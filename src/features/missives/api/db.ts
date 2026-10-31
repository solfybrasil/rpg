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

import {
  createInventoryItemInDB,
  deleteInventoryItemInDB,
  fetchInventoryItems,
  moveInventoryItemInDB,
  transferInventoryItemInDB,
  updateInventoryItemInDB,
} from '../../inventory/api/db';
import { fetchCharactersFromDB, saveCharacterToDB, updateCharacterInDB } from '../../sheet/api';
export async function fetchScenariosFromDB() {
  try {
    const { data, error } = await supabase
      .from('scenarios')
      .select(SCENARIO_COLS)
      .order('created_at');

    if (error || !data) {
      return [];
    }

    return data.map((s) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      hook: s.hook,
      summary: s.summary,
      acts: typeof s.acts === 'string' ? JSON.parse(s.acts) : s.acts || [],
    }));
  } catch (_) {
    return [];
  }
}

export const UNIVERSAL_SESSION_CODE = 'MESA';

/**
 * Garante que a sessão única universal ('MESA') exista e esteja ativa no Supabase
 */
export async function ensureUniversalSessionInDB() {
  return { code: UNIVERSAL_SESSION_CODE, status: 'active' };
}

export async function createSessionInDB() {
  return { code: UNIVERSAL_SESSION_CODE, status: 'active' };
}

export async function getSessionFromDB() {
  return { code: UNIVERSAL_SESSION_CODE, status: 'active' };
}

/**
 * Registra um Jurado na sessão no Supabase
 */
export async function joinPlayerInDB(sessionCode, player) {
  return player;
}

/**
 * Atualiza os dados de um personagem no Supabase
 */
export async function updatePlayerInDB(characterId, updates) {
  try {
    const dbUpdates = {};
    if (updates.health !== undefined) {
      dbUpdates.health = updates.health;
      if (updates.alive === undefined) {
        dbUpdates.alive = updates.health > 0;
      }
    }
    if (updates.maxHealth !== undefined) dbUpdates.max_health = updates.maxHealth;
    if (updates.max_health !== undefined) dbUpdates.max_health = updates.max_health;
    if (updates.plague !== undefined) dbUpdates.plague = updates.plague;
    if (updates.focus !== undefined) dbUpdates.focus = updates.focus;
    if (updates.maxFocus !== undefined) dbUpdates.max_focus = updates.maxFocus;
    if (updates.max_focus !== undefined) dbUpdates.max_focus = updates.max_focus;
    if (updates.inspiration !== undefined)
      dbUpdates.inspiration = Math.min(2, Math.max(0, updates.inspiration));
    if (updates.defense !== undefined) dbUpdates.defense = updates.defense;
    if (updates.coins_bronze !== undefined) dbUpdates.coins_bronze = updates.coins_bronze;
    if (updates.coinsBronze !== undefined) dbUpdates.coins_bronze = updates.coinsBronze;
    if (updates.alive !== undefined) dbUpdates.alive = updates.alive;
    if (updates.conditions !== undefined) dbUpdates.conditions = updates.conditions;
    if (updates.death_saves !== undefined) dbUpdates.death_saves = updates.death_saves;
    dbUpdates.updated_at = new Date().toISOString();

    let targetId = characterId;
    if (typeof characterId === 'string' && characterId.startsWith('usr-')) {
      targetId =
        typeof window !== 'undefined'
          ? localStorage.getItem('peste_selected_hero') || 'tor_bjorn'
          : 'tor_bjorn';
    }

    const { data, error } = await supabase
      .from('characters')
      .update(dbUpdates)
      .eq('id', targetId)
      .select();

    if (error) {
      console.warn('[SUPABASE] Aviso ao atualizar personagem:', error.message);
      return null;
    }
    return (data && data[0]) || null;
  } catch (err) {
    console.warn('[SUPABASE] Falha ao atualizar personagem no banco:', err);
    return null;
  }
}

/**
 * Insere uma missiva sagrada no banco Supabase
 */
export async function sendMessageToDB({ sessionCode, fromId, toId, fromName, text, priority }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      session_code: (sessionCode || UNIVERSAL_SESSION_CODE).toUpperCase(),
      from_id: fromId,
      to_id: toId,
      from_name: fromName,
      text,
      priority: priority || 'SAGRADA',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Busca todos os personagens ativos
 */
export async function fetchSessionPlayers() {
  return fetchCharactersFromDB();
}

/**
 * Busca o histórico de missivas da sessão
 */
export async function fetchSessionMessages(sessionCode) {
  const { data, error } = await supabase
    .from('messages')
    .select(MSG_COLS)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Remove jogador ou finaliza sessão (noop na nova arquitetura)
 */
export async function leaveSessionInDB() {
  return;
}

/**
 * Cria canal em tempo real do Supabase Realtime para personagens e mensagens
 */
export function subscribeToSessionRealtime({
  sessionCode,
  onPlayerInsert,
  onPlayerUpdate,
  onPlayerDelete,
  onMessageInsert,
  onSessionClosed,
}) {
  const channel = supabase
    .channel('realtime:app_characters_messages')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'characters',
      },
      (payload) => {
        if (payload.eventType === 'INSERT') onPlayerInsert?.(payload.new);
        else if (payload.eventType === 'UPDATE') onPlayerUpdate?.(payload.new);
        else if (payload.eventType === 'DELETE') onPlayerDelete?.(payload.old);
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        if (payload.new) onMessageInsert?.(payload.new);
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
 * Transferência de item entre heróis
 */
/**
 * PIN do Mestre: conferir PIN
 */
export async function checkDMPinRPC(pin) {
  try {
    const { data, error } = await supabase.rpc('check_dm_pin', {
      p_pin: String(pin),
    });
    if (error) throw error;
    const isValid = data === true || data?.valid === true;
    return { valid: isValid };
  } catch (err) {
    console.error('[PIN] Erro ao verificar PIN:', err);
    return { valid: false, error: err.message };
  }
}

/**
 * PIN do Mestre: definir novo PIN
 */
export async function setDMPinRPC(pin) {
  try {
    const { data, error } = await supabase.rpc('set_dm_pin', {
      p_pin: String(pin),
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[PIN] Erro ao definir PIN:', err);
    return false;
  }
}

/**
 * Compatibilidade legada inofensiva para join_table e release_character
 */
export async function joinTableRPC(_sessionCode, characterId, _deviceId) {
  return { success: true, character_id: characterId };
}

export async function releaseCharacterRPC(_sessionCode, characterId) {
  return { success: true, character_id: characterId };
}
