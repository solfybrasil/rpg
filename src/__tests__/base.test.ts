import { describe, expect, it, vi } from 'vitest';

vi.mock('../shared/supabase', () => ({ supabase: {}, queryKeys: { inventory: { byHero: (id: string) => ['inventory', id] } } }));
vi.mock('../shared/supabase/realtime', () => ({ subscribeRealtime: () => () => {} }));

const { asRecord, isMissingTable, itemSnapshot } = await import('../features/base/api/baseApi');
const { formatCoins, kindInfo } = await import('../features/base/data/kinds');

describe('Base do grupo', () => {
  it('mostra moedas como na mochila', () => {
    expect(formatCoins(0)).toBe('grátis');
    expect(formatCoins(2500)).toBe('1o');
    expect(formatCoins(2500 + 3 * 50 + 7)).toBe('1o 3p 7b');
  });

  it('tipo desconhecido vira baú', () => {
    expect(kindInfo('xyz').label).toBe('Baú');
    expect(kindInfo('cofre').label).toBe('Cofre');
  });

  it('item guardado perde dono e posição, e volta no formato da mochila', () => {
    const row = {
      id: 'i1', character_id: 'h', player_id: 'h', slot_index: 4, equip_slot: null,
      name: 'Poção', rarity: 'Incomum', quantity: 3, description: 'cura',
    };
    const snap = itemSnapshot(row);
    expect(snap).toEqual({ name: 'Poção', rarity: 'Incomum', description: 'cura' });
    const back = asRecord({ id: 'b1', storage_id: 's', slot_index: 2, quantity: 3, item: snap, deposited_by: null });
    expect(back).toMatchObject({ id: 'b1', name: 'Poção', quantity: 3, slot_index: 2 });
  });

  it('reconhece tabela ausente', () => {
    expect(isMissingTable({ code: '42P01' })).toBe(true);
    expect(isMissingTable({ code: 'PGRST205', message: 'Could not find the table' })).toBe(true);
    expect(isMissingTable({ code: '23505', message: 'duplicate' })).toBe(false);
  });
});

const parts = await import('../features/base/data/parts');

describe('Base — lado de fora', () => {
  const p = { condition: 80, max_condition: 100, wear_per_day: 10, cond_minutes: 1000 };

  it('desgasta pelo relógio do mundo e para no zero', () => {
    expect(parts.currentCondition(p, 1000)).toBe(80);
    expect(parts.currentCondition(p, 1000 + 1440)).toBe(70);
    expect(parts.currentCondition(p, 1000 + 1440 * 30)).toBe(0);
    // relógio "voltando" não aumenta o estado
    expect(parts.currentCondition(p, 0)).toBe(80);
  });

  it('o que não desgasta fica igual', () => {
    expect(parts.currentCondition({ ...p, wear_per_day: 0 }, 1e9)).toBe(80);
    expect(parts.daysToBreak({ ...p, wear_per_day: 0 }, 1e9)).toBeNull();
    expect(parts.daysToBreak(p, 1000)).toBe(8);
  });

  it('rótulos do estado', () => {
    expect(parts.conditionLabel(1)).toBe('Perfeito');
    expect(parts.conditionLabel(0.8)).toBe('Bom');
    expect(parts.conditionLabel(0.5)).toBe('Desgastado');
    expect(parts.conditionLabel(0.1)).toBe('Danificado');
    expect(parts.conditionLabel(0)).toBe('Quebrado');
  });

  it('materiais: soma por nome sem diferenciar maiúsculas, ignora linhas vazias', () => {
    const m = parts.countByName([{ name: 'Tábua', quantity: 2 }, { name: ' tábua ', quantity: 1 }, { name: 'Piche' }]);
    expect(m.get('tábua')).toBe(3);
    expect(m.get('piche')).toBe(1);
    expect(parts.parseNeeds([{ name: 'Corda', qty: 0 }, { name: '', qty: 3 }, null])).toEqual([{ name: 'Corda', qty: 1 }]);
  });
});
