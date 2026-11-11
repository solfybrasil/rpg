import { toast } from 'sonner';
import { creatureMediaFields } from './creatureMedia';
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

export async function fetchBestiaryFromDB() {
  try {
    const { data, error } = await supabase.from('bestiary').select(BESTIARY_COLS).order('name');

    if (error || !data) {
      return [];
    }

    return data.map((b) => ({
      id: b.id,
      name: b.name,
      subtitle: b.subtitle,
      threat: b.threat,
      origin: b.origin,
      description: b.description,
      behavior: b.behavior,
      stats: typeof b.stats === 'string' ? JSON.parse(b.stats) : b.stats,
      attacks: typeof b.attacks === 'string' ? JSON.parse(b.attacks) : b.attacks || [],
      gmTips: b.gm_tips,
      tier: b.tier,
      max_hp: b.max_hp,
      defense: b.defense,
      attack_bonus: b.attack_bonus,
      damage_dice: b.damage_dice,
      attacks_per_turn: b.attacks_per_turn,
      special: b.special,
      image_url: b.image_url,
    }));
  } catch (_) {
    return [];
  }
}

/**
 * Busca criaturas do creature_catalog com paginação e filtros
 */
export async function fetchCreatureCatalogFromDB({
  page = 1,
  pageSize = 60,
  search = '',
  region_key = '',
  category = '',
  tier = '',
  threatMin = 1,
  threatMax = 10,
  edible = null,
  plague = null,
  unique = null,
  includeArchived = false,
} = {}) {
  try {
    let query = supabase.from('creature_catalog').select(CREATURE_CAT_COLS, { count: 'estimated' });

    if (!includeArchived) {
      query = query.eq('archived', false);
    }

    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      query = query.or(`name.ilike.${s},description.ilike.${s},species.ilike.${s}`);
    }

    if (region_key) {
      query = query.eq('region_key', region_key);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (tier) {
      query = query.eq('tier', tier);
    }

    if (threatMin > 1) {
      query = query.gte('threat', threatMin);
    }

    if (threatMax < 10) {
      query = query.lte('threat', threatMax);
    }

    if (edible !== null && edible !== undefined && edible !== '') {
      query = query.eq('edible', !!edible);
    }

    if (plague !== null && plague !== undefined && plague !== '') {
      query = query.eq('plague', !!plague);
    }

    if (unique !== null && unique !== undefined && unique !== '') {
      query = query.eq('unique', !!unique);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('threat', { ascending: true })
      .order('name', { ascending: true })
      .range(from, to);

    if (error) throw error;
    const items = (data || []).map((cr) => {
      let localMedia = {};
      try {
        localMedia = JSON.parse(localStorage.getItem(`peste_fera_media_${cr.id}`)) || {};
      } catch (_) {}
      return {
        ...cr,
        // A mídia de batalha fica no fragmento de image_url (a tabela não tem colunas próprias);
        // o localStorage é só o que outros navegadores ainda não tinham salvo no banco.
        ...creatureMediaFields(cr, localMedia),
      };
    });
    return { data: items, count: count || 0 };
  } catch (err) {
    console.error('[DB] Erro ao buscar criaturas:', err);
    return { data: [], count: 0 };
  }
}

/**
 * Busca 10 criaturas mais adequadas para uma região e nível médio
 */
export async function fetchCreaturesForRegionFromDB(regionKey, avgThreat = 3) {
  try {
    const minThreat = Math.max(1, avgThreat - 2);
    const maxThreat = Math.min(10, avgThreat + 2);

    const { data, error } = await supabase
      .from('creature_catalog')
      .select(CREATURE_CAT_COLS)
      .eq('archived', false)
      .eq('region_key', regionKey)
      .gte('threat', minThreat)
      .lte('threat', maxThreat)
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[DB] Erro ao buscar criaturas da região:', err);
    return [];
  }
}

/**
 * Salva (cria ou atualiza) criatura no catálogo
 */
export async function saveCreatureToDB(creatureData) {
  try {
    const { data, error } = await supabase
      .from('creature_catalog')
      .upsert(creatureData, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro ao salvar criatura:', err);
    throw err;
  }
}

/**
 * Arquiva / Desarquiva criatura
 */
export async function archiveCreatureInDB(creatureId, archived = true) {
  try {
    const { error } = await supabase
      .from('creature_catalog')
      .update({ archived })
      .eq('id', creatureId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[DB] Erro ao arquivar criatura:', err);
    throw err;
  }
}

/**
 * RPC harvest_creature
 */
export async function harvestCreatureRPC(playerId, combatantId) {
  try {
    const { data, error } = await supabase.rpc('harvest_creature', {
      p_player_id: playerId,
      p_combatant_id: combatantId,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro no harvestCreatureRPC:', err);
    throw err;
  }
}

export async function saveCreatureBattleMedia(creatureId, mediaData) {
  try {
    localStorage.setItem(`peste_fera_media_${creatureId}`, JSON.stringify(mediaData));
    await supabase.from('creature_catalog').update(mediaData).eq('id', creatureId);
  } catch (err) {
    console.warn('[DB] saveCreatureBattleMedia:', err);
  }
}
