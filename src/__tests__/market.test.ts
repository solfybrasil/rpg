import { describe, expect, it } from 'vitest';
import {
  type CatalogLite,
  generateStock,
  marketTier,
  minutesToRestock,
  nearestMarket,
  periodOf,
  sellOffer,
} from '../features/market/data/engine';
import { REGION_PROFILES, catKey, regionProfile } from '../features/market/data/regions';

const cats = ['Arma', 'Armadura', 'Poção', 'Alquimia', 'Comida', 'Material', 'Ferramenta', 'Tesouro', 'Parte de criatura lendária'];
const rars = ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Maldito'];
const catalog: CatalogLite[] = [];
for (let i = 0; i < 600; i++) {
  catalog.push({
    id: `i${i}`,
    name: `Item ${i}`,
    category: cats[i % cats.length],
    rarity: rars[Math.floor(i / cats.length) % rars.length],
    price_bronze: 10 + (i % 50) * 10,
    image_url: null,
    icon: null,
    description: null,
    special: null,
    stackable: null,
    equippable_as: null,
    damage_dice: null,
    armor_bonus: null,
    wear_type: null,
    archived: i % 97 === 0,
  });
}
const lyssandre = { id: 'p1', name: 'Lyssandre', type: 'cap', region: 'brumas' };
const vila = { id: 'p2', name: 'Vila', type: 'vil', region: 'valdoria' };
const base = { catalog, overrides: [], priceMult: 1 };

describe('Mercado por região', () => {
  it('mesmo lugar e período dão a mesma vitrine; outro período muda', () => {
    const a = generateStock({ ...base, place: lyssandre, profile: regionProfile('brumas'), period: 10 });
    const b = generateStock({ ...base, place: lyssandre, profile: regionProfile('brumas'), period: 10 });
    const c = generateStock({ ...base, place: lyssandre, profile: regionProfile('brumas'), period: 11 });
    expect(a.map((e) => [e.item.id, e.price, e.stock])).toEqual(b.map((e) => [e.item.id, e.price, e.stock]));
    expect(a.map((e) => e.item.id)).not.toEqual(c.map((e) => e.item.id));
    expect(a).toHaveLength(marketTier('cap').size);
  });

  it('vila é menor e não passa de Incomum; arquivados e lendárias nunca aparecem', () => {
    const s = generateStock({ ...base, place: vila, profile: regionProfile('valdoria'), period: 1 });
    expect(s).toHaveLength(marketTier('vil').size);
    for (const e of s) {
      expect(['Comum', 'Incomum']).toContain(e.item.rarity);
      expect(e.item.archived).toBe(false);
      expect(catKey(e.item.category)).not.toBe('lendaria');
    }
  });

  it('especialidade da região sai mais barata que o que é escasso', () => {
    const p = REGION_PROFILES.bib; // forja: armas baratas, alquimia cara
    let cheap = 0;
    let pricey = 0;
    for (let period = 0; period < 30; period++) {
      for (const e of generateStock({ ...base, place: lyssandre, profile: p, period })) {
        const ratio = e.price / Number(e.item.price_bronze);
        if (e.tag === 'especialidade') cheap += ratio < 1 ? 1 : 0;
        if (e.tag === 'escasso') pricey += ratio > 1.2 ? 1 : 0;
      }
    }
    expect(cheap).toBeGreaterThan(0);
    expect(pricey).toBeGreaterThan(0);
  });

  it('o Mestre tira, fixa e muda preço (o mais específico vence)', () => {
    const profile = regionProfile('brumas');
    const first = generateStock({ ...base, place: lyssandre, profile, period: 3 })[0].item.id;
    const s = generateStock({
      ...base,
      place: lyssandre,
      profile,
      period: 3,
      overrides: [
        { id: 'a', scope: '*', catalog_id: first, mode: 'nunca', price_bronze: null, stock: null },
        { id: 'b', scope: 'place:p1', catalog_id: first, mode: 'sempre', price_bronze: 7, stock: 3 },
        { id: 'c', scope: 'brumas', catalog_id: 'i5', mode: 'sempre', price_bronze: null, stock: null },
      ],
    });
    const f = s.find((e) => e.item.id === first);
    expect(f).toMatchObject({ price: 7, stock: 3, pinned: true });
    expect(s.find((e) => e.item.id === 'i5')?.pinned).toBe(true);
  });

  it('venda paga mais pelo que falta na região', () => {
    const p = REGION_PROFILES.bib;
    expect(sellOffer(100, 'Alquimia', p, 1)).toBeGreaterThan(sellOffer(100, 'Arma', p, 1));
    expect(sellOffer(0, 'Arma', p, 1)).toBe(0);
  });

  it('períodos e renovação seguem o relógio do mundo', () => {
    expect(periodOf(0, 3)).toBe(0);
    expect(periodOf(3 * 1440, 3)).toBe(1);
    expect(periodOf(3 * 1440, 3, 2)).toBe(3);
    expect(minutesToRestock(1440, 3)).toBe(2 * 1440);
  });

  it('acha o lugar mais perto do grupo', () => {
    const r = nearestMarket(
      [
        { ...lyssandre, x: 100, y: 100 },
        { ...vila, x: 1000, y: 1000 },
      ],
      950,
      980,
    );
    expect(r?.place.id).toBe('p2');
  });
});
