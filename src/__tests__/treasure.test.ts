import { describe, expect, it } from 'vitest';
import { chestUrl, fxUrl, parseSpecial } from '../features/battle-map/engine/FxSprite';
import type { CatalogLite } from '../features/market/data/engine';
import { REGION_PROFILES } from '../features/market/data/regions';
import { TIERS, rerollItem, rollChest } from '../features/treasure/data/loot';
import { FX_LIST } from '../vendor/pixelfx/catalog';

const rars = ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Maldito'];
const cats = ['Arma', 'Armadura', 'Poção', 'Material', 'Tesouro', 'Troféu'];
const catalog: CatalogLite[] = Array.from({ length: 300 }, (_, i) => ({
  id: `c${i}`,
  name: `Item ${i}`,
  category: cats[i % cats.length],
  rarity: rars[Math.floor(i / cats.length) % rars.length],
  price_bronze: 10,
  image_url: null,
  icon: null,
  description: null,
  special: null,
  stackable: null,
  equippable_as: null,
  damage_dice: null,
  armor_bonus: null,
  wear_type: null,
  archived: i % 50 === 0,
}));

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1103515245 + 12345) % 2147483648;
    return a / 2147483648;
  };
}

describe('Baús de tesouro', () => {
  it('respeita quantidade, moedas e raridades de cada tipo', () => {
    for (const tier of Object.keys(TIERS) as Array<keyof typeof TIERS>) {
      for (let s = 1; s < 30; s++) {
        const { items, coins } = rollChest({ catalog, tier, rand: seeded(s) });
        const t = TIERS[tier];
        expect(items.length).toBeGreaterThanOrEqual(1);
        expect(items.length).toBeLessThanOrEqual(t.items[1]);
        expect(coins).toBeGreaterThanOrEqual(t.coins[0]);
        expect(coins).toBeLessThanOrEqual(t.coins[1]);
        expect(new Set(items.map((i) => i.catalog_id)).size).toBe(items.length);
        for (const it of items) {
          expect(it.taken_by).toBeNull();
          expect(it.category).not.toBe('Troféu');
          expect(catalog.find((c) => c.id === it.catalog_id)?.archived).toBe(false);
        }
      }
    }
  });

  it('baú de madeira não traz épico nem lendário; relicário garante raridade alta', () => {
    for (let s = 1; s < 40; s++) {
      const m = rollChest({ catalog, tier: 'madeira', rand: seeded(s) });
      expect(m.items.every((i) => ['Comum', 'Incomum', 'Raro'].includes(String(i.rarity)))).toBe(true);
      const l = rollChest({ catalog, tier: 'lendario', rand: seeded(s) });
      expect(l.items.some((i) => i.rarity === 'Lendário')).toBe(true);
      const a = rollChest({ catalog, tier: 'amaldicoado', rand: seeded(s) });
      expect(a.items.some((i) => i.rarity === 'Maldito')).toBe(true);
    }
  });

  it('a região puxa o que ela produz', () => {
    const bib = REGION_PROFILES.bib; // armas e armaduras
    let favored = 0;
    let total = 0;
    for (let s = 1; s < 60; s++) {
      for (const it of rollChest({ catalog, tier: 'ferro', profile: bib, rand: seeded(s) }).items) {
        total++;
        if (it.category === 'Arma' || it.category === 'Armadura') favored++;
      }
    }
    expect(favored / total).toBeGreaterThan(0.4);
  });

  it('trocar um item traz outro que ainda não está no baú', () => {
    const r = rollChest({ catalog, tier: 'ferro', rand: seeded(3) });
    const n = rerollItem({ catalog, tier: 'ferro', current: r.items });
    expect(n).not.toBeNull();
    expect(r.items.some((i) => i.catalog_id === n?.catalog_id)).toBe(false);
  });
});

describe('Peças especiais do mapa', () => {
  it('efeito e baú vão e voltam pelo endereço da peça', () => {
    expect(parseSpecial(fxUrl('fire/campfire'))).toEqual({ kind: 'fx', id: 'fire/campfire', scale: 1, repeat: true, every: 0 });
    expect(parseSpecial(fxUrl('lightning/zap-hit', { scale: 2.5, every: 4 }))).toMatchObject({ scale: 2.5, every: 4 });
    expect(parseSpecial(chestUrl('abc'))).toEqual({ kind: 'bau', chestId: 'abc', opened: false });
    expect(parseSpecial(chestUrl('abc', true))).toMatchObject({ opened: true });
    expect(parseSpecial('/batalha/fera_idle.webm')).toBeNull();
    expect(parseSpecial(null)).toBeNull();
  });

  it('catálogo de efeitos em português, sem repetição', () => {
    expect(FX_LIST.length).toBeGreaterThan(100);
    expect(new Set(FX_LIST.map((f) => f.id)).size).toBe(FX_LIST.length);
    expect(FX_LIST.every((f) => f.nome.length > 2 && f.w > 0 && f.h > 0)).toBe(true);
  });
});
