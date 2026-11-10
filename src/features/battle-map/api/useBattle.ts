import type { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import type { BattleMap, BattleToken } from '../engine/types.ts';
import { fetchActiveBattleMap, fetchBattleTokens, getBattleDb, moverTokenRpc } from './battleApi.ts';

export const BATTLE_MAP_KEY = ['battle_map', 'active'];
export const BATTLE_TOKENS_KEY = (mapId: string) => ['battle_tokens', mapId];

type Payload = RealtimePostgresChangesPayload<Record<string, unknown>>;

/**
 * Canais compartilhados com contagem de referência: vários componentes que
 * escutam a mesma tabela usam um canal só (antes cada um abria 2 canais com
 * nome aleatório).
 */
const shared = new Map<string, { channel: RealtimeChannel; client: SupabaseClient<any>; handlers: Set<(p: Payload) => void> }>();

function listen(
  client: SupabaseClient<any>,
  name: string,
  table: string,
  filter: string | undefined,
  handler: (p: Payload) => void,
): () => void {
  let entry = shared.get(name);
  if (!entry) {
    const handlers = new Set<(p: Payload) => void>();
    const channel = client
      .channel(name)
      .on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) } as never,
        (p: Payload) => {
          for (const h of handlers) h(p);
        },
      )
      .subscribe();
    entry = { channel, client, handlers };
    shared.set(name, entry);
  }
  entry.handlers.add(handler);
  return () => {
    const e = shared.get(name);
    if (!e) return;
    e.handlers.delete(handler);
    if (e.handlers.size === 0) {
      shared.delete(name);
      void e.client.removeChannel(e.channel);
    }
  };
}

/** Escuta a tabela no banco da mesa (o mesmo para Mestre, jogador e TV). */
function listenBattle(name: string, table: string, filter: string | undefined, handler: (p: Payload) => void) {
  let stop: (() => void) | null = null;
  let cancelled = false;
  void getBattleDb().then((db) => {
    if (!cancelled) stop = listen(db, `bt_${name}`, table, filter, handler);
  });
  return () => {
    cancelled = true;
    stop?.();
  };
}

/**
 * Consulta periódica de reserva: se o Realtime do Supabase não estiver ativo
 * para estas tabelas, a TV e os jogadores ainda atualizam em poucos segundos.
 * O React Query mantém a mesma referência quando nada mudou (sem re-render).
 */
const POLL_MAP_MS = 4000;
const POLL_TOKENS_MS = 2500;

/** Aplica um evento de realtime numa lista de peças (INSERT repetido vira UPDATE). */
export function applyTokenPayload(prev: BattleToken[] | undefined, payload: Payload): BattleToken[] {
  const list = prev ?? [];
  if (payload.eventType === 'DELETE') {
    const id = (payload.old as { id?: string })?.id;
    return list.filter((t) => t.id !== id);
  }
  const row = payload.new as unknown as BattleToken;
  if (!row?.id) return list;
  const i = list.findIndex((t) => t.id === row.id);
  if (i === -1) return [...list, row];
  const next = list.slice();
  next[i] = { ...list[i], ...row };
  return next;
}

/**
 * Mesa ativa. O tempo real avisa na hora; a consulta periódica é só a rede de
 * segurança. Telas que não são a mesa (ex.: o layout do Jogador, que só quer
 * saber se há mesa ao vivo) passam um intervalo maior para não gastar rede.
 */
export function useActiveBattleMap(opts: { pollMs?: number } = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: BATTLE_MAP_KEY,
    queryFn: fetchActiveBattleMap,
    staleTime: 1000,
    refetchInterval: opts.pollMs ?? POLL_MAP_MS,
  });

  useEffect(
    () =>
      listenBattle('battle_maps', 'battle_maps', undefined, (payload) => {
        if (payload.eventType !== 'UPDATE' && payload.eventType !== 'INSERT') return;
        const updated = payload.new as unknown as BattleMap;
        queryClient.setQueryData(BATTLE_MAP_KEY, (prev: BattleMap | null | undefined) => {
          // Outra mesa foi posta ao vivo: ela passa a ser a ativa.
          if (updated.status === 'ao_vivo' && prev?.id !== updated.id) return updated;
          if (prev && prev.id === updated.id) {
            // A mesa ativa saiu do ar: busca de novo qual está ao vivo.
            if (updated.status !== 'ao_vivo') void queryClient.invalidateQueries({ queryKey: BATTLE_MAP_KEY });
            return { ...prev, ...updated };
          }
          return prev;
        });
      }),
    [queryClient],
  );

  return query;
}

export function useBattleTokens(
  mapId: string | undefined,
  opts: {
    /** Enquanto true, a consulta periódica espera (ex.: Mestre com gravação pendente). */
    isBusy?: () => boolean;
  } = {},
) {
  const queryClient = useQueryClient();
  const busyRef = useRef(opts.isBusy);
  busyRef.current = opts.isBusy;
  // Movimentos do próprio jogador ainda sendo gravados
  const inflight = useRef(0);

  const query = useQuery({
    queryKey: BATTLE_TOKENS_KEY(mapId || 'none'),
    queryFn: () => fetchBattleTokens(mapId as string),
    enabled: Boolean(mapId),
    staleTime: 1000,
    refetchInterval: () => (inflight.current > 0 || busyRef.current?.() ? false : POLL_TOKENS_MS),
  });

  useEffect(() => {
    if (!mapId) return;
    return listenBattle(`battle_tokens_${mapId}`, 'battle_tokens', `map_id=eq.${mapId}`, (payload) => {
      queryClient.setQueryData(BATTLE_TOKENS_KEY(mapId), (prev: BattleToken[] | undefined) =>
        applyTokenPayload(prev, payload),
      );
    });
  }, [mapId, queryClient]);

  const moveToken = useCallback(
    async (tokenId: string, c: number, r: number, path: Array<[number, number]>) => {
      if (!mapId) return false;
      let prevMovesLeft = 6;
      queryClient.setQueryData(BATTLE_TOKENS_KEY(mapId), (prev: BattleToken[] | undefined) =>
        prev?.map((t) => {
          if (t.id !== tokenId) return t;
          prevMovesLeft = t.moves_left ?? 6;
          return {
            ...t,
            c,
            r,
            path,
            moves_left: Math.max(0, prevMovesLeft - path.length),
            updated_at: new Date().toISOString(),
          };
        }),
      );
      inflight.current++;
      try {
        return await moverTokenRpc(tokenId, c, r, path, prevMovesLeft);
      } finally {
        // pequena folga para o banco/realtime refletirem antes da próxima consulta
        setTimeout(() => {
          inflight.current = Math.max(0, inflight.current - 1);
        }, 800);
      }
    },
    [mapId, queryClient],
  );

  return {
    ...query,
    tokens: query.data || [],
    moveToken,
  };
}
