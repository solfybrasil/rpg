import { supabase } from '../../../shared/supabase/client';
import type { CharacterRow, InventoryRow, ItemCatalogRow } from '../types';

/**
 * Busca itens no catálogo oficial (`item_catalog`) direto no servidor Supabase
 */
export async function searchItemCatalog(
  term = '',
  category?: string,
  limit = 24,
): Promise<ItemCatalogRow[]> {
  let query = supabase.from('item_catalog').select('*').limit(limit);

  if (term.trim()) {
    query = query.ilike('name', `%${term.trim()}%`);
  }

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query.order('name', { ascending: true });
  if (error) {
    console.error('Erro ao buscar item_catalog:', error);
    return [];
  }
  return data || [];
}

function normalizeRarity(r?: string | null): 'Comum' | 'Incomum' | 'Raro' | 'Lendário' | 'Artefato' {
  const lower = (r || '').toLowerCase();
  if (lower.includes('incom')) return 'Incomum';
  if (lower.includes('rar')) return 'Raro';
  if (lower.includes('lend')) return 'Lendário';
  if (lower.includes('artef')) return 'Artefato';
  return 'Comum';
}

/**
 * Concede um item diretamente para o inventário do herói (`inventory_items`)
 */
export async function giveItemToHero(
  heroId: string,
  itemData: Partial<InventoryRow>,
): Promise<InventoryRow | null> {
  const payload = {
    session_code: 'MESA',
    character_id: heroId,
    player_id: heroId,
    name: itemData.name || 'Item Concedido',
    category: itemData.category || 'Geral',
    quantity: itemData.quantity ?? 1,
    image_url: itemData.image_url || null,
    description: itemData.description || 'Dádiva concedida pelo Mestre da Mesa.',
    rarity: normalizeRarity(itemData.rarity),
    wear_type: itemData.wear_type || 'unlimited',
    durability: itemData.durability ?? 1,
    max_durability: itemData.max_durability ?? 1,
    slot_index: itemData.slot_index ?? null,
  };

  const { data, error } = await supabase
    .from('inventory_items')
    .insert([payload as never])
    .select()
    .single();

  if (error) {
    console.error('Erro ao conceder item:', error);
    throw error;
  }
  return data as InventoryRow;
}

/**
 * Remove/descarta um item do inventário do herói
 */
export async function removeItemFromHero(itemId: string): Promise<boolean> {
  const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);

  if (error) {
    console.error('Erro ao remover item:', error);
    throw error;
  }
  return true;
}

/**
 * Atualiza status vitais do herói na tabela `characters`
 */
export async function updateHeroVitals(
  heroId: string,
  patch: Partial<CharacterRow>,
): Promise<CharacterRow> {
  const { data, error } = await supabase
    .from('characters')
    .update(patch)
    .eq('id', heroId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar vitals do herói:', error);
    throw error;
  }
  return data as CharacterRow;
}

/**
 * Aplica uma condição ao herói (adiciona ao array conditions em characters)
 */
export async function applyConditionToHero(
  hero: CharacterRow,
  conditionName: string,
): Promise<CharacterRow> {
  const current = Array.isArray(hero.conditions) ? (hero.conditions as string[]) : [];
  if (current.includes(conditionName)) return hero;

  const updatedConditions = [...current, conditionName];
  return updateHeroVitals(hero.id, { conditions: updatedConditions });
}

/**
 * Remove uma condição do herói
 */
export async function removeConditionFromHero(
  hero: CharacterRow,
  conditionName: string,
): Promise<CharacterRow> {
  const current = Array.isArray(hero.conditions) ? (hero.conditions as string[]) : [];
  const updatedConditions = current.filter((c) => c !== conditionName);
  return updateHeroVitals(hero.id, { conditions: updatedConditions });
}
