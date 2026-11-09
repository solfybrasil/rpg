/**
 * Dados do continente de Aldrenor (geografia + lugares base).
 * O arquivo fica em /public/data/aldrenor.json e só é baixado quando o mapa abre.
 */

export const WORLD_W = 9600;
export const WORLD_H = 6400;
export const TILE_CONST = { OX: -2800, OY: -2800, EXT_W: 15200, EXT_H: 12000, TS: 256, BASE: 0.03125, CELL: 64 };
export const MAX_LEVEL = 10;

export type PlaceType =
  | 'cap' | 'cid' | 'por' | 'vil' | 'for' | 'rui' | 'mas' | 'tem' | 'cov'
  | 'mar' | 'tor' | 'gui' | 'est' | 'fer' | 'min' | 'acp' | 'pon' | 'far';

export interface BasePlace {
  id: number;
  name: string;
  type: PlaceType;
  region: string;
  desc: string;
  x: number;
  y: number;
  visited: boolean;
  major: boolean;
}

export interface Region {
  id: string;
  name: string;
  x: number;
  y: number;
  terrain: string;
  people: string;
}

/** Geografia já descompactada (formato de trabalho do desenhista). */
export interface Geo {
  contours: Array<{ pts: Int32Array; a: number; b: number; c: number; e: number }>;
  grid: string[];
  borders: string;
  roads: string;
  route: string;
  rivers: string[];
  terrain: Array<[string, number, number, number]>;
  compass: [number, number];
  arts: Array<{ k: string; x: number; y: number; s: number; rot: number; r: number }>;
  tints: Array<[string, string]>;
  reglabels: Array<[string, number, number, number, number]>;
  oceans: Array<[string, number, number, number, number]>;
}

export interface AldrenorData {
  geo: Geo;
  places: BasePlace[];
  regions: Region[];
  types: Record<PlaceType, string>;
}

export const TYPE_ORDER: PlaceType[] = [
  'cap', 'cid', 'por', 'vil', 'est', 'gui', 'for', 'tem', 'tor', 'rui', 'mas', 'cov', 'fer', 'mar', 'min', 'acp', 'pon', 'far',
];

export const TYPE_PLURAL: Record<PlaceType, string> = {
  cap: 'Capitais', cid: 'Cidades', por: 'Portos', vil: 'Vilas', gui: 'Guildas', for: 'Fortalezas',
  tem: 'Templos', tor: 'Torres', rui: 'Ruínas', mas: 'Masmorras', cov: 'Covis de dragão', mar: 'Marcos',
  est: 'Estalagens', fer: 'Covis de feras', min: 'Minas', acp: 'Acampamentos', pon: 'Travessias', far: 'Faróis',
};

/** Tipos que contam como "grandes" (sempre com ícone) quando o lugar não tem essa marca salva. */
export const MAJOR_TYPES = new Set<PlaceType>(['cap', 'cid', 'por', 'cov', 'tor', 'gui']);
export const CITY_TYPES = new Set<PlaceType>(['cap', 'cid', 'por']);

function bytes(s: string) {
  const b = atob(s);
  const u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
}

/** Converte o formato compacto do arquivo no formato de trabalho (igual ao original). */
export function unpack(raw: any): Geo {
  const G = raw;
  const T = G.terrain;
  if (T && T.xy) {
    const xy = new Int16Array(bytes(T.xy).buffer);
    const sc = bytes(T.s);
    const out = new Array(T.k.length);
    for (let i = 0; i < out.length; i++) out[i] = [T.kinds[T.k.charCodeAt(i) - 65], xy[i * 2], xy[i * 2 + 1], sc[i] / 100];
    G.terrain = out;
  }
  G.contours = G.contours.map(([t, x0, y0, d, a, b, c, e]: [string, number, number, string, number, number, number, number]) => {
    const rawB = bytes(d);
    const dl = t === 'b' ? new Int8Array(rawB.buffer) : new Int16Array(rawB.buffer);
    const pts = new Int32Array(dl.length + 2);
    pts[0] = x0;
    pts[1] = y0;
    for (let i = 0; i < dl.length; i += 2) {
      pts[i + 2] = pts[i] + dl[i];
      pts[i + 3] = pts[i + 1] + dl[i + 1];
    }
    return { pts, a, b, c, e };
  });
  G.grid = G.grid.map((r: string) => r.replace(/(\d+)([SLM])/g, (_m, n, ch) => ch.repeat(+n)));
  return G as Geo;
}

let cache: Promise<AldrenorData> | null = null;

export function loadAldrenor(): Promise<AldrenorData> {
  if (!cache) {
    cache = fetch('/data/aldrenor.json')
      .then((r) => {
        if (!r.ok) throw new Error(`Mapa não encontrado (HTTP ${r.status})`);
        return r.json();
      })
      .then((d) => ({ geo: unpack(d.geo), places: d.places, regions: d.regions, types: d.types }))
      .catch((err) => {
        cache = null;
        throw err;
      });
  }
  return cache;
}

/** Ponto está em terra? (usa a grade de 64 unidades do mapa) */
export function isLand(geo: Geo, x: number, y: number) {
  const { OX, OY, CELL } = TILE_CONST;
  const row = geo.grid[Math.floor((y - OY) / CELL)];
  const ch = row?.[Math.floor((x - OX) / CELL)] ?? 'S';
  return ch !== 'S';
}
