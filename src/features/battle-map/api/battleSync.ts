import type { RealtimeChannel } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { subscribeRealtime } from '../../../shared/supabase/realtime.ts';
import { supabase as mainSupabase } from '../../../shared/supabase/client.ts';
import type { BattlePing, HeroVital } from '../engine/types.ts';
import { getBattleDb } from './battleApi.ts';

/** Estado do turno, mantido pelo Mestre e espelhado em Jogadores e TV. */
export interface BattleTurn {
  tokenId: string | null;
  name: string | null;
  round: number;
}

/** Efeito tocado uma vez numa casa (não fica salvo na mesa). */
export interface BattleFxEvent {
  id: string;
  c: number;
  r: number;
  scale?: number;
  /** Perspectiva escolhida pelo Mestre (sem isto, acompanha a grade). */
  view?: 'iso' | 'reta';
}

/** Medição com régua sincronizada em tempo real. */
export interface BattleMeasureEvent {
  from: { c: number; r: number } | null;
  to: { c: number; r: number } | null;
}

interface SyncHandlers {
  onPing?: (ping: BattlePing) => void;
  onFx?: (fx: BattleFxEvent) => void;
  onTurn?: (turn: BattleTurn) => void;
  onMeasure?: (measure: BattleMeasureEvent) => void;
  /** Só o Mestre responde a novos participantes com o turno atual. */
  getTurn?: () => BattleTurn | null;
  getMeasure?: () => BattleMeasureEvent | null;
}

/**
 * Canal leve (broadcast, sem gravar no banco) para pings e turno da mesa.
 * Quem entra pede o estado ('hello') e o Mestre responde com o turno atual.
 */
export function useBattleSync(mapId: string | undefined, handlers: SyncHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!mapId) return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    void getBattleDb().then((db) => {
      if (cancelled) return;
      const channel = db.channel(`battle_sync_${mapId}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on('broadcast', { event: 'ping' }, ({ payload }) => {
          handlersRef.current.onPing?.(payload as BattlePing);
        })
        .on('broadcast', { event: 'fx' }, ({ payload }) => {
          handlersRef.current.onFx?.(payload as BattleFxEvent);
        })
        .on('broadcast', { event: 'turn' }, ({ payload }) => {
          handlersRef.current.onTurn?.(payload as BattleTurn);
        })
        .on('broadcast', { event: 'measure' }, ({ payload }) => {
          handlersRef.current.onMeasure?.(payload as BattleMeasureEvent);
        })
        .on('broadcast', { event: 'hello' }, () => {
          const turn = handlersRef.current.getTurn?.();
          if (turn) void channel.send({ type: 'broadcast', event: 'turn', payload: turn });
          const measure = handlersRef.current.getMeasure?.();
          if (measure?.from && measure?.to) {
            void channel.send({ type: 'broadcast', event: 'measure', payload: measure });
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            void channel.send({ type: 'broadcast', event: 'hello', payload: {} });
          }
        });

      channelRef.current = channel;
      cleanup = () => {
        channelRef.current = null;
        void db.removeChannel(channel);
      };
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [mapId]);

  const sendPing = useCallback((ping: BattlePing) => {
    void channelRef.current?.send({ type: 'broadcast', event: 'ping', payload: ping });
  }, []);

  const sendTurn = useCallback((turn: BattleTurn) => {
    void channelRef.current?.send({ type: 'broadcast', event: 'turn', payload: turn });
  }, []);

  const sendFx = useCallback((fx: BattleFxEvent) => {
    void channelRef.current?.send({ type: 'broadcast', event: 'fx', payload: fx });
  }, []);

  const sendMeasure = useCallback((measure: BattleMeasureEvent) => {
    void channelRef.current?.send({ type: 'broadcast', event: 'measure', payload: measure });
  }, []);

  return { sendPing, sendTurn, sendFx, sendMeasure };
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
