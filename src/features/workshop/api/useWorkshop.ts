import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import type { GridRecipeRecord, WorkshopStation } from '../../entities/recipe';
import { queryKeys, subscribeRealtime, supabase } from '../../../shared/supabase';
import type { Database } from '../../../shared/supabase/types';

export const workshopQueryKeys = {
  all: ['workshop'] as const,
  recipes: (station: string) => ['workshop', 'recipes', station] as const,
  knownRecipes: (charId: string) => ['workshop', 'known', charId] as const,
  attempts: (charId: string) => ['workshop', 'attempts', charId] as const,
};

/**
 * Hook para buscar as receitas ativas da estação (grade 3x3)
 */
export function useWorkshopRecipes(station: WorkshopStation) {
  return useQuery({
    queryKey: workshopQueryKeys.recipes(station),
    queryFn: async (): Promise<GridRecipeRecord[]> => {
      const { data, error } = await supabase
        .from('crafting_grid_recipes')
        .select('*')
        .eq('station', station)
        .eq('active', true)
        .order('peso', { ascending: true });

      if (error) {
        console.error('[WORKSHOP] Erro ao buscar receitas da bancada:', error);
        throw error;
      }

      return (data || []).map((row) => ({
        id: row.id,
        station: row.station as WorkshopStation,
        result_id: row.result_id,
        result_name: row.result_name,
        result_qty: row.result_qty ?? 1,
        grid: Array.isArray(row.grid) ? (row.grid as Array<string | null>) : Array(9).fill(null),
        grid_names: Array.isArray(row.grid_names) ? (row.grid_names as Array<string | null>) : undefined,
        ingredients: Array.isArray(row.ingredients)
          ? (row.ingredients as Array<{ id?: string; name?: string; qty?: number }>)
          : [],
        peso: Number(row.peso || 6),
        skill: row.skill ?? undefined,
        rarity: row.rarity ?? 'Comum',
        alternate: Boolean(row.alternate),
        starter: Boolean(row.starter),
        loss_minor: row.loss_minor ?? 50,
        loss_major: row.loss_major ?? 80,
        active: row.active ?? true,
      }));
    },
    staleTime: 1000 * 60 * 10, // 10 min
  });
}

/**
 * Hook para buscar as receitas conhecidas do personagem com Realtime
 */
export function useKnownRecipes(characterId: string | null | undefined) {
  const queryClient = useQueryClient();
  const qk = characterId
    ? workshopQueryKeys.knownRecipes(characterId)
    : (['workshop', 'known', 'none'] as const);

  const query = useQuery({
    queryKey: qk,
    queryFn: async (): Promise<string[]> => {
      if (!characterId) return [];
      const { data, error } = await supabase
        .from('player_known_recipes')
        .select('recipe_id')
        .eq('character_id', characterId);

      if (error) {
        console.warn('[WORKSHOP] Erro ao carregar player_known_recipes:', error);
        return [];
      }

      return (data || []).map((r) => r.recipe_id);
    },
    enabled: Boolean(characterId),
  });

  useEffect(() => {
    if (!characterId) return;

    const unsub = subscribeRealtime<{ character_id: string; recipe_id: string }>({
      topic: `known_recipes_${characterId}`,
      table: 'player_known_recipes',
      filter: `character_id=eq.${characterId}`,
      queryKeyToUpdate: qk,
    });

    return () => unsub();
  }, [characterId, qk]);

  const knownSet = useMemo(() => new Set(query.data || []), [query.data]);

  return {
    ...query,
    knownRecipeIds: knownSet,
  };
}

/**
 * Dispara tentativa de criação na RPC do Supabase
 */
export function useCraftAttemptMutation() {
  return useMutation({
    mutationFn: async ({
      playerId,
      characterId,
      station,
      grid,
    }: {
      playerId: string;
      characterId?: string;
      station: WorkshopStation;
      grid: Array<string | null>;
    }) => {
      // Prioriza player_id exigido pela RPC
      const targetId = playerId || characterId;
      const { data, error } = await supabase.rpc('craft_attempt', {
        p_player_id: targetId,
        p_station: station,
        p_grid: grid,
      });

      if (error) {
        console.error('[WORKSHOP] Erro na RPC craft_attempt:', error);
        throw error;
      }
      return data;
    },
  });
}

/**
 * Resolve a criação (consome ingredientes e insere produto na mochila)
 */
export function useCraftResolveMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attemptId }: { attemptId: string }) => {
      const { data, error } = await supabase.rpc('craft_resolve', {
        p_attempt_id: attemptId,
      });

      if (error) {
        console.error('[WORKSHOP] Erro na RPC craft_resolve:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      // Invalida inventário e receitas conhecidas para refletir instantaneamente
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: ['workshop', 'known'] });
    },
  });
}

/**
 * Reroll com Inspiração em caso de Falha
 */
export function useCraftRerollMutation() {
  return useMutation({
    mutationFn: async ({ attemptId }: { attemptId: string }) => {
      const { data, error } = await supabase.rpc('craft_reroll', {
        p_attempt_id: attemptId,
      });

      if (error) {
        console.error('[WORKSHOP] Erro na RPC craft_reroll:', error);
        throw error;
      }
      return data;
    },
  });
}

/**
 * Quebrar Juramento (+1 Praga) para converter falha em sucesso
 */
export function useCraftBreakOathMutation() {
  return useMutation({
    mutationFn: async ({ attemptId }: { attemptId: string }) => {
      const { data, error } = await supabase.rpc('craft_break_oath', {
        p_attempt_id: attemptId,
      });

      if (error) {
        console.error('[WORKSHOP] Erro na RPC craft_break_oath:', error);
        throw error;
      }
      return data;
    },
  });
}

/**
 * Controle da forja pelo Mestre
 */
export function useToggleForgeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ forgeAvailable }: { forgeAvailable: boolean }) => {
      const qk = queryKeys.gameState.global;
      const current = queryClient.getQueryData<Database['public']['Tables']['game_state']['Row']>(qk);
      const targetId = current?.id ?? 1;

      const { data, error } = await supabase
        .from('game_state')
        .update({ forge_available: forgeAvailable, updated_at: new Date().toISOString() })
        .eq('id', targetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ forgeAvailable }) => {
      const qk = queryKeys.gameState.global;
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<Database['public']['Tables']['game_state']['Row']>(qk);
      if (previous) {
        queryClient.setQueryData(qk, { ...previous, forge_available: forgeAvailable });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.gameState.global, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gameState.global });
    },
  });
}
