import type { EquipSlotKey, InventoryItemRecord } from '../../../entities/item';
import { supabase } from '../../../shared/supabase/client';
import type { Database } from '../../../shared/supabase/types';

export type InventoryRow = Database['public']['Tables']['inventory_items']['Row'];

/**
 * Move ou troca posição de slots (Drag and Drop)
 */
export async function moveSlotInDB(
  itemId: string,
  targetSlot: number,
  _heroId?: string,
): Promise<{ success: boolean }> {
  try {
    const { data, error } = await supabase.rpc('move_inventory_item', {
      p_item_id: itemId,
      p_target_slot: Number(targetSlot),
    });

    if (error) {
      console.warn('[INVENTORY] RPC move_inventory_item falhou, usando fallback direto:', error.message);
      const { error: directErr } = await supabase
        .from('inventory_items')
        .update({
          slot_index: Number(targetSlot),
          equip_slot: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (directErr) throw directErr;
      return { success: true };
    }

    return data || { success: true };
  } catch (err) {
    console.error('[INVENTORY] Erro ao mover item de slot:', err);
    throw err;
  }
}

/**
 * Transfere item entre heróis
 */
export async function transferItemInDB(
  itemId: string,
  targetCharacterId: string,
  targetSlot = -1,
  quantity = 1,
): Promise<{ success: boolean }> {
  try {
    const qty = Math.max(1, Math.floor(quantity));
    const slot = typeof targetSlot === 'number' ? targetSlot : -1;

    const { data, error } = await supabase.rpc('transfer_inventory_item', {
      p_item_id: itemId,
      p_target_character_id: targetCharacterId,
      p_target_slot: slot,
      p_quantity: qty,
    });

    if (error) {
      console.warn('[INVENTORY] RPC transfer_inventory_item falhou, usando fallback direto:', error.message);
      // Fallback: se quantidade parcial, divide pilha; se total, muda o dono
      const { data: itemData } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (itemData) {
        const curQty = Number(itemData.quantity || 1);
        if (qty >= curQty) {
          const { error: updErr } = await supabase
            .from('inventory_items')
            .update({
              character_id: targetCharacterId,
              player_id: targetCharacterId,
              equip_slot: null,
              slot_index: slot >= 0 ? slot : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', itemId);
          if (updErr) throw updErr;
        } else {
          // Subtrai do original
          await supabase
            .from('inventory_items')
            .update({
              quantity: curQty - qty,
              updated_at: new Date().toISOString(),
            })
            .eq('id', itemId);

          // Cria novo item no destinatário
          const newItem = {
            ...itemData,
            id: undefined,
            character_id: targetCharacterId,
            player_id: targetCharacterId,
            quantity: qty,
            equip_slot: null,
            slot_index: slot >= 0 ? slot : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          delete (newItem as Record<string, unknown>).id;
          await supabase.from('inventory_items').insert(newItem);
        }
      }
      return { success: true };
    }

    return data || { success: true };
  } catch (err) {
    console.error('[INVENTORY] Erro ao transferir item:', err);
    throw err;
  }
}

/**
 * Equipa um item no slot de equipamento do herói
 */
export async function equipItemInDB(
  itemId: string,
  slot: EquipSlotKey,
  heroId: string,
): Promise<{ success: boolean }> {
  try {
    const { data, error } = await supabase.rpc('equip_item', {
      p_item_id: itemId,
      p_slot: slot,
    });

    if (error) {
      console.warn('[INVENTORY] RPC equip_item falhou, usando fallback direto:', error.message);
      // Desequipa qualquer item que já ocupe o slot
      await supabase
        .from('inventory_items')
        .update({ equip_slot: null, updated_at: new Date().toISOString() })
        .eq('character_id', heroId)
        .eq('equip_slot', slot);

      // Equipa o novo
      const { error: directErr } = await supabase
        .from('inventory_items')
        .update({
          equip_slot: slot,
          slot_index: -1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (directErr) throw directErr;
      return { success: true };
    }

    return data || { success: true };
  } catch (err) {
    console.error('[INVENTORY] Erro ao equipar item:', err);
    throw err;
  }
}

/**
 * Desequipa um item e coloca de volta na mochila
 */
export async function unequipItemInDB(
  itemId: string,
  targetSlot = -1,
): Promise<{ success: boolean }> {
  try {
    const { data, error } = await supabase.rpc('unequip_item', {
      p_item_id: itemId,
      p_target_slot: Number(targetSlot),
    });

    if (error) {
      console.warn('[INVENTORY] RPC unequip_item falhou, usando fallback direto:', error.message);
      const { error: directErr } = await supabase
        .from('inventory_items')
        .update({
          equip_slot: null,
          slot_index: targetSlot >= 0 ? Number(targetSlot) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (directErr) throw directErr;
      return { success: true };
    }

    return data || { success: true };
  } catch (err) {
    console.error('[INVENTORY] Erro ao desequipar item:', err);
    throw err;
  }
}

/**
 * Atualiza campos de um item
 */
export async function updateInventoryItemInDB(
  itemId: string,
  patch: Partial<InventoryRow>,
): Promise<InventoryRow> {
  const { data, error } = await supabase
    .from('inventory_items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deleta item do inventário
 */
export async function deleteInventoryItemInDB(itemId: string): Promise<boolean> {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
  return true;
}
