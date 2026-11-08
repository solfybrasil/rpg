import { Anvil, CheckCircle2, ChevronRight, Sparkles, Wrench } from 'lucide-react';
import React from 'react';
import { deriveRecipeCategory, type EnrichedRecipeResult } from '../../../entities/recipe';

interface RecipeCardProps {
  recipe: EnrichedRecipeResult;
  onAssemble: (recipe: EnrichedRecipeResult) => void;
}

const STATION_COLORS: Record<string, { badge: string; text: string }> = {
  forja: { badge: 'bg-amber-950/60 border-amber-800/60 text-amber-300', text: 'text-amber-400' },
  alquimia: { badge: 'bg-purple-950/60 border-purple-800/60 text-purple-300', text: 'text-purple-400' },
  cozinha: { badge: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300', text: 'text-emerald-400' },
};

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onAssemble }) => {
  const stationStyle = STATION_COLORS[recipe.station] || STATION_COLORS.forja;
  const category = deriveRecipeCategory(recipe);

  return (
    <div className="flex flex-col h-full bg-[#14120e] border border-[rgba(201,169,97,0.22)] rounded-lg p-4 hover:border-[rgba(201,169,97,0.45)] transition-all duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
      {/* Cabeçalho da Receita */}
      <div className="flex items-start justify-between gap-3 mb-2.5 pb-2.5 border-b border-[rgba(201,169,97,0.18)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 bg-[#0d0c0a] border border-[rgba(201,169,97,0.25)] rounded-md flex items-center justify-center flex-shrink-0">
            {recipe.image_url ? (
              <img
                src={recipe.image_url}
                alt={recipe.result_name}
                className="w-7 h-7 object-contain drop-shadow"
              />
            ) : (
              <span className="text-lg">
                {recipe.station === 'forja' ? '⚔️' : recipe.station === 'alquimia' ? '🧪' : '🍲'}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-['Cinzel',serif] text-sm font-bold text-[#f5ede0] tracking-wide truncate">
              {recipe.result_name}
              {(recipe.result_qty || 1) > 1 && (
                <span className="ml-1 text-xs text-[#c9a961] font-mono">×{recipe.result_qty}</span>
              )}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#9a917f] mt-0.5">
              <span className={`px-1.5 py-0.2 rounded border text-[9px] uppercase font-bold ${stationStyle.badge}`}>
                {recipe.station}
              </span>
              <span>·</span>
              <span>{category}</span>
            </div>
          </div>
        </div>

        {/* Peso da Receita */}
        <div className="flex flex-col items-end flex-shrink-0">
          <span className="px-2 py-0.5 rounded bg-[#0d0c0a] border border-[rgba(201,169,97,0.25)] text-[10px] font-mono font-bold text-[#c9a961]">
            Peso {recipe.peso}
          </span>
          {recipe.rarity && (
            <span className="text-[9px] font-mono text-[#8c8272] mt-0.5">
              {recipe.rarity}
            </span>
          )}
        </div>
      </div>

      {/* Mini Grade 3x3 e Efeito */}
      <div className="flex items-center gap-3 mb-3">
        {/* Mini Grade 3x3 com Linhas Finas */}
        <div className="grid grid-cols-3 gap-0.5 p-1 bg-[#0d0c0a] border border-[rgba(201,169,97,0.2)] rounded w-[62px] h-[62px] flex-shrink-0">
          {Array.from({ length: 9 }).map((_, idx) => {
            const hasSlot = Boolean(recipe.grid?.[idx]);
            return (
              <div
                key={idx}
                className={`flex items-center justify-center transition-colors ${
                  hasSlot
                    ? 'bg-[#c9a961]/30 border border-[#c9a961]'
                    : 'bg-black/40 border border-black/60'
                }`}
                title={recipe.grid?.[idx] ? `Slot ${idx + 1}: ${recipe.grid[idx]}` : 'Vazio'}
              >
                {hasSlot && <div className="w-1.5 h-1.5 bg-[#c9a961]" />}
              </div>
            );
          })}
        </div>

        {/* Efeito em Garamond */}
        <p className="flex-1 font-serif text-xs text-[#b8a792] italic line-clamp-3 leading-relaxed">
          {recipe.description || 'Fórmula ancestral de alquimia e forja transmitida sob juramento em Aldrenor.'}
        </p>
      </div>

      {/* Ingredientes Necessários vs Possuídos */}
      <div className="flex-1 space-y-1 mb-3 pt-2 border-t border-[rgba(201,169,97,0.18)]">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#8c8272] block">
          Ingredientes da Bancada:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {recipe.ingredientsStatus.map((ing) => (
            <div
              key={ing.id}
              className={`flex items-center justify-between px-2 py-0.5 text-[10px] font-mono border rounded ${
                ing.isSatisfied
                  ? 'bg-[rgba(201,169,97,0.08)] border-[rgba(201,169,97,0.3)] text-[#f5ede0]'
                  : 'bg-[#0d0c0a] border-[rgba(201,169,97,0.12)] text-[#8c8272]'
              }`}
            >
              <span className="truncate mr-1">{ing.name}</span>
              <span className={ing.isSatisfied ? 'text-[#c9a961] font-bold' : 'text-[#8c8272]'}>
                {ing.owned}/{ing.needed}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé: Selo Você tem tudo + Ação Montar */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[rgba(201,169,97,0.18)]">
        {recipe.canCraftNow ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[rgba(201,169,97,0.12)] border border-[rgba(201,169,97,0.3)] text-[#f5ede0] text-[10px] font-mono font-bold animate-pulse">
            <CheckCircle2 size={12} className="text-[#c9a961]" />
            <span>Você tem tudo</span>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-[#8c8272]">
            {recipe.progressPercent}% dos materiais
          </span>
        )}

        <button
          type="button"
          onClick={() => onAssemble(recipe)}
          className="flex items-center gap-1 px-3 py-1.5 rounded border border-[rgba(201,169,97,0.3)] bg-[#1c1812] hover:border-[#c9a961] text-[#f5ede0] font-['Cinzel',serif] text-xs font-bold transition-all active:scale-95 cursor-pointer ml-auto"
        >
          <Wrench size={12} />
          <span>Montar na Bancada</span>
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
};
