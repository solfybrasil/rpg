import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { supabase as mainSupabase } from '../../../shared/supabase/client.ts';
import type { BattleMap, BattleToken } from '../engine/types.ts';

/**
 * Banco da mesa de batalha.
 *
 * Antes, cada leitura/escrita tentava um projeto e caía no outro, e no fim
 * devolvia uma mesa e peças de EXEMPLO fixas no código ("Tigre-Serpente").
 * Resultado: o Mestre "salvava" peças de exemplo (nada ia para o banco) e a TV
 * e os jogadores viam sempre a mesma fera, na mesma posição.
 *
 * Agora: um único banco é escolhido no início e usado por todos (Mestre,
 * jogador e TV); nenhum dado falso; erros sobem para a tela.
 */

// Projeto dedicado da mesa (o mesmo que o código já usava como primário).
const BATTLE_URL =
  (import.meta.env.VITE_BATTLE_SUPABASE_URL as string | undefined) || 'https://ngwexiqejyfsfnhtnrhf.supabase.co';
const BATTLE_KEY =
  (import.meta.env.VITE_BATTLE_SUPABASE_ANON_KEY as string | undefined) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nd2V4aXFlanlmc2ZuaHRucmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDU3NTgsImV4cCI6MjA5MzQ4MTc1OH0.Q8zUGKrQIiuVHskdYrg069h5vlce_L2lSUwb2LgQJUo';

const dedicated: SupabaseClient<any> = createClient(BATTLE_URL, BATTLE_KEY, {
  realtime: { params: { eventsPerSecond: 20 } },
});
const main = mainSupabase as unknown as SupabaseClient<any>;

let chosen: SupabaseClient<any> | null = null;
let dbPromise: Promise<SupabaseClient<any>> | null = null;

async function probe(db: SupabaseClient<any>) {
  const all = await db.from('battle_maps').select('id', { count: 'exact', head: true });
  if (all.error) return { ok: false, maps: 0, live: 0 };
  const live = await db.from('battle_maps').select('id', { count: 'exact', head: true }).eq('status', 'ao_vivo');
  return { ok: true, maps: all.count ?? 0, live: live.count ?? 0 };
}

/**
 * Escolhe UM banco para a mesa, igual para todos os clientes:
 * o que tem mesa ao vivo; senão o que tem mesas; senão o dedicado (o primário
 * de antes); se o dedicado não responder, o principal.
 */
export function getBattleDb(): Promise<SupabaseClient<any>> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const [d, m] = await Promise.all([probe(dedicated), probe(main)]);
      let pick: SupabaseClient<any>;
      if (d.ok && m.ok) {
        if (d.live !== m.live) pick = d.live > m.live ? dedicated : main;
        else if ((d.maps > 0) !== (m.maps > 0)) pick = d.maps > 0 ? dedicated : main;
        else pick = dedicated;
      } else pick = d.ok ? dedicated : main;
      if (!d.ok && !m.ok) console.warn('[mesa] nenhum banco respondeu à tabela battle_maps');
      chosen = pick;
      return pick;
    })();
  }
  return dbPromise;
}

/** Cliente já escolhido (para canais de tempo real); antes da escolha, o dedicado. */
export function battleClient(): SupabaseClient<any> {
  return chosen ?? dedicated;
}

/** @deprecated use battleClient() / getBattleDb() */
export const battleSupabase: SupabaseClient<any> = dedicated;

function fail(what: string, error: { message?: string } | null | undefined): never {
  throw new Error(`${what}: ${error?.message || 'sem resposta do banco'}`);
}

const now = () => new Date().toISOString();

// ── 1. MESAS ──

/** Mesa ao vivo (a mais recente, se houver mais de uma). Sem mesa ao vivo: null. */
export async function fetchActiveBattleMap(): Promise<BattleMap | null> {
  const db = await getBattleDb();
  const { data, error } = await db
    .from('battle_maps')
    .select('*')
    .eq('status', 'ao_vivo')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) fail('Não foi possível ler a mesa ao vivo', error);
  return (data?.[0] as BattleMap) ?? null;
}

export async function fetchBattleMaps(): Promise<BattleMap[]> {
  const db = await getBattleDb();
  const { data, error } = await db.from('battle_maps').select('*').order('updated_at', { ascending: false });
  if (error) fail('Não foi possível ler as mesas', error);
  return (data ?? []) as BattleMap[];
}

export async function createBattleMap(mapData: Partial<BattleMap>): Promise<BattleMap> {
  const db = await getBattleDb();
  const row: Partial<BattleMap> = {
    name: mapData.name || 'Nova Mesa de Batalha',
    background_url: mapData.background_url || '/batalha/santuario.jpg',
    img_w: mapData.img_w || 1376,
    img_h: mapData.img_h || 768,
    tile_size: mapData.tile_size || 86,
    origin_x: mapData.origin_x ?? 690,
    origin_y: mapData.origin_y ?? 418,
    show_grid: mapData.show_grid ?? true,
    blocked: mapData.blocked || [],
    move_limit: mapData.move_limit || 6,
    status: mapData.status || 'rascunho',
    round: mapData.round || 1,
    updated_at: now(),
  };
  const { data, error } = await db.from('battle_maps').insert([row]).select().single();
  if (error || !data) fail('Não foi possível criar a mesa', error);
  return data as BattleMap;
}

export async function updateBattleMap(id: string, updates: Partial<BattleMap>): Promise<BattleMap> {
  const db = await getBattleDb();
  const { id: _ignore, created_at: _c, ...patch } = updates as BattleMap;
  const { data, error } = await db
    .from('battle_maps')
    .update({ ...patch, updated_at: now() })
    .eq('id', id)
    .select();
  if (error) fail('Não foi possível salvar a mesa', error);
  if (!data || data.length === 0) fail('A mesa não existe mais no banco', null);
  return data[0] as BattleMap;
}

export async function deleteBattleMap(id: string): Promise<void> {
  const db = await getBattleDb();
  const { error: e1 } = await db.from('battle_tokens').delete().eq('map_id', id);
  if (e1) fail('Não foi possível apagar as peças da mesa', e1);
  const { error } = await db.from('battle_maps').delete().eq('id', id);
  if (error) fail('Não foi possível apagar a mesa', error);
}

/** Duplica a mesa e também as suas peças. */
export async function duplicateBattleMap(id: string): Promise<BattleMap> {
  const db = await getBattleDb();
  const { data: src, error } = await db.from('battle_maps').select('*').eq('id', id).single();
  if (error || !src) fail('Mesa de origem não encontrada', error);
  const { id: _i, created_at: _c, updated_at: _u, ...rest } = src as BattleMap;
  const copy = await createBattleMap({ ...rest, name: `${src.name} (cópia)`, status: 'rascunho', round: 1 });
  const tokens = await fetchBattleTokens(id);
  if (tokens.length) {
    const rows = tokens.map(({ id: _t, created_at: _tc, ...t }: BattleToken & { created_at?: string }) => ({
      ...t,
      map_id: copy.id,
      path: [],
      updated_at: now(),
    }));
    const { error: te } = await db.from('battle_tokens').insert(rows);
    if (te) fail('Mesa copiada, mas as peças não', te);
  }
  return copy;
}

/** Põe uma mesa ao vivo (as outras voltam a rascunho) ou tira do ar. */
export async function setMapLiveStatus(id: string, isLive: boolean): Promise<BattleMap> {
  const db = await getBattleDb();
  if (isLive) {
    const { error } = await db.from('battle_maps').update({ status: 'rascunho' }).eq('status', 'ao_vivo').neq('id', id);
    if (error) fail('Não foi possível tirar as outras mesas do ar', error);
  }
  return updateBattleMap(id, { status: isLive ? 'ao_vivo' : 'rascunho' });
}

// ── 2. PEÇAS ──

export async function fetchBattleTokens(mapId: string): Promise<BattleToken[]> {
  const db = await getBattleDb();
  const { data, error } = await db.from('battle_tokens').select('*').eq('map_id', mapId);
  if (error) fail('Não foi possível ler as peças', error);
  return (data ?? []) as BattleToken[];
}

export async function createBattleToken(tokenData: Partial<BattleToken>): Promise<BattleToken> {
  const db = await getBattleDb();
  const { hp: _hp, max_hp: _mhp, ...rest } = tokenData;
  const row = {
    ...rest,
    moves_left: tokenData.moves_left ?? 6,
    visible: tokenData.visible ?? true,
    updated_at: now(),
  };
  const { data, error } = await db.from('battle_tokens').insert([row]).select().single();
  if (error || !data) fail('Não foi possível criar a peça', error);
  return data as BattleToken;
}

export async function updateBattleToken(id: string, updates: Partial<BattleToken>): Promise<BattleToken> {
  const db = await getBattleDb();
  const { id: _i, hp: _hp, max_hp: _mhp, ...patch } = updates;
  const { data, error } = await db
    .from('battle_tokens')
    .update({ ...patch, updated_at: now() })
    .eq('id', id)
    .select();
  if (error) fail('Não foi possível salvar a peça', error);
  if (!data || data.length === 0) fail('A peça não existe mais no banco', null);
  return data[0] as BattleToken;
}

/** Colunas de mídia que existem em `battle_tokens` (qualquer outra faz o banco recusar a gravação). */
export const TOKEN_MEDIA_KEYS = [
  'media_url',
  'media_type',
  'chroma',
  'anchor_x',
  'anchor_y',
  'size',
  'facing',
  'poster_url',
  'idle_mp4_url',
  'idle_webm_url',
] as const;

export type TokenMediaPatch = Partial<Pick<BattleToken, (typeof TOKEN_MEDIA_KEYS)[number]>>;

/** Só os campos de mídia válidos (descarta o resto). */
export function pickTokenMedia(src: Record<string, unknown>): TokenMediaPatch {
  const out: Record<string, unknown> = {};
  for (const k of TOKEN_MEDIA_KEYS) if (src[k] !== undefined) out[k] = src[k];
  return out as TokenMediaPatch;
}

/**
 * Grava a mídia numa peça e em todas as peças do mesmo herói/fera (em qualquer mesa), para a
 * próxima mesa já abrir com ela. Cada filtro numa consulta própria: misturar `hero_id` (texto) com
 * `id` (uuid) num `or` faz o banco recusar tudo quando o valor não é um uuid.
 */
export async function applyTokenMedia(
  target: { tokenId: string; heroId?: string | null; beastId?: string | null },
  patch: TokenMediaPatch,
): Promise<BattleToken[]> {
  const db = await getBattleDb();
  const row = { ...pickTokenMedia(patch as Record<string, unknown>), updated_at: now() };
  const runs: Array<PromiseLike<{ data: unknown; error: unknown }>> = [
    db.from('battle_tokens').update(row).eq('id', target.tokenId).select(),
  ];
  if (target.heroId) runs.push(db.from('battle_tokens').update(row).eq('hero_id', target.heroId).select());
  else if (target.beastId) runs.push(db.from('battle_tokens').update(row).eq('beast_id', target.beastId).select());
  const results = await Promise.all(runs);
  const first = results[0];
  if (first.error) fail('Não foi possível salvar a mídia da peça', first.error);
  const byId = new Map<string, BattleToken>();
  for (const r of results) for (const t of ((r.data as BattleToken[] | null) ?? [])) byId.set(t.id, t);
  if (!byId.has(target.tokenId)) fail('A peça não existe mais no banco', null);
  return [...byId.values()];
}

/** Mesma gravação, sem peça de referência (ex.: Bestiário atualizando as peças de uma fera). */
export async function applyOwnerMedia(owner: { heroId?: string; beastId?: string }, patch: TokenMediaPatch): Promise<BattleToken[]> {
  const db = await getBattleDb();
  const col = owner.heroId ? 'hero_id' : 'beast_id';
  const val = owner.heroId ?? owner.beastId;
  if (!val) return [];
  const { data, error } = await db
    .from('battle_tokens')
    .update({ ...pickTokenMedia(patch as Record<string, unknown>), updated_at: now() })
    .eq(col, val)
    .select();
  if (error) fail('Não foi possível atualizar as peças desta fera', error);
  return (data ?? []) as BattleToken[];
}

/** Última mídia salva para um herói ou fera (para a peça já entrar na mesa com ela). */
export async function fetchLatestTokenMedia(owner: { heroId?: string; beastId?: string }): Promise<TokenMediaPatch | null> {
  const db = await getBattleDb();
  const col = owner.heroId ? 'hero_id' : 'beast_id';
  const val = owner.heroId ?? owner.beastId;
  if (!val) return null;
  const { data, error } = await db
    .from('battle_tokens')
    .select(TOKEN_MEDIA_KEYS.join(', '))
    .eq(col, val)
    .not('media_url', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error || !data?.length) return null;
  return pickTokenMedia(data[0] as unknown as Record<string, unknown>);
}

export async function deleteBattleToken(id: string): Promise<void> {
  const db = await getBattleDb();
  const { error } = await db.from('battle_tokens').delete().eq('id', id);
  if (error) fail('Não foi possível remover a peça', error);
}

/** Movimento do jogador: RPC (valida passos no servidor) ou, se não existir, update direto. */
export async function moverTokenRpc(
  tokenId: string,
  c: number,
  r: number,
  path: Array<[number, number]>,
  currentMovesLeft?: number,
): Promise<boolean> {
  const db = await getBattleDb();
  const { data, error } = await db.rpc('mover_token', { p_token: tokenId, p_c: c, p_r: r, p_path: path });
  if (!error && (data as { success?: boolean } | null)?.success !== false) return true;

  await updateBattleToken(tokenId, {
    c,
    r,
    path,
    moves_left: Math.max(0, (currentMovesLeft ?? 6) - path.length),
  });
  return true;
}

/** Nova rodada: RPC ou, se não existir, incrementa a rodada e restaura os passos. */
export async function novaRodadaRPC(mapId: string): Promise<{ success: boolean; round: number }> {
  const db = await getBattleDb();
  const { data, error } = await db.rpc('nova_rodada_batalha', { p_map_id: mapId });
  if (!error && (data as { success?: boolean })?.success) {
    return { success: true, round: (data as { round?: number }).round || 1 };
  }

  const { data: map, error: me } = await db.from('battle_maps').select('round, move_limit').eq('id', mapId).single();
  if (me || !map) fail('Mesa não encontrada', me);
  const round = Number(map.round || 1) + 1;
  await updateBattleMap(mapId, { round });
  const { error: te } = await db
    .from('battle_tokens')
    .update({ moves_left: map.move_limit || 6, updated_at: now() })
    .eq('map_id', mapId);
  if (te) fail('Rodada avançada, mas os passos não foram restaurados', te);
  return { success: true, round };
}

// ── 3. BESTIÁRIO ──

export async function fetchCreatureCatalog(search = '', limit = 20): Promise<any[]> {
  let query = mainSupabase
    .from('creature_catalog')
    .select('id, name, species, category, size, threat, max_hp, defense, image_url, description')
    .order('name', { ascending: true })
    .limit(limit);
  if (search.trim()) query = query.ilike('name', `%${search.trim()}%`);
  const { data, error } = await query;
  if (error) {
    console.warn('[mesa] bestiário indisponível:', error.message);
    return [];
  }
  return data ?? [];
}
