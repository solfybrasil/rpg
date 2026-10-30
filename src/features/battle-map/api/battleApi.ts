import { createClient } from '@supabase/supabase-js';
import { supabase as mainSupabase } from '../../../shared/supabase/client.ts';
import type { BattleMap, BattleToken } from '../engine/types.ts';

const BATTLE_URL =
  import.meta.env.VITE_BATTLE_SUPABASE_URL ||
  'https://ngwexiqejyfsfnhtnrhf.supabase.co';
const BATTLE_KEY =
  import.meta.env.VITE_BATTLE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nd2V4aXFlanlmc2ZuaHRucmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDU3NTgsImV4cCI6MjA5MzQ4MTc1OH0.Q8zUGKrQIiuVHskdYrg069h5vlce_L2lSUwb2LgQJUo';

export const battleSupabase = createClient(BATTLE_URL, BATTLE_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});

export const DEFAULT_BATTLE_MAP: BattleMap = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Santuário do Tigre-Serpente',
  background_url: '/batalha/santuario.jpg',
  img_w: 1376,
  img_h: 768,
  tile_size: 86,
  origin_x: 690,
  origin_y: 418,
  show_grid: true,
  blocked: ['1,1', '2,2'],
  move_limit: 6,
  status: 'ao_vivo',
  round: 1,
  updated_at: new Date().toISOString(),
};

export const DEFAULT_BATTLE_TOKENS: BattleToken[] = [
  {
    id: '00000000-0000-0000-0000-000000000011',
    map_id: '00000000-0000-0000-0000-000000000001',
    kind: 'heroi',
    hero_id: 'malenia',
    name: 'Malenia',
    media_url: '/batalha/malenia_idle.webm',
    media_type: 'video',
    chroma: 'verde',
    anchor_x: 0.487,
    anchor_y: 0.985,
    size: 172,
    facing: 1,
    c: -1,
    r: 3,
    moves_left: 6,
    visible: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    map_id: '00000000-0000-0000-0000-000000000001',
    kind: 'heroi',
    hero_id: 'kaelis_moonfire',
    name: 'Kaelis',
    media_url: '/batalha/kaelis_idle.webm',
    media_type: 'video',
    chroma: 'magenta',
    anchor_x: 0.486,
    anchor_y: 0.985,
    size: 166,
    facing: 1,
    c: -3,
    r: 3,
    moves_left: 6,
    visible: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000013',
    map_id: '00000000-0000-0000-0000-000000000001',
    kind: 'heroi',
    hero_id: 'tor_bjorn',
    name: 'Tor',
    media_url: '/batalha/tor_idle.webm',
    media_type: 'video',
    chroma: 'verde',
    anchor_x: 0.412,
    anchor_y: 0.954,
    size: 130,
    facing: 1,
    c: 0,
    r: 5,
    moves_left: 6,
    visible: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000014',
    map_id: '00000000-0000-0000-0000-000000000001',
    kind: 'fera',
    name: 'Tigre-Serpente',
    media_url: '/batalha/fera_idle.webm',
    media_type: 'video',
    chroma: 'verde',
    anchor_x: 0.284,
    anchor_y: 0.96,
    size: 160,
    facing: 1,
    c: 3,
    r: 0,
    moves_left: 6,
    visible: true,
  },
];

export async function fetchActiveBattleMap(): Promise<BattleMap | null> {
  // 1. Tenta banco de batalha dedicado
  try {
    const { data, error } = await battleSupabase
      .from('battle_maps')
      .select('*')
      .eq('status', 'ao_vivo')
      .maybeSingle();

    if (!error && data) {
      return data as BattleMap;
    }
  } catch (_) {}

  // 2. Tenta banco principal
  try {
    const { data, error } = await mainSupabase
      .from('battle_maps' as any)
      .select('*')
      .eq('status', 'ao_vivo')
      .maybeSingle();

    if (!error && data) {
      return data as unknown as BattleMap;
    }
  } catch (_) {}

  // 3. Fallback: se houver mapa em rascunho/default
  try {
    const { data } = await battleSupabase
      .from('battle_maps')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) return data as BattleMap;
  } catch (_) {}

  return DEFAULT_BATTLE_MAP;
}

export async function fetchBattleTokens(
  mapId: string,
): Promise<BattleToken[]> {
  try {
    const { data, error } = await battleSupabase
      .from('battle_tokens')
      .select('*')
      .eq('map_id', mapId)
      .order('size', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as BattleToken[];
    }
  } catch (_) {}

  // Tenta banco principal
  try {
    const { data, error } = await mainSupabase
      .from('battle_tokens' as any)
      .select('*')
      .eq('map_id', mapId);

    if (!error && data && (data as any).length > 0) {
      return data as unknown as BattleToken[];
    }
  } catch (_) {}

  return DEFAULT_BATTLE_TOKENS.map((t) => ({ ...t, map_id: mapId }));
}

export async function moverTokenRpc(
  tokenId: string,
  c: number,
  r: number,
  path: Array<[number, number]>,
): Promise<boolean> {
  // Tenta RPC nativa mover_token no banco de batalha
  try {
    const { data, error } = await battleSupabase.rpc('mover_token', {
      p_token: tokenId,
      p_c: c,
      p_r: r,
      p_path: path,
    });

    if (!error && data && (data as any).success) {
      return true;
    }
  } catch (_) {}

  // Fallback: update direto na tabela battle_tokens
  try {
    const { error } = await battleSupabase
      .from('battle_tokens')
      .update({
        c,
        r,
        path,
        moves_left: Math.max(0, 6 - path.length),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenId);

    if (!error) return true;
  } catch (_) {}

  return true;
}
