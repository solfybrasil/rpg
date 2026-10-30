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
 * Busca receitas da Oficina (Alquimia e Forja)
 */
export async function fetchCraftingRecipesFromDB() {
  try {
    const { data, error } = await supabase
      .from('crafting_recipes')
      .select(RECIPE_COLS)
      .order('name');

    if (error) {
      console.error('[CRAFTING] Erro ao buscar receitas:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[CRAFTING] Erro:', err);
    return [];
  }
}

/**
 * Executa fabricação atômica via RPC craft_item
 */
export async function craftItemViaRPC(playerId, recipeId, targetItemId = null, result = 'sucesso') {
  const { data, error } = await supabase.rpc('craft_item', {
    p_player_id: playerId,
    p_recipe_id: recipeId,
    p_target_item_id: targetItemId,
    p_result: result,
  });

  if (error) {
    console.error('[CRAFTING] Erro ao executar craft_item:', error);
    throw error;
  }
  return data;
}

/**
 * Alterna se a Forja está disponível na sessão
 */
export async function setSessionForgeAvailableInDB(_sessionCode = 'MESA', forgeAvailable = true) {
  const { data, error } = await supabase
    .from('game_state')
    .update({ forge_available: !!forgeAvailable, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select('forge_available')
    .single();

  if (error) {
    console.error('[FORGE] Erro ao atualizar forja em game_state:', error);
    throw error;
  }
  return data;
}

// ============================================================================
// FASE 7: BANCADA DE OFICINA 3x3 (FORJA & ALQUIMIA), RECEITAS E LIVRO
// ============================================================================

/**
 * Busca receitas paginadas da grade 3x3 com filtros (para o Mestre)
 */
export async function fetchCraftingGridRecipes({
  station = 'todos',
  search = '',
  rarity = 'Todas',
  alternate = null,
  starter = null,
  active = null,
  page = 0,
  pageSize = 60,
} = {}) {
  try {
    let query = supabase.from('crafting_grid_recipes').select(RECIPE_GRID_COLS, { count: 'exact' });

    if (station && station !== 'todos') {
      query = query.eq('station', station);
    }
    if (rarity && rarity !== 'Todas') {
      query = query.eq('rarity', rarity);
    }
    if (alternate !== null && alternate !== undefined && alternate !== '') {
      query = query.eq('alternate', !!alternate);
    }
    if (starter !== null && starter !== undefined && starter !== '') {
      query = query.eq('starter', !!starter);
    }
    if (active !== null && active !== undefined && active !== '') {
      query = query.eq('active', !!active);
    }
    if (search && search.trim()) {
      const q = search.trim();
      query = query.or(`result_name.ilike.%${q}%,id.ilike.%${q}%,skill.ilike.%${q}%`);
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query
      .order('peso', { ascending: true })
      .order('result_name', { ascending: true })
      .range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;
    return { recipes: data || [], count: count || 0 };
  } catch (err) {
    console.warn('[RECIPES] Falha ao buscar receitas da grade:', err.message);
    return { recipes: [], count: 0 };
  }
}

/**
 * Carrega todas as receitas ativas de uma estação para indexação rápida no cliente
 */
export async function fetchAllRecipesForStation(station) {
  try {
    let query = supabase
      .from('crafting_grid_recipes')
      .select(
        'id, station, result_id, result_name, result_qty, grid, grid_names, ingredients, peso, skill, rarity, alternate, starter, loss_minor, loss_major, active',
      )
      .eq('active', true);

    if (station && station !== 'todos') {
      query = query.eq('station', station);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[RECIPES] Falha ao carregar receitas da estação:', err.message);
    return [];
  }
}

/**
 * Busca receitas aprendidas por um personagem
 */
export async function fetchPlayerKnownRecipes(characterId) {
  if (!characterId) return [];
  try {
    const { data, error } = await supabase
      .from('player_known_recipes')
      .select('recipe_id, source, learned_at')
      .eq('character_id', characterId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[RECIPES] Falha ao buscar receitas conhecidas:', err.message);
    return [];
  }
}

/**
 * RPC craft_attempt: Valida requisitos, ingredientes e rola dados no servidor
 */
export async function craftAttemptRPC(characterId, station, grid) {
  const { data, error } = await supabase.rpc('craft_attempt', {
    p_character_id: characterId,
    p_station: station,
    p_grid: grid,
  });

  if (error) {
    console.error('[CRAFT] Erro em craft_attempt:', error);
    throw error;
  }
  return data;
}

/**
 * RPC craft_reroll: Gasta Inspiração e rola novamente falha/desastre
 */
export async function craftRerollRPC(attemptId) {
  const { data, error } = await supabase.rpc('craft_reroll', {
    p_attempt_id: attemptId,
  });

  if (error) {
    console.error('[CRAFT] Erro em craft_reroll:', error);
    throw error;
  }
  return data;
}

/**
 * RPC craft_break_oath: Converte falha em sucesso ganhando +1 de Peste
 */
export async function craftBreakOathRPC(attemptId) {
  const { data, error } = await supabase.rpc('craft_break_oath', {
    p_attempt_id: attemptId,
  });

  if (error) {
    console.error('[CRAFT] Erro em craft_break_oath:', error);
    throw error;
  }
  return data;
}

/**
 * RPC craft_resolve: Consome ingredientes, gera resultado ou aplica perdas
 */
export async function craftResolveRPC(attemptId) {
  const { data, error } = await supabase.rpc('craft_resolve', {
    p_attempt_id: attemptId,
  });

  if (error) {
    console.error('[CRAFT] Erro em craft_resolve:', error);
    throw error;
  }
  return data;
}

/**
 * RPC teach_recipe: Mestre ensina receita diretamente a um personagem
 */
export async function teachRecipeRPC(characterId, recipeId, source = 'mestre') {
  const { data, error } = await supabase.rpc('teach_recipe', {
    p_character_id: characterId,
    p_recipe_id: recipeId,
    p_source: source,
  });

  if (error) {
    console.error('[CRAFT] Erro em teach_recipe:', error);
    throw error;
  }
  return data;
}

/**
 * Salva / Atualiza uma receita da grade (Mestre)
 */
export async function saveCraftingGridRecipe(recipe) {
  try {
    const row = {
      ...recipe,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('crafting_grid_recipes')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[RECIPES] Erro ao salvar receita:', err);
    throw err;
  }
}

/**
 * Deleta ou desativa uma receita da grade
 */
export async function deleteCraftingGridRecipe(recipeId) {
  try {
    const { error } = await supabase.from('crafting_grid_recipes').delete().eq('id', recipeId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[RECIPES] Erro ao deletar receita:', err);
    throw err;
  }
}

/**
 * Busca tentativas de criação recentes (feed do Mestre)
 */
export async function fetchRecentCraftAttempts(sessionCode = 'MESA', limit = 30) {
  try {
    const { data, error } = await supabase
      .from('craft_attempts')
      .select(CRAFT_ATTEMPT_COLS)
      .eq('session_code', (sessionCode || 'MESA').toUpperCase())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[CRAFT] Falha ao buscar tentativas recentes:', err.message);
    return [];
  }
}

/**
 * Subscrição em tempo real para tentativas de criação (feed de criações)
 */
export function subscribeToCraftAttemptsRealtime(sessionCode = 'MESA', onAttempt) {
  const code = (sessionCode || 'MESA').toUpperCase();
  const channel = getSafeRealtimeChannel(`craft_attempts_realtime_${code.toLowerCase()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'craft_attempts', filter: `session_code=eq.${code}` },
      (payload) => {
        if (typeof onAttempt === 'function') onAttempt(payload);
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
 * Subscrição em tempo real para receitas aprendidas pelo personagem
 */
export function subscribeToKnownRecipesRealtime(characterId, onKnownChange) {
  if (!characterId) return () => {};
  const channel = getSafeRealtimeChannel(`known_recipes_realtime_${characterId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'player_known_recipes',
        filter: `character_id=eq.${characterId}`,
      },
      (payload) => {
        if (typeof onKnownChange === 'function') onKnownChange(payload);
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
 * Busca marcas / favoritos do Livro de Receitas
 */
export async function fetchPlayerRecipeMarks(characterId) {
  if (!characterId) return new Set();
  try {
    const { data, error } = await supabase
      .from('player_recipe_marks')
      .select('recipe_id')
      .eq('character_id', characterId);
    if (error) throw error;
    return new Set((data || []).map((d) => d.recipe_id));
  } catch (err) {
    console.warn('[BOOK] Falha ao carregar marcas:', err.message);
    return new Set();
  }
}

/**
 * Alterna favorito / marcação de receita
 */
export async function togglePlayerRecipeMark(characterId, recipeId, isMarked) {
  if (!characterId || !recipeId) return;
  try {
    if (isMarked) {
      await supabase
        .from('player_recipe_marks')
        .upsert({ character_id: characterId, recipe_id: recipeId });
    } else {
      await supabase
        .from('player_recipe_marks')
        .delete()
        .eq('character_id', characterId)
        .eq('recipe_id', recipeId);
    }
  } catch (err) {
    console.warn('[BOOK] Erro ao alternar marca:', err.message);
  }
}

/**
 * Busca anotações do jogador no Livro de Receitas
 */
export async function fetchPlayerRecipeNotes(characterId) {
  if (!characterId) return {};
  try {
    const { data, error } = await supabase
      .from('player_recipe_notes')
      .select('recipe_id, body')
      .eq('character_id', characterId);
    if (error) throw error;
    const notes = {};
    (data || []).forEach((n) => {
      notes[n.recipe_id] = n.body;
    });
    return notes;
  } catch (err) {
    console.warn('[BOOK] Falha ao carregar anotações:', err.message);
    return {};
  }
}

/**
 * Salva anotação manuscrita de receita
 */
export async function savePlayerRecipeNote(characterId, recipeId, body) {
  if (!characterId || !recipeId) return;
  try {
    await supabase.from('player_recipe_notes').upsert({
      character_id: characterId,
      recipe_id: recipeId,
      body: body || '',
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[BOOK] Erro ao salvar nota:', err.message);
  }
}

/**
 * Inscrição em tempo real para anotações do livro
 */
export function subscribeToRecipeNotesRealtime(characterId, onNoteChange) {
  if (!characterId) return () => {};
  const channel = getSafeRealtimeChannel(`recipe_notes_${characterId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'player_recipe_notes',
        filter: `character_id=eq.${characterId}`,
      },
      (payload) => {
        if (typeof onNoteChange === 'function') onNoteChange(payload);
      },
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {}
  };
}
