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

/**
 * Registra distribuição de XP no encerramento de sessão
 */
export async function awardXPInDB(sessionCode = 'MESA', awards) {
  const code = (sessionCode || 'MESA').toUpperCase();
  const rows = awards.map((a) => ({
    session_code: code,
    player_id: a.player_id || null,
    character_id: a.character_id || null,
    amount: a.amount,
    reasons: a.reasons || [],
    note: a.note || null,
  }));

  const { data, error } = await supabase.from('xp_awards').insert(rows).select();

  if (error) {
    console.error('[XP] Erro ao registrar premiações de XP:', error);
    throw error;
  }

  // Atualiza characters.xp para cada um
  for (const a of awards) {
    if (a.character_id && a.amount > 0) {
      const { data: charData } = await supabase
        .from('characters')
        .select('xp')
        .eq('id', a.character_id)
        .single();
      const currentXP = Number(charData?.xp) || 0;
      await supabase
        .from('characters')
        .update({ xp: currentXP + a.amount })
        .eq('id', a.character_id);
    }
  }

  return data;
}

/**
 * Busca histórico de XP de um personagem
 */
export async function fetchXPAwardsFromDB(characterId = null, sessionCode = 'MESA') {
  try {
    const code = (sessionCode || 'MESA').toUpperCase();
    let query = supabase
      .from('xp_awards')
      .select(XP_COLS)
      .eq('session_code', code)
      .order('created_at', { ascending: false });

    if (characterId) {
      query = query.eq('character_id', characterId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[XP] Erro ao buscar histórico de XP:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[XP] Erro:', err);
    return [];
  }
}

/**
 * Busca notas do jogador
 */
export async function fetchPlayerNotesFromDB(characterId, sessionCode = 'MESA') {
  if (!characterId) return [];
  try {
    const code = (sessionCode || 'MESA').toUpperCase();
    const { data, error } = await supabase
      .from('player_notes')
      .select(NOTES_COLS)
      .eq('session_code', code)
      .eq('character_id', characterId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[NOTES] Erro ao buscar notas do jogador:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[NOTES] Erro:', err);
    return [];
  }
}

/**
 * Salva ou atualiza uma nota do jogador
 */
export async function savePlayerNoteToDB(note) {
  const row = {
    session_code: (note.session_code || 'MESA').toUpperCase(),
    character_id: note.character_id,
    title: note.title || 'Sem Título',
    body: note.body || '',
    updated_at: new Date().toISOString(),
  };

  if (note.id) {
    const { data, error } = await supabase
      .from('player_notes')
      .update(row)
      .eq('id', note.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('player_notes').insert(row).select().single();
    if (error) throw error;
    return data;
  }
}

/**
 * Deleta uma nota do jogador
 */
export async function deletePlayerNoteFromDB(noteId) {
  const { error } = await supabase.from('player_notes').delete().eq('id', noteId);

  if (error) throw error;
  return true;
}

/**
 * Busca notas do Mestre
 */
export async function fetchDMNotesFromDB(sessionCode = 'MESA') {
  try {
    const code = (sessionCode || 'MESA').toUpperCase();
    const { data, error } = await supabase
      .from('dm_notes')
      .select(DM_NOTES_COLS)
      .eq('session_code', code)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[NOTES] Erro ao buscar notas do Mestre:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[NOTES] Erro:', err);
    return [];
  }
}

/**
 * Salva ou atualiza uma nota do Mestre
 */
export async function saveDMNoteToDB(note) {
  const row = {
    session_code: (note.session_code || 'MESA').toUpperCase(),
    title: note.title || 'Sem Título',
    body: note.body || '',
    updated_at: new Date().toISOString(),
  };

  if (note.id) {
    const { data, error } = await supabase
      .from('dm_notes')
      .update(row)
      .eq('id', note.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('dm_notes').insert(row).select().single();
    if (error) throw error;
    return data;
  }
}

/**
 * Deleta uma nota do Mestre
 */
export async function deleteDMNoteFromDB(noteId) {
  const { error } = await supabase.from('dm_notes').delete().eq('id', noteId);

  if (error) throw error;
  return true;
}
