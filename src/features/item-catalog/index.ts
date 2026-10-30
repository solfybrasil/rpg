import { useQuery } from '@tanstack/react-query';
import { type Tables, queryKeys, supabase } from '../../shared/supabase';

export type ItemCatalogRow = Tables<'item_catalog'>;

const ITEM_CATALOG_COLUMNS =
  'id, name, category, rarity, weight_slots, price_bronze, description, icon, image_url, equip_slot, weapon_damage, weapon_attr, weapon_skill, weapon_range, weapon_type, armor_defense, is_two_handed, bonus_json, durability_max';

export async function fetchCatalogItems(params?: {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}): Promise<ItemCatalogRow[]> {
  const page = params?.page ?? 0;
  const pageSize = params?.pageSize ?? 60;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from('item_catalog').select(ITEM_CATALOG_COLUMNS).range(from, to);

  if (params?.search?.trim()) {
    query = query.ilike('name', `%${params.search.trim()}%`);
  }
  if (params?.category && params.category !== 'todos') {
    query = query.eq('category', params.category);
  }

  const { data, error } = await query.order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ItemCatalogRow[];
}

export function useItems(params?: {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery<ItemCatalogRow[]>({
    queryKey: queryKeys.catalogs.items(params),
    queryFn: () => fetchCatalogItems(params),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

// [peste-v2 fundacao] component placeholder
