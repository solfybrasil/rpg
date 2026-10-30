import type { InventoryItemRecord } from '../item';

export interface GridRecipeRecord {
  id: string;
  name: string;
  station: 'forja' | 'alquimia' | 'cozinha' | string;
  peso?: number;
  grid: Array<string | null>;
  result_item?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GridSlotInput {
  catalog_id?: string | null;
  [key: string]: unknown;
}

export function matchWorkshopRecipe3x3(
  recipes: GridRecipeRecord[],
  station: string,
  gridSlots: Array<GridSlotInput | null>,
  backpackItems: InventoryItemRecord[],
): {
  matched: boolean;
  canCraft: boolean;
  recipe?: GridRecipeRecord;
  reason?: 'receita_invalida' | 'falta_ingrediente';
  missingCatalogId?: string;
  requiredByCatalog?: Record<string, number>;
} {
  const stationRecipes = recipes.filter((r) => r.station === station);
  const indexMap = new Map(stationRecipes.map((r) => [JSON.stringify(r.grid), r]));
  const currentKeys = gridSlots.map((s) => (s ? (s.catalog_id ?? null) : null));
  const recipe = indexMap.get(JSON.stringify(currentKeys)) || undefined;

  if (!recipe) {
    return { matched: false, canCraft: false, reason: 'receita_invalida' };
  }

  const requiredByCatalog: Record<string, number> = {};
  for (const catId of currentKeys.filter((k): k is string => Boolean(k))) {
    requiredByCatalog[catId] = (requiredByCatalog[catId] || 0) + 1;
  }

  for (const [catId, reqQty] of Object.entries(requiredByCatalog)) {
    const ownedQty = backpackItems
      .filter((i) => i.catalog_id === catId && !i.equip_slot)
      .reduce((acc, i) => acc + Number(i.quantity || 1), 0);
    if (ownedQty < reqQty) {
      return {
        matched: true,
        recipe,
        canCraft: false,
        reason: 'falta_ingrediente',
        missingCatalogId: catId,
      };
    }
  }

  return { matched: true, recipe, canCraft: true, requiredByCatalog };
}
