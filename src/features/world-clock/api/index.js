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
 * Busca estado global do jogo (game_state)
 */
export async function fetchGameStateFromDB() {
  try {
    const { data, error } = await supabase
      .from('game_state')
      .select(GAME_STATE_COLS)
      .eq('id', 1)
      .maybeSingle();

    if (error) throw error;
    return (
      data || {
        id: 1,
        current_peso: 6,
        shop_open: true,
        shop_name: 'Mercado da Fuligem',
        forge_available: false,
      }
    );
  } catch (err) {
    console.warn('[GAME_STATE] Falha ao carregar estado do jogo:', err.message);
    return {
      id: 1,
      current_peso: 6,
      shop_open: true,
      shop_name: 'Mercado da Fuligem',
      forge_available: false,
    };
  }
}

/**
 * Atualiza estado global do jogo (game_state)
 */
export async function updateGameStateInDB(updates) {
  try {
    const { data, error } = await supabase
      .from('game_state')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[GAME_STATE] Erro ao atualizar game_state:', err);
    throw err;
  }
}

/**
 * Escuta mudanças em game_state em tempo real
 */
export function subscribeToGameStateRealtime(onStateChange) {
  return subscribeRealtime({
    topic: 'game_state',
    table: 'game_state',
    queryKeyToUpdate: ['game_state'],
    handler: (payload) => {
      if (typeof onStateChange === 'function' && payload?.new) {
        onStateChange(payload.new);
      }
    },
  });
}

// =====================================================================
// RELÓGIO DO MUNDO, PRAZOS E MUNDO_LOG (ETAPA 1)
// =====================================================================

export async function mundoAvancarRPC(minutos, motivo = '', multFome = 1) {
  try {
    const { data, error } = await supabase.rpc('mundo_avancar', {
      p_minutos: minutos,
      p_motivo: motivo,
      p_mult_fome: multFome,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro mundoAvancarRPC:', err);
    throw err;
  }
}

export async function mundoDefinirDataRPC(ano, mes, dia, hora) {
  try {
    const { data, error } = await supabase.rpc('mundo_definir_data', {
      p_ano: ano,
      p_mes: mes,
      p_dia: dia,
      p_hora: hora,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro mundoDefinirDataRPC:', err);
    throw err;
  }
}

export async function prazoCriarRPC(titulo, minutosApartirDeAgora, visivel = true) {
  try {
    const { data, error } = await supabase.rpc('prazo_criar', {
      p_titulo: titulo,
      p_minutos_a_partir_de_agora: minutosApartirDeAgora,
      p_visivel: visivel,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro prazoCriarRPC:', err);
    throw err;
  }
}

export async function prazoConcluirRPC(id) {
  try {
    const { data, error } = await supabase.rpc('prazo_concluir', { p_id: id });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro prazoConcluirRPC:', err);
    throw err;
  }
}

export async function prazoApagarRPC(id) {
  try {
    const { data, error } = await supabase.rpc('prazo_apagar', { p_id: id });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro prazoApagarRPC:', err);
    throw err;
  }
}

export async function fetchMundoPrazosFromDB() {
  try {
    const { data, error } = await supabase
      .from('mundo_prazos')
      .select(PRAZOS_COLS)
      .order('vence_em_minutos', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[DB] Erro ao buscar prazos:', err.message);
    return [];
  }
}

export async function fetchMundoLogsFromDB(limit = 20) {
  try {
    const { data, error } = await supabase
      .from('mundo_log')
      .select(MUNDO_LOG_COLS)
      .order('criado_em', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[DB] Erro ao buscar mundo_log:', err.message);
    return [];
  }
}

export function subscribeToMundoPrazosRealtime(onPayload) {
  return subscribeRealtime({
    topic: 'mundo_prazos',
    table: 'mundo_prazos',
    queryKeyToUpdate: ['mundo_prazos'],
    handler: onPayload,
  });
}

export function subscribeToMundoLogRealtime(onEntry) {
  return subscribeRealtime({
    topic: 'mundo_log',
    table: 'mundo_log',
    event: 'INSERT',
    queryKeyToUpdate: ['mundo_log'],
    handler: (payload) => {
      if (payload?.new) onEntry?.(payload.new);
    },
  });
}

/* ─── ETAPA 2: Descanso com Tela Travada ────────────────────────── */
export async function descansoIniciarRPC(
  tipo = 'curto',
  segundosReais = null,
  eventoSecreto = null,
) {
  try {
    const { data, error } = await supabase.rpc('descanso_iniciar', {
      p_tipo: tipo,
      p_segundos_reais: segundosReais,
      p_evento_secreto: eventoSecreto,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro descansoIniciarRPC:', err);
    throw err;
  }
}

export async function descansoAtividadeDefinirRPC(characterId, atividade) {
  try {
    const { data, error } = await supabase.rpc('descanso_atividade_definir', {
      p_character_id: characterId,
      p_atividade: atividade,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro descansoAtividadeDefinirRPC:', err);
    throw err;
  }
}

export async function descansoFinalizarRPC(interrompido = false) {
  try {
    const { data, error } = await supabase.rpc('descanso_finalizar', {
      p_interrompido: interrompido,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro descansoFinalizarRPC:', err);
    throw err;
  }
}

/* ─── ETAPA 3: Fome e Saciedade ────────────────────────────────── */
export async function comerRPC(characterId, itemInventarioId) {
  try {
    const { data, error } = await supabase.rpc('comer', {
      p_character_id: characterId,
      p_item_inventario_id: itemInventarioId,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro comerRPC:', err);
    throw err;
  }
}

export async function refeicaoTavernaRPC(characterId, precoBronze = 10) {
  try {
    const { data, error } = await supabase.rpc('refeicao_taverna', {
      p_character_id: characterId,
      p_preco_bronze: precoBronze,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro refeicaoTavernaRPC:', err);
    throw err;
  }
}

/* ─── ETAPA 4: Exaustão ─────────────────────────────────────────── */
export async function heroiDefinirExaustoRPC(characterId, exausto) {
  try {
    const { data, error } = await supabase.rpc('heroi_definir_exausto', {
      p_character_id: characterId,
      p_exausto: !!exausto,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro heroiDefinirExaustoRPC:', err);
    throw err;
  }
}

/* ─── ETAPA 5: Efeitos (Condições) & Combate ───────────────────── */
export async function fetchEfeitosCatalogoFromDB() {
  try {
    const { data, error } = await supabase
      .from('efeitos_catalogo')
      .select(EFEITOS_CAT_COLS)
      .order('nome', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[DB] Erro fetchEfeitosCatalogoFromDB:', err);
    return [];
  }
}

export async function fetchEfeitosCombinacoesFromDB() {
  try {
    const { data, error } = await supabase.from('efeitos_combinacoes').select(EFEITOS_COMB_COLS);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[DB] Erro fetchEfeitosCombinacoesFromDB:', err);
    return [];
  }
}

export async function fetchHeroiEfeitosFromDB(characterId = null) {
  try {
    let query = supabase.from('heroi_efeitos').select('*, efeitos_catalogo(*)');
    if (characterId) {
      query = query.eq('character_id', characterId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[DB] Erro fetchHeroiEfeitosFromDB:', err);
    return [];
  }
}

export function subscribeToHeroiEfeitosRealtime(callback) {
  return subscribeRealtime({
    topic: 'heroi_efeitos',
    table: 'heroi_efeitos',
    queryKeyToUpdate: ['heroi_efeitos'],
    handler: callback,
  });
}

export async function efeitoAplicarRPC(
  characterId,
  efeitoId,
  pilhas = 1,
  duracao = null,
  origem = 'Mestre',
  textoExtra = null,
) {
  try {
    const { data, error } = await supabase.rpc('efeito_aplicar', {
      p_character_id: characterId,
      p_efeito_id: efeitoId,
      p_pilhas: pilhas,
      p_duracao: duracao,
      p_origem: origem,
      p_texto_extra: textoExtra,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro efeitoAplicarRPC:', err);
    throw err;
  }
}

export async function efeitoRemoverRPC(characterId, efeitoId, pilhas = null) {
  try {
    const { data, error } = await supabase.rpc('efeito_remover', {
      p_character_id: characterId,
      p_efeito_id: efeitoId,
      p_pilhas: pilhas,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro efeitoRemoverRPC:', err);
    throw err;
  }
}

export async function combateIniciarRPC() {
  try {
    const { data, error } = await supabase.rpc('combate_iniciar');
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro combateIniciarRPC:', err);
    throw err;
  }
}

export async function combateProximaRodadaRPC() {
  try {
    const { data, error } = await supabase.rpc('combate_proxima_rodada');
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro combateProximaRodadaRPC:', err);
    throw err;
  }
}

export async function combateEncerrarRPC() {
  try {
    const { data, error } = await supabase.rpc('combate_encerrar');
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro combateEncerrarRPC:', err);
    throw err;
  }
}

export async function heroiCurarVidaRPC(characterId, qtd) {
  try {
    const { data, error } = await supabase.rpc('heroi_curar_vida', {
      p_character_id: characterId,
      p_qtd: qtd,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro heroiCurarVidaRPC:', err);
    throw err;
  }
}

export async function mundoTickRPC() {
  try {
    const { data, error } = await supabase.rpc('mundo_tick');
    if (error) throw error;
    return data;
  } catch (err) {
    // Falha silenciosa para polling contínuo sem poluir o console caso não exista
    console.warn('[DB] Tick do relógio ignorado ou em espera:', err.message);
    return null;
  }
}

export async function mestreConfigurarRelogioRPC({
  correndo = null,
  escala = null,
  abrigado = null,
}) {
  try {
    const { data, error } = await supabase.rpc('mestre_configurar_relogio', {
      p_correndo: correndo,
      p_escala: escala,
      p_abrigado: abrigado,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[DB] Erro mestreConfigurarRelogioRPC:', err);
    throw err;
  }
}
