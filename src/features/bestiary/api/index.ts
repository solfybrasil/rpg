import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatarCriaturaParaBatalha } from '../../../entities/creature/index.ts';
import { supabase } from '../../../shared/supabase/client.ts';
import { createBattleToken, fetchActiveBattleMap, fetchBattleTokens } from '../../battle-map/api/battleApi.ts';
import { findFreeCells } from '../../battle-map/components/dm/editorUtils.ts';
import type { Creature, CreatureFilter, PaginatedCreaturesResult } from './types.ts';

export * from './types.ts';

const CREATURE_COLUMNS =
  'id, name, species, category, size, region, region_key, stage, tier, threat, max_hp, defense, attack_bonus, damage_dice, attacks_per_turn, abilities, weakness, loot, harvest_skill, harvest_peso, edible, cooking, eat_effect, plague, unique, lair, description, icon, image_url, tags, archived, created_at, updated_at';

export async function fetchCreaturesCatalog(
  filter: CreatureFilter = {},
): Promise<PaginatedCreaturesResult> {
  const page = filter.page && filter.page > 0 ? filter.page : 1;
  const pageSize = filter.pageSize && filter.pageSize > 0 ? filter.pageSize : 30;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('creature_catalog')
    .select(CREATURE_COLUMNS, { count: 'exact' });

  // Archived filter
  if (!filter.includeArchived) {
    query = query.or('archived.is.null,archived.eq.false');
  }

  // Text search
  if (filter.search && filter.search.trim()) {
    const s = `%${filter.search.trim().toLowerCase()}%`;
    query = query.or(`name.ilike.${s},species.ilike.${s},description.ilike.${s}`);
  }

  // Region filter
  if (filter.region && filter.region !== 'todas') {
    query = query.or(`region.eq.${filter.region},region_key.eq.${filter.region}`);
  }

  // Category filter
  if (filter.category && filter.category !== 'todas') {
    query = query.eq('category', filter.category);
  }

  // Tier filter
  if (filter.tier && filter.tier !== 'todos') {
    query = query.eq('tier', filter.tier);
  }

  // Threat range
  if (filter.threatMin && filter.threatMin > 1) {
    query = query.gte('threat', filter.threatMin);
  }
  if (filter.threatMax && filter.threatMax < 10) {
    query = query.lte('threat', filter.threatMax);
  }

  // Flags
  if (filter.edible !== undefined && filter.edible !== null) {
    query = query.eq('edible', filter.edible);
  }
  if (filter.plague !== undefined && filter.plague !== null) {
    query = query.eq('plague', filter.plague);
  }
  if (filter.unique !== undefined && filter.unique !== null) {
    query = query.eq('unique', filter.unique);
  }

  // Order & Pagination
  const { data, count, error } = await query
    .order('threat', { ascending: true })
    .order('name', { ascending: true })
    .range(from, to);

  if (error) {
    console.error('[BestiaryAPI] Erro ao buscar criaturas:', error);
    throw new Error(error.message);
  }

  const rawItems = data || [];
  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const creatures: Creature[] = rawItems.map((c: any) => {
    let localMedia: any = {};
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(`peste_fera_media_${c.id}`);
        if (stored) localMedia = JSON.parse(stored);
      } catch (_) {}
    }

    const formatted = formatarCriaturaParaBatalha(c) as any;

    return {
      id: c.id,
      name: c.name || 'Criatura Sem Nome',
      species: c.species || null,
      category: c.category || 'Fera',
      size: c.size || 'Médio',
      region: c.region || null,
      region_key: c.region_key || null,
      stage: c.stage || null,
      tier: c.tier || 'Soldado',
      threat: Number(c.threat || 1),
      max_hp: Number(c.max_hp || 10),
      defense: Number(c.defense || 10),
      attack_bonus: Number(c.attack_bonus || 0),
      damage_dice: c.damage_dice || '1d6',
      attacks_per_turn: Number(c.attacks_per_turn || 1),
      abilities: Array.isArray(c.abilities) ? c.abilities : [],
      weakness: c.weakness || null,
      loot: Array.isArray(c.loot) ? c.loot : [],
      harvest_skill: c.harvest_skill || 'Sobrevivência',
      harvest_peso: Number(c.harvest_peso || 1),
      edible: !!c.edible,
      cooking: c.cooking || null,
      eat_effect: c.eat_effect || null,
      plague: !!c.plague,
      unique: !!c.unique,
      lair: c.lair || null,
      description: c.description || null,
      icon: c.icon || '🐺',
      image_url: c.image_url || null,
      tags: Array.isArray(c.tags) ? c.tags : [],
      archived: !!c.archived,
      created_at: c.created_at || null,
      updated_at: c.updated_at || null,

      // Battle media
      idle_mp4_url: c.idle_mp4_url || localMedia.idle_mp4_url || null,
      idle_webm_url: c.idle_webm_url || localMedia.idle_webm_url || null,
      poster_url: c.poster_url || localMedia.poster_url || c.image_url || null,
      media_chroma: c.media_chroma || localMedia.media_chroma || 'verde',
      media_anchor_x: Number(c.media_anchor_x ?? localMedia.media_anchor_x ?? 0.5),
      media_anchor_y: Number(c.media_anchor_y ?? localMedia.media_anchor_y ?? 0.98),
      media_size: Number(c.media_size ?? localMedia.media_size ?? 160),
      media_facing: Number(c.media_facing ?? localMedia.media_facing ?? 1),

      // Derived
      ataques: formatted?.ataques || [],
      drops: formatted?.drops || [],
      efeitos_auto: !!formatted?.efeitos_auto,
    };
  });

  return {
    data: creatures,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export function useCreaturesCatalog(filter: CreatureFilter = {}) {
  return useQuery<PaginatedCreaturesResult>({
    queryKey: ['creatures_catalog', filter],
    queryFn: () => fetchCreaturesCatalog(filter),
    staleTime: 60_000,
  });
}

export async function createCreature(creatureData: Partial<Creature>): Promise<Creature> {
  const id =
    creatureData.id ||
    `fera_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const payload: any = {
    id,
    name: creatureData.name || 'Nova Criatura',
    species: creatureData.species || null,
    category: creatureData.category || 'Fera',
    size: creatureData.size || 'Médio',
    region: creatureData.region || null,
    region_key: creatureData.region_key || null,
    stage: creatureData.stage || null,
    tier: creatureData.tier || 'Soldado',
    threat: Number(creatureData.threat || 1),
    max_hp: Number(creatureData.max_hp || 10),
    defense: Number(creatureData.defense || 10),
    attack_bonus: Number(creatureData.attack_bonus || 0),
    damage_dice: creatureData.damage_dice || '1d6',
    attacks_per_turn: Number(creatureData.attacks_per_turn || 1),
    abilities: creatureData.abilities || [],
    weakness: creatureData.weakness || null,
    loot: creatureData.loot || [],
    harvest_skill: creatureData.harvest_skill || 'Sobrevivência',
    harvest_peso: Number(creatureData.harvest_peso || 1),
    edible: !!creatureData.edible,
    cooking: creatureData.cooking || null,
    eat_effect: creatureData.eat_effect || null,
    plague: !!creatureData.plague,
    unique: !!creatureData.unique,
    lair: creatureData.lair || null,
    description: creatureData.description || null,
    icon: creatureData.icon || '🐺',
    image_url: creatureData.image_url || null,
    tags: creatureData.tags || [],
    archived: false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('creature_catalog')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[BestiaryAPI] Erro ao criar criatura:', error);
    throw new Error(error.message);
  }

  return data as unknown as Creature;
}

export async function updateCreature(
  id: string,
  updates: Partial<Creature>,
): Promise<Creature> {
  const payload: any = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  delete payload.ataques;
  delete payload.drops;
  delete payload.efeitos_auto;

  const { data, error } = await supabase
    .from('creature_catalog')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[BestiaryAPI] Erro ao atualizar criatura:', error);
    throw new Error(error.message);
  }

  return data as unknown as Creature;
}

export async function archiveCreature(
  id: string,
  archived = true,
): Promise<boolean> {
  const { error } = await supabase
    .from('creature_catalog')
    .update({ archived, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[BestiaryAPI] Erro ao arquivar criatura:', error);
    throw new Error(error.message);
  }

  return true;
}

export async function sendCreatureToBattle(
  creature: Creature,
  qty = 1,
): Promise<{ success: boolean; encounterId?: string }> {
  try {
    // 1. Procurar encontro ativo
    let encounterId: string | null = null;
    const { data: activeEncs } = await supabase
      .from('combat_encounters')
      .select('id, name, active')
      .eq('active', true)
      .limit(1);

    if (activeEncs && activeEncs.length > 0) {
      encounterId = activeEncs[0].id;
    } else {
      // Cria novo encontro
      const { data: newEnc, error: encError } = await supabase
        .from('combat_encounters')
        .insert([
          {
            name: `Encontro com ${creature.name}`,
            active: true,
            round: 1,
            turn_index: 0,
            session_code: 'MESA',
          },
        ])
        .select()
        .single();

      if (encError || !newEnc) {
        throw new Error(encError?.message || 'Falha ao criar encontro de combate');
      }
      encounterId = newEnc.id;
    }

    // 2. Inserir combatentes
    const combatantsToAdd = [];
    for (let i = 1; i <= qty; i++) {
      const name = qty > 1 ? `${creature.name} ${i}` : creature.name;
      combatantsToAdd.push({
        encounter_id: encounterId,
        session_code: 'MESA',
        kind: 'creature',
        name,
        image_url: creature.image_url || creature.poster_url || null,
        max_hp: creature.max_hp || 10,
        hp: creature.max_hp || 10,
        defense: creature.defense || 10,
        attack_bonus: creature.attack_bonus || 0,
        damage_dice: creature.damage_dice || '1d6',
        attacks_per_turn: creature.attacks_per_turn || 1,
        special: {
          abilities: creature.abilities || [],
          weakness: creature.weakness || null,
          tier: creature.tier,
          threat: creature.threat,
        },
        creature_id: creature.id,
        initiative: 0,
        hidden: false,
        defeated: false,
        conditions: [],
      });
    }

    const { error: insError } = await supabase
      .from('combatants')
      .insert(combatantsToAdd);

    if (insError) throw insError;

    return { success: true, encounterId };
  } catch (err: any) {
    console.error('[BestiaryAPI] Erro ao enviar criatura para batalha:', err);
    throw err;
  }
}

export async function sendCreatureToTable(
  creature: Creature,
): Promise<{ success: boolean; token: any }> {
  const activeMap = await fetchActiveBattleMap();
  if (!activeMap) {
    throw new Error('Nenhuma mesa ao vivo. Abra a Mesa e coloque uma ao vivo primeiro.');
  }
  // Primeira célula livre perto do centro do mapa
  const tokens = await fetchBattleTokens(activeMap.id);
  const [cell] = findFreeCells(activeMap, tokens, 1);
  const media = creature.idle_webm_url || creature.idle_mp4_url || creature.image_url || creature.poster_url || '/batalha/fera_idle.webm';

  const token = await createBattleToken({
    map_id: activeMap.id,
    kind: 'fera',
    beast_id: creature.id,
    name: creature.name,
    media_url: media,
    media_type: /\.(webm|mp4)$/i.test(media) ? 'video' : 'imagem',
    chroma: (creature.media_chroma as string) || 'verde',
    anchor_x: creature.media_anchor_x ?? 0.284,
    anchor_y: creature.media_anchor_y ?? 0.96,
    size: creature.media_size ?? 160,
    facing: creature.media_facing ?? 1,
    c: cell.c,
    r: cell.r,
    visible: true,
  });
  return { success: true, token };
}

export async function saveCreatureBattleMedia(
  creatureId: string,
  mediaData: Record<string, any>,
): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`peste_fera_media_${creatureId}`, JSON.stringify(mediaData));
    } catch (_) {}
  }

  try {
    await supabase.from('creature_catalog').update(mediaData).eq('id', creatureId);
  } catch (err) {
    console.warn('[BestiaryAPI] Falha ao atualizar banco de mídia da fera:', err);
  }
}
