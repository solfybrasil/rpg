import type { GridRecipeRecord, WorkshopStation } from '../../entities/recipe';

export interface IngredientStatus {
  id: string;
  name: string;
  needed: number;
  owned: number;
  isSatisfied: boolean;
}

export interface EnrichedRecipe extends GridRecipeRecord {
  isKnown: boolean;
  canCraftNow: boolean;
  hasAnyIngredient: boolean;
  progressPercent: number;
  ingredientsStatus: IngredientStatus[];
}

export interface RecipeBookFilterState {
  search: string;
  station: 'todas' | WorkshopStation;
  onlyCraftable: boolean;
}
