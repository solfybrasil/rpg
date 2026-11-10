import { type CatKey, type RegionProfile, catKey } from './regions';

/** Campos do catálogo que o mercado usa. */
export interface CatalogLite {
  id: string;
  name: string;
  category: string | null;
  rarity: string | null;
  price_bronze: number | null;
  image_url: string | null;
  icon: string | null;
  description: string | null;
  special: string | null;
  stackable: boolean | null;
  equippable_as: string | null;
  damage_dice: string | null;
  armor_bonus: number | null;
  wear_type: string | null;
  archived: boolean | null;
}

export interface MarketPlace {
  id: string;
  name: string;
  type: string;
  region: string;
}

export interface MarketOverride {
  id: string;
  scope: string;
  catalog_id: string;
  mode: 'sempre' | 'nunca';
  price_bronze: number | null;
  stock: number | null;
}

export interface StockEntry {
  item: CatalogLite;
  price: number;
  stock: number;
  /** Por que o preço é esse (mostrado ao jogador). */
  tag: 'especialidade' | 'escasso' | null;
  /** O Mestre fixou ou ajustou este item. */
  pinned: boolean;
}

export const RARITY_ORDER = ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Artefato', 'Maldito'];

export function rarityIndex(r: string | null | undefined) {
  const i = RARITY_ORDER.findIndex((x) => x.toLowerCase() === String(r ?? 'Comum').toLowerCase());
  return i < 0 ? 0 : i;
}

const RARITY_WEIGHT = [10, 5, 2, 0.6, 0.15, 0, 0.3];

/** Tamanho do mercado pelo tipo do lugar. */
export function marketTier(type: string | null | undefined) {
  switch (type) {
    case 'cap':
      return { size: 40, maxRarity: 3, label: 'Grande mercado' };
    case 'cid':
    case 'por':
      return { size: 28, maxRarity: 2, label: 'Mercado' };
    case 'vil':
      return { size: 16, maxRarity: 1, label: 'Venda' };
    case 'est':
    case 'gui':
    case 'for':
    case 'acp':
      return { size: 10, maxRarity: 1, label: 'Mercador' };
    default:
      return { size: 8, maxRarity: 1, label: 'Mercador ambulante' };
  }
}

export function marketTitle(place: MarketPlace | null) {
  if (!place) return 'Mercador ambulante';
  switch (place.type) {
    case 'cap':
      return `Grande Mercado de ${place.name}`;
    case 'por':
      return `Cais de ${place.name}`;
    case 'cid':
      return `Mercado de ${place.name}`;
    case 'vil':
      return `Venda de ${place.name}`;
    case 'ambulante':
      return 'Mercador ambulante';
    default:
      return `Mercador de ${place.name}`;
  }
}

/** Período do estoque: muda a cada `restockDays` dias do relógio do mundo. */
export function periodOf(minutes: number, restockDays: number, offset = 0) {
  const len = Math.max(60, Math.round(Math.max(0.05, restockDays) * 1440));
  return Math.floor(minutes / len) + offset;
}

/** Minutos do mundo até o próximo estoque. */
export function minutesToRestock(minutes: number, restockDays: number) {
  const len = Math.max(60, Math.round(Math.max(0.05, restockDays) * 1440));
  return len - (minutes % len);
}

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BULK: CatKey[] = ['pocao', 'alquimia', 'comida', 'prato', 'material', 'parte'];
/** Nunca entram no sorteio (só se o Mestre fixar). */
const NEVER: CatKey[] = ['lendaria'];

function roundPrice(p: number) {
  if (p < 20) return Math.max(1, Math.round(p));
  if (p < 200) return Math.round(p);
  return Math.round(p / 5) * 5;
}

function categoryFactor(key: CatKey, profile: RegionProfile) {
  if (profile.specialties.includes(key)) return { price: 0.8, weight: 2.6, tag: 'especialidade' as const };
  if (profile.scarce.includes(key)) return { price: 1.35, weight: 0.35, tag: 'escasso' as const };
  return { price: 1, weight: 1, tag: null };
}

/** Preço de compra deste item neste mercado (sem a variação do dia). */
export function basePrice(item: CatalogLite, profile: RegionProfile, priceMult: number) {
  const f = categoryFactor(catKey(item.category), profile);
  return (Number(item.price_bronze) || 0) * profile.mult * priceMult * f.price;
}

/** Quanto o mercador paga por um item do jogador. */
export function sellOffer(price: number, category: string | null | undefined, profile: RegionProfile, priceMult: number) {
  const base = Math.max(0, Number(price) || 0);
  if (!base) return 0;
  const key = catKey(category);
  const demand = profile.scarce.includes(key) ? 1.5 : profile.specialties.includes(key) ? 0.75 : 1;
  return Math.max(1, Math.round(base * 0.4 * demand * profile.mult * priceMult));
}

function overrideFor(list: MarketOverride[], catalogId: string, place: MarketPlace | null, regionId: string) {
  // O mais específico vence: lugar > região > todos.
  const scopes = [place ? `place:${place.id}` : null, regionId, '*'];
  for (const sc of scopes) {
    if (!sc) continue;
    const o = list.find((x) => x.catalog_id === catalogId && x.scope === sc);
    if (o) return o;
  }
  return null;
}

/**
 * Estoque do mercado: sorteio ponderado e determinístico (mesmo lugar + mesmo
 * período = mesma vitrine para todos), mais os ajustes do Mestre.
 */
export function generateStock(opts: {
  catalog: CatalogLite[];
  place: MarketPlace | null;
  profile: RegionProfile;
  period: number;
  overrides: MarketOverride[];
  priceMult: number;
}): StockEntry[] {
  const { catalog, place, profile, period, overrides, priceMult } = opts;
  const tier = marketTier(place?.type);
  const maxRarity = Math.min(4, tier.maxRarity + profile.rarityBonus);
  const seedKey = `${place?.id ?? `amb:${profile.id}`}#${period}`;
  const rand = mulberry32(hashStr(seedKey));
  const relevant = overrides.filter(
    (o) => o.scope === '*' || o.scope === profile.id || (place && o.scope === `place:${place.id}`),
  );

  // 1) sorteio ponderado sem repetição (Efraimidis–Spirakis)
  const keyed: Array<{ k: number; item: CatalogLite }> = [];
  for (const item of catalog) {
    if (item.archived || !(Number(item.price_bronze) > 0)) continue;
    const ri = rarityIndex(item.rarity);
    const ck = catKey(item.category);
    if (NEVER.includes(ck)) continue;
    if (ri === 6 ? !profile.blackMarket : ri > maxRarity) continue;
    const w = RARITY_WEIGHT[ri] * categoryFactor(ck, profile).weight;
    if (w <= 0) continue;
    keyed.push({ k: rand() ** (1 / w), item });
  }
  keyed.sort((a, b) => b.k - a.k);

  const out = new Map<string, StockEntry>();
  const make = (item: CatalogLite): StockEntry => {
    const ck = catKey(item.category);
    const f = categoryFactor(ck, profile);
    const r = mulberry32(hashStr(`${seedKey}:${item.id}`));
    const variance = 1 + (r() - 0.5) * 0.24;
    const price = roundPrice(basePrice(item, profile, priceMult) * variance);
    const ri = rarityIndex(item.rarity);
    let stock: number;
    if (BULK.includes(ck) || item.stackable) stock = 2 + Math.floor(r() * (tier.size / 3 + (f.tag === 'especialidade' ? 6 : 0)));
    else stock = 1 + (r() < 0.35 ? 1 : 0) + (f.tag === 'especialidade' ? 1 : 0);
    if (ri >= 2) stock = Math.min(stock, ri >= 3 ? 1 : 2);
    return { item, price, stock: Math.max(1, stock), tag: f.tag, pinned: false };
  };

  for (const { item } of keyed) {
    if (out.size >= tier.size) break;
    const o = overrideFor(relevant, item.id, place, profile.id);
    if (o?.mode === 'nunca') continue;
    out.set(item.id, make(item));
  }

  // 2) ajustes do Mestre: itens fixos e preço/estoque escolhidos
  const byId = new Map(catalog.map((c) => [c.id, c]));
  for (const o of relevant) {
    const item = byId.get(o.catalog_id);
    if (!item) continue;
    const top = overrideFor(relevant, o.catalog_id, place, profile.id);
    if (top !== o) continue; // vale só o mais específico
    if (o.mode === 'nunca') {
      out.delete(o.catalog_id);
      continue;
    }
    const e = out.get(o.catalog_id) ?? make(item);
    out.set(o.catalog_id, {
      ...e,
      price: o.price_bronze != null ? Math.max(0, o.price_bronze) : e.price,
      stock: o.stock != null ? Math.max(0, o.stock) : e.stock,
      pinned: true,
    });
  }

  return [...out.values()].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || catKey(a.item.category).localeCompare(catKey(b.item.category)) || a.price - b.price,
  );
}

/** Lugar de mercado mais perto de um ponto (para "onde o grupo está"). */
export function nearestMarket<T extends MarketPlace & { x: number; y: number }>(places: T[], x: number, y: number) {
  let best: T | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const p of places) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best ? { place: best, dist: Math.sqrt(bestD) } : null;
}
