import type { CatalogLite } from '../../market/data/engine';
import { rarityIndex } from '../../market/data/engine';
import { type CatKey, type RegionProfile, catKey } from '../../market/data/regions';

export type ChestTier = 'madeira' | 'ferro' | 'ouro' | 'amaldicoado' | 'lendario';

export interface ChestItem {
  /** Id da linha dentro do baú (o mesmo item pode aparecer duas vezes). */
  key: string;
  catalog_id: string;
  name: string;
  rarity: string | null;
  category: string | null;
  image_url: string | null;
  qty: number;
  /** Reservado para um herói (null = qualquer um). */
  for: string | null;
  /** Herói que já pegou (null = ainda no baú). */
  taken_by: string | null;
}

interface TierInfo {
  nome: string;
  /** Quantos itens o baú traz. */
  items: [number, number];
  /** Peso por raridade: Comum, Incomum, Raro, Épico, Lendário, Artefato, Maldito. */
  weights: [number, number, number, number, number, number, number];
  /** Moedas em bronze. */
  coins: [number, number];
  /** Pelo menos um item desta raridade (índice) ou mais rara. */
  guarantee?: number;
  frase: string;
}

export const TIERS: Record<ChestTier, TierInfo> = {
  madeira: {
    nome: 'Baú de madeira',
    items: [2, 4],
    weights: [10, 4, 0.6, 0, 0, 0, 0],
    coins: [20, 150],
    frase: 'Tábuas gastas e uma fechadura enferrujada.',
  },
  ferro: {
    nome: 'Baú de ferro',
    items: [3, 5],
    weights: [6, 6, 2.5, 0.3, 0, 0, 0],
    coins: [120, 600],
    guarantee: 1,
    frase: 'Cintas de ferro e um cadeado que já resistiu a muita coisa.',
  },
  ouro: {
    nome: 'Baú dourado',
    items: [3, 6],
    weights: [2, 5, 5, 1.6, 0.15, 0, 0],
    coins: [600, 3000],
    guarantee: 2,
    frase: 'Brilha mesmo no escuro. Alguém sentiria falta disto.',
  },
  amaldicoado: {
    nome: 'Baú amaldiçoado',
    items: [2, 4],
    weights: [1, 2, 3, 1.5, 0.2, 0, 4],
    coins: [0, 400],
    guarantee: 6,
    frase: 'Frio ao toque. Sussurra quando ninguém está olhando.',
  },
  lendario: {
    nome: 'Relicário lendário',
    items: [2, 4],
    weights: [0, 1, 4, 3, 1.2, 0, 0],
    coins: [2500, 10000],
    guarantee: 4,
    frase: 'Selado há eras. O ar pesa ao redor dele.',
  },
};

export const TIER_ORDER = Object.keys(TIERS) as ChestTier[];

/** Categorias que fazem sentido num baú (troféus e partes lendárias só se o Mestre puser). */
const NO_LOOT: CatKey[] = ['lendaria', 'trofeu', 'prato'];

function rnd(rand: () => number, [a, b]: [number, number]) {
  return a + Math.floor(rand() * (b - a + 1));
}

let keySeq = 0;
export function newKey() {
  keySeq = (keySeq + 1) % 1e6;
  return `${Date.now().toString(36)}${keySeq.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export function toChestItem(c: CatalogLite, qty = 1): ChestItem {
  return {
    key: newKey(),
    catalog_id: c.id,
    name: c.name,
    rarity: c.rarity,
    category: c.category,
    image_url: c.image_url,
    qty,
    for: null,
    taken_by: null,
  };
}

const BULK: CatKey[] = ['pocao', 'alquimia', 'comida', 'material', 'parte'];

/**
 * Sorteia o conteúdo de um baú. A região (opcional) puxa os itens que ela
 * produz, como no mercado.
 */
export function rollChest(opts: {
  catalog: CatalogLite[];
  tier: ChestTier;
  profile?: RegionProfile | null;
  rand?: () => number;
}): { items: ChestItem[]; coins: number } {
  const { catalog, tier, profile } = opts;
  const rand = opts.rand ?? Math.random;
  const t = TIERS[tier];
  const pool = catalog.filter((c) => !c.archived && !NO_LOOT.includes(catKey(c.category)));
  const weightOf = (c: CatalogLite) => {
    const w = t.weights[rarityIndex(c.rarity)] ?? 0;
    if (!w) return 0;
    const k = catKey(c.category);
    const region = profile ? (profile.specialties.includes(k) ? 2 : profile.scarce.includes(k) ? 0.5 : 1) : 1;
    return w * region;
  };
  const pick = (filter?: (c: CatalogLite) => boolean): CatalogLite | null => {
    let total = 0;
    const cand: Array<[CatalogLite, number]> = [];
    for (const c of pool) {
      if (filter && !filter(c)) continue;
      const w = weightOf(c) || (filter ? 1 : 0);
      if (w > 0) {
        cand.push([c, w]);
        total += w;
      }
    }
    if (!total) return null;
    let x = rand() * total;
    for (const [c, w] of cand) {
      x -= w;
      if (x <= 0) return c;
    }
    return cand[cand.length - 1][0];
  };

  const n = rnd(rand, t.items);
  const chosen: CatalogLite[] = [];
  if (t.guarantee != null) {
    const g = t.guarantee;
    const c = pick((x) => (g === 6 ? rarityIndex(x.rarity) === 6 : rarityIndex(x.rarity) >= g && rarityIndex(x.rarity) <= 4));
    if (c) chosen.push(c);
  }
  for (let i = 0; chosen.length < n && i < n * 6; i++) {
    const c = pick();
    if (c && !chosen.some((x) => x.id === c.id)) chosen.push(c);
  }
  const items = chosen.map((c) => {
    const bulk = BULK.includes(catKey(c.category)) || Boolean(c.stackable);
    return toChestItem(c, bulk ? 1 + Math.floor(rand() * 3) : 1);
  });
  return { items, coins: rnd(rand, t.coins) };
}

/** Troca um item por outro sorteado do mesmo nível do baú. */
export function rerollItem(opts: { catalog: CatalogLite[]; tier: ChestTier; current: ChestItem[]; profile?: RegionProfile | null }) {
  const taken = new Set(opts.current.map((i) => i.catalog_id));
  for (let i = 0; i < 20; i++) {
    const r = rollChest({ ...opts, tier: opts.tier });
    const fresh = r.items.find((x) => !taken.has(x.catalog_id));
    if (fresh) return fresh;
  }
  return null;
}
