import type { InventoryItemRecord } from '../item';

export type WorkshopStation = 'forja' | 'alquimia' | 'cozinha';

export interface GridRecipeRecord {
  id: string;
  station: WorkshopStation | string;
  result_id: string;
  result_name: string;
  result_qty?: number;
  grid: Array<string | null>;
  grid_names?: Array<string | null>;
  ingredients?: Array<{ id?: string; catalog_id?: string; name?: string; qty?: number }>;
  peso: number;
  skill?: string;
  rarity?: string;
  alternate?: boolean;
  starter?: boolean;
  category?: string;
  description?: string;
  loss_minor?: number;
  loss_major?: number;
  active?: boolean;
  image_url?: string;
  icon?: string;
  [key: string]: unknown;
}

export interface GridSlotInput {
  catalog_id?: string | null;
  id?: string | null;
  name?: string | null;
  [key: string]: unknown;
}

export interface MatchWorkshopRecipeResult {
  matched: boolean;
  canCraft: boolean;
  recipe?: GridRecipeRecord;
  reason?: 'receita_invalida' | 'falta_ingrediente';
  missingCatalogId?: string;
  requiredByCatalog?: Record<string, number>;
}

/**
 * Normaliza uma chave de slot ou ingrediente
 */
export function normalizeCatalogKey(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  return trimmed;
}

/**
 * Compara o grid 3x3 contra o catálogo de receitas ativas da estação
 */
export function matchWorkshopRecipe3x3(
  recipes: GridRecipeRecord[],
  station: string,
  gridSlots: Array<GridSlotInput | null>,
  backpackItems: InventoryItemRecord[],
): MatchWorkshopRecipeResult {
  const stationRecipes = recipes.filter((r) => r.station === station);
  const currentKeys = gridSlots.map((s) => (s ? normalizeCatalogKey(s.catalog_id || s.id) : null));
  const currentKeysJson = JSON.stringify(currentKeys);

  const recipe = stationRecipes.find((r) => JSON.stringify(r.grid) === currentKeysJson);

  if (!recipe) {
    return { matched: false, canCraft: false, reason: 'receita_invalida' };
  }

  const requiredByCatalog: Record<string, number> = {};
  for (const catId of currentKeys.filter((k): k is string => Boolean(k))) {
    requiredByCatalog[catId] = (requiredByCatalog[catId] || 0) + 1;
  }

  for (const [catId, reqQty] of Object.entries(requiredByCatalog)) {
    const ownedQty = backpackItems
      .filter((i) => !i.equip_slot && (i.catalog_id === catId || i.id === catId))
      .reduce((acc, i) => acc + Number(i.quantity || 1), 0);
    if (ownedQty < reqQty) {
      return {
        matched: true,
        recipe,
        canCraft: false,
        reason: 'falta_ingrediente',
        missingCatalogId: catId,
        requiredByCatalog,
      };
    }
  }

  return { matched: true, recipe, canCraft: true, requiredByCatalog };
}

/**
 * Calcula a chance de sucesso de 2d6 + mod contra Peso em %
 * 1,1 é sempre falha/desastre; 6,6 é sempre sucesso/crítico.
 */
export function calculateSuccessChance(modifier: number, peso: number): number {
  if (peso <= 0) return 100;
  let successes = 0;
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = 1; d2 <= 6; d2++) {
      if (d1 === 1 && d2 === 1) continue; // Desastre automático
      if (d1 === 6 && d2 === 6) {
        successes++; // Crítico automático
        continue;
      }
      if (d1 + d2 + modifier >= peso) {
        successes++;
      }
    }
  }
  return Math.round((successes / 36) * 100);
}

export type CraftRollOutcome = 'desastre' | 'falha' | 'sucesso' | 'brilhante' | 'critico';

export interface CraftRollResult {
  dice1: number;
  dice2: number;
  modifier: number;
  total: number;
  peso: number;
  outcome: CraftRollOutcome;
  isBrilliant: boolean;
  yieldMultiplier: number;
}

/**
 * Determina o resultado da rolagem 2d6 de criação
 */
export function calculateCraftRollOutcome(
  dice1: number,
  dice2: number,
  modifier: number,
  peso: number,
): CraftRollResult {
  const sumDice = dice1 + dice2;
  const total = sumDice + modifier;

  let outcome: CraftRollOutcome;
  let isBrilliant = false;
  let yieldMultiplier = 1;

  if (dice1 === 1 && dice2 === 1) {
    outcome = 'desastre';
    yieldMultiplier = 0;
  } else if (dice1 === 6 && dice2 === 6) {
    outcome = 'critico';
    isBrilliant = true;
    yieldMultiplier = 2;
  } else if (total >= peso + 3) {
    outcome = 'brilhante';
    isBrilliant = true;
    yieldMultiplier = 2;
  } else if (total >= peso) {
    outcome = 'sucesso';
    yieldMultiplier = 1;
  } else {
    outcome = 'falha';
    yieldMultiplier = 0;
  }

  return {
    dice1,
    dice2,
    modifier,
    total,
    peso,
    outcome,
    isBrilliant,
    yieldMultiplier,
  };
}

export interface StationPrerequisites {
  canOperate: boolean;
  missingReasons: string[];
  hasTools: boolean;
  forgeReady: boolean;
}

/**
 * Checa ferramentas e ambiente para a bancada
 */
export function checkStationPrerequisites(
  station: WorkshopStation | string,
  forgeAvailable: boolean,
  backpackItems: InventoryItemRecord[],
): StationPrerequisites {
  const missingReasons: string[] = [];
  let hasTools = true;
  let forgeReady = true;

  const hasItemWithText = (query: string, catalogId?: string) => {
    return backpackItems.some(
      (it) =>
        !it.equip_slot &&
        ((catalogId && it.catalog_id === catalogId) ||
          (it.name || '').toLowerCase().includes(query.toLowerCase())),
    );
  };

  if (station === 'forja') {
    if (!forgeAvailable) {
      forgeReady = false;
      missingReasons.push('É necessária uma forja acesa no local (controle do Mestre).');
    }
    const hasForgeHammer = hasItemWithText('ferramentas de ferreiro', 'ferramentas-de-ferreiro');
    if (!hasForgeHammer) {
      hasTools = false;
      missingReasons.push('Falta "Ferramentas de ferreiro" na mochila.');
    }
  } else if (station === 'alquimia') {
    const hasKit = hasItemWithText('kit de alquimia', 'kit-de-alquimia');
    if (!hasKit) {
      hasTools = false;
      missingReasons.push('Falta um "Kit de alquimia" na mochila.');
    }
  } else if (station === 'cozinha') {
    if (!forgeAvailable) {
      forgeReady = false;
      missingReasons.push('É necessário fogo aceso ou braseiro disponível.');
    }
    const hasPot = hasItemWithText('panela de ferro', 'panela-de-ferro');
    if (!hasPot) {
      hasTools = false;
      missingReasons.push('Falta uma "Panela de ferro" na mochila.');
    }
  }

  return {
    canOperate: missingReasons.length === 0,
    missingReasons,
    hasTools,
    forgeReady,
  };
}

/**
 * Categorização inteligente de itens de receitas
 */
export function deriveRecipeCategory(recipe: {
  category?: string | null;
  result_name?: string | null;
  station?: string;
}): string {
  if (recipe.category?.trim()) {
    return recipe.category;
  }
  const name = (recipe.result_name || '').toLowerCase();
  const station = recipe.station;

  if (station === 'forja') {
    if (
      /espada|lâmina|lamina|machado|adaga|lança|lanca|maça|maca|arco|besta|foice|martelo|gládio|gladio|cutelo/.test(
        name,
      )
    ) {
      return 'Armas';
    }
    if (
      /escudo|elmo|armadura|couraça|couraca|grevas|manoplas|cota|peitoral|broquel|manto/.test(name)
    ) {
      return 'Armaduras & Proteções';
    }
    return 'Ferramentas & Equipamentos';
  }

  if (station === 'alquimia') {
    if (/poção|pocao|elixir|extrato|bálsamo|balsamo|tintura|tônico|tonico|soro/.test(name)) {
      return 'Poções & Elixires';
    }
    if (/óleo|oleo|veneno|toxina|pó|po|bomba|fogo|ácido|acido|resina/.test(name)) {
      return 'Óleos & Substâncias';
    }
    return 'Alquimia Geral';
  }

  if (station === 'cozinha') {
    if (/sopa|caldo|ensopado|guisado|cozido/.test(name)) {
      return 'Sopas & Caldos';
    }
    if (/assado|carne|filé|file|costela|picanha|bife|peixe|frango|javali/.test(name)) {
      return 'Carnes & Pratos';
    }
    if (/chá|cha|vinho|cerveja|hidromel|bebida|suco/.test(name)) {
      return 'Bebidas & Infusões';
    }
    if (/pão|pao|bolo|torta|queijo|ração|racao|biscoito/.test(name)) {
      return 'Pães & Provisões';
    }
    return 'Culinária Geral';
  }

  return 'Manufatura Geral';
}

export interface IngredientRequirement {
  id: string;
  name: string;
  needed: number;
  owned: number;
  isSatisfied: boolean;
}

export interface EnrichedRecipeResult extends GridRecipeRecord {
  isKnown: boolean;
  canCraftNow: boolean;
  hasAnyIngredient: boolean;
  progressPercent: number;
  ingredientsStatus: IngredientRequirement[];
}

/**
 * Enriquece uma receita com o status de posse dos ingredientes da mochila
 */
export function enrichRecipeWithInventory(
  recipe: GridRecipeRecord,
  backpackItems: InventoryItemRecord[],
  isKnown = true,
): EnrichedRecipeResult {
  const countsByCatId: Record<string, number> = {};
  for (const it of backpackItems) {
    if (it.equip_slot) continue;
    const catId = it.catalog_id || it.id;
    if (catId) {
      countsByCatId[catId] = (countsByCatId[catId] || 0) + Number(it.quantity || 1);
    }
  }

  // Calcula requisitos a partir do grid ou da lista de ingredientes
  const required: Record<string, { name: string; qty: number }> = {};

  if (Array.isArray(recipe.grid)) {
    recipe.grid.forEach((catId, idx) => {
      if (!catId) return;
      const slotName = recipe.grid_names?.[idx] || catId;
      if (!required[catId]) {
        required[catId] = { name: slotName, qty: 0 };
      }
      required[catId].qty += 1;
    });
  } else if (Array.isArray(recipe.ingredients)) {
    for (const ing of recipe.ingredients) {
      const id = ing.catalog_id || ing.id;
      if (!id) continue;
      required[id] = { name: ing.name || id, qty: ing.qty || 1 };
    }
  }

  const reqEntries = Object.entries(required);
  let totalNeeded = 0;
  let totalOwned = 0;
  let satisfiedTypes = 0;
  let typesWithAny = 0;

  const ingredientsStatus: IngredientRequirement[] = reqEntries.map(([catId, data]) => {
    const owned = countsByCatId[catId] || 0;
    const needed = data.qty;
    totalNeeded += needed;
    totalOwned += Math.min(owned, needed);

    const isSatisfied = owned >= needed;
    if (isSatisfied) satisfiedTypes += 1;
    if (owned > 0) typesWithAny += 1;

    return {
      id: catId,
      name: data.name,
      needed,
      owned,
      isSatisfied,
    };
  });

  const totalTypes = reqEntries.length;
  const canCraftNow = totalTypes > 0 && satisfiedTypes === totalTypes;
  const hasAnyIngredient = typesWithAny > 0;
  const progressPercent = totalNeeded > 0 ? Math.round((totalOwned / totalNeeded) * 100) : 0;

  return {
    ...recipe,
    isKnown,
    canCraftNow,
    hasAnyIngredient,
    progressPercent,
    ingredientsStatus,
  };
}

/**
 * Filtra a lista de receitas por busca, estação e se pode criar agora
 */
export function filterRecipeList(
  recipes: EnrichedRecipeResult[],
  filters: {
    search?: string;
    station?: string;
    onlyCraftable?: boolean;
  },
): EnrichedRecipeResult[] {
  let list = recipes;

  if (filters.station && filters.station !== 'todas') {
    list = list.filter((r) => r.station === filters.station);
  }

  if (filters.onlyCraftable) {
    list = list.filter((r) => r.canCraftNow);
  }

  if (filters.search?.trim()) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter((r) => {
      const nameMatch = (r.result_name || '').toLowerCase().includes(q);
      const catMatch = (r.category || '').toLowerCase().includes(q);
      const ingMatch = r.ingredientsStatus.some((i) => i.name.toLowerCase().includes(q));
      return nameMatch || catMatch || ingMatch;
    });
  }

  return list;
}
