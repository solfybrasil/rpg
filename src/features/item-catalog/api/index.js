import { toast } from 'sonner';
import { getSafeRealtimeChannel, subscribeRealtime, supabase } from '../../../shared/supabase';

const CHAR_COLS =
  'id, name, title, race, race_id, racial_trait, oath_type, oath, oath_power, attributes, health, max_health, plague, gear, oath_item, backstory, connection, avatar_icon, created_at, caminho, level, xp, max_focus, defense, skills, gift, plague_gifts, focus, inspiration, coins_bronze, conditions, death_saves, alive, active, sort_order, updated_at, claimed_device, last_seen, session_code, player_id, character_id, oath_tree, descanso_atividade, saciedade, horas_faminto, vida_max_fome, horas_acordado, exausto';
const INV_COLS =
  'id, session_code, player_id, name, description, image_url, wear_type, durability, max_durability, quantity, category, rarity, icon, created_by, created_at, updated_at, slot_index, equippable_as, equip_slot, damage_dice, armor_bonus, attack_bonus, damage_bonus, skill_bonus, two_handed, ranged, quality, special, price_bronze, catalog_id, character_id';
const CREATURE_CAT_COLS =
  'id, name, species, category, size, region, region_key, stage, tier, threat, max_hp, defense, attack_bonus, damage_dice, attacks_per_turn, abilities, weakness, loot, harvest_skill, harvest_peso, edible, cooking, eat_effect, plague, unique, lair, description, icon, image_url, tags, archived, created_at, updated_at';
const RECIPE_GRID_COLS =
  'id, station, result_id, result_name, result_qty, grid, grid_names, ingredients, peso, skill, rarity, alternate, starter, loss_minor, loss_major, active, notes, created_at, updated_at';
const RECIPE_COLS =
  'id, name, station, skill, peso, ingredients, result_item, brilliant_bonus, fail_consequence, icon, description, created_at';
const SHOP_COLS =
  'id, session_code, name, description, category, rarity, icon, image_url, price_bronze, stock, equippable_as, damage_dice, armor_bonus, attack_bonus, damage_bonus, skill_bonus, two_handed, ranged, wear_type, max_durability, special, active, created_at, catalog_id';
const DICE_COLS =
  'id, session_code, player_id, player_name, label, dice, kept, modifier, total, peso, mode, result, rerolled, oath_broken, created_at';
const MSG_COLS = 'id, session_code, from_id, to_id, from_name, text, priority, read, created_at';
const COIN_COLS =
  'id, session_code, player_id, delta_bronze, balance_after, reason, ref_id, created_at, character_id';
const GAME_STATE_COLS =
  'id, current_peso, shop_open, shop_name, forge_available, dm_pin_hash, updated_at, mundo_minutos, clima, clima_dia, descanso_ativo, descanso_tipo, descanso_fim, descanso_evento, combate_ativo, combate_rodada, relogio_correndo, relogio_escala, relogio_ultimo_tick, relogio_pausado_combate, grupo_abrigado';
const NOTES_COLS = 'id, session_code, player_id, title, body, updated_at, character_id';
const DM_NOTES_COLS = 'id, session_code, title, body, updated_at';
const EFEITOS_CAT_COLS =
  'id, nome, tipo, icone, cor, empilhavel, max_pilhas, duracao_padrao, unidade_duracao, tique_dano, tique_cura, modificadores, descricao_curta, descricao_regras, como_remover';
const EFEITOS_COMB_COLS =
  'id, efeito_existente, efeito_novo, resultado_efeito, resultado_pilhas, dreno_foco, remover_existente, bloquear_novo, mensagem';
const PRAZOS_COLS =
  'id, titulo, expira_em_minutos, visivel_jogadores, concluido, disparado, criado_em';
const MUNDO_LOG_COLS = 'id, mundo_minutos, texto, tipo, criado_em';
const MAP_REGION_COLS =
  'id, session_code, name, subtitle, threat, discovered, polygon, label_x, label_y';
const MAP_STATE_COLS = 'session_code, party_place_id, party_x, party_y, route, ping, updated_at';
const MAP_PIN_COLS = 'id, session_code, player_id, x, y, note, created_at';
const COMBAT_ENC_COLS = 'id, session_code, name, active, round, turn_index, created_at';
const COMBATANT_COLS =
  'id, encounter_id, session_code, kind, player_id, name, image_url, max_hp, hp, defense, attack_bonus, damage_dice, attacks_per_turn, special, initiative, conditions, hidden, defeated, created_at, character_id, creature_id, harvested';
const XP_COLS = 'id, session_code, player_id, amount, reasons, note, created_at, character_id';
const SEM_DONO_COLS = 'id, item_data, origin, created_at';
const CRAFT_ATTEMPT_COLS =
  'id, session_code, character_id, recipe_id, station, grid, dice, total, peso, outcome, rerolled, oath_broken, resolved, result_summary, created_at';
const SCENARIO_COLS = 'id, title, subtitle, hook, summary, acts, created_at';
const BESTIARY_COLS =
  'id, name, title, threat, category, habitat, image_url, lore, signs, behavior, hp, defense, attack, weight, loot, weakness, immunities, created_at';

// ============================================================================
// FASE 6: CATÁLOGO DE ITENS DE ALDRENOR & CENTRO DE CONTROLE
// ============================================================================

/**
 * Busca itens do catálogo com paginação e filtros no servidor
 */
export async function fetchItemCatalogFromDB({
  search = '',
  category = '',
  rarity = '',
  equippableAs = '',
  weaponClass = '',
  armorClass = '',
  origin = '',
  onlyWithoutImage = false,
  showArchived = false,
  sortBy = 'name', // 'name' | 'rarity' | 'price' | 'recent'
  page = 0,
  pageSize = 60,
} = {}) {
  try {
    let query = supabase
      .from('item_catalog')
      .select(
        'id, name, category, subcategory, rarity, price_bronze, image_url, icon, special, description, equippable_as, weapon_class, armor_class, origin, archived, plague_cost, wear_type, durability, max_durability, stackable',
        { count: 'estimated' },
      );

    if (!showArchived) {
      query = query.eq('archived', false);
    }

    if (category && category !== 'Todos') {
      query = query.or(`category.eq."${category}",subcategory.eq."${category}"`);
    }

    if (rarity && rarity !== 'Todas') {
      query = query.eq('rarity', rarity);
    }

    if (equippableAs) {
      query = query.eq('equippable_as', equippableAs);
    }

    if (weaponClass) {
      query = query.eq('weapon_class', weaponClass);
    }

    if (armorClass) {
      query = query.eq('armor_class', armorClass);
    }

    if (origin) {
      query = query.ilike('origin', `%${origin}%`);
    }

    if (onlyWithoutImage) {
      query = query.or('image_url.is.null,image_url.eq.');
    }

    if (search && search.trim()) {
      const term = search.trim();
      query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%,special.ilike.%${term}%`);
    }

    if (sortBy === 'price') {
      query = query.order('price_bronze', { ascending: false, nullsFirst: false });
    } else if (sortBy === 'recent') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'rarity') {
      query = query.order('rarity', { ascending: true }).order('name', { ascending: true });
    } else {
      query = query.order('name', { ascending: true });
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) {
      console.error('[CATALOG] Erro ao buscar itens do catálogo:', error);
      return { items: [], count: 0 };
    }

    return { items: data || [], count: count || 0 };
  } catch (err) {
    console.error('[CATALOG] Exceção ao buscar itens:', err);
    return { items: [], count: 0 };
  }
}

/**
 * Cria ou atualiza item no catálogo
 */
export async function saveCatalogItemInDB(item) {
  const row = {
    ...item,
    two_handed: !!item.two_handed,
    ranged: !!item.ranged,
    stackable: !!item.stackable,
    archived: !!item.archived,
    skill_bonus: Array.isArray(item.skill_bonus) ? item.skill_bonus : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('item_catalog')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('[CATALOG] Erro ao salvar item no catálogo:', error);
    throw error;
  }
  return data;
}

/**
 * Deleta item definitivamente do catálogo
 */
export async function deleteCatalogItemFromDB(catalogId) {
  const { error } = await supabase.from('item_catalog').delete().eq('id', catalogId);

  if (error) {
    console.error('[CATALOG] Erro ao excluir item do catálogo:', error);
    throw error;
  }
  return true;
}

/**
 * Concede item do catálogo a um herói via RPC canônica give_catalog_item
 */
export async function giveCatalogItemViaRPC(catalogId, characterId, quantity = 1) {
  const { data, error } = await supabase.rpc('give_catalog_item', {
    p_catalog_id: catalogId,
    p_character_id: characterId,
    p_quantity: Number(quantity) || 1,
  });

  if (error) {
    console.error('[CATALOG] Erro em give_catalog_item:', error);
    throw error;
  }
  return data;
}

/**
 * Concede item customizado (Forja) a um herói via RPC canônica give_custom_item
 */
export async function giveCustomItemViaRPC(characterId, item) {
  const { data, error } = await supabase.rpc('give_custom_item', {
    p_character_id: characterId,
    p_item: item,
  });

  if (error) {
    console.error('[FORGE] Erro em give_custom_item:', error);
    throw error;
  }
  return data;
}

/**
 * Sincroniza cópias do item nas mochilas e na loja via RPC sync_catalog_copies
 */
export async function syncCatalogCopiesViaRPC(catalogId) {
  const { data, error } = await supabase.rpc('sync_catalog_copies', {
    p_catalog_id: catalogId,
  });

  if (error) {
    console.error('[CATALOG] Erro em sync_catalog_copies:', error);
    throw error;
  }
  return data;
}
