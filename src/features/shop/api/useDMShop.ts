import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys, subscribeRealtime, supabase } from '../../../shared/supabase';
import type { Database } from '../../../shared/supabase/types';
import { STARTER_SHOP_ITEMS } from '../data/starterShopItems';
import type { ShopItem } from '../types';

export const dmShopQueryKeys = {
  items: (sessionCode = 'MESA') => ['dm_shop', 'items', sessionCode] as const,
};

export function useDMShopItems(sessionCode = 'MESA') {
  const queryClient = useQueryClient();
  const qk = dmShopQueryKeys.items(sessionCode);

  const query = useQuery({
    queryKey: qk,
    queryFn: async (): Promise<ShopItem[]> => {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[DMShop] Erro ao buscar artigos da loja:', error);
        throw error;
      }

      return (data || []).map((it: any) => ({
        id: it.id,
        session_code: it.session_code || 'MESA',
        catalog_id: it.catalog_id || null,
        name: it.name,
        description: it.description || '',
        image_url: it.image_url || null,
        icon: it.icon || '🎒',
        category: it.category || 'Geral',
        rarity: it.rarity || 'Comum',
        price_bronze: Number(it.price_bronze) || 0,
        stock: it.stock !== null && it.stock !== undefined ? Number(it.stock) : null,
        active: it.active !== undefined ? Boolean(it.active) : true,
        equippable_as: it.equippable_as || null,
        damage_dice: it.damage_dice || null,
        armor_bonus: Number(it.armor_bonus || 0),
        attack_bonus: Number(it.attack_bonus || 0),
        durability: Number(it.durability ?? 1),
        max_durability: Number(it.max_durability ?? 1),
        wear_type: it.wear_type || 'unlimited',
        special: it.special || null,
        quality: it.quality || 'Comum',
      }));
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const unsub = subscribeRealtime<{ session_code: string }>({
      topic: `shop_items_realtime_${sessionCode.toLowerCase()}`,
      table: 'shop_items',
      queryKeyToUpdate: qk,
    });
    return () => unsub();
  }, [sessionCode, qk]);

  return query;
}

export function useToggleShopMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shopOpen,
      shopName,
    }: {
      shopOpen?: boolean;
      shopName?: string;
    }) => {
      const qk = queryKeys.gameState.global;
      const current = queryClient.getQueryData<Database['public']['Tables']['game_state']['Row']>(qk);
      const targetId = current?.id ?? 1;

      const payload: any = { updated_at: new Date().toISOString() };
      if (shopOpen !== undefined) payload.shop_open = shopOpen;
      if (shopName !== undefined) payload.shop_name = shopName.trim();

      const { data, error } = await supabase
        .from('game_state')
        .update(payload)
        .eq('id', targetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ shopOpen, shopName }) => {
      const qk = queryKeys.gameState.global;
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<Database['public']['Tables']['game_state']['Row']>(qk);
      if (previous) {
        queryClient.setQueryData(qk, {
          ...previous,
          ...(shopOpen !== undefined ? { shop_open: shopOpen } : {}),
          ...(shopName !== undefined ? { shop_name: shopName.trim() } : {}),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.gameState.global, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gameState.global });
    },
  });
}

export function useUpdateShopItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ShopItem>;
    }) => {
      const { data, error } = await supabase
        .from('shop_items')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm_shop', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['shop_items'] });
    },
  });
}

export function useCreateShopItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemData: Partial<ShopItem>) => {
      const payload: any = {
        session_code: itemData.session_code || 'MESA',
        catalog_id: itemData.catalog_id || null,
        name: itemData.name?.trim() || 'Novo Artigo à Venda',
        description: itemData.description || '',
        image_url: itemData.image_url || null,
        icon: itemData.icon || '🎒',
        category: itemData.category || 'Geral',
        rarity: itemData.rarity || 'Comum',
        price_bronze: Number(itemData.price_bronze) || 0,
        stock: itemData.stock !== null && itemData.stock !== undefined ? Number(itemData.stock) : null,
        active: itemData.active !== undefined ? Boolean(itemData.active) : true,
        equippable_as: itemData.equippable_as || null,
        damage_dice: itemData.damage_dice || null,
        armor_bonus: Number(itemData.armor_bonus || 0),
        attack_bonus: Number(itemData.attack_bonus || 0),
        durability: Number(itemData.durability ?? 1),
        max_durability: Number(itemData.max_durability ?? 1),
        wear_type: itemData.wear_type || 'unlimited',
        special: itemData.special || null,
      };

      const { data, error } = await supabase
        .from('shop_items')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm_shop', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['shop_items'] });
    },
  });
}

export function useDeleteShopItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('shop_items').delete().eq('id', itemId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm_shop', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['shop_items'] });
    },
  });
}

export function usePopulateStarterShopMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from('shop_items')
        .select('name');

      const existingNames = new Set(
        (existing || []).map((it) => (it.name || '').trim().toLowerCase()),
      );

      const toInsert = STARTER_SHOP_ITEMS.filter(
        (s) => !existingNames.has((s.name || '').trim().toLowerCase()),
      ).map((it) => ({
        session_code: 'MESA',
        catalog_id: it.catalog_id || null,
        name: it.name,
        description: it.description || '',
        image_url: it.image_url || null,
        icon: it.icon || '🎒',
        category: it.category || 'Geral',
        rarity: it.rarity || 'Comum',
        price_bronze: Number(it.price_bronze) || 10,
        stock: it.stock ?? null,
        active: true,
        equippable_as: it.equippable_as || null,
        damage_dice: it.damage_dice || null,
        armor_bonus: Number(it.armor_bonus || 0),
        attack_bonus: Number(it.attack_bonus || 0),
        durability: Number(it.durability ?? 1),
        max_durability: Number(it.max_durability ?? 1),
        wear_type: it.wear_type || 'unlimited',
        special: it.special || null,
      }));

      if (toInsert.length > 0) {
        const { error } = await supabase.from('shop_items').insert(toInsert);
        if (error) throw error;
      }

      return toInsert.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm_shop', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['shop_items'] });
    },
  });
}
