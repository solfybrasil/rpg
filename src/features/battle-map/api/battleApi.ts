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

// ── 1. CONSULTA DE MAPAS ──

export async function fetchActiveBattleMap(): Promise<BattleMap | null> {
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

export async function fetchBattleMaps(): Promise<BattleMap[]> {
  try {
    const { data, error } = await battleSupabase
      .from('battle_maps')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as BattleMap[];
    }
  } catch (_) {}

  try {
    const { data, error } = await mainSupabase
      .from('battle_maps' as any)
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data && (data as any).length > 0) {
      return data as unknown as BattleMap[];
    }
  } catch (_) {}

  return [DEFAULT_BATTLE_MAP];
}

export async function createBattleMap(
  mapData: Partial<BattleMap>,
): Promise<BattleMap> {
  const newMap: Partial<BattleMap> = {
    name: mapData.name || 'Nova Mesa de Batalha',
    background_url: mapData.background_url || '/batalha/santuario.jpg',
    img_w: mapData.img_w || 1376,
    img_h: mapData.img_h || 768,
    tile_size: mapData.tile_size || 86,
    origin_x: mapData.origin_x || 690,
    origin_y: mapData.origin_y || 418,
    show_grid: mapData.show_grid ?? true,
    blocked: mapData.blocked || [],
    move_limit: mapData.move_limit || 6,
    status: mapData.status || 'rascunho',
    round: 1,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await battleSupabase
      .from('battle_maps')
      .insert([newMap])
      .select()
      .single();

    if (!error && data) return data as BattleMap;
  } catch (_) {}

  try {
    const { data, error } = await mainSupabase
      .from('battle_maps' as any)
      .insert([newMap])
      .select()
      .single();

    if (!error && data) return data as unknown as BattleMap;
  } catch (_) {}

  return {
    ...newMap,
    id: `local_${Date.now()}`,
  } as BattleMap;
}

export async function updateBattleMap(
  id: string,
  updates: Partial<BattleMap>,
): Promise<BattleMap> {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await battleSupabase
      .from('battle_maps')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) return data as BattleMap;
  } catch (_) {}

  try {
    const { data, error } = await mainSupabase
      .from('battle_maps' as any)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) return data as unknown as BattleMap;
  } catch (_) {}

  return { id, ...updates } as BattleMap;
}

export async function deleteBattleMap(id: string): Promise<boolean> {
  try {
    await battleSupabase.from('battle_tokens').delete().eq('map_id', id);
    const { error } = await battleSupabase
      .from('battle_maps')
      .delete()
      .eq('id', id);
    if (!error) return true;
  } catch (_) {}

  try {
    await mainSupabase.from('battle_tokens' as any).delete().eq('map_id', id);
    await mainSupabase.from('battle_maps' as any).delete().eq('id', id);
    return true;
  } catch (_) {}

  return true;
}

export async function duplicateBattleMap(id: string): Promise<BattleMap> {
  const maps = await fetchBattleMaps();
  const source = maps.find((m) => m.id === id) || DEFAULT_BATTLE_MAP;

  return createBattleMap({
    ...source,
    name: `${source.name} (Cópia)`,
    status: 'rascunho',
  });
}

export async function setMapLiveStatus(
  id: string,
  isLive: boolean,
): Promise<BattleMap> {
  const newStatus = isLive ? 'ao_vivo' : 'rascunho';

  if (isLive) {
    try {
      await battleSupabase
        .from('battle_maps')
        .update({ status: 'rascunho' })
        .neq('id', id);
    } catch (_) {}
  }

  return updateBattleMap(id, { status: newStatus });
}

// ── 2. TOKENS DA MESA ──

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

export async function createBattleToken(
  tokenData: Partial<BattleToken>,
): Promise<BattleToken> {
  const payload = {
    ...tokenData,
    moves_left: tokenData.moves_left ?? 6,
    visible: tokenData.visible ?? true,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await battleSupabase
      .from('battle_tokens')
      .insert([payload])
      .select()
      .single();

    if (!error && data) return data as BattleToken;
  } catch (_) {}

  try {
    const { data, error } = await mainSupabase
      .from('battle_tokens' as any)
      .insert([payload])
      .select()
      .single();

    if (!error && data) return data as unknown as BattleToken;
  } catch (_) {}

  return {
    ...payload,
    id: `local_tok_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  } as BattleToken;
}

export async function updateBattleToken(
  id: string,
  updates: Partial<BattleToken>,
): Promise<BattleToken> {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await battleSupabase
      .from('battle_tokens')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) return data as BattleToken;
  } catch (_) {}

  try {
    const { data, error } = await mainSupabase
      .from('battle_tokens' as any)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) return data as unknown as BattleToken;
  } catch (_) {}

  return { id, ...updates } as BattleToken;
}

export async function deleteBattleToken(id: string): Promise<boolean> {
  try {
    const { error } = await battleSupabase
      .from('battle_tokens')
      .delete()
      .eq('id', id);
    if (!error) return true;
  } catch (_) {}

  try {
    await mainSupabase.from('battle_tokens' as any).delete().eq('id', id);
    return true;
  } catch (_) {}

  return true;
}

export async function moverTokenRpc(
  tokenId: string,
  c: number,
  r: number,
  path: Array<[number, number]>,
): Promise<boolean> {
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

// ── 3. NOVA RODADA (Restaura movimentos) ──
export async function novaRodadaRPC(
  mapId: string,
): Promise<{ success: boolean; round: number }> {
  try {
    const { data, error } = await battleSupabase.rpc('nova_rodada_batalha', {
      p_map_id: mapId,
    });

    if (!error && data && (data as any).success) {
      return { success: true, round: (data as any).round || 1 };
    }
  } catch (_) {}

  try {
    const map = await fetchActiveBattleMap();
    const nextRound = (map?.round || 1) + 1;

    await updateBattleMap(mapId, { round: nextRound });
    await battleSupabase
      .from('battle_tokens')
      .update({ moves_left: map?.move_limit || 6, updated_at: new Date().toISOString() })
      .eq('map_id', mapId)
      .eq('kind', 'heroi');

    return { success: true, round: nextRound };
  } catch (_) {}

  return { success: true, round: 2 };
}

// ── 4. BUSCA NO CATÁLOGO DO BESTIÁRIO ──
export async function fetchCreatureCatalog(
  search = '',
  limit = 20,
): Promise<any[]> {
  try {
    let query = mainSupabase
      .from('creature_catalog')
      .select('id, name, species, category, size, threat, max_hp, defense, image_url, description')
      .order('name', { ascending: true })
      .limit(limit);

    if (search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) return data;
  } catch (_) {}

  return [
    {
      id: 'tigre_serpente',
      name: 'Tigre-Serpente',
      species: 'Monstruosidade',
      category: 'Fera',
      size: 'Médio',
      threat: 3,
      max_hp: 28,
      defense: 12,
      image_url: '/batalha/fera_idle.webm',
      description: 'Predador silencioso dos pântanos com pele venenosa.',
    },
    {
      id: 'lobo_peste',
      name: 'Lobo da Peste',
      species: 'Besta Corrompida',
      category: 'Fera',
      size: 'Médio',
      threat: 2,
      max_hp: 18,
      defense: 10,
      image_url: '/batalha/fera_idle.webm',
      description: 'Lobo emaciado portador do esporo sombrio.',
    },
    {
      id: 'hidra_venenosa',
      name: 'Hidra Abissal',
      species: 'Monstruosidade',
      category: 'Fera',
      size: 'Grande',
      threat: 5,
      max_hp: 55,
      defense: 14,
      image_url: '/batalha/fera_idle.webm',
      description: 'Ser serpentino com três cabeças que cospem bile pútrida.',
    },
  ];
}
