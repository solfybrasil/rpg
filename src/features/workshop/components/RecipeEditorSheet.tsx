import {
  ArrowRight,
  Check,
  Flame,
  FlaskConical,
  Package,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { GridRecipeRecord, WorkshopStation } from '../../../entities/recipe';
import { Badge, Button, Sheet, Switch } from '../../../shared/ui/index.ts';
import { useCatalogItems } from '../../item-catalog/api/index.ts';
import { useSaveGridRecipeMutation } from '../api/useDMWorkshop.ts';

interface RecipeEditorSheetProps {
  recipe: GridRecipeRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export const RecipeEditorSheet: React.FC<RecipeEditorSheetProps> = ({
  recipe,
  open,
  onOpenChange,
  onSaved,
}) => {
  const isEditing = Boolean(recipe);
  const saveMutation = useSaveGridRecipeMutation();

  // Form Fields
  const [station, setStation] = useState<WorkshopStation>('forja');
  const [resultName, setResultName] = useState('');
  const [resultId, setResultId] = useState('');
  const [resultQty, setResultQty] = useState<number>(1);
  const [peso, setPeso] = useState<number>(6);
  const [skill, setSkill] = useState('Forja');
  const [rarity, setRarity] = useState('Comum');
  const [starter, setStarter] = useState(false);
  const [alternate, setAlternate] = useState(false);
  const [active, setActive] = useState(true);

  // 3x3 Grid State
  const [grid, setGrid] = useState<Array<string | null>>(Array(9).fill(null));
  const [gridNames, setGridNames] = useState<Array<string | null>>(Array(9).fill(null));

  // Catalog picker state
  const [pickingTarget, setPickingTarget] = useState<'result' | number | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const { data: catalogData } = useCatalogItems({ search: catalogSearch, pageSize: 20 });
  const catalogItems = catalogData?.data || [];

  useEffect(() => {
    if (recipe) {
      setStation(recipe.station || 'forja');
      setResultName(recipe.result_name || '');
      setResultId(recipe.result_id || '');
      setResultQty(recipe.result_qty || 1);
      setPeso(recipe.peso || 6);
      setSkill(recipe.skill || (recipe.station === 'alquimia' ? 'Alquimia' : 'Forja'));
      setRarity(recipe.rarity || 'Comum');
      setStarter(Boolean(recipe.starter));
      setAlternate(Boolean(recipe.alternate));
      setActive(recipe.active !== undefined ? Boolean(recipe.active) : true);
      setGrid(Array.isArray(recipe.grid) ? [...recipe.grid] : Array(9).fill(null));
      setGridNames(
        Array.isArray(recipe.grid_names) ? [...recipe.grid_names] : Array(9).fill(null),
      );
    } else {
      setStation('forja');
      setResultName('');
      setResultId('');
      setResultQty(1);
      setPeso(6);
      setSkill('Forja');
      setRarity('Comum');
      setStarter(false);
      setAlternate(false);
      setActive(true);
      setGrid(Array(9).fill(null));
      setGridNames(Array(9).fill(null));
    }
    setPickingTarget(null);
    setCatalogSearch('');
  }, [recipe, open]);

  const handleSlotClick = (slotIdx: number) => {
    setPickingTarget(slotIdx);
  };

  const handleClearSlot = (slotIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextGrid = [...grid];
    const nextNames = [...gridNames];
    nextGrid[slotIdx] = null;
    nextNames[slotIdx] = null;
    setGrid(nextGrid);
    setGridNames(nextNames);
  };

  const handleSelectCatalogItem = (item: any) => {
    if (pickingTarget === 'result') {
      setResultName(item.name);
      setResultId(item.id);
      setRarity(item.rarity || 'Comum');
      setPickingTarget(null);
    } else if (typeof pickingTarget === 'number') {
      const nextGrid = [...grid];
      const nextNames = [...gridNames];
      nextGrid[pickingTarget] = item.id;
      nextNames[pickingTarget] = item.name;
      setGrid(nextGrid);
      setGridNames(nextNames);
      setPickingTarget(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultName.trim()) {
      toast.error('Informe o produto resultante da receita');
      return;
    }

    const hasIngredients = grid.some((s) => s !== null);
    if (!hasIngredients) {
      toast.error('Coloque pelo menos um ingrediente na grade 3x3');
      return;
    }

    // Build unique ingredients summary
    const ingMap = new Map<string, { id: string; name: string; qty: number }>();
    grid.forEach((id, idx) => {
      if (id) {
        const name = gridNames[idx] || id;
        const existing = ingMap.get(id);
        if (existing) {
          existing.qty += 1;
        } else {
          ingMap.set(id, { id, name, qty: 1 });
        }
      }
    });

    try {
      await saveMutation.mutateAsync({
        id: recipe?.id,
        station,
        result_id: resultId || resultName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        result_name: resultName.trim(),
        result_qty: resultQty,
        grid,
        grid_names: gridNames,
        ingredients: Array.from(ingMap.values()),
        peso,
        skill,
        rarity,
        starter,
        alternate,
        active,
      });

      toast.success(
        isEditing
          ? `Receita "${resultName}" atualizada com sucesso!`
          : `Nova fórmula "${resultName}" forjada no catálogo!`,
      );
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Falha ao salvar receita: ${err.message || 'Erro desconhecido'}`);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      title={
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg font-bold text-[#f5b65b]">
            {isEditing ? `Editar Receita: ${resultName || 'Sem Nome'}` : 'Criar Nova Receita 3x3'}
          </span>
          <Badge variant="gold">{station}</Badge>
        </div>
      }
      description={
        <span>
          Configure os 9 slots visuais, o artigo resultante e o peso de dificuldade para os aventureiros.
        </span>
      }
      className="w-full sm:max-w-3xl max-h-screen overflow-y-auto bg-[#121215] border-l border-white/10"
    >
      <form onSubmit={handleSubmit} className="space-y-6 pt-4 pb-12">
        {/* Main 3x3 Grid & Result Flow */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-4 rounded-2xl border border-white/10 bg-black/40">
          {/* 3x3 Visual Grid (7 cols) */}
          <div className="md:col-span-7 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3">
              Grade de Fabricação 3x3
            </span>
            <div className="grid grid-cols-3 gap-2 p-2 rounded-2xl border border-white/15 bg-[#141418] shadow-2xl">
              {grid.map((itemId, idx) => {
                const name = gridNames[idx];
                const isSelected = pickingTarget === idx;
                const isFilled = Boolean(itemId);

                return (
                  <div
                    key={idx}
                    data-testid={`recipe-editor-slot-${idx}`}
                    onClick={() => handleSlotClick(idx)}
                    className={`relative flex h-16 w-16 sm:h-20 sm:w-20 cursor-pointer flex-col items-center justify-center rounded-xl border p-1 text-center transition-all ${
                      isSelected
                        ? 'border-[#f5b65b] bg-[#f5b65b]/20 shadow-[0_0_15px_rgba(245,182,91,0.4)] scale-105'
                        : isFilled
                        ? 'border-[#f5b65b]/50 bg-[#1a1a22] hover:border-[#f5b65b]'
                        : 'border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    {isFilled ? (
                      <>
                        <span className="text-xl select-none">✦</span>
                        <span className="text-[10px] font-serif font-bold text-[#ebe6d6] line-clamp-2 leading-tight mt-0.5">
                          {name || itemId}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleClearSlot(idx, e)}
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-950 border border-red-500/50 flex items-center justify-center text-red-300 hover:bg-red-800"
                          title="Remover deste slot"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-white/20 uppercase font-mono">
                        Slot #{idx + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-white/40 mt-2 font-serif text-center">
              Clique em qualquer compartimento para selecionar o ingrediente no catálogo.
            </p>
          </div>

          {/* Product Result Box (5 cols) */}
          <div className="md:col-span-5 flex flex-col justify-center items-center p-4 rounded-xl border border-[#f5b65b]/20 bg-[#f5b65b]/5 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#f5b65b] mb-2">
              Produto Resultante
            </span>
            <div
              data-testid="recipe-editor-product-slot"
              onClick={() => setPickingTarget('result')}
              className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-2xl border bg-[#141418] shadow-lg transition-all ${
                pickingTarget === 'result'
                  ? 'border-[#f5b65b] shadow-[0_0_15px_rgba(245,182,91,0.4)]'
                  : 'border-[#f5b65b]/40 hover:border-[#f5b65b]'
              }`}
            >
              <span className="text-3xl select-none">
                {station === 'alquimia' ? '🧪' : station === 'cozinha' ? '🍲' : '🗡️'}
              </span>
            </div>

            <p className="mt-2 font-serif font-bold text-sm text-[#ebe6d6]">
              {resultName || 'Clique para escolher artigo'}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-white/60">Qtd:</span>
              <input
                type="number"
                min={1}
                max={99}
                value={resultQty}
                onChange={(e) => setResultQty(Math.max(1, Number(e.target.value) || 1))}
                className="w-14 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-center font-mono text-xs text-[#ebe6d6] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Item Catalog Inset Picker (When a slot is clicked) */}
        {pickingTarget !== null && (
          <div className="rounded-2xl border border-[#f5b65b]/40 bg-[#18181d] p-4 shadow-2xl animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <span className="font-serif text-xs font-bold uppercase tracking-wider text-[#f5b65b]">
                {pickingTarget === 'result'
                  ? 'Selecionar Artigo Resultante'
                  : `Selecionar Ingrediente para o Slot #${(pickingTarget as number) + 1}`}
              </span>
              <button
                type="button"
                onClick={() => setPickingTarget(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Catalog search input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                autoFocus
                placeholder="Buscar no catálogo de itens..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/50 py-1.5 pl-8 pr-3 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
              />
            </div>

            {/* Catalog results */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {catalogItems.map((catItem) => (
                <button
                  key={catItem.id}
                  type="button"
                  onClick={() => handleSelectCatalogItem(catItem)}
                  className="flex items-center gap-2 p-2 rounded-xl border border-white/10 bg-black/30 hover:border-[#f5b65b]/50 hover:bg-[#f5b65b]/10 text-left transition-colors"
                >
                  <span className="text-base select-none shrink-0">{catItem.icon || '📦'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-serif font-bold text-[#ebe6d6] truncate">
                      {catItem.name}
                    </p>
                    <p className="text-[10px] text-white/40 truncate">{catItem.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recipe Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Bancada de Criação
            </label>
            <select
              value={station}
              onChange={(e) => {
                const s = e.target.value as WorkshopStation;
                setStation(s);
                if (s === 'alquimia') setSkill('Alquimia');
                else if (s === 'cozinha') setSkill('Culinária');
                else setSkill('Forja');
              }}
              className="w-full rounded-xl border border-white/10 bg-[#18181d] px-3 py-2 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            >
              <option value="forja">Forja Marcial</option>
              <option value="alquimia">Alquimia & Caldeirão</option>
              <option value="cozinha">Cozinha de Campo</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Peso / Dificuldade (DC)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={peso}
              onChange={(e) => setPeso(Number(e.target.value) || 6)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Raridade da Obra
            </label>
            <select
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#18181d] px-3 py-2 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            >
              <option value="Comum">Comum</option>
              <option value="Incomum">Incomum</option>
              <option value="Raro">Raro</option>
              <option value="Épico">Épico</option>
              <option value="Lendário">Lendário</option>
              <option value="Artefato">Artefato</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/10">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70">
            <input
              type="checkbox"
              checked={starter}
              onChange={(e) => setStarter(e.target.checked)}
              className="rounded border-white/20 bg-black/40 text-[#f5b65b] focus:ring-0"
            />
            <span>Receita Inicial (Conhecida)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70">
            <input
              type="checkbox"
              checked={alternate}
              onChange={(e) => setAlternate(e.target.checked)}
              className="rounded border-white/20 bg-black/40 text-[#f5b65b] focus:ring-0"
            />
            <span>Fórmula Alternativa</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded border-white/20 bg-black/40 text-[#f5b65b] focus:ring-0"
            />
            <span>Receita Ativa na Mesa</span>
          </label>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            data-testid="save-recipe-btn"
            variant="gold"
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5"
          >
            <Save className="h-4 w-4" />
            <span>{saveMutation.isPending ? 'Salvando...' : isEditing ? 'Atualizar Fórmula' : 'Forjar Fórmula 3x3'}</span>
          </Button>
        </div>
      </form>
    </Sheet>
  );
};
