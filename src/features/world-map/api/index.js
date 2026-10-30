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

export async function fetchMapData(sessionCode = 'MESA', role = 'player') {
  const code = (sessionCode || 'MESA').toUpperCase();
  const placesSelect =
    role === 'dm'
      ? '*'
      : 'id, session_code, name, type, region_id, x, y, desc_public, discovered, visited, created_at, updated_at';

  try {
    const [placesRes, regionsRes, stateRes, pinsRes] = await Promise.all([
      supabase.from('map_places').select(placesSelect).eq('session_code', code),
      supabase.from('map_regions').select(MAP_REGION_COLS).eq('session_code', code),
      supabase.from('map_state').select(MAP_STATE_COLS).eq('session_code', code).maybeSingle(),
      supabase.from('map_pins').select(MAP_PIN_COLS).eq('session_code', code),
    ]);

    if (placesRes.error) console.error('[MAP] Erro ao buscar lugares:', placesRes.error);
    if (regionsRes.error) console.error('[MAP] Erro ao buscar regiões:', regionsRes.error);
    if (stateRes.error) console.error('[MAP] Erro ao buscar estado do mapa:', stateRes.error);
    if (pinsRes.error) console.error('[MAP] Erro ao buscar alfinetes:', pinsRes.error);

    return {
      places: placesRes.data || [],
      regions: regionsRes.data || [],
      state: stateRes.data || null,
      pins: pinsRes.data || [],
    };
  } catch (err) {
    console.error('[MAP] Falha em fetchMapData:', err);
    return { places: [], regions: [], state: null, pins: [] };
  }
}

/**
 * Atualiza um lugar do mapa
 */
export async function updateMapPlace(id, updates) {
  const { data, error } = await supabase
    .from('map_places')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[MAP] Erro ao atualizar lugar:', error);
    throw error;
  }
  return data;
}

/**
 * Cria um novo lugar no mapa
 */
export async function createMapPlace(placeData) {
  const { data, error } = await supabase
    .from('map_places')
    .insert({
      session_code: (placeData.session_code || 'MESA').toUpperCase(),
      name: placeData.name,
      type: placeData.type || 'mar',
      region_id: placeData.region_id,
      x: Number(placeData.x),
      y: Number(placeData.y),
      desc_public: placeData.desc_public || '',
      desc_secret: placeData.desc_secret || null,
      discovered: Boolean(placeData.discovered),
      visited: Boolean(placeData.visited),
    })
    .select()
    .single();

  if (error) {
    console.error('[MAP] Erro ao criar lugar:', error);
    throw error;
  }
  return data;
}

/**
 * Exclui um lugar do mapa
 */
export async function deleteMapPlace(id) {
  const { error } = await supabase.from('map_places').delete().eq('id', id);

  if (error) {
    console.error('[MAP] Erro ao deletar lugar:', error);
    throw error;
  }
  return true;
}

/**
 * Define se uma região está descoberta (névoa de guerra)
 */
export async function setRegionDiscovered(sessionCode = 'MESA', regionId, discovered) {
  const code = (sessionCode || 'MESA').toUpperCase();
  const { data, error } = await supabase
    .from('map_regions')
    .upsert(
      {
        session_code: code,
        region_id: regionId,
        discovered: Boolean(discovered),
      },
      { onConflict: 'session_code,region_id' },
    )
    .select()
    .single();

  if (error) {
    console.error('[MAP] Erro ao atualizar descoberta de região:', error);
    throw error;
  }
  return data;
}

/**
 * Atualiza o estado global do mapa (posição do grupo, rota, ping)
 */
export async function updateMapState(sessionCode = 'MESA', updates) {
  const code = (sessionCode || 'MESA').toUpperCase();
  const { data, error } = await supabase
    .from('map_state')
    .upsert(
      {
        session_code: code,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_code' },
    )
    .select()
    .single();

  if (error) {
    console.error('[MAP] Erro ao atualizar map_state:', error);
    throw error;
  }
  return data;
}

/**
 * Cria um alfinete pessoal de jogador
 */
export async function createMapPin(pinData) {
  const { data, error } = await supabase
    .from('map_pins')
    .insert({
      session_code: (pinData.session_code || 'MESA').toUpperCase(),
      player_id: pinData.player_id,
      x: Number(pinData.x),
      y: Number(pinData.y),
      note: pinData.note || '',
    })
    .select()
    .single();

  if (error) {
    console.error('[MAP] Erro ao criar alfinete:', error);
    throw error;
  }
  return data;
}

/**
 * Exclui um alfinete pessoal de jogador
 */
export async function deleteMapPin(id) {
  const { error } = await supabase.from('map_pins').delete().eq('id', id);

  if (error) {
    console.error('[MAP] Erro ao deletar alfinete:', error);
    throw error;
  }
  return true;
}

/**
 * Subscrição em tempo real para as 4 tabelas do mapa
 */
export function subscribeToMapRealtime(
  sessionCode = 'MESA',
  { onPlaceChange, onRegionChange, onStateChange, onPinChange },
) {
  const code = (sessionCode || 'MESA').toUpperCase();
  const channel = getSafeRealtimeChannel(`map_realtime_${code.toLowerCase()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'map_places', filter: `session_code=eq.${code}` },
      (payload) => {
        if (typeof onPlaceChange === 'function') onPlaceChange(payload);
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'map_regions', filter: `session_code=eq.${code}` },
      (payload) => {
        if (typeof onRegionChange === 'function') onRegionChange(payload);
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'map_state', filter: `session_code=eq.${code}` },
      (payload) => {
        if (typeof onStateChange === 'function') onStateChange(payload);
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'map_pins', filter: `session_code=eq.${code}` },
      (payload) => {
        if (typeof onPinChange === 'function') onPinChange(payload);
      },
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {}
  };
}
