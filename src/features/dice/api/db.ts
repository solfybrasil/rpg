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

/**
 * Atualiza o Peso da cena na tabela sessions
 */
export async function setSessionPesoInDB(_sessionCode = 'MESA', peso = 8) {
  try {
    const { data, error } = await supabase
      .from('game_state')
      .update({ current_peso: Number(peso), updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select('current_peso')
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SUPABASE] Erro ao atualizar peso em game_state:', err);
    return null;
  }
}

/**
 * Busca o Peso atual da cena (game_state)
 */
export async function fetchSessionPeso(_sessionCode = 'MESA') {
  try {
    const { data, error } = await supabase
      .from('game_state')
      .select('current_peso')
      .eq('id', 1)
      .maybeSingle();

    if (error) throw error;
    return data?.current_peso ?? 8;
  } catch (err) {
    console.warn('[SUPABASE] Falha ao buscar peso de game_state:', err);
    return 8;
  }
}

/**
 * Insere uma rolagem de dados na tabela dice_rolls
 */
export async function insertDiceRollInDB(rollData) {
  try {
    const row = {
      session_code: (rollData.session_code || rollData.sessionCode || 'MESA').toUpperCase(),
      player_id: rollData.player_id || rollData.playerId || null,
      player_name: rollData.player_name || rollData.playerName || 'Jurado',
      label: rollData.label || 'Teste de Ação',
      dice: rollData.dice || [],
      kept: rollData.kept || [],
      modifier: rollData.modifier ?? 0,
      total: rollData.total,
      peso: rollData.peso ?? 8,
      mode: rollData.mode || 'normal',
      result: rollData.result,
      broke_oath: Boolean(rollData.broke_oath || rollData.brokeOath),
      used_inspiration: Boolean(rollData.used_inspiration || rollData.usedInspiration),
    };

    const { data, error } = await supabase.from('dice_rolls').insert(row).select().single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SUPABASE] Erro ao registrar rolagem de dados:', err);
    return null;
  }
}

/**
 * Busca as últimas rolagens de dados da sessão
 */
export async function fetchDiceRollsFromDB(sessionCode = 'MESA', limit = 20) {
  try {
    const { data, error } = await supabase
      .from('dice_rolls')
      .select(DICE_COLS)
      .eq('session_code', sessionCode.toUpperCase())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[SUPABASE] Falha ao buscar rolagens:', err);
    return [];
  }
}

/**
 * Escuta rolagens de dados em tempo real
 */
export function subscribeToDiceRollsRealtime(sessionCode = 'MESA', onInsert) {
  const code = (sessionCode || UNIVERSAL_SESSION_CODE).toLowerCase();
  const channel = getSafeRealtimeChannel(`dice_rolls_realtime_${code}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'dice_rolls',
        filter: `session_code=eq.${sessionCode.toUpperCase()}`,
      },
      (payload) => {
        if (typeof onInsert === 'function' && payload?.new) {
          onInsert(payload.new);
        }
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
 * Escuta atualizações da sessão (ex: Peso atual) em tempo real
 */
export function subscribeToSessionPesoRealtime(_sessionCode = 'MESA', onUpdate) {
  const channel = getSafeRealtimeChannel('game_state_peso_realtime')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_state',
      },
      (payload) => {
        if (typeof onUpdate === 'function' && payload?.new) {
          onUpdate(payload.new);
        }
      },
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {}
  };
}

/* ══════════════════════════════════════════════════════════════
   SISTEMA DE MAPA DE ALDRENOR (FASE 3)
   ══════════════════════════════════════════════════════════════ */
