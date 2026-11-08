import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { subscribeRealtime } from '../../../shared/supabase/realtime.ts';
import { supabase as mainSupabase } from '../../../shared/supabase/client.ts';
import type { BattlePing, HeroVital } from '../engine/types.ts';
import { battleSupabase } from './battleApi.ts';

/** Estado do turno, mantido pelo Mestre e espelhado em Jogadores e TV. */
export interface BattleTurn {
  tokenId: string | null;
  name: string | null;
  round: number;
}

interface SyncHandlers {
  onPing?: (ping: BattlePing) => void;
  onTurn?: (turn: BattleTurn) => void;
  /** Só o Mestre responde a novos participantes com o turno atual. */
  getTurn?: () => BattleTurn | null;
}

/**
 * Canal leve (broadcast, sem gravar no banco) para pings e turno da mesa.
 * Quem entra pede o estado ('hello') e o Mestre responde com o turno atual.
 */
export function useBattleSync(mapId: string | undefined, handlers: SyncHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const channelRef = useRef<ReturnType<typeof battleSupabase.channel> | null>(null);

  useEffect(() => {
    if (!mapId) return;
    const channel = battleSupabase.channel(`battle_sync_${mapId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'ping' }, ({ payload }) => {
        handlersRef.current.onPing?.(payload as BattlePing);
      })
      .on('broadcast', { event: 'turn' }, ({ payload }) => {
        handlersRef.current.onTurn?.(payload as BattleTurn);
      })
      .on('broadcast', { event: 'hello' }, () => {
        const turn = handlersRef.current.getTurn?.();
        if (turn) void channel.send({ type: 'broadcast', event: 'turn', payload: turn });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.send({ type: 'broadcast', event: 'hello', payload: {} });
        }
      });

    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void battleSupabase.removeChannel(channel);
    };
  }, [mapId]);

  const sendPing = useCallback((ping: BattlePing) => {
    void channelRef.current?.send({ type: 'broadcast', event: 'ping', payload: ping });
  }, []);

  const sendTurn = useCallback((turn: BattleTurn) => {
    void channelRef.current?.send({ type: 'broadcast', event: 'turn', payload: turn });
  }, []);

  return { sendPing, sendTurn };
}

const HERO_VITALS_KEY = ['battle', 'hero_vitals'] as const;

interface VitalRow {
  id: string;
  name: string | null;
  health: number | null;
  max_health: number | null;
  avatar_icon: string | null;
}

/** Vida dos heróis (tabela `characters`), com atualização em tempo real. */
export function useHeroVitals() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: HERO_VITALS_KEY,
    queryFn: async (): Promise<VitalRow[]> => {
      const { data, error } = await mainSupabase
        .from('characters')
        .select('id, name, health, max_health, avatar_icon')
        .order('name');
      if (error) return [];
      return (data || []) as VitalRow[];
    },
    staleTime: 60_000,
  });

  useEffect(
    () =>
      subscribeRealtime<Record<string, unknown>>({
        topic: 'battle_hero_vitals',
        table: 'characters',
        event: 'UPDATE',
        handler: (payload) => {
          const row = payload.new as Partial<VitalRow>;
          if (!row?.id) return;
          queryClient.setQueryData<VitalRow[]>(HERO_VITALS_KEY, (prev) =>
            prev?.map((h) => (h.id === row.id ? { ...h, ...row } : h)),
          );
        },
      }),
    [queryClient],
  );

  const vitals = useMemo(() => {
    const out: Record<string, HeroVital> = {};
    for (const h of query.data || []) {
      if (h.health == null) continue;
      out[h.id] = { hp: Number(h.health), maxHp: Number(h.max_health ?? h.health) || 1 };
    }
    return out;
  }, [query.data]);

  return { heroes: query.data || [], vitals };
}
