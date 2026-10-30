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
 * Verifica se as tabelas do Supabase já foram criadas e estão acessíveis
 */
export async function checkDatabaseReady() {
  try {
    const { error } = await supabase.from('game_state').select('id').limit(1);
    if (error) {
      const { error: charErr } = await supabase.from('characters').select('id').limit(1);
      if (charErr) {
        return { ready: false, reason: 'TABLES_MISSING', error: charErr };
      }
    }
    return { ready: true };
  } catch (err) {
    return { ready: false, reason: 'NETWORK_ERROR', error: err };
  }
}

/**
 * Busca a lista de personagens reais do Supabase (ordenados por sort_order e nome)
 */
export async function fetchCharactersFromDB() {
  try {
    const { data, error } = await supabase
      .from('characters')
      .select(CHAR_COLS)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      race: c.race,
      raceId: c.race_id,
      racialTrait: c.racial_trait,
      oathType: c.oath_type,
      oath: c.oath,
      oathPower: c.oath_power,
      attributes: typeof c.attributes === 'string' ? JSON.parse(c.attributes) : c.attributes,
      health: c.health,
      maxHealth: c.max_health,
      max_health: c.max_health,
      plague: c.plague,
      gear: typeof c.gear === 'string' ? JSON.parse(c.gear) : c.gear || [],
      oathItem: c.oath_item,
      backstory: c.backstory,
      connection: c.connection,
      avatarIcon: c.avatar_icon || '⚔️',
      avatar_icon: c.avatar_icon || '⚔️',
      imageUrl:
        c.image_url ||
        c.portrait_url ||
        (c.avatar_icon && c.avatar_icon.startsWith('http') ? c.avatar_icon : ''),
      portraitUrl:
        c.portrait_url ||
        c.image_url ||
        (c.avatar_icon && c.avatar_icon.startsWith('http') ? c.avatar_icon : ''),
      caminho: c.caminho || '',
      level: c.level || 1,
      xp: c.xp || 0,
      maxFocus: c.max_focus ?? 3,
      max_focus: c.max_focus ?? 3,
      focus: c.focus ?? c.max_focus ?? 3,
      defense: c.defense ?? 8,
      base_defense: c.base_defense ?? c.baseDefense ?? undefined,
      baseDefense: c.base_defense ?? c.baseDefense ?? undefined,
      inspiration: c.inspiration ?? 0,
      coins_bronze: c.coins_bronze ?? 0,
      coinsBronze: c.coins_bronze ?? 0,
      conditions: typeof c.conditions === 'string' ? JSON.parse(c.conditions) : c.conditions || [],
      death_saves:
        typeof c.death_saves === 'string'
          ? JSON.parse(c.death_saves)
          : c.death_saves || { s: 0, f: 0 },
      deathSaves:
        typeof c.death_saves === 'string'
          ? JSON.parse(c.death_saves)
          : c.death_saves || { s: 0, f: 0 },
      alive: c.alive ?? true,
      active: c.active ?? false,
      sortOrder: c.sort_order ?? 99,
      sort_order: c.sort_order ?? 99,
      skills: typeof c.skills === 'string' ? JSON.parse(c.skills) : c.skills || [],
      gift: c.gift || '',
      plagueGifts:
        typeof c.plague_gifts === 'string' ? JSON.parse(c.plague_gifts) : c.plague_gifts || [],
      saciedade: Number(c.saciedade ?? 8),
      horas_faminto: Number(c.horas_faminto ?? 0),
      horasFaminto: Number(c.horas_faminto ?? 0),
      vida_max_fome: Number(c.vida_max_fome ?? 0),
      vidaMaxFome: Number(c.vida_max_fome ?? 0),
      horas_acordado: Number(c.horas_acordado ?? 0),
      horasAcordado: Number(c.horas_acordado ?? 0),
      exausto: Boolean(c.exausto ?? false),
      idle_mp4_url:
        c.idle_mp4_url ||
        (() => {
          try {
            return JSON.parse(localStorage.getItem(`peste_heroi_media_${c.id}`))?.idle_mp4_url;
          } catch (_) {
            return null;
          }
        })() ||
        null,
      idle_webm_url:
        c.idle_webm_url ||
        (() => {
          try {
            return JSON.parse(localStorage.getItem(`peste_heroi_media_${c.id}`))?.idle_webm_url;
          } catch (_) {
            return null;
          }
        })() ||
        null,
      poster_url:
        c.poster_url ||
        (() => {
          try {
            return JSON.parse(localStorage.getItem(`peste_heroi_media_${c.id}`))?.poster_url;
          } catch (_) {
            return null;
          }
        })() ||
        null,
      media_chroma:
        c.media_chroma ||
        (() => {
          try {
            return JSON.parse(localStorage.getItem(`peste_heroi_media_${c.id}`))?.media_chroma;
          } catch (_) {
            return 'verde';
          }
        })() ||
        'verde',
      media_anchor_x: Number(
        c.media_anchor_x ??
          (() => {
            try {
              return JSON.parse(localStorage.getItem(`peste_heroi_media_${c.id}`))?.media_anchor_x;
            } catch (_) {
              return 0.5;
            }
          })() ??
          0.5,
      ),
      media_anchor_y: Number(
        c.media_anchor_y ??
          (() => {
            try {
              return JSON.parse(localStorage.getItem(`peste_heroi_media_${c.id}`))?.media_anchor_y;
            } catch (_) {
              return 0.98;
            }
          })() ??
          0.98,
      ),
      media_size: Number(
        c.media_size ??
          (() => {
            try {
              return JSON.parse(localStorage.getItem(`peste_heroi_media_${c.id}`))?.media_size;
            } catch (_) {
              return 160;
            }
          })() ??
          160,
      ),
      media_facing: Number(
        c.media_facing ??
          (() => {
            try {
              return JSON.parse(localStorage.getItem(`peste_heroi_media_${c.id}`))?.media_facing;
            } catch (_) {
              return 1;
            }
          })() ??
          1,
      ),
    }));
  } catch (_) {
    return [];
  }
}

/**
 * Salva um novo personagem criado diretamente no banco Supabase
 */
export async function saveCharacterToDB(char) {
  try {
    const row = {
      id: char.id,
      name: char.name,
      title: char.title,
      race: char.race,
      race_id: char.raceId,
      racial_trait: char.racialTrait,
      oath_type: char.oathType,
      oath: char.oath,
      oath_power: char.oathPower,
      attributes: char.attributes,
      health: char.health,
      max_health: char.maxHealth,
      plague: char.plague || 0,
      gear: char.gear,
      oath_item: char.oathItem,
      backstory: char.backstory,
      connection: char.connection,
      avatar_icon: char.avatarIcon,
      caminho: char.caminho,
      level: char.level || 1,
      xp: char.xp || 0,
      max_focus: char.maxFocus ?? 3,
      defense: char.defense ?? 8,
      skills: char.skills || [],
      gift: char.gift || '',
      plague_gifts: char.plagueGifts || [],
    };

    const { data, error } = await supabase.from('characters').upsert(row).select().single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[SUPABASE] Falha ao salvar personagem no banco:', err);
    return null;
  }
}

/**
 * Atualiza campos de um personagem no Supabase
 */
export async function updateCharacterInDB(charId, updates) {
  try {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.race !== undefined) payload.race = updates.race;
    if (updates.racialTrait !== undefined) payload.racial_trait = updates.racialTrait;
    if (updates.oathType !== undefined) payload.oath_type = updates.oathType;
    if (updates.oath !== undefined) payload.oath = updates.oath;
    if (updates.oathPower !== undefined) payload.oath_power = updates.oathPower;
    if (updates.attributes !== undefined) payload.attributes = updates.attributes;
    if (updates.health !== undefined) payload.health = updates.health;
    if (updates.maxHealth !== undefined) payload.max_health = updates.maxHealth;
    if (updates.plague !== undefined) payload.plague = updates.plague;
    if (updates.gear !== undefined) payload.gear = updates.gear;
    if (updates.oathItem !== undefined) payload.oath_item = updates.oathItem;
    if (updates.backstory !== undefined) payload.backstory = updates.backstory;
    if (updates.connection !== undefined) payload.connection = updates.connection;
    if (updates.avatarIcon !== undefined) payload.avatar_icon = updates.avatarIcon;
    if (updates.caminho !== undefined) payload.caminho = updates.caminho;
    if (updates.level !== undefined) payload.level = updates.level;
    if (updates.xp !== undefined) payload.xp = updates.xp;
    if (updates.maxFocus !== undefined) payload.max_focus = updates.maxFocus;
    if (updates.max_focus !== undefined) payload.max_focus = updates.max_focus;
    if (updates.defense !== undefined) payload.defense = updates.defense;
    if (updates.base_defense !== undefined) payload.base_defense = updates.base_defense;
    if (updates.baseDefense !== undefined) payload.base_defense = updates.baseDefense;
    if (updates.skills !== undefined) payload.skills = updates.skills;
    if (updates.gift !== undefined) payload.gift = updates.gift;
    if (updates.inspiration !== undefined) payload.inspiration = updates.inspiration;
    if (updates.oathTree !== undefined) payload.oath_tree = updates.oathTree;
    if (updates.oath_tree !== undefined) payload.oath_tree = updates.oath_tree;
    if (updates.plagueGifts !== undefined) payload.plague_gifts = updates.plagueGifts;
    if (updates.plague_gifts !== undefined) payload.plague_gifts = updates.plague_gifts;
    // Permite salvar a URL do retrato na coluna avatar_icon se fornecida, ou limpar se vazio
    if (updates.portraitUrl !== undefined || updates.imageUrl !== undefined) {
      payload.avatar_icon = updates.portraitUrl || updates.imageUrl || updates.avatarIcon || '⚔️';
    }

    const { data, error } = await supabase
      .from('characters')
      .update(payload)
      .eq('id', charId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[SUPABASE] Falha ao atualizar personagem:', err);
    return null;
  }
}

/**
 * Recarrega ou inicializa no Supabase as 4 fichas técnicas oficiais da mesa:
 * Malenia, Tor Bjorn, Kaelis Moonfire e Kaian
 */
export async function syncOfficialCharactersToDB(officialList) {
  try {
    const listToInsert = officialList.map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      race: c.race,
      race_id: c.raceId,
      racial_trait: c.racialTrait,
      oath_type: c.oathType,
      oath: c.oath,
      oath_power: c.oathPower,
      attributes: c.attributes,
      health: c.health,
      max_health: c.maxHealth,
      plague: c.plague,
      gear: c.gear,
      oath_item: c.oathItem,
      backstory: c.backstory,
      connection: c.connection,
      avatar_icon: c.portraitUrl || c.avatarIcon,
    }));

    // Insere ou atualiza os 4 personagens no banco
    for (const row of listToInsert) {
      await supabase.from('characters').upsert(row);
    }

    // Opcional: remove os antigos 'gareth', 'broggan', 'lyraen', 'morren', 'vaelen' se ainda estiverem lá
    const oldIds = ['gareth', 'broggan', 'lyraen', 'morren', 'vaelen'];
    await supabase.from('characters').delete().in('id', oldIds);

    return true;
  } catch (err) {
    console.warn('[SUPABASE] Falha ao sincronizar personagens oficiais:', err);
    return false;
  }
}

/**
 * Remove qualquer canal prévio com o mesmo nome para evitar vazamento de WebSockets
 */
/**
 * Assina mudanças em tempo real na tabela de personagens do Supabase
 */
export function subscribeToCharactersRealtime(onCharacterChange) {
  return subscribeRealtime({
    topic: 'characters',
    table: 'characters',
    queryKeyToUpdate: ['characters'],
    handler: onCharacterChange,
  });
}

/**
 * Busca o Bestiário real do Supabase
 */
/**
 * Otimiza e redimensiona a imagem do avatar (máx 512x512) para salvamento leve e instantâneo
 */
export async function optimizeAvatarImage(file, maxWidth = 512, maxHeight = 512, quality = 0.85) {
  return new Promise((resolve) => {
    try {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        resolve({ file, dataUrl: null });
        return;
      }
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const fileExt = file.name ? file.name.split('.').pop().toLowerCase() : 'jpg';
                const cleanExt = ['png', 'webp'].includes(fileExt) ? fileExt : 'jpeg';
                const mime =
                  cleanExt === 'png'
                    ? 'image/png'
                    : cleanExt === 'webp'
                      ? 'image/webp'
                      : 'image/jpeg';
                const optimizedFile = new File(
                  [blob],
                  `avatar_${Date.now()}.${cleanExt === 'jpeg' ? 'jpg' : cleanExt}`,
                  { type: mime },
                );
                resolve({
                  file: optimizedFile,
                  dataUrl: canvas.toDataURL(mime, quality),
                });
              } else {
                resolve({ file, dataUrl: e.target.result });
              }
            },
            file.type === 'image/png' ? 'image/png' : 'image/jpeg',
            quality,
          );
        };
        img.onerror = () => resolve({ file, dataUrl: e.target.result });
        img.src = e.target.result;
      };
      reader.onerror = () => resolve({ file, dataUrl: null });
      reader.readAsDataURL(file);
    } catch (_) {
      resolve({ file, dataUrl: null });
    }
  });
}

/**
 * Upload de imagem de avatar do jogador para o Supabase Storage (bucket 'avatars' ou 'items')
 */
export async function uploadPlayerAvatarToStorage(file, characterId = 'hero') {
  try {
    const fileExt = file.name ? file.name.split('.').pop().toLowerCase() : 'jpg';
    const cleanExt = ['png', 'jpg', 'jpeg', 'webp'].includes(fileExt) ? fileExt : 'jpg';
    const fileName = `avatar_${characterId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;
    const filePath = `avatars/${fileName}`;

    // Tenta primeiro no bucket 'avatars'
    let uploadRes = await supabase.storage.from('avatars').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

    let chosenBucket = 'avatars';

    // Se o bucket 'avatars' não existir ou der erro de RLS, tenta o bucket 'items'
    if (uploadRes.error) {
      console.warn(
        '[STORAGE] Bucket avatars inacessível, tentando bucket items:',
        uploadRes.error.message,
      );
      uploadRes = await supabase.storage.from('items').upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });
      chosenBucket = 'items';
    }

    if (uploadRes.error) {
      toast.error(`Erro ao enviar avatar para o Storage: ${uploadRes.error.message}`, {
        action: {
          label: 'Tentar de novo',
          onClick: () => void uploadPlayerAvatarToStorage(file, characterId),
        },
      });
      throw uploadRes.error;
    }

    const { data: publicUrlData } = supabase.storage.from(chosenBucket).getPublicUrl(filePath);

    return publicUrlData?.publicUrl || '';
  } catch (err) {
    toast.error(`Falha no upload do avatar: ${err?.message || 'Erro de rede'}`, {
      action: {
        label: 'Tentar de novo',
        onClick: () => void uploadPlayerAvatarToStorage(file, characterId),
      },
    });
    throw err;
  }
}

/**
 * Atualiza death saves do jogador
 */
export async function updatePlayerDeathSavesInDB(characterId, deathSaves) {
  const { data, error } = await supabase
    .from('characters')
    .update({ death_saves: deathSaves, updated_at: new Date().toISOString() })
    .eq('id', characterId)
    .select()
    .single();

  if (error) {
    console.error('[DEATH_SAVES] Erro ao salvar death saves:', error);
  }
  return data;
}

/**
 * Atualiza condições do jogador
 */
export async function updatePlayerConditionsInDB(characterId, conditions) {
  const { data, error } = await supabase
    .from('characters')
    .update({ conditions, updated_at: new Date().toISOString() })
    .eq('id', characterId)
    .select()
    .single();

  if (error) {
    console.error('[CONDITIONS] Erro ao salvar condições:', error);
  }
  return data;
}

/**
 * Executa subida de nível via RPC level_up
 */
export async function levelUpViaRPC(characterId, choices = {}) {
  const { data, error } = await supabase.rpc('level_up', {
    p_character_id: characterId,
    p_choices: choices,
  });

  if (error) {
    console.error('[LEVEL_UP] Erro ao subir de nível:', error);
    throw error;
  }
  return data;
}

/**
 * RPC Canônica: Recalcular estatísticas do herói (recalc_hero_stats)
 */
export async function recalcHeroStatsRPC(characterId) {
  try {
    const { data, error } = await supabase.rpc('recalc_hero_stats', {
      p_character_id: characterId,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SUPABASE RPC recalc_hero_stats]', err);
    throw err;
  }
}

/**
 * Compatibilidade legada para recalcCharacterStatsRPC
 */
export async function recalcCharacterStatsRPC(arg1, arg2) {
  const charId = arg2 || arg1;
  return recalcHeroStatsRPC(charId);
}

// ── MÍDIA DE BATALHA DE HERÓIS E FERAS ──

export async function saveHeroBattleMedia(heroId, mediaData) {
  try {
    localStorage.setItem(`peste_heroi_media_${heroId}`, JSON.stringify(mediaData));
    await supabase.from('characters').update(mediaData).eq('id', heroId);
  } catch (err) {
    console.warn('[DB] saveHeroBattleMedia:', err);
  }
}
