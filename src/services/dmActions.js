/**
 * ============================================================================
 * INVENTÁRIO COMPLETO DAS AÇÕES DO PAINEL DO MESTRE (CONFESSOR)
 * Arquitetura Simples: 3 Heróis Fixos + Mestre (sem sessões / sem tabela players)
 * ============================================================================
 */

import { supabase } from '../shared/supabase';

function handleError(actionName, error) {
  const msg = error?.message || error?.error_description || String(error || 'Erro desconhecido');
  console.error(`[DM Action Error] ${actionName}:`, error);

  if (msg.includes('Mochila cheia')) {
    return 'Não foi possível enviar o item: Mochila cheia (40/40 espaços ocupados).';
  }
  if (msg.includes('Moedas insuficientes') || msg.includes('Saldo insuficiente')) {
    return 'Não foi possível completar a transação: Moedas de bronze insuficientes.';
  }
  if (msg.includes('não encontrado')) {
    return 'Jurado ou item não encontrado nos registros.';
  }
  return `Falha em ${actionName}: ${msg}`;
}

/* ─── 1. MESA (ESTADO DO JOGADOR) ────────────────────────── */

export async function dmUpdatePlayerState(_sessionCode = 'MESA', characterId, changes) {
  if (!characterId) return { success: false, error: 'Identificador do personagem ausente.' };
  try {
    const { data, error } = await supabase.rpc('set_hero_state', {
      p_character_id: characterId,
      p_changes: changes,
    });

    if (error) throw error;
    if (data?.success === false) throw new Error(data.error);
    return { success: true, player: data };
  } catch (err) {
    try {
      const { data: updateData, error: updateErr } = await supabase
        .from('characters')
        .update(changes)
        .eq('id', characterId)
        .select()
        .single();
      if (!updateErr && updateData) {
        return { success: true, player: updateData };
      }
    } catch (_) {}
    const errorMsg = handleError('atualizar estado do jogador', err);
    return { success: false, error: errorMsg };
  }
}

export async function dmSetPlayerConditions(_sessionCode = 'MESA', characterId, conditions) {
  return dmUpdatePlayerState(_sessionCode, characterId, { conditions });
}

export async function dmSetDeathSaves(_sessionCode = 'MESA', characterId, deathSaves) {
  return dmUpdatePlayerState(_sessionCode, characterId, { death_saves: deathSaves });
}

export async function dmAdjustCoins(
  characterId,
  delta,
  reason = 'mestre',
  ref = null,
  _sessionCode = 'MESA',
) {
  if (!characterId) return { success: false, error: 'Identificador do personagem ausente.' };
  try {
    const { data, error } = await supabase.rpc('adjust_coins', {
      p_character_id: characterId,
      p_delta: Number(delta),
      p_reason: reason,
      p_ref: ref,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    try {
      const { data: charData, error: charErr } = await supabase
        .from('characters')
        .select('coins_bronze')
        .eq('id', characterId)
        .single();
      if (!charErr && charData) {
        const nextBal = Math.max(0, (charData.coins_bronze || 0) + Number(delta));
        await supabase.from('characters').update({ coins_bronze: nextBal }).eq('id', characterId);
        try {
          await supabase.from('coin_ledger').insert({
            character_id: characterId,
            delta: Number(delta),
            balance_after: nextBal,
            reason: reason,
            ref_id: ref,
          });
        } catch (_) {}
        return { success: true, data: { balance: nextBal } };
      }
    } catch (_) {}
    const errorMsg = handleError('ajustar moedas', err);
    return { success: false, error: errorMsg };
  }
}

export async function dmGiveCoinsToAll(characterIds = [], amountBronze, _sessionCode = 'MESA') {
  try {
    const { data, error } = await supabase.rpc('dm_give_coins_to_all', {
      p_amount: Number(amountBronze),
      p_reason: 'mestre_todos',
    });

    if (error) throw error;
    return { success: true, count: characterIds.length || 3, data };
  } catch (err) {
    const errorMsg = handleError('dar moedas a todos', err);
    return { success: false, error: errorMsg };
  }
}

export async function dmReleaseCharacter(_sessionCode = 'MESA', characterId) {
  // No modelo simples, heróis não são bloqueados por aparelhos
  return { success: true, message: 'Personagem livre.' };
}

export async function dmGetCharacterInventory(characterId, _sessionCode = 'MESA') {
  if (!characterId) return [];
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('character_id', characterId)
      .order('slot_index', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[dmGetCharacterInventory Error]', err);
    return [];
  }
}

export async function dmUpdateInventoryItem(itemId, updates) {
  if (!itemId) return { success: false, error: 'ID do item ausente.' };
  try {
    const { data, error } = await supabase.rpc('update_item', {
      p_item_id: itemId,
      p_changes: updates,
    });

    if (error) throw error;
    return { success: true, item: data };
  } catch (err) {
    const errorMsg = handleError('editar item', err);
    return { success: false, error: errorMsg };
  }
}

export async function dmDeleteInventoryItem(
  itemId,
  characterId,
  itemName = 'Item',
  _sessionCode = 'MESA',
) {
  if (!itemId) return { success: false, error: 'ID do item ausente.' };
  try {
    const { error } = await supabase.rpc('remove_item', {
      p_item_id: itemId,
    });

    if (error) throw error;

    // Notifica na mesa
    if (characterId) {
      await supabase.from('messages').insert({
        from_id: 'CONFESSOR',
        to_id: characterId,
        author_name: 'Confessor',
        text: `⚖ O Confessor confiscou "${itemName}" da sua mochila.`,
        priority: 'SAGRADA',
      });
    }

    return { success: true };
  } catch (err) {
    const errorMsg = handleError('confiscar item', err);
    return { success: false, error: errorMsg };
  }
}

/* ─── 2. ITENS & FORJA MÍSTICA ───────────────────────────── */

export async function dmGiveCatalogItem(
  characterId,
  catalogId,
  quantity = 1,
  _sessionCode = 'MESA',
) {
  if (!characterId || !catalogId) {
    return { success: false, error: 'Jurado e Item do Catálogo são obrigatórios.' };
  }
  try {
    const { data, error } = await supabase.rpc('give_catalog_item', {
      p_catalog_id: catalogId,
      p_character_id: characterId,
      p_quantity: Number(quantity) || 1,
    });

    if (error) throw error;
    return { success: true, itemId: data };
  } catch (err) {
    const errorMsg = handleError('enviar item do catálogo', err);
    return { success: false, error: errorMsg };
  }
}

export async function dmForgeCustomItem(characterId, itemData, _sessionCode = 'MESA') {
  if (!characterId || !itemData || !itemData.name) {
    return { success: false, error: 'Jurado e Dados do Item Forjado são obrigatórios.' };
  }
  try {
    const { data, error } = await supabase.rpc('give_custom_item', {
      p_character_id: characterId,
      p_item: itemData,
    });

    if (error) throw error;

    // Notifica o jogador
    await supabase.from('messages').insert({
      from_id: 'CONFESSOR',
      to_id: characterId,
      author_name: 'Forja Mística',
      text: `✨ O Confessor forjou e entregou em sua mochila: "${itemData.name}"!`,
      priority: 'SAGRADA',
    });

    return { success: true, itemId: data };
  } catch (err) {
    const errorMsg = handleError('forjar item customizado', err);
    return { success: false, error: errorMsg };
  }
}

export async function dmCreateShopItem(_sessionCode = 'MESA', itemData) {
  try {
    const { data, error } = await supabase
      .from('shop_items')
      .insert({
        name: itemData.name,
        description: itemData.description || '',
        image_url: itemData.image_url || null,
        icon: itemData.icon || '🎒',
        category: itemData.category || 'geral',
        rarity: itemData.rarity || 'Comum',
        wear_type: itemData.wear_type || 'unlimited',
        durability: itemData.durability ?? 1,
        max_durability: itemData.max_durability ?? 1,
        quantity: itemData.quantity || 1,
        equippable_as: itemData.equippable_as || null,
        price_bronze: Number(itemData.price_bronze) || 0,
        active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, item: data };
  } catch (err) {
    const errorMsg = handleError('colocar item na loja', err);
    return { success: false, error: errorMsg };
  }
}

/* ─── 3. LOJA DA SESSÃO ──────────────────────────────────── */

export async function dmToggleShop(_sessionCode = 'MESA', isOpen, shopName) {
  try {
    const updates = { shop_open: !!isOpen };
    if (shopName) updates.shop_name = shopName;

    const { data, error } = await supabase
      .from('game_state')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    return { success: true, state: data };
  } catch (err) {
    const errorMsg = handleError('alterar estado da loja', err);
    return { success: false, error: errorMsg };
  }
}

export async function dmDeleteShopItem(shopItemId) {
  try {
    const { error } = await supabase.from('shop_items').delete().eq('id', shopItemId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    const errorMsg = handleError('remover item da loja', err);
    return { success: false, error: errorMsg };
  }
}

/* ─── 4. COMBATE ─────────────────────────────────────────── */

export async function dmDamagePlayerInCombat(_sessionCode = 'MESA', characterId, damage) {
  if (!characterId) return { success: false, error: 'Identificador do personagem ausente.' };
  try {
    const { data: hero, error: fetchErr } = await supabase
      .from('characters')
      .select('health, max_health')
      .eq('id', characterId)
      .single();

    if (fetchErr || !hero) throw new Error('Personagem não encontrado.');

    const newHp = Math.max(0, (hero.health || 0) - Number(damage));
    return await dmUpdatePlayerState('MESA', characterId, { health: newHp });
  } catch (err) {
    const errorMsg = handleError('aplicar dano de combate', err);
    return { success: false, error: errorMsg };
  }
}

export async function dmDownPlayer(_sessionCode = 'MESA', characterId) {
  return await dmUpdatePlayerState('MESA', characterId, { health: 0, alive: false });
}

/* ─── 5. MENSAGENS ───────────────────────────────────────── */

export async function dmSendMessageToPlayer(
  characterId,
  text,
  _sessionCode = 'MESA',
  priority = 'SAGRADA',
) {
  if (!characterId || !text)
    return { success: false, error: 'Destinatário e mensagem são obrigatórios.' };
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        from_id: 'CONFESSOR',
        to_id: characterId,
        author_name: 'Confessor',
        text,
        priority,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, message: data };
  } catch (err) {
    const errorMsg = handleError('enviar missiva', err);
    return { success: false, error: errorMsg };
  }
}

export async function dmBroadcastMessage(text, _sessionCode = 'MESA', priority = 'SAGRADA') {
  if (!text) return { success: false, error: 'Texto da mensagem ausente.' };
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        from_id: 'CONFESSOR',
        to_id: 'todos',
        author_name: 'Confessor da Mesa',
        text,
        priority,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, message: data };
  } catch (err) {
    const errorMsg = handleError('enviar anúncio para todos', err);
    return { success: false, error: errorMsg };
  }
}

/* ─── 6. PROGRESSÃO & RECEITAS ───────────────────────────── */

export async function dmAwardXP(_sessionCode = 'MESA', characterId, amount, reason = 'Vitória') {
  if (!characterId || !amount)
    return { success: false, error: 'Jurado e quantidade de XP são obrigatórios.' };
  try {
    const { data: hero } = await supabase
      .from('characters')
      .select('xp')
      .eq('id', characterId)
      .single();

    const newXp = (hero?.xp || 0) + Number(amount);

    await supabase
      .from('characters')
      .update({ xp: newXp, updated_at: new Date().toISOString() })
      .eq('id', characterId);

    await supabase.from('xp_awards').insert({
      character_id: characterId,
      amount: Number(amount),
      note: reason,
    });

    return { success: true, xp: newXp };
  } catch (err) {
    const errorMsg = handleError('conceder XP', err);
    return { success: false, error: errorMsg };
  }
}

export async function dmTeachRecipe(characterId, recipeId, source = 'mestre') {
  if (!characterId || !recipeId)
    return { success: false, error: 'Jurado e receita são obrigatórios.' };
  try {
    const { data, error } = await supabase.rpc('teach_recipe', {
      p_character_id: characterId,
      p_recipe_id: recipeId,
      p_source: source,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    const errorMsg = handleError('ensinar receita', err);
    return { success: false, error: errorMsg };
  }
}

export async function dmLevelUpCharacter(characterId, choices = {}) {
  if (!characterId) return { success: false, error: 'Identificador do personagem ausente.' };
  try {
    const { data, error } = await supabase.rpc('level_up', {
      p_character_id: characterId,
      p_choices: choices,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    const errorMsg = handleError('subir de nível', err);
    return { success: false, error: errorMsg };
  }
}

/* ─── 7. ITENS SEM DONO ──────────────────────────────────── */

export async function dmFetchItensSemDono() {
  try {
    const { data, error } = await supabase
      .from('itens_sem_dono')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[dmFetchItensSemDono]', err);
    return [];
  }
}

export async function dmAssignItemSemDono(semDonoId, characterId) {
  if (!semDonoId || !characterId)
    return { success: false, error: 'ID do item e do herói são obrigatórios.' };
  try {
    const { data: semDono, error: fetchErr } = await supabase
      .from('itens_sem_dono')
      .select('*')
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
    const errorMsg = handleError('entregar item sem dono', err);
    return { success: false, error: errorMsg };
  }
}
