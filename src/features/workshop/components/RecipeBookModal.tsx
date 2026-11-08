import React from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import type { GridRecipeRecord, WorkshopStation } from '../../../entities/recipe';
import { RecipeBookView } from '../../recipes/components/RecipeBookView';

interface RecipeBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes?: GridRecipeRecord[];
  knownRecipeIds?: Set<string>;
  backpackItems?: InventoryItemRecord[];
  currentStation?: WorkshopStation;
  onAssembleRecipe: (recipe: GridRecipeRecord) => void;
}

export const RecipeBookModal: React.FC<RecipeBookModalProps> = ({
  isOpen,
  onClose,
  onAssembleRecipe,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col my-auto rounded-xl overflow-hidden border border-[rgba(201,169,97,0.35)] shadow-[0_12px_48px_rgba(0,0,0,0.9)] bg-[#0e0906]">
        {/* Top bar with close button */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#14120e] border-b border-[rgba(201,169,97,0.2)]">
          <span className="font-['Cinzel',serif] text-xs font-bold tracking-widest text-[#c9a961] uppercase">
            COMPÊNDIO DE MANUFATURA
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#1e1a14] border border-[rgba(201,169,97,0.25)] text-[#e8e2d4] hover:text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer hover:border-[#c9a961]"
          >
            ✕
          </button>
        </div>

        {/* Book View */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4">
          <RecipeBookView
            isModal={true}
            onCloseModal={onClose}
            onAssembleRecipe={(recipe) => {
              onAssembleRecipe(recipe);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
