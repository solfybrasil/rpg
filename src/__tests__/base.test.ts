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
