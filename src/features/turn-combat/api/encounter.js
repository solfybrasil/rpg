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
// FASE 5: COMBATE, OFICINA, XP/NÍVEIS E DIÁRIO NA NUVEM
// ============================================================================

/**
 * Busca o encontro de combate ativo para a sessão
 */
export async function fetchActiveCombatEncounter(sessionCode = 'MESA') {
  try {
    const code = (sessionCode || 'MESA').toUpperCase();
    const { data, error } = await supabase
      .from('combat_encounters')
      .select(COMBAT_ENC_COLS)
      .eq('session_code', code)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[COMBAT] Erro ao buscar combate ativo:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[COMBAT] Erro:', err);
    return null;
  }
}

/**
 * Cria um novo combate ativo
 */
export async function createCombatEncounterInDB(
  sessionCode = 'MESA',
  name = 'Encontro de Combate',
) {
  const code = (sessionCode || 'MESA').toUpperCase();
  const { data, error } = await supabase
    .from('combat_encounters')
    .insert({
      session_code: code,
      name,
      active: true,
      round: 1,
      turn_index: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('[COMBAT] Erro ao criar combate:', error);
    throw error;
  }
  return data;
}

/**
 * Atualiza o combate (round, turn_index, etc.)
 */
export async function updateCombatEncounterInDB(encounterId, updates) {
  const { data, error } = await supabase
    .from('combat_encounters')
    .update(updates)
    .eq('id', encounterId)
    .select()
    .single();

  if (error) {
    console.error('[COMBAT] Erro ao atualizar combate:', error);
    throw error;
  }
  return data;
}

/**
 * Encerra o combate ativo
 */
export async function endCombatEncounterInDB(encounterId) {
  const { data, error } = await supabase
    .from('combat_encounters')
    .update({ active: false })
    .eq('id', encounterId)
    .select()
    .single();

  if (error) {
    console.error('[COMBAT] Erro ao encerrar combate:', error);
    throw error;
  }
  return data;
}

/**
 * Busca combatentes do encontro
 */
export async function fetchCombatantsFromDB(encounterId) {
  if (!encounterId) return [];
  try {
    const { data, error } = await supabase
      .from('combatants')
      .select(COMBATANT_COLS)
      .eq('encounter_id', encounterId)
      .order('initiative', { ascending: false });

    if (error) {
      console.error('[COMBAT] Erro ao buscar combatentes:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[COMBAT] Erro:', err);
    return [];
  }
}

/**
 * Adiciona um combatente
 */
export async function addCombatantToDB(combatantData) {
  const { data, error } = await supabase.from('combatants').insert(combatantData).select().single();

  if (error) {
    console.error('[COMBAT] Erro ao adicionar combatente:', error);
    throw error;
  }
  return data;
}

/**
 * Atualiza um combatente (HP, condições, iniciativa, etc.)
 */
export async function updateCombatantInDB(combatantId, updates) {
  const { data, error } = await supabase
    .from('combatants')
    .update(updates)
    .eq('id', combatantId)
    .select()
    .single();

  if (error) {
    console.error('[COMBAT] Erro ao atualizar combatente:', error);
    throw error;
  }
  return data;
}

/**
 * Remove um combatente
 */
export async function deleteCombatantFromDB(combatantId) {
  const { error } = await supabase.from('combatants').delete().eq('id', combatantId);

  if (error) {
    console.error('[COMBAT] Erro ao remover combatente:', error);
    throw error;
  }
  return true;
}

/**
 * Escuta mudanças de combate em tempo real
 */
export function subscribeToCombatRealtime(sessionCode = 'MESA', onCombatChange) {
  const code = (sessionCode || 'MESA').toUpperCase();
  const channel = getSafeRealtimeChannel(`combat_realtime_${code.toLowerCase()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'combat_encounters',
        filter: `session_code=eq.${code}`,
      },
      (payload) => {
        if (typeof onCombatChange === 'function') onCombatChange('encounter', payload);
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'combatants', filter: `session_code=eq.${code}` },
      (payload) => {
        if (typeof onCombatChange === 'function') onCombatChange('combatant', payload);
      },
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {}
  };
}

// ----------------------------------------------------------------------------
// COMBATE NA MESA - RPCS
// ----------------------------------------------------------------------------

export async function combatRollRPC(actorId, kind, targetId = null, options = {}) {
  try {
    const { data, error } = await supabase.rpc('combat_roll', {
      p_actor_id: actorId,
      p_kind: kind,
      p_target_id: targetId,
      p_options: options,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro combatRollRPC:', err);
    throw err;
  }
}

export async function combatDamageRPC(encounterId, attackerId, targetId, amount, isDirect = false) {
  try {
    const { data, error } = await supabase.rpc('combat_damage', {
      p_encounter_id: encounterId,
      p_attacker_id: attackerId,
      p_target_id: targetId,
      p_amount: amount,
      p_is_direct: isDirect,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro combatDamageRPC:', err);
    throw err;
  }
}

export async function combatUseAbilityRPC(
  actorId,
  abilityName,
  targetId = null,
  customDice = null,
) {
  try {
    const { data, error } = await supabase.rpc('combat_use_ability', {
      p_actor_id: actorId,
      p_ability_name: abilityName,
      p_target_id: targetId,
      p_custom_dice: customDice,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro combatUseAbilityRPC:', err);
    throw err;
  }
}

export async function combatUseItemRPC(actorId, itemId, targetId = null) {
  try {
    const { data, error } = await supabase.rpc('combat_use_item', {
      p_actor_id: actorId,
      p_item_id: itemId,
      p_target_id: targetId,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro combatUseItemRPC:', err);
    throw err;
  }
}

export async function combatEnemyAttackRPC(encounterId, enemyId, targetId, customDice = null) {
  try {
    const { data, error } = await supabase.rpc('combat_enemy_attack', {
      p_encounter_id: encounterId,
      p_enemy_id: enemyId,
      p_target_id: targetId,
      p_custom_dice: customDice,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro combatEnemyAttackRPC:', err);
    throw err;
  }
}

export async function combatReactionRPC(pendingId, actorId, reactionKind, diceOverride = null) {
  try {
    const { data, error } = await supabase.rpc('combat_reaction', {
      p_pending_id: pendingId,
      p_actor_id: actorId,
      p_reaction_kind: reactionKind,
      p_dice_override: diceOverride,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro combatReactionRPC:', err);
    throw err;
  }
}

export async function combatResolvePendingRPC(pendingId) {
  try {
    const { data, error } = await supabase.rpc('combat_resolve_pending', {
      p_pending_id: pendingId,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro combatResolvePendingRPC:', err);
    throw err;
  }
}

export async function combatEndTurnRPC(actorId) {
  try {
    const { data, error } = await supabase.rpc('combat_end_turn', {
      p_actor_id: actorId,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro combatEndTurnRPC:', err);
    throw err;
  }
}

export async function combatUndoRPC(encounterId) {
  try {
    const { data, error } = await supabase.rpc('combat_undo', {
      p_encounter_id: encounterId,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro combatUndoRPC:', err);
    throw err;
  }
}
