import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys, subscribeRealtime } from '../../../shared/supabase';
import { type InventoryItemRow, fetchHeroInventory } from '../api';

export function useInventory(heroId: string | null | undefined) {
  const safeId = heroId || '';

  useEffect(() => {
    if (!safeId) return;
    return subscribeRealtime({
      topic: `inventory:${safeId}`,
      table: 'inventory_items',
      filter: `character_id=eq.${safeId}`,
      queryKeyToUpdate: queryKeys.inventory.byHero(safeId),
    });
  }, [safeId]);

  return useQuery<InventoryItemRow[]>({
    queryKey: queryKeys.inventory.byHero(safeId),
    queryFn: () => fetchHeroInventory(safeId),
    enabled: Boolean(safeId),
  });
}
