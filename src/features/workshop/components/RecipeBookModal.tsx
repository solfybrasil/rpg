import { Anvil, BookOpen, Check, CheckCircle2, ChevronRight, FlaskConical, Search, UtensilsCrossed, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import { deriveRecipeCategory, type GridRecipeRecord, type WorkshopStation } from '../../../entities/recipe';

interface RecipeBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: GridRecipeRecord[];
  knownRecipeIds: Set<string>;
  backpackItems: InventoryItemRecord[];
  currentStation: WorkshopStation;
  onAssembleRecipe: (recipe: GridRecipeRecord) => void;
}

export const RecipeBookModal: React.FC<RecipeBookModalProps> = ({
  isOpen,
  onClose,
  recipes,
  knownRecipeIds,
  backpackItems,
  currentStation,
  onAssembleRecipe,
}) => {
  const [stationFilter, setStationFilter] = useState<string>(currentStation);
  const [search, setSearch] = useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Receitas conhecidas pelo jogador filtradas
  const knownRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const isKnown = r.starter || knownRecipeIds.has(r.id);
      if (!isKnown) return false;
      if (stationFilter !== 'todas' && r.station !== stationFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (r.result_name || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q)
      );
    });
  }, [recipes, knownRecipeIds, stationFilter, search]);

  // Checa se o jogador possui todos os ingredientes de uma receita
  const checkHasIngredients = (recipe: GridRecipeRecord) => {
    const required: Record<string, number> = {};
    (recipe.grid || []).forEach((catId) => {
      if (catId) {
        required[catId] = (required[catId] || 0) + 1;
      }
    });

    for (const [catId, reqQty] of Object.entries(required)) {
      const owned = backpackItems
        .filter((it) => !it.equip_slot && (it.catalog_id === catId || it.id === catId))
        .reduce((sum, it) => sum + Number(it.quantity || 1), 0);
      if (owned < reqQty) return false;
    }
    return true;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col max-h-[85vh] shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-amber-500" />
            <h2 className="text-sm font-mono font-bold text-white tracking-wider uppercase">
              Livro de Receitas ({knownRecipes.length} dominadas)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-full bg-neutral-900 border border-neutral-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="p-3 border-b border-neutral-800/80 bg-neutral-900/30 flex flex-wrap items-center justify-between gap-2">
          {/* Tabs de Estação */}
          <div className="flex items-center gap-1">
            {[
              { id: 'todas', label: 'Todas' },
              { id: 'forja', label: 'Forja', icon: Anvil },
              { id: 'alquimia', label: 'Alquimia', icon: FlaskConical },
              { id: 'cozinha', label: 'Cozinha', icon: UtensilsCrossed },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = stationFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStationFilter(tab.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                    isActive
                      ? 'bg-amber-950/80 border border-amber-600/70 text-amber-200 font-bold'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {Icon && <Icon size={12} />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Campo de Busca */}
          <div className="relative w-44">
            <Search size={12} className="absolute left-2.5 top-2 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar receita..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-md pl-7 pr-2 py-1 text-xs font-mono text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>

        {/* Lista de Receitas */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {knownRecipes.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-neutral-500">
              Nenhuma receita encontrada para os filtros selecionados.
            </div>
          ) : (
            knownRecipes.map((r) => {
              const hasIngredients = checkHasIngredients(r);
              const category = deriveRecipeCategory(r);

              return (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/80 hover:border-neutral-700 transition-all"
                >
                  {/* Informações da Receita */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center flex-shrink-0">
                      {r.image_url ? (
                        <img
                          src={r.image_url}
                          alt={r.result_name}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <span className="text-xl">
                          {r.station === 'forja' ? '⚔️' : r.station === 'alquimia' ? '🧪' : '🍲'}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white truncate">
                          {r.result_name}
                        </span>
                        {(r.result_qty || 1) > 1 && (
                          <span className="text-[10px] font-mono text-amber-400 font-bold">
                            ×{r.result_qty}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400 mt-0.5">
                        <span className="capitalize text-amber-400/80">{r.station}</span>
                        <span>·</span>
                        <span>{category}</span>
                        <span>·</span>
                        <span>Peso {r.peso}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ação: Montar na Bancada */}
                  <div className="flex items-center justify-end gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800/60">
                    {hasIngredients ? (
                      <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 mr-1">
                        <Check size={12} />
                        <span>Materiais prontos</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-neutral-500 mr-1">
                        Faltam materiais
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onAssembleRecipe(r);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-600/60 text-amber-200 font-mono text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                    >
                      <span>Montar</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
