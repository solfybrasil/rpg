import { describe, expect, it } from 'vitest';
import { queryClient } from '../shared/supabase/queryClient';

describe('Realtime Cache Direct Patching (sem refetch)', () => {
  it('aplica patch de UPDATE diretamente no cache de array sem refetch', () => {
    const qk = ['test_heroes_list'];
    const initialList = [
      { id: 'h1', name: 'Herói 1', hp: 20 },
      { id: 'h2', name: 'Herói 2', hp: 30 },
    ];

    queryClient.setQueryData(qk, initialList);

    // Simulação do patch de realtime (como feito em applyDefaultCachePatch)
    const payload = {
      eventType: 'UPDATE',
      new: { id: 'h1', name: 'Herói 1 Alterado', hp: 15 },
      old: { id: 'h1' },
    };

    queryClient.setQueryData(qk, (old: unknown) => {
      const arr = old as typeof initialList;
      return arr.map((item) => (item.id === payload.new.id ? { ...item, ...payload.new } : item));
    });

    const updated = queryClient.getQueryData<typeof initialList>(qk);
    expect(updated).toEqual([
      { id: 'h1', name: 'Herói 1 Alterado', hp: 15 },
      { id: 'h2', name: 'Herói 2', hp: 30 },
    ]);
  });

  it('aplica patch de INSERT adicionando item novo no cache', () => {
    const qk = ['test_inventory'];
    const initialItems = [{ id: 'item_1', name: 'Poção' }];

    queryClient.setQueryData(qk, initialItems);

    const newItem = { id: 'item_2', name: 'Espada Curta' };
    queryClient.setQueryData(qk, (old: unknown) => {
      const arr = old as typeof initialItems;
      return [newItem, ...arr];
    });

    const updated = queryClient.getQueryData<typeof initialItems>(qk);
    expect(updated).toHaveLength(2);
    expect(updated?.[0].id).toBe('item_2');
  });

  it('aplica patch de DELETE removendo item do cache', () => {
    const qk = ['test_delete_cache'];
    const initialItems = [
      { id: 'i1', name: 'A' },
      { id: 'i2', name: 'B' },
    ];

    queryClient.setQueryData(qk, initialItems);

    queryClient.setQueryData(qk, (old: unknown) => {
      const arr = old as typeof initialItems;
      return arr.filter((item) => item.id !== 'i1');
    });

    const updated = queryClient.getQueryData<typeof initialItems>(qk);
    expect(updated).toEqual([{ id: 'i2', name: 'B' }]);
  });
});
