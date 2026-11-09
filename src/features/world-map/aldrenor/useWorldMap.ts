import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { subscribeRealtime, supabase } from '../../../shared/supabase';
import { type AldrenorData, type BasePlace, MAJOR_TYPES, type PlaceType, loadAldrenor } from './data';

export const MAP_SESSION = 'MESA';
const db = supabase as any;

/** Lugar como a tela usa (banco ou mapa base). */
export interface WorldPlace {
  id: string;
  name: string;
  type: PlaceType;
  region: string;
  x: number;
  y: number;
  descPublic: string;
  descSecret: string | null;
  /** Visível para os jogadores. */
  discovered: boolean;
  visited: boolean;
  major: boolean;
  /** Ainda é o lugar do mapa base (antes de importar para o banco). */
  isBase: boolean;
}

export interface MapStateRow {
  party_x: number | null;
  party_y: number | null;
  route: Array<[number, number]> | null;
  ping: unknown;
}

export interface MapPinRow {
  id: string;
  player_id: string;
  x: number;
  y: number;
  note: string | null;
}

const K = {
  geo: ['world-map', 'aldrenor'] as const,
  places: (role: string) => ['world-map', 'places', role] as const,
  regions: ['world-map', 'regions'] as const,
  state: ['world-map', 'state'] as const,
  pins: ['world-map', 'pins'] as const,
};

/**
 * O mapa antigo tinha 2400×1600; o de Aldrenor tem 9600×6400 (4×).
 * Registros gravados pelo mapa antigo (antes da troca) ficam na escala velha.
 */
const LEGACY = { w: 2400, h: 1600, scale: 4, cutoff: Date.parse('2026-11-09T18:00:00Z') };
function isLegacyTime(ts: unknown) {
  if (!ts) return true;
  const t = Date.parse(String(ts));
  return Number.isNaN(t) || t < LEGACY.cutoff;
}
function inOldBounds(x: unknown, y: unknown) {
  const nx = Number(x);
  const ny = Number(y);
  return Number.isFinite(nx) && Number.isFinite(ny) && nx <= LEGACY.w && ny <= LEGACY.h;
}

function fromBase(p: BasePlace): WorldPlace {
  return {
    id: `base-${p.id}`,
    name: p.name,
    type: p.type,
    region: p.region,
    x: p.x,
    y: p.y,
    descPublic: p.desc,
    descSecret: null,
    discovered: true,
    visited: p.visited,
    major: p.major,
    isBase: true,
  };
}

function fromRow(r: any, majorNames: Set<string>): WorldPlace {
  const type = (r.type || 'mar') as PlaceType;
  return {
    id: r.id,
    name: r.name,
    type,
    region: r.region_id,
    x: Number(r.x),
    y: Number(r.y),
    descPublic: r.desc_public || '',
    descSecret: r.desc_secret ?? null,
    discovered: r.discovered !== false,
    visited: Boolean(r.visited),
    major: MAJOR_TYPES.has(type) || majorNames.has(r.name),
    isBase: false,
  };
}

/** Geografia + lugares base (arquivo estático, uma vez por sessão). */
export function useAldrenorData() {
  return useQuery<AldrenorData>({ queryKey: K.geo, queryFn: loadAldrenor, staleTime: Number.POSITIVE_INFINITY, gcTime: Number.POSITIVE_INFINITY });
}

export function useWorldMap(role: 'player' | 'dm') {
  const qc = useQueryClient();
  const geo = useAldrenorData();
  const cols =
    role === 'dm'
      ? '*'
      : 'id, session_code, name, type, region_id, x, y, desc_public, discovered, visited, created_at, updated_at';

  const placesQ = useQuery({
    queryKey: K.places(role),
    queryFn: async () => {
      const { data, error } = await db.from('map_places').select(cols).eq('session_code', MAP_SESSION).limit(5000);
      if (error) throw new Error(`Não foi possível ler os lugares: ${error.message}`);
      return (data ?? []) as any[];
    },
    staleTime: 10_000,
    refetchInterval: 20_000,
  });

  const regionsQ = useQuery({
    queryKey: K.regions,
    queryFn: async () => {
      const { data, error } = await db.from('map_regions').select('region_id, discovered').eq('session_code', MAP_SESSION);
      if (error) return [];
      return (data ?? []) as Array<{ region_id: string; discovered: boolean | null }>;
    },
    staleTime: 10_000,
    refetchInterval: 20_000,
  });

  const stateQ = useQuery({
    queryKey: K.state,
    queryFn: async () => {
      const { data, error } = await db.from('map_state').select('party_x, party_y, route, ping').eq('session_code', MAP_SESSION).maybeSingle();
      if (error) return null;
      return (data ?? null) as MapStateRow | null;
    },
    staleTime: 3_000,
    refetchInterval: 6_000,
  });

  const pinsQ = useQuery({
    queryKey: K.pins,
    queryFn: async () => {
      const { data, error } = await db.from('map_pins').select('id, player_id, x, y, note').eq('session_code', MAP_SESSION);
      if (error) return [];
      return (data ?? []) as MapPinRow[];
    },
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

  // Tempo real: qualquer mudança nas tabelas do mapa recarrega a parte afetada.
  useEffect(() => {
    const subs = [
      subscribeRealtime({ topic: 'wm_places', table: 'map_places', handler: () => void qc.invalidateQueries({ queryKey: ['world-map', 'places'] }) }),
      subscribeRealtime({ topic: 'wm_regions', table: 'map_regions', handler: () => void qc.invalidateQueries({ queryKey: K.regions }) }),
      subscribeRealtime({ topic: 'wm_state', table: 'map_state', handler: () => void qc.invalidateQueries({ queryKey: K.state }) }),
      subscribeRealtime({ topic: 'wm_pins', table: 'map_pins', handler: () => void qc.invalidateQueries({ queryKey: K.pins }) }),
    ];
    return () => subs.forEach((u) => u());
  }, [qc]);

  const majorNames = useMemo(() => new Set((geo.data?.places ?? []).filter((p) => p.major).map((p) => p.name)), [geo.data]);

  const usingBase = (placesQ.data?.length ?? 0) === 0;
  const places = useMemo<WorldPlace[]>(() => {
    if (!geo.data) return [];
    if (usingBase) return geo.data.places.map(fromBase);
    return (placesQ.data ?? []).map((r) => fromRow(r, majorNames));
  }, [geo.data, usingBase, placesQ.data, majorNames]);

  /** Lugares do mapa base que ainda não estão no banco (mesmo nome ou mesmo ponto). */
  const missingBase = useMemo<BasePlace[]>(() => {
    if (!geo.data || usingBase) return [];
    const rows = placesQ.data ?? [];
    const names = new Set(rows.map((r) => String(r.name ?? '').trim().toLowerCase()));
    const spots = new Set(rows.map((r) => `${Math.round(Number(r.x) / 4)},${Math.round(Number(r.y) / 4)}`));
    return geo.data.places.filter(
      (p) => !names.has(p.name.trim().toLowerCase()) && !spots.has(`${Math.round(p.x / 4)},${Math.round(p.y / 4)}`),
    );
  }, [geo.data, usingBase, placesQ.data]);

  /** Lugares gravados pelo mapa antigo, ainda na escala velha (só o Mestre corrige). */
  const legacyPlaces = useMemo(
    () =>
      role === 'dm'
        ? (placesQ.data ?? []).filter((r) => inOldBounds(r.x, r.y) && isLegacyTime(r.updated_at ?? r.created_at))
        : [],
    [role, placesQ.data],
  );

  const hiddenRegions = useMemo(
    () => new Set((regionsQ.data ?? []).filter((r) => r.discovered === false).map((r) => r.region_id)),
    [regionsQ.data],
  );

  return {
    geo,
    places,
    usingBase,
    missingBase,
    legacyPlaces,
    rawPlaces: (placesQ.data ?? []) as any[],
    dbCount: placesQ.data?.length ?? 0,
    loading: geo.isLoading || placesQ.isLoading,
    error: (geo.error || placesQ.error) as Error | null,
    hiddenRegions,
    state: stateQ.data ?? null,
    pins: pinsQ.data ?? [],
  };
}

function toRow(p: Partial<WorldPlace>) {
  const row: Record<string, unknown> = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.type !== undefined) row.type = p.type;
  if (p.region !== undefined) row.region_id = p.region;
  if (p.x !== undefined) row.x = Math.round(p.x);
  if (p.y !== undefined) row.y = Math.round(p.y);
  if (p.descPublic !== undefined) row.desc_public = p.descPublic;
  if (p.descSecret !== undefined) row.desc_secret = p.descSecret;
  if (p.discovered !== undefined) row.discovered = p.discovered;
  if (p.visited !== undefined) row.visited = p.visited;
  return row;
}

function report(prefix: string) {
  return (err: unknown) => toast.error(`${prefix}: ${err instanceof Error ? err.message : 'erro'}`);
}

/** Ações do Mestre (todas otimistas: a tela muda na hora e volta se o banco recusar). */
export function useWorldMapActions() {
  const qc = useQueryClient();
  const pk = K.places('dm');

  const patchRows = (fn: (rows: any[]) => any[]) => {
    const prev = qc.getQueryData<any[]>(pk);
    qc.setQueryData<any[]>(pk, (rows) => fn(rows ?? []));
    return prev;
  };

  const updatePlace = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<WorldPlace> }) => {
      const { error } = await db.from('map_places').update({ ...toRow(patch), updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onMutate: ({ id, patch }) => ({ prev: patchRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...toRow(patch) } : r))) }),
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(pk, ctx.prev);
      report('Não foi possível salvar o lugar')(err);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['world-map', 'places'] }),
  });

  const createPlace = useMutation({
    mutationFn: async (p: Omit<WorldPlace, 'id' | 'isBase' | 'major'>) => {
      const { data, error } = await db
        .from('map_places')
        .insert({ session_code: MAP_SESSION, ...toRow(p) })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      qc.setQueryData<any[]>(pk, (rows) => [...(rows ?? []), row]);
      void qc.invalidateQueries({ queryKey: ['world-map', 'places'] });
    },
    onError: report('Não foi possível criar o lugar'),
  });

  const deletePlace = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('map_places').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: (id) => ({ prev: patchRows((rows) => rows.filter((r) => r.id !== id)) }),
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(pk, ctx.prev);
      report('Não foi possível apagar o lugar')(err);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['world-map', 'places'] }),
  });

  /** Copia os lugares do mapa base para o banco (só uma vez), para poder editar tudo. */
  const importBase = useMutation({
    mutationFn: async (base: BasePlace[]) => {
      const rows = base.map((p) => ({
        session_code: MAP_SESSION,
        name: p.name,
        type: p.type,
        region_id: p.region,
        x: Math.round(p.x),
        y: Math.round(p.y),
        desc_public: p.desc,
        discovered: true,
        visited: p.visited,
      }));
      for (let i = 0; i < rows.length; i += 250) {
        const { error } = await db.from('map_places').insert(rows.slice(i, i + 250));
        if (error) throw new Error(`Importação parou em ${i} de ${rows.length}: ${error.message}`);
      }
      return rows.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} lugares adicionados ao banco. Agora você pode editar tudo.`);
      void qc.invalidateQueries({ queryKey: ['world-map', 'places'] });
    },
    onError: report('Falha ao importar'),
  });

  const setRegionVisible = useMutation({
    mutationFn: async ({ region, visible }: { region: string; visible: boolean }) => {
      const { error } = await db
        .from('map_regions')
        .upsert({ session_code: MAP_SESSION, region_id: region, discovered: visible }, { onConflict: 'session_code,region_id' });
      if (error) throw error;
    },
    onMutate: ({ region, visible }) => {
      const prev = qc.getQueryData<any[]>(K.regions);
      qc.setQueryData<any[]>(K.regions, (rows) => [
        ...(rows ?? []).filter((r) => r.region_id !== region),
        { region_id: region, discovered: visible },
      ]);
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(K.regions, ctx.prev);
      report('Não foi possível mudar a região')(err);
    },
  });

  const updateState = useMutation({
    mutationFn: async (patch: Partial<MapStateRow>) => {
      const { error } = await db
        .from('map_state')
        .upsert({ session_code: MAP_SESSION, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'session_code' });
      if (error) throw error;
    },
    onMutate: (patch) => {
      const prev = qc.getQueryData<MapStateRow | null>(K.state);
      qc.setQueryData<MapStateRow | null>(K.state, (s) => ({ party_x: null, party_y: null, route: null, ping: null, ...(s ?? {}), ...patch }));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      qc.setQueryData(K.state, ctx?.prev ?? null);
      report('Não foi possível salvar o mapa')(err);
    },
  });

  /**
   * Converte o que o mapa antigo gravou para a escala nova: lugares (para a
   * posição do mapa base quando o nome bate, senão ×4; duplicados são
   * apagados), posição do grupo, rota e alfinetes antigos.
   */
  const fixLegacy = useMutation({
    mutationFn: async ({ legacy, all, base }: { legacy: any[]; all: any[]; base: BasePlace[] }) => {
      const legacyIds = new Set(legacy.map((r) => r.id));
      const keyOf = (n: unknown) => String(n ?? '').trim().toLowerCase();
      const modern = new Set(all.filter((r) => !legacyIds.has(r.id)).map((r) => keyOf(r.name)));
      const byName = new Map(base.map((b) => [keyOf(b.name), b]));
      let moved = 0;
      let removed = 0;
      const jobs = legacy.map((r) => async () => {
        if (modern.has(keyOf(r.name))) {
          const { error } = await db.from('map_places').delete().eq('id', r.id);
          if (error) throw error;
          removed++;
          return;
        }
        const b = byName.get(keyOf(r.name));
        const x = b ? Math.round(b.x) : Math.round(Number(r.x) * LEGACY.scale);
        const y = b ? Math.round(b.y) : Math.round(Number(r.y) * LEGACY.scale);
        const { error } = await db
          .from('map_places')
          .update({ x, y, updated_at: new Date().toISOString() })
          .eq('id', r.id);
        if (error) throw error;
        moved++;
      });
      for (let i = 0; i < jobs.length; i += 20) await Promise.all(jobs.slice(i, i + 20).map((j) => j()));

      // Grupo e rota
      const st = await db.from('map_state').select('*').eq('session_code', MAP_SESSION).maybeSingle();
      const row = st.data as any;
      if (!st.error && row && isLegacyTime(row.updated_at)) {
        const patch: Record<string, unknown> = {};
        if (row.party_x != null && inOldBounds(row.party_x, row.party_y)) {
          patch.party_x = Math.round(Number(row.party_x) * LEGACY.scale);
          patch.party_y = Math.round(Number(row.party_y) * LEGACY.scale);
        }
        if (Array.isArray(row.route) && row.route.length && row.route.every((p: any) => Array.isArray(p) && inOldBounds(p[0], p[1]))) {
          patch.route = row.route.map((p: number[]) => [Math.round(p[0] * LEGACY.scale), Math.round(p[1] * LEGACY.scale)]);
        }
        if (Object.keys(patch).length) {
          await db.from('map_state').update({ ...patch, updated_at: new Date().toISOString() }).eq('session_code', MAP_SESSION);
        }
      }

      // Alfinetes
      const pins = await db.from('map_pins').select('*').eq('session_code', MAP_SESSION);
      if (!pins.error) {
        for (const pin of (pins.data ?? []) as any[]) {
          if (!inOldBounds(pin.x, pin.y) || !isLegacyTime(pin.created_at)) continue;
          await db
            .from('map_pins')
            .update({ x: Math.round(Number(pin.x) * LEGACY.scale), y: Math.round(Number(pin.y) * LEGACY.scale) })
            .eq('id', pin.id);
        }
      }
      return { moved, removed };
    },
    onSuccess: ({ moved, removed }) => {
      toast.success(
        `Mapa antigo convertido: ${moved} ${moved === 1 ? 'lugar corrigido' : 'lugares corrigidos'}` +
          (removed ? `, ${removed} ${removed === 1 ? 'duplicado apagado' : 'duplicados apagados'}.` : '.'),
      );
      for (const key of [['world-map', 'places'], K.state, K.pins]) void qc.invalidateQueries({ queryKey: key });
    },
    onError: (err) => {
      void qc.invalidateQueries({ queryKey: ['world-map', 'places'] });
      report('Não foi possível corrigir os lugares antigos')(err);
    },
  });

  /** Acrescenta um ponto à rota lendo o cache atual (cliques rápidos não se perdem). */
  const appendRoute = (pt: [number, number]) => {
    const cur = qc.getQueryData<MapStateRow | null>(K.state)?.route ?? [];
    updateState.mutate({ route: [...cur, pt] });
  };

  const createPin = useMutation({
    mutationFn: async (pin: { player_id: string; x: number; y: number; note: string }) => {
      const { data, error } = await db.from('map_pins').insert({ session_code: MAP_SESSION, ...pin }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => qc.setQueryData<MapPinRow[]>(K.pins, (rows) => [...(rows ?? []), row]),
    onError: report('Não foi possível criar o alfinete'),
  });

  const deletePin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('map_pins').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: (id) => {
      const prev = qc.getQueryData<MapPinRow[]>(K.pins);
      qc.setQueryData<MapPinRow[]>(K.pins, (rows) => (rows ?? []).filter((r) => r.id !== id));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(K.pins, ctx.prev);
      report('Não foi possível remover o alfinete')(err);
    },
  });

  return { updatePlace, createPlace, deletePlace, importBase, setRegionVisible, updateState, appendRoute, fixLegacy, createPin, deletePin };
}
