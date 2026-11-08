import type { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { supabase as mainSupabase } from '../../../shared/supabase/client.ts';
import type { BattleMap, BattleToken } from '../engine/types.ts';
import { battleSupabase, fetchActiveBattleMap, fetchBattleTokens, moverTokenRpc } from './battleApi.ts';

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

/** Escuta a mesma tabela nos dois projetos Supabase (mesa dedicada + principal). */
function listenBoth(name: string, table: string, filter: string | undefined, handler: (p: Payload) => void) {
  const a = listen(battleSupabase as SupabaseClient<any>, `bt_${name}`, table, filter, handler);
  const b =
    (battleSupabase as unknown) === (mainSupabase as unknown)
      ? () => {}
      : listen(mainSupabase as SupabaseClient<any>, `mn_${name}`, table, filter, handler);
  return () => {
    a();
    b();
  };
}

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

export function useActiveBattleMap() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: BATTLE_MAP_KEY,
    queryFn: fetchActiveBattleMap,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(
    () =>
      listenBoth('battle_maps', 'battle_maps', undefined, (payload) => {
        if (payload.eventType !== 'UPDATE' && payload.eventType !== 'INSERT') return;
        const updated = payload.new as unknown as BattleMap;
        queryClient.setQueryData(BATTLE_MAP_KEY, (prev: BattleMap | null | undefined) => {
          if (!prev || prev.id === updated.id) return { ...prev, ...updated };
          // Outra mesa foi posta ao vivo: ela passa a ser a ativa.
          if (updated.status === 'ao_vivo') return updated;
          return prev;
        });
      }),
    [queryClient],
  );

  return query;
}

export function useBattleTokens(mapId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: BATTLE_TOKENS_KEY(mapId || 'none'),
    queryFn: () => fetchBattleTokens(mapId as string),
    enabled: Boolean(mapId),
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (!mapId) return;
    return listenBoth(`battle_tokens_${mapId}`, 'battle_tokens', `map_id=eq.${mapId}`, (payload) => {
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
      return moverTokenRpc(tokenId, c, r, path, prevMovesLeft);
    },
    [mapId, queryClient],
  );

  return {
    ...query,
    tokens: query.data || [],
    moveToken,
  };
}
