import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { GridRecipeRecord, WorkshopStation } from '../../entities/recipe';
import { queryKeys, subscribeRealtime, supabase } from '../../../shared/supabase';
import type { Database } from '../../../shared/supabase/types';

export interface GridRecipeFilter {
  station?: string;
  rarity?: string;
  search?: string;
  activeOnly?: boolean;
}

export const dmWorkshopQueryKeys = {
  allRecipes: (filter?: GridRecipeFilter) => ['dm_workshop', 'recipes', filter] as const,
  craftAttempts: ['dm_workshop', 'attempts'] as const,
  heroes: ['dm_workshop', 'heroes'] as const,
};

/**
 * Hook para buscar todas as receitas 3x3 do catálogo com filtros
 */
export function useAllGridRecipes(filter: GridRecipeFilter = {}) {
  return useQuery({
    queryKey: dmWorkshopQueryKeys.allRecipes(filter),
    queryFn: async (): Promise<GridRecipeRecord[]> => {
      let query = supabase.from('crafting_grid_recipes').select('*');

      if (filter.station && filter.station !== 'todos') {
        query = query.eq('station', filter.station);
      }

      if (filter.rarity && filter.rarity !== 'Todas') {
        query = query.eq('rarity', filter.rarity);
      }

      if (filter.activeOnly) {
        query = query.eq('active', true);
      }

      if (filter.search && filter.search.trim()) {
        const s = `%${filter.search.trim().toLowerCase()}%`;
        query = query.or(`result_name.ilike.${s},skill.ilike.${s},id.ilike.${s}`);
      }

      const { data, error } = await query.order('peso', { ascending: true });

      if (error) {
        console.error('[DMWorkshop] Erro ao buscar receitas:', error);
        throw error;
      }

      return (data || []).map((row) => ({
        id: row.id,
        station: row.station as WorkshopStation,
        result_id: row.result_id,
        result_name: row.result_name,
        result_qty: row.result_qty ?? 1,
        grid: Array.isArray(row.grid) ? (row.grid as Array<string | null>) : Array(9).fill(null),
        grid_names: Array.isArray(row.grid_names)
          ? (row.grid_names as Array<string | null>)
          : undefined,
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
    staleTime: 60_000,
  });
}

/**
 * Mutation para salvar ou atualizar receita 3x3
 */
export function useSaveGridRecipeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipe: Partial<GridRecipeRecord> & { id?: string }) => {
      const id =
        recipe.id?.trim() ||
        `${recipe.station || 'forja'}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

      const payload: any = {
        id,
        station: recipe.station || 'forja',
        result_id: recipe.result_id || 'item_generico',
        result_name: recipe.result_name?.trim() || 'Item Sem Nome',
        result_qty: Math.max(1, Number(recipe.result_qty) || 1),
        grid: Array.isArray(recipe.grid) ? recipe.grid : Array(9).fill(null),
        grid_names: Array.isArray(recipe.grid_names) ? recipe.grid_names : Array(9).fill(null),
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        peso: Number(recipe.peso || 6),
        skill: recipe.skill || (recipe.station === 'alquimia' ? 'Alquimia' : 'Forja'),
        rarity: recipe.rarity || 'Comum',
        alternate: Boolean(recipe.alternate),
        starter: Boolean(recipe.starter),
        loss_minor: Number(recipe.loss_minor ?? 50),
        loss_major: Number(recipe.loss_major ?? 80),
        active: recipe.active !== undefined ? Boolean(recipe.active) : true,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('crafting_grid_recipes')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[DMWorkshop] Erro ao salvar receita 3x3:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm_workshop', 'recipes'] });
      queryClient.invalidateQueries({ queryKey: ['workshop', 'recipes'] });
    },
  });
}

/**
 * Mutation para deletar receita 3x3
 */
export function useDeleteGridRecipeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipeId: string) => {
      const { error } = await supabase
        .from('crafting_grid_recipes')
        .delete()
        .eq('id', recipeId);

      if (error) {
        console.error('[DMWorkshop] Erro ao deletar receita 3x3:', error);
        throw error;
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm_workshop', 'recipes'] });
      queryClient.invalidateQueries({ queryKey: ['workshop', 'recipes'] });
    },
  });
}

/**
 * Mutation para ensinar receita a um herói
 */
export function useTeachRecipeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      characterId,
      recipeId,
    }: {
      characterId: string;
      recipeId: string;
    }) => {
      // 1. Tentar RPC teach_recipe
      const { error: rpcErr } = await supabase.rpc('teach_recipe', {
        p_character_id: characterId,
        p_recipe_id: recipeId,
        p_source: 'mestre',
      });

      if (!rpcErr) return true;

      // 2. Fallback: inserção direta em player_known_recipes
      const { error: insErr } = await supabase
        .from('player_known_recipes')
        .upsert(
          {
            character_id: characterId,
            recipe_id: recipeId,
          },
          { onConflict: 'character_id,recipe_id' as any },
        );

      if (insErr) {
        console.error('[DMWorkshop] Falha ao ensinar receita:', insErr);
        throw insErr;
      }
      return true;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['workshop', 'known', variables.characterId],
      });
    },
  });
}

/**
 * Mutation para alternar a Forja Aberta / Fechada
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

/**
 * Mutation para alternar Alquimia Aberta / Fechada (via game_state.descanso_evento)
 */
export function useToggleAlchemyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alchemyAvailable }: { alchemyAvailable: boolean }) => {
      const qk = queryKeys.gameState.global;
      const current = queryClient.getQueryData<Database['public']['Tables']['game_state']['Row']>(qk);
      const targetId = current?.id ?? 1;

      const descansoEvento = alchemyAvailable ? null : 'alchemy_closed';

      const { data, error } = await supabase
        .from('game_state')
        .update({ descanso_evento: descansoEvento, updated_at: new Date().toISOString() })
        .eq('id', targetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ alchemyAvailable }) => {
      const qk = queryKeys.gameState.global;
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<Database['public']['Tables']['game_state']['Row']>(qk);
      if (previous) {
        queryClient.setQueryData(qk, {
          ...previous,
          descanso_evento: alchemyAvailable ? null : 'alchemy_closed',
        });
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

/**
 * Hook para buscar o feed em tempo real de tentativas de criação
 */
export function useRecentCraftAttemptsFeed(sessionCode = 'MESA') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: dmWorkshopQueryKeys.craftAttempts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('craft_attempts')
        .select('*')
        .eq('session_code', sessionCode.toUpperCase())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('[DMWorkshop] Erro ao buscar tentativas:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const unsub = subscribeRealtime<{ session_code: string }>({
      topic: `craft_attempts_dm_${sessionCode.toLowerCase()}`,
      table: 'craft_attempts',
      filter: `session_code=eq.${sessionCode.toUpperCase()}`,
      queryKeyToUpdate: dmWorkshopQueryKeys.craftAttempts,
    });
    return () => unsub();
  }, [sessionCode]);

  return query;
}
