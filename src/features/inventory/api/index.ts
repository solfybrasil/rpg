import { type Tables, supabase } from '../../../shared/supabase';

export type InventoryItemRow = Tables<'inventory_items'>;

const INVENTORY_COLUMNS =
  'id, character_id, player_id, catalog_id, name, category, description, quantity, weight_slots, rarity, icon, image_url, slot_index, equip_slot, bonus_json, price_bronze, durability_current, durability_max, weapon_damage, weapon_attr, weapon_skill, weapon_range, weapon_type, armor_defense, is_two_handed, item_data, updated_at';

export async function fetchHeroInventory(heroId: string): Promise<InventoryItemRow[]> {
  if (!heroId) return [];
  const { data, error } = await supabase
    .from('inventory_items')
    .select(INVENTORY_COLUMNS)
    .or(`character_id.eq.${heroId},player_id.eq.${heroId}`)
    .order('slot_index', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as InventoryItemRow[];
}
