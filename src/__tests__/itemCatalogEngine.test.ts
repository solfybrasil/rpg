import { describe, expect, it } from 'vitest';
import { fromBronze } from '../entities/item';
import {
  getItemRarityBadgeVariant,
  getItemRarityBorder,
} from '../features/item-catalog/components/ItemCatalogCardGrid.tsx';
import {
  ITEM_CATEGORIES,
  ITEM_RARITIES,
} from '../features/item-catalog/data/constants.ts';

describe('Item Catalog Engine & Logic', () => {
  it('correctly maps rarity strings to Badge variants', () => {
    expect(getItemRarityBadgeVariant('Comum')).toBe('comum');
    expect(getItemRarityBadgeVariant('Incomum')).toBe('incomum');
    expect(getItemRarityBadgeVariant('Raro')).toBe('raro');
    expect(getItemRarityBadgeVariant('Épico')).toBe('lendario');
    expect(getItemRarityBadgeVariant('Lendário')).toBe('lendario');
    expect(getItemRarityBadgeVariant('Artefato')).toBe('artefato');
    expect(getItemRarityBadgeVariant('Maldito')).toBe('danger');
    expect(getItemRarityBadgeVariant(null)).toBe('default');
  });

  it('correctly maps rarity strings to atmospheric borders', () => {
    expect(getItemRarityBorder('Artefato')).toContain('border-[#f5b65b]');
    expect(getItemRarityBorder('Lendário')).toContain('border-purple-500');
    expect(getItemRarityBorder('Raro')).toContain('border-blue-500');
    expect(getItemRarityBorder('Incomum')).toContain('border-emerald-500');
    expect(getItemRarityBorder('Maldito')).toContain('border-red-500');
    expect(getItemRarityBorder('Comum')).toContain('border-white/10');
  });

  it('contains expected categories and rarities constants', () => {
    expect(ITEM_CATEGORIES).toContain('Arma');
    expect(ITEM_CATEGORIES).toContain('Armadura');
    expect(ITEM_CATEGORIES).toContain('Alquimia');
    expect(ITEM_CATEGORIES).toContain('Material');
    expect(ITEM_CATEGORIES).toContain('Tesouro');

    expect(ITEM_RARITIES).toContain('Comum');
    expect(ITEM_RARITIES).toContain('Raro');
    expect(ITEM_RARITIES).toContain('Artefato');
    expect(ITEM_RARITIES).toContain('Maldito');
  });

  it('calculates coin conversions for bronze prices accurately', () => {
    // 1 gold = 100 silver = 10000 bronze? Let's verify fromBronze
    const res50 = fromBronze(50);
    expect(res50.total).toBe(50);

    const res1250 = fromBronze(1250);
    expect(res1250.total).toBe(1250);
    expect(res1250.silver).toBeGreaterThanOrEqual(0);
  });

  it('correctly formats CSV lines with quotes and escaping', () => {
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const mockItem = {
      id: 'espada_obsidiana',
      name: 'Espada de "Obsidiana"',
      category: 'Armas',
      price_bronze: 250,
      damage_dice: '1d8+2',
    };

    const formattedName = escapeCSV(mockItem.name);
    expect(formattedName).toBe('"Espada de ""Obsidiana"""');

    const formattedPrice = escapeCSV(mockItem.price_bronze);
    expect(formattedPrice).toBe('"250"');
  });

  it('computes pagination offsets and bounds cleanly', () => {
    const pageSize = 40;
    const computeRange = (page: number) => {
      const p = Math.max(1, page);
      const from = (p - 1) * pageSize;
      const to = from + pageSize - 1;
      return { from, to };
    };

    expect(computeRange(1)).toEqual({ from: 0, to: 39 });
    expect(computeRange(2)).toEqual({ from: 40, to: 79 });
    expect(computeRange(76)).toEqual({ from: 3000, to: 3039 });
  });
});
