import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { queryKeys, subscribeRealtime, supabase } from '../supabase';
import type { Database } from '../supabase/types';

export type CharacterRow = Database['public']['Tables']['characters']['Row'];
export type InventoryRow = Database['public']['Tables']['inventory_items']['Row'];
export type GameStateRow = Database['public']['Tables']['game_state']['Row'];

/**
 * Hook reativo para um herói individual com realtime sem refetch e mutações otimistas
 */
export function useHero(heroId: string | null | undefined) {
  const queryClient = useQueryClient();
  const qk = heroId ? queryKeys.heroes.detail(heroId) : (['heroes', 'none'] as const);

  const query = useQuery({
    queryKey: qk,
    queryFn: async (): Promise<CharacterRow | null> => {
      if (!heroId) return null;
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', heroId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(heroId),
  });

  useEffect(() => {
    if (!heroId) return;

    const unsub = subscribeRealtime<CharacterRow>({
      topic: `hero_${heroId}`,
      table: 'characters',
      filter: `id=eq.${heroId}`,
      queryKeyToUpdate: qk,
    });

    return () => unsub();
  }, [heroId, qk]);

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<CharacterRow>) => {
      if (!heroId) throw new Error('ID do herói não fornecido');
      const { data, error } = await supabase
        .from('characters')
        .update(patch)
        .eq('id', heroId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<CharacterRow>(qk);
      if (previous) {
        queryClient.setQueryData<CharacterRow>(qk, { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(qk, context.previous);
      }
      toast.error(`Erro ao atualizar herói: ${err instanceof Error ? err.message : 'Falha'}`);
    },
  });

  return {
    ...query,
    hero: query.data ?? null,
    updateHero: updateMutation.mutate,
    updateHeroAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}

/**
 * Hook reativo para todos os heróis da campanha
 */
export function useHeroes() {
  const qk = queryKeys.heroes.all;

  const query = useQuery({
    queryKey: qk,
    queryFn: async (): Promise<CharacterRow[]> => {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    const unsub = subscribeRealtime<CharacterRow>({
      topic: 'all_heroes',
      table: 'characters',
      queryKeyToUpdate: qk,
    });

    return () => unsub();
  }, [qk]);

  return {
    ...query,
    heroes: query.data || [],
  };
}

/**
 * Hook reativo para o inventário do herói
 */
export function useInventory(heroId: string | null | undefined) {
  const queryClient = useQueryClient();
  const qk = heroId ? queryKeys.inventory.byHero(heroId) : (['inventory', 'none'] as const);

  const query = useQuery({
    queryKey: qk,
    queryFn: async (): Promise<InventoryRow[]> => {
      if (!heroId) return [];
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('character_id', heroId);

      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(heroId),
  });

  useEffect(() => {
    if (!heroId) return;

    const unsub = subscribeRealtime<InventoryRow>({
      topic: `inventory_${heroId}`,
      table: 'inventory_items',
      filter: `character_id=eq.${heroId}`,
      queryKeyToUpdate: qk,
    });

    return () => unsub();
  }, [heroId, qk]);

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<InventoryRow> }) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(patch)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<InventoryRow[]>(qk);
      if (previous) {
        queryClient.setQueryData<InventoryRow[]>(
          qk,
          previous.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        );
      }
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(qk, context.previous);
      }
      toast.error(`Erro ao atualizar item: ${err instanceof Error ? err.message : 'Falha'}`);
    },
  });

  return {
    ...query,
    items: query.data || [],
    updateItem: updateItemMutation.mutate,
    updateItemAsync: updateItemMutation.mutateAsync,
  };
}

/**
 * Hook reativo para o estado global do jogo (Relógio, banners, status)
 */
export function useGameState() {
  const queryClient = useQueryClient();
  const qk = queryKeys.gameState.global;

  const query = useQuery({
    queryKey: qk,
    queryFn: async (): Promise<GameStateRow | null> => {
      const { data, error } = await supabase.from('game_state').select('*').limit(1).maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const unsub = subscribeRealtime<GameStateRow>({
      topic: 'game_state_global',
      table: 'game_state',
      queryKeyToUpdate: qk,
    });

    return () => unsub();
  }, [qk]);

  const updateGameStateMutation = useMutation({
    mutationFn: async (patch: Partial<GameStateRow>) => {
      const current = queryClient.getQueryData<GameStateRow>(qk);
      if (!current?.id) throw new Error('game_state não carregado');

      const { data, error } = await supabase
        .from('game_state')
        .update(patch)
        .eq('id', current.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<GameStateRow>(qk);
      if (previous) {
        queryClient.setQueryData<GameStateRow>(qk, { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(qk, context.previous);
      }
      toast.error(
        `Erro ao atualizar estado do jogo: ${err instanceof Error ? err.message : 'Falha'}`,
      );
    },
  });

  return {
    ...query,
    gameState: query.data ?? null,
    updateGameState: updateGameStateMutation.mutate,
    updateGameStateAsync: updateGameStateMutation.mutateAsync,
  };
}
