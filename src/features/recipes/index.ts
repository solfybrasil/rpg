import { useQuery } from '@tanstack/react-query';
import { type Tables, queryKeys, supabase } from '../../shared/supabase';

export type GridRecipeRow = Tables<'crafting_grid_recipes'>;

const GRID_RECIPE_COLUMNS =
  'id, name, station, peso, grid, result_item_id, result_name, result_quantity, result_rarity, result_category, result_icon, description';

export async function fetchGridRecipes(station?: string): Promise<GridRecipeRow[]> {
  let query = supabase.from('crafting_grid_recipes').select(GRID_RECIPE_COLUMNS);
  if (station && station !== 'all') {
    query = query.eq('station', station);
  }
  const { data, error } = await query.order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as GridRecipeRow[];
}

export function useRecipes(station?: string) {
  return useQuery<GridRecipeRow[]>({
    queryKey: queryKeys.catalogs.gridRecipes(station),
    queryFn: () => fetchGridRecipes(station),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

// [peste-v2 fundacao] component placeholder
// [peste-v2 fundacao] component placeholder
// [peste-v2 fundacao] component placeholder
