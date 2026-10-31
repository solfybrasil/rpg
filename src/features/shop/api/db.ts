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

import { adjustCoinsRPC } from '../../inventory/api/db';
export async function buyShopItemInDB(characterId, shopItemId, qty = 1) {
  const quantity = Math.max(1, Number(qty) || 1);

  try {
    const { data, error } = await supabase.rpc('buy_shop_item', {
      p_character_id: characterId,
      p_shop_item_id: shopItemId,
      p_qty: quantity,
    });
    if (!error && data) return data;
    if (error) throw error;
  } catch (rpcErr) {
    console.warn(
      '[SHOP RPC WARN] buy_shop_item RPC falhou, executando fallback JS:',
      rpcErr?.message || rpcErr,
    );

    // Fallback direto no Supabase
    // 1. Busca o item na loja
    const { data: shopItem, error: shopErr } = await supabase
      .from('shop_items')
      .select(SHOP_COLS)
      .eq('id', shopItemId)
      .single();

    if (shopErr || !shopItem) {
      throw new Error('Item da loja não encontrado.');
    }

    if (shopItem.stock !== null && shopItem.stock !== undefined && shopItem.stock < quantity) {
      throw new Error('Estoque insuficiente para este item.');
    }

    const totalPrice = (Number(shopItem.price_bronze) || 0) * quantity;

    // 2. Busca o personagem
    const { data: char, error: charErr } = await supabase
      .from('characters')
      .select('id, coins_bronze')
      .eq('id', characterId)
      .single();

    if (charErr || !char) {
      throw new Error('Personagem não encontrado.');
    }

    const currentCoins = Number(char.coins_bronze) || 0;
    if (currentCoins < totalPrice) {
      throw new Error(
        `Moedas insuficientes! Você possui ${currentCoins} bronze e a compra custa ${totalPrice} bronze.`,
      );
    }

    const newBalance = currentCoins - totalPrice;

    // 3. Atualiza moedas do personagem
    const { error: updateCharErr } = await supabase
      .from('characters')
      .update({ coins_bronze: newBalance, updated_at: new Date().toISOString() })
      .eq('id', characterId);

    if (updateCharErr) {
      throw new Error('Erro ao atualizar moedas do personagem: ' + updateCharErr.message);
    }

    // 4. Atualiza estoque na loja (se limitado)
    if (shopItem.stock !== null && shopItem.stock !== undefined) {
      const newStock = Math.max(0, shopItem.stock - quantity);
      await supabase.from('shop_items').update({ stock: newStock }).eq('id', shopItemId);
    }

    // 5. Adiciona o item ao inventário do jogador (calculando primeiro slot_index vago)
    let nextSlotIndex = 0;
    try {
      const { data: existingInv } = await supabase
        .from('inventory_items')
        .select('slot_index')
        .or(`character_id.eq.${characterId},player_id.eq.${characterId}`);

      const usedSlots = new Set(
        (existingInv || []).map((i) => i.slot_index).filter((s) => typeof s === 'number' && s >= 0),
      );
      while (usedSlots.has(nextSlotIndex) && nextSlotIndex < 40) {
        nextSlotIndex++;
      }
    } catch (_) {}

    const inventoryPayload = {
      session_code: shopItem.session_code || 'MESA',
      character_id: characterId,
      player_id: characterId,
      catalog_id: shopItem.catalog_id ? String(shopItem.catalog_id) : null,
      slot_index: nextSlotIndex < 40 ? nextSlotIndex : 0,
      name: shopItem.name,
      description: shopItem.description || '',
      image_url: shopItem.image_url || null,
      icon: shopItem.icon || '🎒',
      category: shopItem.category || 'Geral',
      rarity: shopItem.rarity || 'Comum',
      wear_type: shopItem.wear_type || 'unlimited',
      durability: shopItem.durability ?? 1,
      max_durability: shopItem.max_durability ?? 1,
      quantity: quantity,
      equippable_as: shopItem.equippable_as || null,
      equip_slot: null,
      weapon_class: shopItem.weapon_class || null,
      damage_dice: shopItem.damage_dice || null,
      attack_attr: shopItem.attack_attr || null,
      two_handed: !!shopItem.two_handed,
      ranged: !!shopItem.ranged,
      ammo_type: shopItem.ammo_type || null,
      armor_bonus: Number(shopItem.armor_bonus) || 0,
      attack_bonus: Number(shopItem.attack_bonus) || 0,
      damage_bonus: Number(shopItem.damage_bonus) || 0,
      quality: shopItem.quality || 'Comum',
      special: shopItem.special || null,
      price_bronze: shopItem.price_bronze || 0,
    };

    const { data: insertedItem, error: invErr } = await supabase
      .from('inventory_items')
      .insert(inventoryPayload)
      .select()
      .single();

    if (invErr) {
      console.error('[SHOP FALLBACK] Erro ao inserir item no inventário:', invErr);
    }

    // 6. Registra no ledger (opcional)
    try {
      await supabase.from('coin_ledger').insert({
        character_id: characterId,
        delta: -totalPrice,
        amount: -totalPrice,
        balance_after: newBalance,
        reason: 'compra_loja',
        description: `Compra: ${shopItem.name}`,
      });
    } catch (_) {}

    return {
      success: true,
      balance: newBalance,
      item: insertedItem,
    };
  }
}

/**
 * Chama RPC atômica sell_item com fallback resiliente direto no Supabase
 */
export async function sellItemInDB(arg1, arg2, arg3 = 1) {
  let characterId = arg1;
  let itemId = arg2;
  let qty = arg3;

  // Compatibilidade com sellItemInDB(itemId, qty)
  if (typeof arg1 === 'string' && arg1.length === 36 && typeof arg2 === 'number') {
    itemId = arg1;
    qty = arg2;
    characterId = 'tor_bjorn';
  }

  const quantity = Math.max(1, Number(qty) || 1);

  try {
    const { data, error } = await supabase.rpc('sell_item', {
      p_character_id: characterId,
      p_item_id: itemId,
      p_qty: quantity,
    });
    if (!error && data) return data;
    if (error) throw error;
  } catch (rpcErr) {
    console.warn(
      '[SHOP RPC WARN] sell_item RPC falhou, executando fallback JS:',
      rpcErr?.message || rpcErr,
    );

    // 1. Busca o item no inventário
    const { data: invItem, error: itemErr } = await supabase
      .from('inventory_items')
      .select(INV_COLS)
      .eq('id', itemId)
      .single();

    if (itemErr || !invItem) {
      throw new Error('Item do inventário não encontrado.');
    }

    const charIdToUse =
      characterId && characterId !== 'tor_bjorn' ? characterId : invItem.character_id;
    const sellPricePerUnit = Math.floor((Number(invItem.price_bronze) || 0) / 2);
    const totalEarned = sellPricePerUnit * quantity;

    // 2. Busca o personagem
    const { data: char, error: charErr } = await supabase
      .from('characters')
      .select('id, coins_bronze')
      .eq('id', charIdToUse)
      .single();

    if (charErr || !char) {
      throw new Error('Personagem não encontrado.');
    }

    const currentCoins = Number(char.coins_bronze) || 0;
    const newBalance = currentCoins + totalEarned;

    // 3. Atualiza moedas do personagem
    await supabase
      .from('characters')
      .update({ coins_bronze: newBalance, updated_at: new Date().toISOString() })
      .eq('id', charIdToUse);

    // 4. Reduz ou remove o item do inventário
    const currentInvQty = Number(invItem.quantity) || 1;
    if (currentInvQty <= quantity) {
      await supabase.from('inventory_items').delete().eq('id', itemId);
    } else {
      await supabase
        .from('inventory_items')
        .update({ quantity: currentInvQty - quantity })
        .eq('id', itemId);
    }

    // 5. Registra no ledger (opcional)
    try {
      await supabase.from('coin_ledger').insert({
        character_id: charIdToUse,
        delta: totalEarned,
        amount: totalEarned,
        balance_after: newBalance,
        reason: 'venda_loja',
        description: `Venda: ${invItem.name}`,
      });
    } catch (_) {}

    return {
      success: true,
      balance: newBalance,
      earned: totalEarned,
    };
  }
}

/**
 * Busca itens ativos da loja
 */
export async function fetchShopItemsFromDB(_sessionCode = 'MESA') {
  const { data, error } = await supabase
    .from('shop_items')
    .select(SHOP_COLS)
    .neq('active', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[SHOP] Erro ao buscar itens da loja:', error);
    return [];
  }
  return data || [];
}

/**
 * Cria novo item no catálogo da loja
 */
export async function createShopItemInDB(itemData) {
  const { data, error } = await supabase
    .from('shop_items')
    .insert({
      session_code: itemData.session_code || 'MESA',
      catalog_id: itemData.catalog_id ? String(itemData.catalog_id) : null,
      name: itemData.name,
      description: itemData.description || '',
      image_url: itemData.image_url || null,
      icon: itemData.icon || '🎒',
      category: itemData.category || 'Geral',
      rarity: itemData.rarity || 'Comum',
      wear_type: itemData.wear_type || 'unlimited',
      durability: itemData.durability ?? 1,
      max_durability: itemData.max_durability ?? 1,
      quantity: itemData.quantity || 1,
      equippable_as: itemData.equippable_as || null,
      equip_slot: itemData.equip_slot || null,
      weapon_class: itemData.weapon_class || null,
      damage_dice: itemData.damage_dice || null,
      attack_attr: itemData.attack_attr || null,
      two_handed: !!itemData.two_handed,
      ranged: !!itemData.ranged,
      ammo_type: itemData.ammo_type || null,
      armor_bonus: Number(itemData.armor_bonus) || 0,
      attack_bonus: Number(itemData.attack_bonus) || 0,
      damage_bonus: Number(itemData.damage_bonus) || 0,
      quality: itemData.quality || 'Comum',
      special: itemData.special || null,
      price_bronze: Number(itemData.price_bronze) || 0,
      stock:
        itemData.stock !== undefined && itemData.stock !== '' && itemData.stock !== null
          ? Number(itemData.stock)
          : null,
      active: itemData.active !== undefined ? !!itemData.active : true,
    })
    .select()
    .single();

  if (error) {
    console.error('[SHOP] Erro ao criar item na loja:', error);
    throw error;
  }
  return data;
}

/**
 * Atualiza um item da loja
 */
export async function updateShopItemInDB(shopItemId, updates) {
  const { data, error } = await supabase
    .from('shop_items')
    .update(updates)
    .eq('id', shopItemId)
    .select()
    .single();

  if (error) {
    console.error('[SHOP] Erro ao atualizar item da loja:', error);
    throw error;
  }
  return data;
}

/**
 * Remove um item do catálogo da loja
 */
export async function deleteShopItemInDB(shopItemId) {
  const { error } = await supabase.from('shop_items').delete().eq('id', shopItemId);

  if (error) {
    console.error('[SHOP] Erro ao deletar item da loja:', error);
    throw error;
  }
  return true;
}

/**
 * Alterna estado da loja em game_state (aberta/fechada, nome)
 */
export async function setSessionShopStateInDB(_sessionCode = 'MESA', shopOpen, shopName) {
  const updates = {};
  if (shopOpen !== undefined) updates.shop_open = !!shopOpen;
  if (shopName !== undefined) updates.shop_name = shopName;

  const { data, error } = await supabase
    .from('game_state')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select('shop_open, shop_name')
    .single();

  if (error) {
    console.error('[SHOP] Erro ao atualizar estado da loja em game_state:', error);
    throw error;
  }
  return data;
}

/**
 * Escuta mudanças na tabela shop_items em tempo real
 */
export function subscribeToShopRealtime(_sessionCode = 'MESA', onShopChange) {
  return subscribeRealtime({
    topic: 'shop_realtime',
    table: 'shop_items',
    queryKeyToUpdate: ['shop_items', _sessionCode || 'MESA'],
    handler: onShopChange,
  });
}
