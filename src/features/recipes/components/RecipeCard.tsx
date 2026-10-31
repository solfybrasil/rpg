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
    <div className="flex flex-col h-full bg-neutral-900/40 rounded-xl border border-neutral-800/80 p-4 hover:border-amber-700/50 transition-all duration-200">
      {/* Cabeçalho da Receita */}
      <div className="flex items-start justify-between gap-3 mb-2.5 pb-2.5 border-b border-neutral-800/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center flex-shrink-0">
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
            <h3 className="font-serif text-sm font-bold text-white tracking-wide truncate">
              {recipe.result_name}
              {(recipe.result_qty || 1) > 1 && (
                <span className="ml-1 text-xs text-amber-400 font-mono">×{recipe.result_qty}</span>
              )}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400 mt-0.5">
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
          <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[10px] font-mono font-bold text-amber-200">
            Peso {recipe.peso}
          </span>
          {recipe.rarity && (
            <span className="text-[9px] font-mono text-neutral-500 mt-0.5">
              {recipe.rarity}
            </span>
          )}
        </div>
      </div>

      {/* Mini Grade 3x3 e Efeito */}
      <div className="flex items-center gap-3 mb-3">
        {/* Mini Grade 3x3 com Linhas Finas */}
        <div className="grid grid-cols-3 gap-0.5 p-1 rounded-md bg-neutral-950/80 border border-neutral-800/80 w-[62px] h-[62px] flex-shrink-0">
          {Array.from({ length: 9 }).map((_, idx) => {
            const hasSlot = Boolean(recipe.grid?.[idx]);
            return (
              <div
                key={idx}
                className={`rounded-[2px] flex items-center justify-center transition-colors ${
                  hasSlot
                    ? 'bg-amber-600/40 border border-amber-500/60'
                    : 'bg-neutral-900/60 border border-neutral-800/40'
                }`}
                title={recipe.grid?.[idx] ? `Slot ${idx + 1}: ${recipe.grid[idx]}` : 'Vazio'}
              >
                {hasSlot && <div className="w-1.5 h-1.5 rounded-full bg-amber-400/90" />}
              </div>
            );
          })}
        </div>

        {/* Efeito em Newsreader / Serif */}
        <p className="flex-1 font-serif text-xs text-neutral-300 italic line-clamp-3 leading-relaxed">
          {recipe.description || 'Fórmula ancestral de alquimia e forja transmitida sob juramento em Aldrenor.'}
        </p>
      </div>

      {/* Ingredientes Necessários vs Possuídos */}
      <div className="flex-1 space-y-1 mb-3 pt-2 border-t border-neutral-800/60">
        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">
          Ingredientes da Bancada:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {recipe.ingredientsStatus.map((ing) => (
            <div
              key={ing.id}
              className={`flex items-center justify-between px-2 py-0.5 rounded text-[10px] font-mono border ${
                ing.isSatisfied
                  ? 'bg-neutral-950/70 border-emerald-900/40 text-neutral-200'
                  : 'bg-neutral-950/40 border-neutral-800/60 text-neutral-400'
              }`}
            >
              <span className="truncate mr-1">{ing.name}</span>
              <span className={ing.isSatisfied ? 'text-emerald-400 font-bold' : 'text-amber-500'}>
                {ing.owned}/{ing.needed}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé: Selo Você tem tudo + Ação Montar */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/60">
        {recipe.canCraftNow ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-950/70 border border-emerald-600/60 text-emerald-300 text-[10px] font-mono font-bold animate-pulse">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <span>Você tem tudo</span>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-neutral-500">
            {recipe.progressPercent}% dos materiais
          </span>
        )}

        <button
          type="button"
          onClick={() => onAssemble(recipe)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-xs font-bold transition-all border border-neutral-700 active:scale-95 cursor-pointer ml-auto"
        >
          <Wrench size={12} />
          <span>Montar na Bancada</span>
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
};
