import { useQuery } from '@tanstack/react-query';
import { type Tables, queryKeys, supabase } from '../../shared/supabase';

export type CreatureRow = Tables<'creature_catalog'>;

const CREATURE_COLUMNS =
  'id, name, category, region, size, peso, hp, defense, speed, behavior, attacks, passives, weaknesses, loot, lore, image_url, idle_mp4_url, idle_webm_url, poster_url';

export async function fetchCreatures(params?: {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}): Promise<CreatureRow[]> {
  const page = params?.page ?? 0;
  const pageSize = params?.pageSize ?? 50;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from('creature_catalog').select(CREATURE_COLUMNS).range(from, to);

  if (params?.search?.trim()) {
    query = query.ilike('name', `%${params.search.trim()}%`);
  }
  if (params?.category && params.category !== 'todos') {
    query = query.eq('category', params.category);
  }

  const { data, error } = await query.order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CreatureRow[];
}

export function useCreatures(params?: {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery<CreatureRow[]>({
    queryKey: queryKeys.catalogs.creatures(params),
    queryFn: () => fetchCreatures(params),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

// [peste-v2 fundacao] component placeholder
