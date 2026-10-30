import { toast } from 'sonner';
import { subscribeTable, supabase, uploadPublicFile } from '../../../shared/supabase';
import type { Database } from '../../../shared/supabase/types';

export type BattleMapRow = Database['public']['Tables']['battle_maps']['Row'];
export type BattleTokenRow = Database['public']['Tables']['battle_tokens']['Row'];

const MAP_SESSION_CODE = 'BATTLE_MAP';
const TOKEN_SESSION_CODE = 'BATTLE_TOKEN';

// Cache whether native public.battle_maps exists in the main project (ermkaldfvvjgnhgnvcqo)
let useNativeBattleTables: boolean | null = null;

async function detectNativeBattleTables(): Promise<boolean> {
  if (useNativeBattleTables !== null) return useNativeBattleTables;
  const { error } = await supabase.from('battle_maps').select('id').limit(1);
  if (!error) {
    useNativeBattleTables = true;
    return true;
  }
  // PGRST205 = table not yet created in SQL Editor; use dm_notes backing table in ermkaldfvvjgnhgnvcqo
  useNativeBattleTables = false;
  return false;
}

function notifyNetworkError(message: string, retryFn?: () => unknown) {
  toast.error(message, {
    action: retryFn
      ? {
          label: 'Tentar de novo',
          onClick: () => {
            void retryFn();
          },
        }
      : undefined,
  });
}

function parseRowBody<T>(row: {
  id: string;
  body: string | null;
  updated_at: string | null;
}): T | null {
  if (!row?.body) return null;
  try {
    const parsed = JSON.parse(row.body) as T & { id?: string; updated_at?: string | null };
    return {
      ...parsed,
      id: parsed.id || row.id,
      updated_at: parsed.updated_at || row.updated_at,
    };
  } catch {
    return null;
  }
}

export const BATTLE_PROJECT_ID =
  (import.meta.env.VITE_SUPABASE_URL || '').split('//')?.[1]?.split('.')?.[0] || 'supabase';

export function getBattleDatabaseInfo() {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  return {
    projectId: BATTLE_PROJECT_ID,
    url,
    connected: true,
    provider: 'Supabase Cloud (PostgreSQL + Realtime)',
  };
}

export async function checkBattleTablesExist(): Promise<boolean> {
  try {
    await detectNativeBattleTables();
    return true;
  } catch {
    return false;
  }
}

export async function uploadBattleMedia(
  file: File | Blob,
  customPath: string | null = null,
  bucket: 'batalha' | 'midias' | 'items' = 'midias',
): Promise<string> {
  if (!file) throw new Error('Nenhum arquivo fornecido para upload.');
  const fileNameProp = (file as File).name;
  const ext = fileNameProp ? fileNameProp.split('.').pop()?.toLowerCase() || 'png' : 'webm';
  const fileName =
    customPath || `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

  try {
    return await uploadPublicFile({
      bucket,
      path: fileName,
      file,
      contentType: file.type || undefined,
      upsert: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha no upload de mídia';
    notifyNetworkError(`Erro ao enviar mídia para o Storage: ${msg}`, () =>
      uploadBattleMedia(file, customPath, bucket),
    );
    throw err;
  }
}

export async function fetchBattleMaps(): Promise<BattleMapRow[]> {
  if (await detectNativeBattleTables()) {
    const { data, error } = await supabase
      .from('battle_maps')
      .select(
        'id, name, background_url, img_w, img_h, tile_size, origin_x, origin_y, show_grid, blocked, move_limit, status, round, updated_at',
      )
      .order('updated_at', { ascending: false });
    if (error) {
      notifyNetworkError(`Erro ao carregar mesas de batalha: ${error.message}`, fetchBattleMaps);
      throw error;
    }
    return (data || []) as BattleMapRow[];
  }

  const { data, error } = await supabase
    .from('dm_notes')
    .select('id, title, body, updated_at')
    .eq('session_code', MAP_SESSION_CODE)
    .order('updated_at', { ascending: false });

  if (error) {
    notifyNetworkError(`Erro ao carregar mesas de batalha: ${error.message}`, fetchBattleMaps);
    throw error;
  }

  return (data || [])
    .map((r) => parseRowBody<BattleMapRow>(r))
    .filter((m): m is BattleMapRow => m !== null);
}

export async function fetchActiveBattleMap(): Promise<BattleMapRow | null> {
  if (await detectNativeBattleTables()) {
    const { data, error } = await supabase
      .from('battle_maps')
      .select(
        'id, name, background_url, img_w, img_h, tile_size, origin_x, origin_y, show_grid, blocked, move_limit, status, round, updated_at',
      )
      .eq('status', 'ao_vivo')
      .maybeSingle();
    if (error) {
      notifyNetworkError(`Erro ao buscar mesa ao vivo: ${error.message}`, fetchActiveBattleMap);
      throw error;
    }
    return (data as BattleMapRow | null) ?? null;
  }

  const { data, error } = await supabase
    .from('dm_notes')
    .select('id, title, body, updated_at')
    .eq('session_code', MAP_SESSION_CODE)
    .eq('title', 'ao_vivo')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    notifyNetworkError(`Erro ao buscar mesa ao vivo: ${error.message}`, fetchActiveBattleMap);
    throw error;
  }

  return data ? parseRowBody<BattleMapRow>(data) : null;
}

export async function createBattleMap(mapData: Partial<BattleMapRow>): Promise<BattleMapRow> {
  const payload: BattleMapRow = {
    id: mapData.id && mapData.id.length === 36 ? mapData.id : crypto.randomUUID(),
    name: mapData.name || 'Nova Mesa de Batalha',
    background_url: mapData.background_url || '/batalha/santuario.jpg',
    img_w: Number(mapData.img_w) || 1376,
    img_h: Number(mapData.img_h) || 768,
    tile_size: Number(mapData.tile_size) || 86,
    origin_x: Number(mapData.origin_x ?? (mapData.img_w ? Number(mapData.img_w) / 2 : 688)),
    origin_y: Number(mapData.origin_y ?? (mapData.img_h ? Number(mapData.img_h) / 2 : 384)),
    show_grid: mapData.show_grid !== false,
    blocked: Array.isArray(mapData.blocked) ? mapData.blocked : [],
    move_limit: Number(mapData.move_limit ?? 6),
    status: mapData.status || 'rascunho',
    round: Number(mapData.round) || 1,
    updated_at: new Date().toISOString(),
  };

  if (await detectNativeBattleTables()) {
    const { data, error } = await supabase
      .from('battle_maps')
      .insert([payload])
      .select(
        'id, name, background_url, img_w, img_h, tile_size, origin_x, origin_y, show_grid, blocked, move_limit, status, round, updated_at',
      )
      .single();
    if (error) {
      notifyNetworkError(`Erro ao criar mesa de batalha: ${error.message}`, () =>
        createBattleMap(mapData),
      );
      throw error;
    }
    return data as BattleMapRow;
  }

  const { error } = await supabase.from('dm_notes').upsert({
    id: payload.id,
    session_code: MAP_SESSION_CODE,
    title: payload.status || 'rascunho',
    body: JSON.stringify(payload),
    updated_at: payload.updated_at || new Date().toISOString(),
  });

  if (error) {
    notifyNetworkError(`Erro ao criar mesa de batalha: ${error.message}`, () =>
      createBattleMap(mapData),
    );
    throw error;
  }

  return payload;
}

export async function duplicateBattleMap(sourceMapId: string): Promise<BattleMapRow> {
  const allMaps = await fetchBattleMaps();
  const source = allMaps.find((m) => m.id === sourceMapId);
  if (!source) throw new Error('Mesa de origem não encontrada.');

  const tokens = await fetchBattleTokens(sourceMapId);
  const newMap = await createBattleMap({
    ...source,
    id: undefined,
    name: `${source.name} (Cópia)`,
    status: 'rascunho',
  });

  for (const t of tokens) {
    const { id: _id, map_id: _mapId, updated_at: _u, ...rest } = t;
    await createBattleToken({
      ...rest,
      map_id: newMap.id,
    });
  }

  return newMap;
}

export async function updateBattleMap(
  mapId: string,
  updates: Partial<BattleMapRow>,
): Promise<BattleMapRow> {
  const updated_at = new Date().toISOString();

  if (await detectNativeBattleTables()) {
    const { data, error } = await supabase
      .from('battle_maps')
      .update({ ...updates, updated_at })
      .eq('id', mapId)
      .select(
        'id, name, background_url, img_w, img_h, tile_size, origin_x, origin_y, show_grid, blocked, move_limit, status, round, updated_at',
      )
      .single();
    if (error) {
      notifyNetworkError(`Erro ao atualizar mesa: ${error.message}`, () =>
        updateBattleMap(mapId, updates),
      );
      throw error;
    }
    return data as BattleMapRow;
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('dm_notes')
    .select('id, title, body, updated_at')
    .eq('id', mapId)
    .maybeSingle();

  if (fetchErr || !existing) {
    const msg = fetchErr?.message || 'Mesa não encontrada';
    notifyNetworkError(`Erro ao atualizar mesa: ${msg}`, () => updateBattleMap(mapId, updates));
    throw new Error(msg);
  }

  const current = parseRowBody<BattleMapRow>(existing);
  if (!current) throw new Error('Dados da mesa inválidos');

  const merged: BattleMapRow = {
    ...current,
    ...updates,
    id: mapId,
    updated_at,
  };

  const { error } = await supabase
    .from('dm_notes')
    .update({
      title: merged.status || 'rascunho',
      body: JSON.stringify(merged),
      updated_at,
    })
    .eq('id', mapId);

  if (error) {
    notifyNetworkError(`Erro ao salvar mesa: ${error.message}`, () =>
      updateBattleMap(mapId, updates),
    );
    throw error;
  }

  return merged;
}

export async function setMapLiveStatus(mapId: string, makeLive: boolean): Promise<BattleMapRow> {
  if (makeLive) {
    const allMaps = await fetchBattleMaps();
    for (const m of allMaps) {
      if (m.id !== mapId && m.status === 'ao_vivo') {
        await updateBattleMap(m.id, { status: 'rascunho' });
      }
    }
    return updateBattleMap(mapId, { status: 'ao_vivo' });
  }
  return updateBattleMap(mapId, { status: 'rascunho' });
}

export async function deleteBattleMap(mapId: string): Promise<boolean> {
  if (await detectNativeBattleTables()) {
    const { error } = await supabase.from('battle_maps').delete().eq('id', mapId);
    if (error) {
      notifyNetworkError(`Erro ao excluir mesa: ${error.message}`, () => deleteBattleMap(mapId));
      throw error;
    }
    return true;
  }

  await supabase
    .from('dm_notes')
    .delete()
    .eq('session_code', TOKEN_SESSION_CODE)
    .eq('title', mapId);

  const { error } = await supabase.from('dm_notes').delete().eq('id', mapId);
  if (error) {
    notifyNetworkError(`Erro ao excluir mesa: ${error.message}`, () => deleteBattleMap(mapId));
    throw error;
  }
  return true;
}

export async function fetchBattleTokens(mapId: string): Promise<BattleTokenRow[]> {
  if (!mapId) return [];

  if (await detectNativeBattleTables()) {
    const { data, error } = await supabase
      .from('battle_tokens')
      .select(
        'id, map_id, kind, hero_id, beast_id, name, media_url, media_type, chroma, anchor_x, anchor_y, size, facing, c, r, path, move_seq, moves_left, visible, poster_url, idle_mp4_url, idle_webm_url, updated_at',
      )
      .eq('map_id', mapId)
      .order('c', { ascending: true });
    if (error) {
      notifyNetworkError(`Erro ao carregar peças da mesa: ${error.message}`, () =>
        fetchBattleTokens(mapId),
      );
      throw error;
    }
    return (data || []) as BattleTokenRow[];
  }

  const { data, error } = await supabase
    .from('dm_notes')
    .select('id, title, body, updated_at')
    .eq('session_code', TOKEN_SESSION_CODE)
    .eq('title', mapId);

  if (error) {
    notifyNetworkError(`Erro ao carregar peças da mesa: ${error.message}`, () =>
      fetchBattleTokens(mapId),
    );
    throw error;
  }

  return (data || [])
    .map((r) => parseRowBody<BattleTokenRow>(r))
    .filter((t): t is BattleTokenRow => t !== null)
    .sort((a, b) => (a.c ?? 0) - (b.c ?? 0));
}

export async function createBattleToken(
  tokenData: Partial<BattleTokenRow>,
): Promise<BattleTokenRow> {
  if (!tokenData.map_id) throw new Error('map_id é obrigatório para criar peça.');
  const payload: BattleTokenRow = {
    id: tokenData.id && tokenData.id.length === 36 ? tokenData.id : crypto.randomUUID(),
    map_id: tokenData.map_id,
    kind: tokenData.kind || 'heroi',
    hero_id: tokenData.hero_id || null,
    beast_id: tokenData.beast_id || null,
    name: tokenData.name || 'Nova Peça',
    media_url: tokenData.media_url || null,
    media_type: tokenData.media_type || 'video',
    idle_mp4_url: tokenData.idle_mp4_url || null,
    idle_webm_url: tokenData.idle_webm_url || null,
    poster_url: tokenData.poster_url || null,
    chroma: tokenData.chroma || 'verde',
    anchor_x: Number(tokenData.anchor_x ?? 0.5),
    anchor_y: Number(tokenData.anchor_y ?? 0.985),
    size: Number(tokenData.size ?? 160),
    facing: Number(tokenData.facing ?? 1),
    c: Number(tokenData.c ?? 0),
    r: Number(tokenData.r ?? 0),
    path: Array.isArray(tokenData.path) ? tokenData.path : [],
    move_seq: Number(tokenData.move_seq ?? 0),
    moves_left: Number(tokenData.moves_left ?? 6),
    visible: tokenData.visible !== false,
    updated_at: new Date().toISOString(),
  };

  if (await detectNativeBattleTables()) {
    const { data, error } = await supabase
      .from('battle_tokens')
      .insert([payload])
      .select(
        'id, map_id, kind, hero_id, beast_id, name, media_url, media_type, chroma, anchor_x, anchor_y, size, facing, c, r, path, move_seq, moves_left, visible, poster_url, idle_mp4_url, idle_webm_url, updated_at',
      )
      .single();
    if (error) {
      notifyNetworkError(`Erro ao adicionar peça: ${error.message}`, () =>
        createBattleToken(tokenData),
      );
      throw error;
    }
    return data as BattleTokenRow;
  }

  const { error } = await supabase.from('dm_notes').upsert({
    id: payload.id,
    session_code: TOKEN_SESSION_CODE,
    title: payload.map_id,
    body: JSON.stringify(payload),
    updated_at: payload.updated_at || new Date().toISOString(),
  });

  if (error) {
    notifyNetworkError(`Erro ao adicionar peça: ${error.message}`, () =>
      createBattleToken(tokenData),
    );
    throw error;
  }

  return payload;
}

export async function updateBattleToken(
  tokenId: string,
  updates: Partial<BattleTokenRow>,
): Promise<BattleTokenRow> {
  const updated_at = new Date().toISOString();

  if (await detectNativeBattleTables()) {
    const { data, error } = await supabase
      .from('battle_tokens')
      .update({ ...updates, updated_at })
      .eq('id', tokenId)
      .select(
        'id, map_id, kind, hero_id, beast_id, name, media_url, media_type, chroma, anchor_x, anchor_y, size, facing, c, r, path, move_seq, moves_left, visible, poster_url, idle_mp4_url, idle_webm_url, updated_at',
      )
      .single();
    if (error) {
      notifyNetworkError(`Erro ao atualizar peça: ${error.message}`, () =>
        updateBattleToken(tokenId, updates),
      );
      throw error;
    }
    return data as BattleTokenRow;
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('dm_notes')
    .select('id, title, body, updated_at')
    .eq('id', tokenId)
    .maybeSingle();

  if (fetchErr || !existing) {
    const msg = fetchErr?.message || 'Peça não encontrada';
    notifyNetworkError(`Erro ao atualizar peça: ${msg}`, () => updateBattleToken(tokenId, updates));
    throw new Error(msg);
  }

  const current = parseRowBody<BattleTokenRow>(existing);
  if (!current) throw new Error('Dados da peça inválidos');

  const merged: BattleTokenRow = {
    ...current,
    ...updates,
    id: tokenId,
    updated_at,
  };

  const { error } = await supabase
    .from('dm_notes')
    .update({
      title: merged.map_id,
      body: JSON.stringify(merged),
      updated_at,
    })
    .eq('id', tokenId);

  if (error) {
    notifyNetworkError(`Erro ao salvar peça: ${error.message}`, () =>
      updateBattleToken(tokenId, updates),
    );
    throw error;
  }

  return merged;
}

export async function deleteBattleToken(tokenId: string): Promise<boolean> {
  if (await detectNativeBattleTables()) {
    const { error } = await supabase.from('battle_tokens').delete().eq('id', tokenId);
    if (error) {
      notifyNetworkError(`Erro ao remover peça: ${error.message}`, () =>
        deleteBattleToken(tokenId),
      );
      throw error;
    }
    return true;
  }

  const { error } = await supabase.from('dm_notes').delete().eq('id', tokenId);
  if (error) {
    notifyNetworkError(`Erro ao remover peça: ${error.message}`, () => deleteBattleToken(tokenId));
    throw error;
  }
  return true;
}

export async function moverTokenRPC(
  tokenId: string,
  c: number,
  r: number,
  path: Array<{ c: number; r: number }> = [],
  deviceId: string | null = null,
): Promise<{ success: boolean; token: BattleTokenRow }> {
  if (await detectNativeBattleTables()) {
    const { data, error } = await supabase.rpc('mover_token', {
      p_token: tokenId,
      p_c: c,
      p_r: r,
      p_path: path as unknown as Database['public']['Tables']['battle_tokens']['Row']['path'],
      p_device_id: deviceId || undefined,
    });
    if (error) {
      notifyNetworkError(`Movimento inválido: ${error.message}`);
      throw error;
    }
    const resObj = data as { token?: BattleTokenRow } | null;
    return { success: true, token: (resObj?.token || data) as BattleTokenRow };
  }

  // Validate and update atomically on main project
  const { data: tokenRow, error: tErr } = await supabase
    .from('dm_notes')
    .select('id, title, body, updated_at')
    .eq('id', tokenId)
    .maybeSingle();

  if (tErr || !tokenRow) {
    throw new Error('Token não encontrado');
  }
  const token = parseRowBody<BattleTokenRow>(tokenRow);
  if (!token) throw new Error('Token inválido');

  const { data: mapRow } = await supabase
    .from('dm_notes')
    .select('id, title, body, updated_at')
    .eq('id', token.map_id)
    .maybeSingle();

  const map = mapRow ? parseRowBody<BattleMapRow>(mapRow) : null;
  if (!map || map.status !== 'ao_vivo') {
    throw new Error('A mesa de batalha não está ao vivo');
  }

  const stepCount = Array.isArray(path) ? path.length : 0;
  const moveLimit = Number(map.move_limit ?? 6);
  const currentMoves = Number(token.moves_left ?? moveLimit);
  if (moveLimit > 0 && stepCount > currentMoves) {
    throw new Error(`Movimento excede o limite disponível (${stepCount}/${currentMoves})`);
  }

  const updatedToken = await updateBattleToken(tokenId, {
    c,
    r,
    path: path as unknown as BattleTokenRow['path'],
    move_seq: Number(token.move_seq ?? 0) + 1,
    moves_left: moveLimit > 0 ? Math.max(0, currentMoves - stepCount) : currentMoves,
  });

  return { success: true, token: updatedToken };
}

export async function novaRodadaRPC(mapId: string): Promise<{ success: boolean; round: number }> {
  if (await detectNativeBattleTables()) {
    const { data, error } = await supabase.rpc('nova_rodada_batalha', {
      p_map_id: mapId,
    });
    if (error) {
      notifyNetworkError(`Erro ao avançar rodada: ${error.message}`, () => novaRodadaRPC(mapId));
      throw error;
    }
    const resObj = data as { round?: number } | null;
    return { success: true, round: Number(resObj?.round ?? 1) };
  }

  const maps = await fetchBattleMaps();
  const map = maps.find((m) => m.id === mapId);
  if (!map) throw new Error('Mesa não encontrada');

  const nextRound = Number(map.round ?? 1) + 1;
  const moveLimit = Number(map.move_limit ?? 6);
  await updateBattleMap(mapId, { round: nextRound });

  const tokens = await fetchBattleTokens(mapId);
  for (const t of tokens) {
    if (t.kind === 'heroi') {
      await updateBattleToken(t.id, { moves_left: moveLimit });
    }
  }

  return { success: true, round: nextRound };
}

export function subscribeToBattleRealtime(
  mapId: string,
  onMapChange?: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: BattleMapRow;
    old: { id?: string };
  }) => void,
  onTokenChange?: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: BattleTokenRow;
    old: { id?: string };
  }) => void,
): () => void {
  if (!mapId) return () => {};

  // Subscribe to dm_notes on main project (ermkaldfvvjgnhgnvcqo) via shared ref-counted realtime manager
  const unsubNotes = subscribeTable({
    table: 'dm_notes',
    onEvent: (payload) => {
      const newRow = payload.new as {
        id?: string;
        session_code?: string;
        title?: string;
        body?: string;
        updated_at?: string;
      } | null;
      const oldRow = payload.old as { id?: string } | null;

      if (newRow?.session_code === MAP_SESSION_CODE && newRow.id === mapId) {
        const parsed = parseRowBody<BattleMapRow>({
          id: newRow.id,
          body: newRow.body || null,
          updated_at: newRow.updated_at || null,
        });
        if (parsed && onMapChange) {
          onMapChange({
            eventType: payload.eventType,
            new: parsed,
            old: { id: oldRow?.id || newRow.id },
          });
        }
      } else if (newRow?.session_code === TOKEN_SESSION_CODE && newRow.title === mapId) {
        const parsed = parseRowBody<BattleTokenRow>({
          id: newRow.id || '',
          body: newRow.body || null,
          updated_at: newRow.updated_at || null,
        });
        if (parsed && onTokenChange) {
          onTokenChange({
            eventType: payload.eventType,
            new: parsed,
            old: { id: oldRow?.id || newRow.id },
          });
        }
      } else if (payload.eventType === 'DELETE' && oldRow?.id) {
        if (oldRow.id === mapId && onMapChange) {
          onMapChange({
            eventType: 'DELETE',
            new: {} as BattleMapRow,
            old: { id: oldRow.id },
          });
        } else if (onTokenChange) {
          onTokenChange({
            eventType: 'DELETE',
            new: {} as BattleTokenRow,
            old: { id: oldRow.id },
          });
        }
      }
    },
  });

  return unsubNotes;
}

export function subscribeToLiveMapStatus(
  onLiveChange?: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: BattleMapRow;
    old: { id?: string };
  }) => void,
): () => void {
  return subscribeTable({
    table: 'dm_notes',
    onEvent: (payload) => {
      const newRow = payload.new as {
        id?: string;
        session_code?: string;
        body?: string;
        updated_at?: string;
      } | null;
      const oldRow = payload.old as { id?: string } | null;

      if (newRow?.session_code === MAP_SESSION_CODE) {
        const parsed = parseRowBody<BattleMapRow>({
          id: newRow.id || '',
          body: newRow.body || null,
          updated_at: newRow.updated_at || null,
        });
        if (parsed && onLiveChange) {
          onLiveChange({
            eventType: payload.eventType,
            new: parsed,
            old: { id: oldRow?.id || newRow.id },
          });
        }
      } else if (payload.eventType === 'DELETE' && oldRow?.id && onLiveChange) {
        onLiveChange({
          eventType: 'DELETE',
          new: {} as BattleMapRow,
          old: { id: oldRow.id },
        });
      }
    },
  });
}
