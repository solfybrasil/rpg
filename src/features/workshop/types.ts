import type { GridRecipeRecord, WorkshopStation } from '../../entities/recipe';
import type { InventoryItemRecord } from '../../entities/item';

export type { GridRecipeRecord, WorkshopStation };

export interface WorkshopGridSlot {
  index: number;
  item: InventoryItemRecord | null;
  catalogId?: string | null;
}

export interface MinigameResult {
  completed: boolean;
  score: 'perfeito' | 'bom' | 'normal' | 'falha';
  modifierBonus: number;
  doubleYield: boolean;
  label: string;
}

export interface CraftAttemptState {
  attemptId?: string;
  recipeId?: string;
  station: WorkshopStation;
  dice: [number, number];
  modifier: number;
  total: number;
  peso: number;
  result: 'desastre' | 'falha' | 'sucesso' | 'brilhante' | 'critico';
  isResolved?: boolean;
  recipeDiscovered?: boolean;
  productCreated?: {
    name: string;
    quantity: number;
    rarity?: string;
    imageUrl?: string;
  };
}
