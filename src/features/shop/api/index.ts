import { supabase } from '../../../shared/supabase';
import type { ShopItem } from '../types';
import { STARTER_SHOP_ITEMS } from '../data/starterShopItems';
import { buyShopItemInDB, sellItemInDB, fetchShopItemsFromDB, setSessionShopStateInDB, subscribeToShopRealtime } from './db';

export { buyShopItemInDB, sellItemInDB, setSessionShopStateInDB, subscribeToShopRealtime };

export async function fetchShopItems(sessionCode: string = 'MESA'): Promise<ShopItem[]> {
  try {
    const items = await fetchShopItemsFromDB(sessionCode);
    if (items && items.length > 0) {
      return items as unknown as ShopItem[];
    }
  } catch (err) {
    console.warn('[SHOP] Erro ao buscar itens do Supabase, usando catálogo inicial:', err);
  }
  return STARTER_SHOP_ITEMS;
}
