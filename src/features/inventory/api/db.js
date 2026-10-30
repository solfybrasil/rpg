import { toast } from 'sonner';
import { getSafeRealtimeChannel, subscribeRealtime, supabase } from '../../../shared/supabase';

const UNIVERSAL_SESSION_CODE = 'MESA';

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

import { updateCharacterInDB } from '../../sheet/api';
export async function transferItemInDB({
  senderId,
  targetId,
  itemId,
  quantity = 1,
  targetSlot = null,
}) {
  return transferInventoryItemInDB({
    fromCharacterId: senderId,
    toCharacterId: targetId,
    itemId,
    quantity,
    targetSlot,
  });
}

/**
 * Adiciona um item ao inventário de um herói diretamente no Supabase
 */
export async function addItemToPlayerInDB(characterId, item) {
  return createInventoryItemInDB({ ...item, character_id: characterId });
}

/**
 * Remove um item do inventário
 */
export async function removeItemFromPlayerInDB(characterId, itemId) {
  return deleteInventoryItemInDB(itemId);
}

// ═══════════════════════════════════════════════════════════════════════
// GESTÃO AVANÇADA DE INVENTÁRIO (TABELA inventory_items + STORAGE + REALTIME)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Busca todos os itens de inventário (ou de um herói específico)
 */
export async function fetchInventoryItems(arg1 = null, arg2 = null) {
  try {
    let charId = null;
    if (arg2) {
      charId = arg2;
    } else if (arg1 && arg1 !== 'MESA' && arg1 !== UNIVERSAL_SESSION_CODE && arg1.length > 4) {
      charId = arg1;
    }

    let query = supabase
      .from('inventory_items')
      .select(INV_COLS)
      .order('slot_index', { ascending: true });

    if (charId) {
      query = query.or(`character_id.eq.${charId},player_id.eq.${charId}`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[SUPABASE] Falha ao carregar inventory_items:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('[SUPABASE] Erro inesperado ao buscar inventory_items:', err);
    return [];
  }
}

/**
 * Insere um novo item no inventário (encontra o primeiro slot livre de 0 a 39 se não especificado)
 */
export async function createInventoryItemInDB(item) {
  try {
    const sessionCode = item.session_code || item.sessionCode || 'MESA';
    const playerId = item.player_id || item.playerId;

    let targetSlot = item.slot_index ?? item.slotIndex;
    if (targetSlot === undefined || targetSlot < 0) {
      // Descobre slots ocupados
      const { data: existing } = await supabase
        .from('inventory_items')
        .select('slot_index')
        .eq('session_code', sessionCode)
        .eq('player_id', playerId);

      const occupied = new Set((existing || []).map((i) => i.slot_index));
      for (let s = 0; s < 40; s++) {
        if (!occupied.has(s)) {
          targetSlot = s;
          break;
        }
      }
      if (targetSlot === undefined) {
        throw new Error('Inventário do jogador está cheio (40/40 slots ocupados)');
      }
    }

    const row = {
      session_code: sessionCode,
      player_id: playerId,
      character_id: item.character_id || item.characterId || null,
      slot_index: targetSlot,
      name: item.name,
      description: item.description || '',
      image_url: item.image_url || item.imageUrl || null,
      icon: item.icon || '🗡️',
      category: item.category || 'geral',
      rarity: item.rarity || 'Comum',
      wear_type: item.wear_type || item.wearType || 'unlimited',
      durability: item.durability ?? 1,
      max_durability: item.max_durability ?? item.maxDurability ?? 1,
      quantity: item.quantity ?? 1,
      equippable_as: item.equippable_as || item.equippableAs || null,
      equip_slot: item.equip_slot || item.equipSlot || null,
      weapon_class: item.weapon_class || item.weaponClass || null,
      damage_dice: item.damage_dice || item.damageDice || null,
      attack_attr: item.attack_attr || item.attackAttr || null,
      two_handed:
        item.two_handed !== undefined
          ? !!item.two_handed
          : item.twoHanded !== undefined
            ? !!item.twoHanded
            : false,
      ranged: item.ranged !== undefined ? !!item.ranged : false,
      ammo_type: item.ammo_type || item.ammoType || null,
      armor_bonus: Number(item.armor_bonus ?? item.armorBonus ?? 0),
      attack_bonus: Number(item.attack_bonus ?? item.attackBonus ?? 0),
      damage_bonus: Number(item.damage_bonus ?? item.damageBonus ?? 0),
      quality: item.quality || 'Comum',
      special: item.special || null,
      price_bronze:
        item.price_bronze !== undefined
          ? Number(item.price_bronze)
          : item.priceBronze !== undefined
            ? Number(item.priceBronze)
            : null,
      metadata: item.metadata || {},
    };

    const { data, error } = await supabase.from('inventory_items').insert(row).select().single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SUPABASE] Erro ao criar item no inventário:', err);
    throw err;
  }
}

/**
 * Atualiza campos de um item (durabilidade, quantidade, etc.)
 */
export async function updateInventoryItemInDB(itemId, updates) {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SUPABASE] Erro ao atualizar item no inventário:', err);
    throw err;
  }
}

/**
 * Remove um item do inventário pelo ID
 */
export async function deleteInventoryItemInDB(itemId) {
  try {
    const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[SUPABASE] Erro ao deletar item do inventário:', err);
    throw err;
  }
}

/**
 * Move ou troca posição de slots (Drag and Drop) via RPC canônica move_inventory_item
 */
export async function moveInventoryItemInDB(itemId, targetSlot, _ignored = null) {
  try {
    const { data, error } = await supabase.rpc('move_inventory_item', {
      p_item_id: itemId,
      p_target_slot: Number(targetSlot),
    });

    if (error) throw error;
    return data || { success: true };
  } catch (err) {
    console.error('[SUPABASE] Erro ao mover item de slot:', err);
    throw err;
  }
}

/**
 * Transfere item entre heróis via RPC canônica transfer_inventory_item
 */
export async function transferInventoryItemInDB(
  itemId,
  targetCharacterId,
  targetSlot = -1,
  quantity = 1,
) {
  try {
    const qty = Math.max(1, Number.parseInt(quantity, 10) || 1);
    const slot =
      typeof targetSlot === 'number' ? targetSlot : Number.parseInt(targetSlot, 10) || -1;

    const { data, error } = await supabase.rpc('transfer_inventory_item', {
      p_item_id: itemId,
      p_target_character_id: targetCharacterId,
      p_target_slot: slot,
      p_quantity: qty,
    });

    if (error) {
      // Se der erro de sobrecarga ou RPC ausente, executa fallback direto
      if (error.code === 'PGRST203' || error.code === 'PGRST202') {
        const { error: directErr } = await supabase
          .from('inventory_items')
          .update({
            character_id: targetCharacterId,
            player_id: targetCharacterId,
            equip_slot: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', itemId);
        if (directErr) throw directErr;
        return { success: true };
      }
      throw error;
    }
    return data || { success: true };
  } catch (err) {
    console.error('[SUPABASE] Erro ao transferir item:', err);
    // Fallback de resiliência
    try {
      const { error: fallbackErr } = await supabase
        .from('inventory_items')
        .update({
          character_id: targetCharacterId,
          player_id: targetCharacterId,
          equip_slot: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);
      if (!fallbackErr) return { success: true };
    } catch (_) {}
    throw err;
  }
}

/**
 * Upload de imagem de item para o Supabase Storage (bucket 'items')
 */
export async function uploadItemImageToStorage(file) {
  try {
    const fileExt = file.name ? file.name.split('.').pop() : 'png';
    const fileName = `item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('items').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

    if (uploadError) {
      toast.error(`Erro no upload para o bucket items: ${uploadError.message}`, {
        action: { label: 'Tentar de novo', onClick: () => void uploadItemImageToStorage(file) },
      });
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage.from('items').getPublicUrl(filePath);

    return publicUrlData?.publicUrl || '';
  } catch (err) {
    toast.error(`Falha no upload da imagem do item: ${err?.message || 'Erro de rede'}`, {
      action: { label: 'Tentar de novo', onClick: () => void uploadItemImageToStorage(file) },
    });
    throw err;
  }
}

/**
 * Assina atualizações em tempo real na tabela inventory_items
 */
export function subscribeToInventoryRealtime(_sessionCode = 'MESA', onUpdate) {
  return subscribeRealtime({
    topic: 'inventory_realtime',
    table: 'inventory_items',
    queryKeyToUpdate: ['inventory', 'all'],
    handler: onUpdate,
  });
}

/* ══════════════════════════════════════════════════════════════
   SISTEMA DE EQUIPAMENTO, MOEDAS E LOJA (FASE 4)
   ══════════════════════════════════════════════════════════════ */

/**
 * Chama RPC atômica equip_item
 */
export async function equipItemInDB(itemId, slot) {
  try {
    const { data, error } = await supabase.rpc('equip_item', {
      p_item_id: itemId,
      p_slot: slot,
    });
    if (error) {
      console.warn('[EQUIP RPC] Falha na RPC, usando fallback direto:', error.message);
      const { data: itemData } = await supabase
        .from('inventory_items')
        .select('player_id, character_id')
        .eq('id', itemId)
        .single();
      const ownerId = itemData?.character_id || itemData?.player_id;

      if (ownerId) {
        await supabase
          .from('inventory_items')
          .update({ equip_slot: null, updated_at: new Date().toISOString() })
          .or(`character_id.eq.${ownerId},player_id.eq.${ownerId}`)
          .eq('equip_slot', slot);
      }

      const { data: updated, error: directErr } = await supabase
        .from('inventory_items')
        .update({
          equip_slot: slot,
          slot_index: -1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select()
        .single();

      if (directErr) throw directErr;
      return updated || { success: true };
    }
    return data || { success: true };
  } catch (err) {
    console.error('[EQUIP ERROR]', err);
    try {
      const { data: updated } = await supabase
        .from('inventory_items')
        .update({ equip_slot: slot, slot_index: -1, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select()
        .single();
      if (updated) return updated;
    } catch (_) {}
    throw err;
  }
}

/**
 * Chama RPC atômica unequip_item (com fallback direto)
 */
export async function unequipItemInDB(itemId, targetSlot = -1) {
  try {
    const { data, error } = await supabase.rpc('unequip_item', {
      p_item_id: itemId,
      p_target_slot: Number(targetSlot),
    });
    if (error) {
      console.warn('[UNEQUIP RPC] Falha na RPC, usando fallback direto:', error.message);
      const { data: updated, error: directErr } = await supabase
        .from('inventory_items')
        .update({
          equip_slot: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select()
        .single();

      if (directErr) throw directErr;
      return updated || { success: true };
    }
    return data || { success: true };
  } catch (err) {
    console.error('[UNEQUIP ERROR]', err);
    try {
      const { data: updated } = await supabase
        .from('inventory_items')
        .update({ equip_slot: null, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select()
        .single();
      if (updated) return updated;
    } catch (_) {}
    throw err;
  }
}

/**
 * Executa a RPC atômica adjust_coins no PostgreSQL
 */
export async function adjustCoinsRPC(characterId, delta, reason = 'ajuste', ref = null) {
  const d = Number(delta) || 0;
  try {
    const { data, error } = await supabase.rpc('adjust_coins', {
      p_character_id: characterId,
      p_delta: d,
      p_reason: reason || 'ajuste',
      p_ref: ref ? String(ref) : null,
    });
    if (!error && data) return data;
    if (error) throw error;
  } catch (rpcErr) {
    console.warn(
      '[COIN RPC WARN] RPC adjust_coins falhou, executando fallback JS:',
      rpcErr?.message || rpcErr,
    );

    const { data: char, error: charErr } = await supabase
      .from('characters')
      .select('coins_bronze')
      .eq('id', characterId)
      .single();

    if (charErr || !char) {
      throw new Error('Personagem não encontrado para ajustar moedas.');
    }

    const currentCoins = Number(char.coins_bronze) || 0;
    const newBalance = Math.max(0, currentCoins + d);

    const { error: updateErr } = await supabase
      .from('characters')
      .update({ coins_bronze: newBalance, updated_at: new Date().toISOString() })
      .eq('id', characterId);

    if (updateErr) {
      throw new Error(updateErr.message || 'Erro ao ajustar moedas');
    }

    try {
      await supabase.from('coin_ledger').insert({
        character_id: characterId,
        delta: d,
        amount: d,
        balance_after: newBalance,
        reason: reason || 'ajuste',
        description: ref ? String(ref) : 'ajuste_manual',
      });
    } catch (_) {}

    return { success: true, balance: newBalance };
  }
}

/**
 * Busca o histórico do coin_ledger para um jogador
 */
export async function fetchCoinLedgerFromDB(characterId, limit = 30) {
  let query = supabase
    .from('coin_ledger')
    .select(COIN_COLS)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (characterId) {
    query = query.or(`character_id.eq.${characterId},player_id.eq.${characterId}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[COIN LEDGER FETCH ERROR]', error);
    return [];
  }
  return data || [];
}

/**
 * Assina eventos em tempo real do coin_ledger
 */
export function subscribeToCoinLedgerRealtime(_sessionCode, onEntry) {
  const channel = getSafeRealtimeChannel('coin_ledger_realtime_all')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'coin_ledger',
      },
      (payload) => {
        if (!payload.new) return;
        onEntry?.(payload.new);
      },
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {}
  };
}

/**
 * Chama RPC atômica transfer_coins com fallback resiliente direto
 */
export async function transferCoinsInDB(fromCharacterId, toCharacterId, amountBronze) {
  const amount = Number(amountBronze);
  if (amount <= 0) throw new Error('A quantia transferida deve ser maior que zero.');
  if (fromCharacterId === toCharacterId)
    throw new Error('Não é possível transferir moedas para si mesmo.');

  try {
    const { data, error } = await supabase.rpc('transfer_coins', {
      p_from: fromCharacterId,
      p_to: toCharacterId,
      p_amount: amount,
    });
    if (!error && data) return data;
    if (error) throw error;
  } catch (rpcErr) {
    console.warn(
      '[COINS] RPC transfer_coins com sobrecarga/erro no Postgres, aplicando transferência resiliente:',
      rpcErr,
    );

    // Fallback resiliente direto no Supabase
    // 1. Busca saldo do remetente
    const { data: fromChar, error: fromErr } = await supabase
      .from('characters')
      .select('coins_bronze')
      .eq('id', fromCharacterId)
      .single();
    if (fromErr || !fromChar) throw new Error(`Herói remetente ${fromCharacterId} não encontrado.`);

    const fromBal = Number(fromChar.coins_bronze) || 0;
    if (fromBal < amount) throw new Error('Moedas insuficientes.');

    // 2. Busca saldo do destinatário
    const { data: toChar, error: toErr } = await supabase
      .from('characters')
      .select('coins_bronze')
      .eq('id', toCharacterId)
      .single();
    if (toErr || !toChar) throw new Error(`Herói destinatário ${toCharacterId} não encontrado.`);

    const toBal = Number(toChar.coins_bronze) || 0;
    const newFromBal = fromBal - amount;
    const newToBal = toBal + amount;

    // 3. Atualiza saldos nas fichas
    await supabase
      .from('characters')
      .update({ coins_bronze: newFromBal })
      .eq('id', fromCharacterId);
    await supabase.from('characters').update({ coins_bronze: newToBal }).eq('id', toCharacterId);

    // 4. Registra no coin_ledger para histórico
    await supabase.from('coin_ledger').insert([
      {
        character_id: fromCharacterId,
        player_id: fromCharacterId,
        delta: -amount,
        amount: -amount,
        balance_after: newFromBal,
        reason: 'transferencia_enviada',
        description: `Enviado para ${toCharacterId}`,
      },
      {
        character_id: toCharacterId,
        player_id: toCharacterId,
        delta: amount,
        amount: amount,
        balance_after: newToBal,
        reason: 'transferencia_recebida',
        description: `Recebido de ${fromCharacterId}`,
      },
    ]);

    return {
      success: true,
      from: fromCharacterId,
      to: toCharacterId,
      amount,
      from_balance: newFromBal,
      to_balance: newToBal,
    };
  }
}

/**
 * Busca itens sem dono para distribuição pelo Mestre
 */
export async function fetchItensSemDonoFromDB() {
  try {
    const { data, error } = await supabase
      .from('itens_sem_dono')
      .select(SEM_DONO_COLS)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[ITENS_SEM_DONO] Erro ao carregar itens sem dono:', err.message);
    return [];
  }
}

/**
 * Mestre entrega item sem dono para um herói
 */
export async function assignItemSemDonoToHero(semDonoId, characterId) {
  try {
    const { data: semDono, error: fetchErr } = await supabase
      .from('itens_sem_dono')
      .select(SEM_DONO_COLS)
      .eq('id', semDonoId)
      .single();

    if (fetchErr || !semDono) throw new Error('Item sem dono não encontrado.');

    const item = semDono.item_data;

    // Encontra menor slot livre de 0 a 39
    const { data: existingSlots } = await supabase
      .from('inventory_items')
      .select('slot_index')
      .eq('character_id', characterId)
      .is('equip_slot', null);

    const occupied = new Set((existingSlots || []).map((s) => s.slot_index));
    let freeSlot = -1;
    for (let i = 0; i < 40; i++) {
      if (!occupied.has(i)) {
        freeSlot = i;
        break;
      }
    }

    if (freeSlot === -1) {
      throw new Error('Mochila cheia (40/40 espaços ocupados).');
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('inventory_items')
      .insert({
        character_id: characterId,
        slot_index: freeSlot,
        name: item.name,
        description: item.description || '',
        image_url: item.image_url || null,
        icon: item.icon || '🎒',
        category: item.category || 'Geral',
        rarity: item.rarity || 'Comum',
        wear_type: item.wear_type || 'unlimited',
        durability: item.durability ?? 1,
        max_durability: item.max_durability ?? 1,
        quantity: item.quantity || 1,
        equippable_as: item.equippable_as || null,
        damage_dice: item.damage_dice || null,
        armor_bonus: item.armor_bonus || 0,
        attack_bonus: item.attack_bonus || 0,
        damage_bonus: item.damage_bonus || 0,
        quality: item.quality || 'Comum',
        special: item.special || null,
        price_bronze: item.price_bronze || 0,
        catalog_id: item.catalog_id || null,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Remove de itens_sem_dono
    await supabase.from('itens_sem_dono').delete().eq('id', semDonoId);

    return { success: true, item: inserted };
  } catch (err) {
    console.error('[ITENS_SEM_DONO] Erro ao entregar item sem dono:', err);
    throw err;
  }
}
