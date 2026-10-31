import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { supabase as mainSupabase } from '../../../shared/supabase/client.ts';
import type { BattleMap, BattleToken } from '../engine/types.ts';
import {
  battleSupabase,
  fetchActiveBattleMap,
  fetchBattleTokens,
  moverTokenRpc,
} from './battleApi.ts';

export const BATTLE_MAP_KEY = ['battle_map', 'active'];
export const BATTLE_TOKENS_KEY = (mapId: string) => ['battle_tokens', mapId];

export function useActiveBattleMap() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: BATTLE_MAP_KEY,
    queryFn: fetchActiveBattleMap,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    // Escuta mudanças de status/rodada em battle_maps em tempo real
    const channelId = `realtime_battle_maps_${Math.random().toString(36).substring(2, 9)}`;
    const handleMapPayload = (payload: any) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const updated = payload.new as BattleMap;
        queryClient.setQueryData(BATTLE_MAP_KEY, (prev: BattleMap | null) => {
          if (!prev || prev.id === updated.id || updated.status === 'ao_vivo') {
            return { ...prev, ...updated };
          }
          return prev;
        });
      }
    };

    const channelBattle = battleSupabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battle_maps' },
        handleMapPayload,
      )
      .subscribe();

    const channelMainId = `realtime_main_battle_maps_${Math.random().toString(36).substring(2, 9)}`;
    const channelMain = mainSupabase
      .channel(channelMainId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battle_maps' },
        handleMapPayload,
      )
      .subscribe();

    return () => {
      battleSupabase.removeChannel(channelBattle);
      mainSupabase.removeChannel(channelMain);
    };
  }, [queryClient]);

  return query;
}

export function useBattleTokens(mapId: string | undefined) {
  const queryClient = useQueryClient();
  const validMapId = mapId || '00000000-0000-0000-0000-000000000001';

  const query = useQuery({
    queryKey: BATTLE_TOKENS_KEY(validMapId),
    queryFn: () => fetchBattleTokens(validMapId),
    enabled: Boolean(validMapId),
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (!validMapId) return;

    const handleTokenPayload = (payload: any) => {
      const updatedToken = payload.new as BattleToken;
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        queryClient.setQueryData(
          BATTLE_TOKENS_KEY(validMapId),
          (prev: BattleToken[] | undefined) => {
            if (!prev) return [updatedToken];
            const index = prev.findIndex((t) => t.id === updatedToken.id);
            if (index >= 0) {
              const next = [...prev];
              next[index] = { ...next[index], ...updatedToken };
              return next;
            }
            return [...prev, updatedToken];
          },
        );
      } else if (payload.eventType === 'DELETE') {
        const deletedId = (payload.old as { id: string })?.id;
        queryClient.setQueryData(
          BATTLE_TOKENS_KEY(validMapId),
          (prev: BattleToken[] | undefined) => {
            if (!prev) return [];
            return prev.filter((t) => t.id !== deletedId);
          },
        );
      }
    };

    // Escuta movimentações e mudanças de tokens em tempo real em ambos os canais
    const channelId = `realtime_battle_tokens_${validMapId}_${Math.random().toString(36).substring(2, 9)}`;
    const channelBattle = battleSupabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_tokens',
          filter: `map_id=eq.${validMapId}`,
        },
        handleTokenPayload,
      )
      .subscribe();

    const channelMainId = `realtime_main_tokens_${validMapId}_${Math.random().toString(36).substring(2, 9)}`;
    const channelMain = mainSupabase
      .channel(channelMainId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_tokens',
          filter: `map_id=eq.${validMapId}`,
        },
        handleTokenPayload,
      )
      .subscribe();

    return () => {
      battleSupabase.removeChannel(channelBattle);
      mainSupabase.removeChannel(channelMain);
    };
  }, [validMapId, queryClient]);

  const moveToken = useCallback(
    async (
      tokenId: string,
      c: number,
      r: number,
      path: Array<[number, number]>,
    ) => {
      // 1. Atualização Otimista no Cache TanStack Query
      queryClient.setQueryData(
        BATTLE_TOKENS_KEY(validMapId),
        (prev: BattleToken[] | undefined) => {
          if (!prev) return prev;
          return prev.map((t) =>
            t.id === tokenId
              ? {
                  ...t,
                  c,
                  r,
                  path,
                  moves_left: Math.max(0, (t.moves_left ?? 6) - path.length),
                }
              : t,
          );
        },
      );

      // 2. Executa a RPC
      return await moverTokenRpc(tokenId, c, r, path);
    },
    [validMapId, queryClient],
  );

  return {
    ...query,
    tokens: query.data || [],
    moveToken,
  };
}
