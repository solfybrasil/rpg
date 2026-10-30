import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { type Tables, queryKeys, subscribeRealtime, supabase } from '../../shared/supabase';

export type CharacterRow = Tables<'characters'>;

const HERO_COLUMNS =
  'id, name, title, oath_type, level, xp, hp_current, hp_max, focus_current, focus_max, defense_base, plague, hunger, exhaustion, inspiration, coins_bronze, attributes, skills, known_spells, oath_tree, active_conditions, portrait_url, avatar_icon, idle_mp4_url, idle_webm_url, poster_url, media_chroma, media_anchor_x, media_anchor_y, media_size, media_facing, claimed_device, session_code, updated_at';

export async function fetchHeroes(): Promise<CharacterRow[]> {
  const { data, error } = await supabase
    .from('characters')
    .select(HERO_COLUMNS)
    .in('id', ['tor_bjorn', 'malenia', 'kaelis_moonfire']);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CharacterRow[];
}

export async function fetchHeroById(heroId: string): Promise<CharacterRow | null> {
  if (!heroId) return null;
  const { data, error } = await supabase
    .from('characters')
    .select(HERO_COLUMNS)
    .eq('id', heroId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as unknown as CharacterRow | null;
}

export function useHeroes() {
  useEffect(() => {
    return subscribeRealtime({
      topic: 'heroes:all',
      table: 'characters',
      queryKeyToUpdate: queryKeys.heroes.all,
    });
  }, []);

  return useQuery<CharacterRow[]>({
    queryKey: queryKeys.heroes.all,
    queryFn: fetchHeroes,
  });
}

export function useHero(heroId: string | null | undefined) {
  const safeId = heroId || '';

  useEffect(() => {
    if (!safeId) return;
    return subscribeRealtime({
      topic: `hero:${safeId}`,
      table: 'characters',
      filter: `id=eq.${safeId}`,
      queryKeyToUpdate: queryKeys.heroes.detail(safeId),
    });
  }, [safeId]);

  return useQuery<CharacterRow | null>({
    queryKey: queryKeys.heroes.detail(safeId),
    queryFn: () => fetchHeroById(safeId),
    enabled: Boolean(safeId),
  });
}

export { PlayerSheetView } from './components/PlayerSheetView';

