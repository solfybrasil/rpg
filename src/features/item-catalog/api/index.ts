import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../shared/supabase/client.ts';
import type { HeroTarget, ItemCatalog, ItemCatalogFilter, PaginatedItemsResult } from './types.ts';
import { generateItemImageWithAI } from './aiGenerator.ts';

export * from './types.ts';
export * from './aiGenerator.ts';

export function normalizeItemFamily(name: string): string {
  let cleaned = (name || '').trim();
  cleaned = cleaned.replace(/\s*[\(\[].*?[\)\]]/g, '');
  cleaned = cleaned.replace(/\s*[\+\-]\d+/g, '');
  cleaned = cleaned.replace(/\s+\b(X|IX|VIII|VII|VI|V|IV|III|II|I)\b/gi, '');
  cleaned = cleaned.replace(
    /\s*[-–—]?\s*\b(menor|maior|superior|supremo|perfeito|perfeita|básico|basico|avançado|avancado|pequeno|pequena|médio|medio|média|media|grande|gigante|antigo|antiga|velho|velha|desgastado|desgastada|bruto|bruta|refinado|refinada)\b$/i,
    ''
  );
  cleaned = cleaned.replace(/\s+\d+$/g, '');
  cleaned = cleaned.trim();
  if (!cleaned) cleaned = (name || '').trim();

  return cleaned
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

const ITEM_COLUMNS =
  'id, name, category, subcategory, rarity, quality, equippable_as, weapon_class, armor_class, damage_dice, attack_attr, two_handed, ranged, ammo_type, armor_bonus, attack_bonus, damage_bonus, focus_bonus, health_bonus, skill_bonus, wear_type, durability, max_durability, stackable, default_quantity, reagent_tier, material_tier, special, description, origin, price_bronze, icon, image_url, tags, archived, plague_cost, saciedade, created_at, updated_at';

export async function fetchCatalogItems(
  filter: ItemCatalogFilter = {},
): Promise<PaginatedItemsResult> {
  const page = filter.page && filter.page > 0 ? filter.page : 1;
  const pageSize = filter.pageSize && filter.pageSize > 0 ? filter.pageSize : 40;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('item_catalog')
    .select(ITEM_COLUMNS, { count: 'exact' });

  // Archived filter
  if (!filter.includeArchived) {
    query = query.or('archived.is.null,archived.eq.false');
  }

  // Category filter
  if (filter.category && filter.category !== 'Todos') {
    query = query.or(`category.eq."${filter.category}",subcategory.eq."${filter.category}"`);
  }

  // Rarity filter
  if (filter.rarity && filter.rarity !== 'Todas') {
    query = query.eq('rarity', filter.rarity);
  }

  // Equippable slot
  if (filter.equippableAs) {
    query = query.eq('equippable_as', filter.equippableAs);
  }

  // Origin filter
  if (filter.origin) {
    query = query.ilike('origin', `%${filter.origin}%`);
  }

  // Without image only
  if (filter.onlyWithoutImage) {
    query = query.or('image_url.is.null,image_url.eq.');
  }

  // Text search
  if (filter.search && filter.search.trim()) {
    const s = `%${filter.search.trim().toLowerCase()}%`;
    query = query.or(`name.ilike.${s},description.ilike.${s},special.ilike.${s}`);
  }

  // Sorting
  if (filter.sortBy === 'price') {
    query = query.order('price_bronze', { ascending: false, nullsFirst: false });
  } else if (filter.sortBy === 'recent') {
    query = query.order('created_at', { ascending: false, nullsFirst: false });
  } else if (filter.sortBy === 'rarity') {
    query = query.order('rarity', { ascending: true }).order('name', { ascending: true });
  } else {
    query = query.order('name', { ascending: true });
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error('[ItemCatalogAPI] Erro ao buscar itens do catálogo:', error);
    throw new Error(error.message);
  }

  const rawItems = data || [];
  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const items: ItemCatalog[] = rawItems.map((it: any) => ({
    id: it.id,
    name: it.name || 'Item Sem Nome',
    category: it.category || 'Geral',
    subcategory: it.subcategory || null,
    rarity: it.rarity || 'Comum',
    quality: it.quality || 'Comum',
    equippable_as: it.equippable_as || null,
    weapon_class: it.weapon_class || null,
    armor_class: it.armor_class || null,
    damage_dice: it.damage_dice || null,
    attack_attr: it.attack_attr || null,
    two_handed: !!it.two_handed,
    ranged: !!it.ranged,
    ammo_type: it.ammo_type || null,
    armor_bonus: Number(it.armor_bonus || 0),
    attack_bonus: Number(it.attack_bonus || 0),
    damage_bonus: Number(it.damage_bonus || 0),
    focus_bonus: Number(it.focus_bonus || 0),
    health_bonus: Number(it.health_bonus || 0),
    skill_bonus: it.skill_bonus || null,
    wear_type: it.wear_type || 'unlimited',
    durability: Number(it.durability ?? 1),
    max_durability: Number(it.max_durability ?? 1),
    stackable: !!it.stackable,
    default_quantity: Number(it.default_quantity || 1),
    reagent_tier: it.reagent_tier || null,
    material_tier: it.material_tier || null,
    special: it.special || null,
    description: it.description || null,
    origin: it.origin || null,
    price_bronze: it.price_bronze !== null ? Number(it.price_bronze) : 50,
    icon: it.icon || '🗡️',
    image_url: it.image_url || null,
    image_status: it.image_status || (it.image_url ? 'pronta' : 'pendente'),
    image_prompt_en: it.image_prompt_en || null,
    image_family: it.image_family || null,
    image_error: it.image_error || null,
    tags: Array.isArray(it.tags) ? it.tags : [],
    archived: !!it.archived,
    plague_cost: Number(it.plague_cost || 0),
    saciedade: Number(it.saciedade || 0),
    created_at: it.created_at || null,
    updated_at: it.updated_at || null,
  }));

  return {
    data: items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export function useCatalogItems(filter: ItemCatalogFilter = {}) {
  return useQuery<PaginatedItemsResult>({
    queryKey: ['item_catalog', filter],
    queryFn: () => fetchCatalogItems(filter),
    staleTime: 60_000,
  });
}

export function useItemImageStats() {
  return useQuery({
    queryKey: ['item_image_stats'],
    queryFn: async () => {
      const { count: prontasCount } = await supabase
        .from('item_catalog')
        .select('id', { count: 'exact', head: true })
        .not('image_url', 'is', null)
        .neq('image_url', '');

      const { count: totalCount } = await supabase
        .from('item_catalog')
        .select('id', { count: 'exact', head: true });

      const prontas = prontasCount || 0;
      const total = totalCount || 0;
      const pendentes = Math.max(0, total - prontas);

      return { prontas, pendentes, total };
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export async function triggerItemImageGeneration(item: ItemCatalog): Promise<string> {
  const result = await generateItemImageWithAI({
    name: item.name,
    description: item.description || item.special || undefined,
    category: item.category,
    itemId: item.id,
  });

  const { error: updateError } = await supabase
    .from('item_catalog')
    .update({
      image_url: result.imageUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', item.id);

  if (updateError) {
    console.warn('[triggerItemImageGeneration] Erro ao atualizar item_catalog:', updateError);
  }

  // Atualização das colunas extras da migração (se já criadas)
  const family = item.image_family || normalizeItemFamily(item.name);
  try {
    await supabase
      .from('item_catalog')
      .update({
        image_status: 'pronta',
        image_family: family,
        image_prompt_en: result.promptEn || null,
      })
      .eq('id', item.id);
  } catch {
    // Ignora se as colunas ainda não existirem no schema do banco
  }

  return result.imageUrl;
}

export async function fetchHeroesForGive(): Promise<HeroTarget[]> {
  try {
    const { data, error } = await supabase
      .from('characters')
      .select('id, name, title, avatar_icon')
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map((h: any) => ({
      id: h.id,
      name: h.name,
      title: h.title,
      avatar_icon: h.avatar_icon,
    }));
  } catch (err) {
    console.error('[ItemCatalogAPI] Erro ao buscar heróis:', err);
    return [];
  }
}

export async function saveCatalogItem(
  itemData: Partial<ItemCatalog>,
): Promise<ItemCatalog> {
  const id =
    itemData.id?.trim() ||
    itemData.name
      ?.trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') ||
    `item_${Date.now()}`;

  const itemName = itemData.name?.trim() || 'Novo Artigo';
  const family = itemData.image_family || normalizeItemFamily(itemName);
  const hasImage = Boolean(itemData.image_url && itemData.image_url.trim());

  // Apenas colunas verificadas da tabela real no PostgreSQL
  const payload: any = {
    id,
    name: itemName,
    category: itemData.category || 'Geral',
    subcategory: itemData.subcategory || null,
    rarity: itemData.rarity || 'Comum',
    quality: itemData.quality || 'Comum',
    equippable_as: itemData.equippable_as || null,
    weapon_class: itemData.weapon_class || null,
    armor_class: itemData.armor_class || null,
    damage_dice: itemData.damage_dice || null,
    attack_attr: itemData.attack_attr || null,
    two_handed: !!itemData.two_handed,
    ranged: !!itemData.ranged,
    ammo_type: itemData.ammo_type || null,
    armor_bonus: Number(itemData.armor_bonus || 0),
    attack_bonus: Number(itemData.attack_bonus || 0),
    damage_bonus: Number(itemData.damage_bonus || 0),
    focus_bonus: Number(itemData.focus_bonus || 0),
    health_bonus: Number(itemData.health_bonus || 0),
    skill_bonus: itemData.skill_bonus || null,
    wear_type: itemData.wear_type || 'unlimited',
    durability: Number(itemData.durability ?? 1),
    max_durability: Number(itemData.max_durability ?? 1),
    stackable: !!itemData.stackable,
    default_quantity: Number(itemData.default_quantity ?? 1),
    reagent_tier: itemData.reagent_tier || null,
    material_tier: itemData.material_tier || null,
    special: itemData.special || null,
    description: itemData.description || null,
    origin: itemData.origin || null,
    price_bronze: Number(itemData.price_bronze) || 0,
    icon: itemData.icon || '🗡️',
    image_url: itemData.image_url || null,
    tags: Array.isArray(itemData.tags) ? itemData.tags : [],
    archived: !!itemData.archived,
    plague_cost: itemData.rarity === 'Maldito' ? Number(itemData.plague_cost || 1) : Number(itemData.plague_cost || 0),
    saciedade: Number(itemData.saciedade || 0),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('item_catalog')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('[ItemCatalogAPI] Erro ao salvar item no catálogo:', error);
    throw new Error(error.message);
  }

  // Tenta atualizar colunas opcionais da migração se existirem
  if (family) {
    try {
      await supabase
        .from('item_catalog')
        .update({
          image_family: family,
          image_status: itemData.image_status || (hasImage ? 'pronta' : 'pendente'),
        })
        .eq('id', id);
    } catch {
      // Ignora se as colunas ainda não existirem
    }
  }

  return data as unknown as ItemCatalog;
}

export async function archiveCatalogItem(
  id: string,
  archived = true,
): Promise<boolean> {
  const { error } = await supabase
    .from('item_catalog')
    .update({ archived, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[ItemCatalogAPI] Erro ao arquivar item:', error);
    throw new Error(error.message);
  }

  return true;
}

export async function giveCatalogItem(
  catalogId: string,
  characterId: string,
  quantity = 1,
): Promise<{ success: boolean }> {
  try {
    // 1. Tentar via RPC canônica give_catalog_item
    const { error: rpcError } = await supabase.rpc('give_catalog_item', {
      p_catalog_id: catalogId,
      p_character_id: characterId,
      p_quantity: Number(quantity) || 1,
    });

    if (!rpcError) {
      return { success: true };
    }

    console.warn('[ItemCatalogAPI] RPC falhou, aplicando fallback direto:', rpcError.message);

    // 2. Fallback: buscar item do catálogo e inserir diretamente em inventory_items
    const { data: catItem, error: catErr } = await supabase
      .from('item_catalog')
      .select('*')
      .eq('id', catalogId)
      .single();

    if (catErr || !catItem) {
      throw new Error(catErr?.message || 'Item do catálogo não encontrado');
    }

    // Achar próximo slot vazio
    const { data: invItems } = await supabase
      .from('inventory_items')
      .select('slot_index')
      .eq('character_id', characterId);

    const occupiedSlots = new Set((invItems || []).map((i: any) => i.slot_index));
    let nextSlot = 0;
    while (occupiedSlots.has(nextSlot)) {
      nextSlot++;
    }

    const payload = {
      character_id: characterId,
      player_id: characterId,
      session_code: 'MESA',
      name: catItem.name,
      description: catItem.description || catItem.special || '',
      image_url: catItem.image_url,
      wear_type: catItem.wear_type || 'unlimited',
      durability: catItem.durability ?? 1,
      max_durability: catItem.max_durability ?? 1,
      quantity: Math.max(1, quantity),
      category: catItem.category,
      rarity: catItem.rarity || 'Comum',
      icon: catItem.icon || '🗡️',
      slot_index: nextSlot,
      equippable_as: catItem.equippable_as,
      damage_dice: catItem.damage_dice,
      armor_bonus: catItem.armor_bonus,
      attack_bonus: catItem.attack_bonus,
      price_bronze: catItem.price_bronze,
      catalog_id: catItem.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insErr } = await supabase.from('inventory_items').insert([payload]);
    if (insErr) throw insErr;

    return { success: true };
  } catch (err: any) {
    console.error('[ItemCatalogAPI] Erro ao conceder item:', err);
    throw err;
  }
}

export const giveCatalogItemViaRPC = giveCatalogItem;

export async function uploadItemImage(file: File): Promise<string> {
  try {
    const fileExt = file.name ? file.name.split('.').pop() : 'png';
    const fileName = `item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('items')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.warn('[ItemCatalogAPI] Erro no storage bucket items:', uploadError.message);
      // Fallback para FileReader dataUrl
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from('items')
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || '';
  } catch (err: any) {
    console.warn('[ItemCatalogAPI] Falha no upload, usando data URL:', err);
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
}
