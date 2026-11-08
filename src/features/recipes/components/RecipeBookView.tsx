import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  Search,
  Star,
  Wrench,
  Check,
  AlertCircle,
  Anvil,
  UtensilsCrossed,
  Sparkles,
  Swords,
  FlaskConical,
  Feather,
  Layers,
  RotateCcw,
  Package,
} from 'lucide-react';
import type { InventoryItemRecord } from '../../../entities/item';
import type { GridRecipeRecord, WorkshopStation } from '../../../entities/recipe';
import { useHero, useInventory } from '../../../shared/hooks/baseHooks';
import { useSessionStore } from '../../../shared/stores/session';
import { useKnownRecipes, useWorkshopRecipes } from '../../workshop/api/useWorkshop';
import '../../../styles/features/RecipeBook.css';

const RARITY_ORDER: Record<string, number> = {
  Comum: 1,
  Incomum: 2,
  Raro: 3,
  Lendário: 4,
  Lendario: 4,
  Artefato: 5,
};

/**
 * Deriva a categoria do item de forma inteligente com base no nome e estação
 */
function deriveCategory(recipe: GridRecipeRecord): string {
  if (recipe.category && recipe.category.trim() !== '') {
    return recipe.category;
  }
  const name = (recipe.result_name || '').toLowerCase();
  const station = recipe.station;

  if (station === 'forja') {
    if (
      /espada|lâmina|lamina|machado|adaga|lança|lanca|maça|maca|arco|besta|foice|presa|tridente|martelo|mangual|alabarda|gládio|gladio|florete|punhal|cutelo/.test(
        name,
      )
    ) {
      return 'Armas';
    }
    if (
      /escudo|elmo|armadura|couraça|couraca|grevas|manoplas|cota|peitoral|brigue|broquel|manto|cinto/.test(
        name,
      )
    ) {
      return 'Armaduras & Proteções';
    }
    return 'Ferramentas & Equipamentos';
  }

  if (station === 'alquimia') {
    if (
      /poção|pocao|elixir|extrato|bálsamo|balsamo|tintura|fórmula|formula|tônico|tonico|soro/.test(
        name,
      )
    ) {
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
      return 'Pães & Rações';
    }
    return 'Culinária Geral';
  }

  return 'Outros';
}

/**
 * Normaliza os ingredientes de uma receita, calculando a lista única
 */
function extractRecipeIngredients(recipe: GridRecipeRecord): Array<{
  id: string;
  name: string;
  qty: number;
}> {
  const recAny = recipe as Record<string, unknown>;
  if (Array.isArray(recAny.ingredients) && recAny.ingredients.length > 0) {
    return (recAny.ingredients as Array<Record<string, unknown>>).map((ing) => ({
      id: String(
        ing.id ||
          ing.catalog_id ||
          (ing.name ? String(ing.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') : ''),
      ),
      name: String(ing.name || ing.result_name || ing.id || 'Ingrediente'),
      qty: Number(ing.qty || ing.quantity || 1),
    }));
  }

  const grid = Array.isArray(recipe.grid) ? recipe.grid : [];
  const gridNames: string[] = Array.isArray(recAny.grid_names)
    ? (recAny.grid_names as string[])
    : [];
  const map = new Map<string, { id: string; name: string; qty: number }>();

  grid.forEach((targetId, idx) => {
    if (!targetId) return;
    const name =
      gridNames[idx] || (typeof targetId === 'string' ? targetId.replace(/-/g, ' ') : 'Item');
    const key = typeof targetId === 'string' ? targetId : name.toLowerCase();

    if (!map.has(key)) {
      map.set(key, {
        id: targetId,
        name: name,
        qty: 0,
      });
    }
    map.get(key)!.qty += 1;
  });

  return Array.from(map.values());
}

export interface RecipeBookViewProps {
  onAssembleRecipe?: (recipe: GridRecipeRecord) => void;
  isModal?: boolean;
  onCloseModal?: () => void;
  currentStation?: WorkshopStation | 'todos';
  highlightRecipeId?: string | null;
  mode?: 'player' | 'dm';
}

export const RecipeBookView: React.FC<RecipeBookViewProps> = ({
  onAssembleRecipe,
  isModal = false,
  onCloseModal,
  currentStation = 'todos',
  highlightRecipeId = null,
  mode = 'player',
}) => {
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const heroId = sessionHeroId || 'teste_1';

  const { hero } = useHero(heroId);
  const { items: inventoryItems = [] } = useInventory(heroId);
  const { knownRecipeIds } = useKnownRecipes(heroId);

  // Busca receitas das estações
  const { data: forgeRecipes = [] } = useWorkshopRecipes('forja');
  const { data: alchemyRecipes = [] } = useWorkshopRecipes('alquimia');
  const { data: cookingRecipes = [] } = useWorkshopRecipes('cozinha');

  const [recipes, setRecipes] = useState<GridRecipeRecord[]>([]);
  const [markedRecipeIds, setMarkedRecipeIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`peste_recipe_marks_${heroId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [recipeNotes, setRecipeNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`peste_recipe_notes_${heroId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Filtros
  const [selectedStation, setSelectedStation] = useState<string>(currentStation || 'todos');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [inventoryFilter, setInventoryFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('ready_first');

  const noteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const combined = [...forgeRecipes, ...alchemyRecipes, ...cookingRecipes];
    setRecipes(combined);
  }, [forgeRecipes, alchemyRecipes, cookingRecipes]);

  // Tecla ESC para fechar se estiver em modal
  useEffect(() => {
    if (!isModal || !onCloseModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModal, onCloseModal]);

  // Mapa de itens do inventário (não equipados)
  const inventoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (inventoryItems || []).forEach((it) => {
      if (it.equip_slot) return;
      const qty = Number(it.quantity || 1);
      if (it.catalog_id) {
        const k = String(it.catalog_id).toLowerCase().trim();
        counts.set(k, (counts.get(k) || 0) + qty);
      }
      if (it.name) {
        const kName = it.name.toLowerCase().trim();
        counts.set(kName, (counts.get(kName) || 0) + qty);
        const kSlug = kName.replace(/[^a-z0-9]+/g, '-');
        counts.set(kSlug, (counts.get(kSlug) || 0) + qty);
      }
      if (it.id) {
        counts.set(String(it.id), (counts.get(String(it.id)) || 0) + qty);
      }
    });
    return counts;
  }, [inventoryItems]);

  const getIngredientCount = useCallback(
    (ing: { id: string; name: string }) => {
      const idKey = ing.id ? String(ing.id).toLowerCase().trim() : '';
      const nameKey = ing.name ? ing.name.toLowerCase().trim() : '';
      const slugKey = nameKey ? nameKey.replace(/[^a-z0-9]+/g, '-') : '';

      const byId = idKey ? countsGet(inventoryCounts, idKey) : 0;
      const byName = nameKey ? countsGet(inventoryCounts, nameKey) : 0;
      const bySlug = slugKey ? countsGet(inventoryCounts, slugKey) : 0;

      return Math.max(byId, byName, bySlug);
    },
    [inventoryCounts],
  );

  function countsGet(map: Map<string, number>, key: string): number {
    return map.get(key) || 0;
  }

  // Enriquecer cada receita com metadados
  const enrichedRecipes = useMemo(() => {
    return recipes.map((recipe) => {
      const isKnown = mode === 'dm' || Boolean(recipe.starter || knownRecipeIds.has(recipe.id));
      const category = deriveCategory(recipe);
      const ingredients = extractRecipeIngredients(recipe);
      const isMarked = markedRecipeIds.has(recipe.id);

      let totalNeededQty = 0;
      let totalOwnedQty = 0;
      let typesSatisfied = 0;
      let typesWithAtLeastOne = 0;
      let totalMissingQty = 0;

      const ingredientsStatus = ingredients.map((ing) => {
        const owned = getIngredientCount(ing);
        const needed = ing.qty || 1;
        totalNeededQty += needed;
        totalOwnedQty += Math.min(owned, needed);

        const isSatisfied = owned >= needed;
        if (isSatisfied) typesSatisfied += 1;
        if (owned > 0) typesWithAtLeastOne += 1;

        const missing = Math.max(0, needed - owned);
        totalMissingQty += missing;

        return {
          ...ing,
          owned,
          needed,
          isSatisfied,
          missing,
        };
      });

      const totalTypes = ingredients.length;
      const canCraftNow = totalTypes > 0 && typesSatisfied === totalTypes;
      const hasAnyIngredient = typesWithAtLeastOne > 0;
      const progressPercent =
        totalNeededQty > 0 ? Math.round((totalOwnedQty / totalNeededQty) * 100) : 0;

      return {
        ...recipe,
        isKnown,
        derivedCategory: category,
        ingredientsStatus,
        totalTypes,
        typesSatisfied,
        typesWithAtLeastOne,
        totalNeededQty,
        totalOwnedQty,
        totalMissingQty,
        canCraftNow,
        hasAnyIngredient,
        progressPercent,
        isMarked,
      };
    });
  }, [recipes, knownRecipeIds, markedRecipeIds, mode, getIngredientCount]);

  // Lista de categorias únicas para os filtros
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    enrichedRecipes.forEach((r) => {
      if (selectedStation === 'todos' || r.station === selectedStation) {
        set.add(r.derivedCategory);
      }
    });
    return Array.from(set).sort();
  }, [enrichedRecipes, selectedStation]);

  // Filtragem e ordenação
  const filteredRecipes = useMemo(() => {
    let list = enrichedRecipes;

    if (mode === 'player') {
      list = list.filter((r) => r.isKnown);
    }

    if (selectedStation !== 'todos') {
      list = list.filter((r) => r.station === selectedStation);
    }

    if (selectedCategory !== 'todos') {
      list = list.filter((r) => r.derivedCategory === selectedCategory);
    }

    if (inventoryFilter === 'ready') {
      list = list.filter((r) => r.canCraftNow);
    } else if (inventoryFilter === 'has_items') {
      list = list.filter((r) => r.hasAnyIngredient);
    } else if (inventoryFilter === 'starred') {
      list = list.filter((r) => r.isMarked);
    } else if (inventoryFilter === 'missing_one') {
      list = list.filter((r) => !r.canCraftNow && r.totalMissingQty <= 1);
    }

    const q = searchTerm.toLowerCase().trim();
    if (q) {
      list = list.filter((r) => {
        const matchName = (r.result_name || '').toLowerCase().includes(q);
        const matchCat = (r.derivedCategory || '').toLowerCase().includes(q);
        const matchIng = r.ingredientsStatus.some((i) => (i.name || '').toLowerCase().includes(q));
        return matchName || matchCat || matchIng;
      });
    }

    return list.sort((a, b) => {
      if (highlightRecipeId) {
        if (a.id === highlightRecipeId) return -1;
        if (b.id === highlightRecipeId) return 1;
      }

      if (sortBy === 'ready_first') {
        if (a.canCraftNow !== b.canCraftNow) return a.canCraftNow ? -1 : 1;
        if (a.progressPercent !== b.progressPercent) return b.progressPercent - a.progressPercent;
      } else if (sortBy === 'rarity_desc') {
        const rA = RARITY_ORDER[a.rarity || 'Comum'] || 1;
        const rB = RARITY_ORDER[b.rarity || 'Comum'] || 1;
        if (rA !== rB) return rB - rA;
      }

      return (a.result_name || '').localeCompare(b.result_name || '');
    });
  }, [
    enrichedRecipes,
    mode,
    selectedStation,
    selectedCategory,
    inventoryFilter,
    searchTerm,
    sortBy,
    highlightRecipeId,
  ]);

  // Contagens para badges
  const counts = useMemo(() => {
    const base = enrichedRecipes.filter((r) => mode !== 'player' || r.isKnown);
    const forja = base.filter((r) => r.station === 'forja').length;
    const alquimia = base.filter((r) => r.station === 'alquimia').length;
    const cozinha = base.filter((r) => r.station === 'cozinha').length;
    const ready = base.filter((r) => r.canCraftNow).length;
    const hasItems = base.filter((r) => r.hasAnyIngredient).length;
    const starred = base.filter((r) => r.isMarked).length;

    return { total: base.length, forja, alquimia, cozinha, ready, hasItems, starred };
  }, [enrichedRecipes, mode]);

  const handleToggleMark = (recipeId: string) => {
    const isMarked = markedRecipeIds.has(recipeId);
    const updated = new Set(markedRecipeIds);
    if (isMarked) updated.delete(recipeId);
    else updated.add(recipeId);
    setMarkedRecipeIds(updated);
    try {
      localStorage.setItem(`peste_recipe_marks_${heroId}`, JSON.stringify(Array.from(updated)));
    } catch {}
  };

  const handleNoteChange = (recipeId: string, text: string) => {
    setRecipeNotes((prev) => {
      const next = { ...prev, [recipeId]: text };
      try {
        localStorage.setItem(`peste_recipe_notes_${heroId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleNoteDrawer = (recipeId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });
  };

  const content = (
    <div
      className="recipe-compendium-shell"
      style={!isModal ? { height: 'auto', minHeight: '85vh', maxHeight: 'none' } : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── 1. HEADER MODERNO E MINIMALISTA ── */}
      <header className="recipe-compendium-header">
        <div className="recipe-header-title-group">
          <div className="recipe-header-icon-box">
            <Sparkles size={20} />
          </div>
          <div className="recipe-header-headings">
            <h2 className="recipe-header-title">
              {mode === 'player' ? 'Compêndio de Criação' : 'Registro de Fórmulas do Mestre'}
            </h2>
            <span className="recipe-header-subtitle">
              {counts.total} fórmulas registradas • Forja, Alquimia e Culinária
            </span>
          </div>
        </div>

        <div className="recipe-header-actions">
          <div className="recipe-search-box">
            <Search size={14} className="recipe-search-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por item ou ingrediente..."
              className="recipe-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="recipe-search-clear"
                onClick={() => setSearchTerm('')}
                title="Limpar busca"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {isModal && onCloseModal && (
            <button
              type="button"
              className="recipe-header-close-btn"
              onClick={onCloseModal}
              title="Fechar Compêndio (Esc)"
            >
              <X size={16} />
              <span>Fechar</span>
            </button>
          )}
        </div>
      </header>

      {/* ── 2. BARRA DE FERRAMENTAS E FILTROS INTELIGENTES ── */}
      <div className="recipe-toolbar">
        {/* Linha 1: Abas de Estações de Ofício */}
        <div className="recipe-stations-row">
          <div className="recipe-station-tabs">
            <button
              type="button"
              className={`recipe-station-tab-btn ${selectedStation === 'todos' ? 'active' : ''}`}
              onClick={() => {
                setSelectedStation('todos');
                setSelectedCategory('todos');
              }}
            >
              <Layers size={14} />
              <span>Todas</span>
              <span className="recipe-tab-count">{counts.total}</span>
            </button>

            <button
              type="button"
              className={`recipe-station-tab-btn ${selectedStation === 'forja' ? 'active' : ''}`}
              onClick={() => {
                setSelectedStation('forja');
                setSelectedCategory('todos');
              }}
            >
              <Anvil size={14} />
              <span>Forja & Metalurgia</span>
              <span className="recipe-tab-count">{counts.forja}</span>
            </button>

            <button
              type="button"
              className={`recipe-station-tab-btn ${selectedStation === 'alquimia' ? 'active' : ''}`}
              onClick={() => {
                setSelectedStation('alquimia');
                setSelectedCategory('todos');
              }}
            >
              <FlaskConical size={14} />
              <span>Alquimia & Misturas</span>
              <span className="recipe-tab-count">{counts.alquimia}</span>
            </button>

            <button
              type="button"
              className={`recipe-station-tab-btn ${selectedStation === 'cozinha' ? 'active' : ''}`}
              onClick={() => {
                setSelectedStation('cozinha');
                setSelectedCategory('todos');
              }}
            >
              <UtensilsCrossed size={14} />
              <span>Culinária dos Ermos</span>
              <span className="recipe-tab-count">{counts.cozinha}</span>
            </button>
          </div>

          <div className="recipe-sort-meta-group">
            <span className="recipe-results-count">{filteredRecipes.length} receitas</span>
            <select
              className="recipe-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="ready_first">Mais Prontas Primeiro</option>
              <option value="rarity_desc">Raridade (Maior)</option>
              <option value="name_asc">Nome (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Linha 2: Chips de Inventário Inteligente + Categorias */}
        <div className="recipe-smart-filters-row">
          <div className="recipe-inventory-chips">
            <button
              type="button"
              className={`recipe-filter-chip ${inventoryFilter === 'todos' ? 'active' : ''}`}
              onClick={() => setInventoryFilter('todos')}
            >
              Todas as Fórmulas
            </button>

            <button
              type="button"
              className={`recipe-filter-chip chip-ready ${inventoryFilter === 'ready' ? 'active' : ''}`}
              onClick={() => setInventoryFilter((prev) => (prev === 'ready' ? 'todos' : 'ready'))}
              title="Mostrar apenas receitas que você pode criar imediatamente"
            >
              <Check size={12} />
              <span>Prontas para Criar ({counts.ready})</span>
            </button>

            <button
              type="button"
              className={`recipe-filter-chip chip-partial ${inventoryFilter === 'has_items' ? 'active' : ''}`}
              onClick={() =>
                setInventoryFilter((prev) => (prev === 'has_items' ? 'todos' : 'has_items'))
              }
              title="Mostrar receitas onde você já tem pelo menos 1 item na mochila"
            >
              <Package size={12} />
              <span>Tenho Ingredientes ({counts.hasItems})</span>
            </button>

            <button
              type="button"
              className={`recipe-filter-chip ${inventoryFilter === 'missing_one' ? 'active' : ''}`}
              onClick={() =>
                setInventoryFilter((prev) => (prev === 'missing_one' ? 'todos' : 'missing_one'))
              }
              title="Receitas que faltam apenas 1 item para completar"
            >
              <span>Falta Apenas 1 Item</span>
            </button>

            {counts.starred > 0 && (
              <button
                type="button"
                className={`recipe-filter-chip chip-star ${inventoryFilter === 'starred' ? 'active' : ''}`}
                onClick={() =>
                  setInventoryFilter((prev) => (prev === 'starred' ? 'todos' : 'starred'))
                }
              >
                <Star size={12} fill="#ffd700" />
                <span>Favoritas ({counts.starred})</span>
              </button>
            )}
          </div>

          {availableCategories.length > 1 && (
            <select
              className="recipe-sort-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="todos">Todas as Categorias</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── 3. CORPO PRINCIPAL COM GRID BENTO DE RECEITAS ── */}
      <main className="recipe-compendium-body">
        {filteredRecipes.length === 0 ? (
          <div className="recipe-empty-state">
            <Package size={42} className="recipe-empty-icon" />
            <h3 className="recipe-empty-title">Nenhuma receita encontrada</h3>
            <p className="recipe-empty-desc">
              {searchTerm
                ? `Nenhum resultado corresponde à busca "${searchTerm}".`
                : inventoryFilter === 'ready'
                  ? 'Você ainda não possui todos os ingredientes de nenhuma receita na mochila.'
                  : inventoryFilter === 'has_items'
                    ? 'Você não possui nenhum ingrediente necessário para as receitas desta seção.'
                    : 'Nenhuma fórmula coincide com os filtros selecionados.'}
            </p>
            <button
              type="button"
              className="recipe-empty-reset-btn"
              onClick={() => {
                setSelectedStation('todos');
                setSelectedCategory('todos');
                setInventoryFilter('todos');
                setSearchTerm('');
              }}
            >
              <RotateCcw size={13} style={{ marginRight: '6px' }} />
              Redefinir Filtros
            </button>
          </div>
        ) : (
          <div className="recipe-grid">
            {filteredRecipes.map((recipe) => (
              <RecipeCardBento
                key={recipe.id}
                recipe={recipe}
                mode={mode}
                isHighlighted={recipe.id === highlightRecipeId}
                isStarred={markedRecipeIds.has(recipe.id)}
                onToggleStar={() => handleToggleMark(recipe.id)}
                personalNote={recipeNotes[recipe.id] || ''}
                isNoteExpanded={expandedNotes.has(recipe.id)}
                onToggleNote={() => toggleNoteDrawer(recipe.id)}
                onNoteChange={(txt) => handleNoteChange(recipe.id, txt)}
                onAssembleOnWorkbench={onAssembleRecipe}
                onCloseCompendium={onCloseModal}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );

  if (isModal) {
    return (
      <div className="recipe-book-backdrop" onClick={onCloseModal}>
        {content}
      </div>
    );
  }

  return <div className="p-4 md:p-6 max-w-7xl mx-auto">{content}</div>;
};

/**
 * Card individual de receita em layout bento idêntico
 */
function RecipeCardBento({
  recipe,
  mode,
  isHighlighted,
  isStarred,
  onToggleStar,
  personalNote,
  isNoteExpanded,
  onToggleNote,
  onNoteChange,
  onAssembleOnWorkbench,
  onCloseCompendium,
}: {
  recipe: any;
  mode: 'player' | 'dm';
  isHighlighted: boolean;
  isStarred: boolean;
  onToggleStar: () => void;
  personalNote: string;
  isNoteExpanded: boolean;
  onToggleNote: () => void;
  onNoteChange: (txt: string) => void;
  onAssembleOnWorkbench?: (recipe: GridRecipeRecord) => void;
  onCloseCompendium?: () => void;
}) {
  const {
    station,
    result_name,
    result_qty,
    peso,
    rarity = 'Comum',
    derivedCategory,
    canCraftNow,
    hasAnyIngredient,
    progressPercent,
    typesSatisfied,
    totalTypes,
    totalMissingQty,
    ingredientsStatus,
    grid = [],
    grid_names = [],
  } = recipe;

  const rarityClass = `rarity-${(rarity || 'comum').toLowerCase()}`;
  const stationLabel =
    station === 'forja' ? 'Forja' : station === 'alquimia' ? 'Alquimia' : 'Cozinha';

  return (
    <div
      className={`recipe-card ${isHighlighted ? 'highlighted' : ''} ${canCraftNow ? 'ready-to-craft' : ''}`}
    >
      {/* 1. Header do Card: Badges e Favorito */}
      <div className="recipe-card-header">
        <div className="recipe-card-badges">
          <span className="recipe-badge-station">{stationLabel}</span>
          <span className="recipe-badge-category">{derivedCategory}</span>
          <span className={`recipe-badge-rarity ${rarityClass}`}>{rarity}</span>
        </div>

        {mode === 'player' && (
          <button
            type="button"
            className={`recipe-card-star-btn ${isStarred ? 'active' : ''}`}
            onClick={onToggleStar}
            title={isStarred ? 'Remover dos favoritos' : 'Favoritar receita'}
          >
            <Star size={16} fill={isStarred ? '#ffd700' : 'none'} />
          </button>
        )}
      </div>

      {/* 2. Identidade: Ícone e Título */}
      <div className="recipe-card-identity">
        <div className="recipe-card-icon-frame">
          {recipe.image_url ? (
            <img src={recipe.image_url} alt={result_name} className="recipe-card-img" />
          ) : station === 'forja' ? (
            <Swords size={22} />
          ) : station === 'alquimia' ? (
            <FlaskConical size={22} />
          ) : (
            <UtensilsCrossed size={22} />
          )}
        </div>

        <div className="recipe-card-info">
          <h3 className="recipe-card-title">{result_name}</h3>
          <span className="recipe-card-meta">
            Rende: {result_qty || 1} un • Peso: {peso || 10} • Dificuldade{' '}
            {peso ? Math.round(peso * 1.2) : 12}
          </span>
        </div>
      </div>

      {/* 3. Status de Prontidão e Ingredientes Disponíveis */}
      <div className="recipe-readiness-box">
        <div className="recipe-readiness-header">
          <span
            className={`recipe-readiness-status ${canCraftNow ? 'status-ready' : hasAnyIngredient ? 'status-partial' : 'status-none'}`}
          >
            {canCraftNow ? (
              <>
                <Check size={13} />
                <span>Pronto para Criar</span>
              </>
            ) : hasAnyIngredient ? (
              <>
                <Package size={13} />
                <span>
                  Possui {typesSatisfied}/{totalTypes} tipos ({totalMissingQty} em falta)
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={13} />
                <span>Nenhum item na mochila</span>
              </>
            )}
          </span>
          <span className="recipe-readiness-ratio">{progressPercent}%</span>
        </div>

        <div className="recipe-progress-track">
          <div
            className={`recipe-progress-bar ${canCraftNow ? 'bar-ready' : hasAnyIngredient ? 'bar-partial' : 'bar-none'}`}
            style={{ width: `${Math.max(canCraftNow ? 100 : progressPercent, 4)}%` }}
          />
        </div>
      </div>

      {/* 4. Miniatura 3x3 + Lista Scannable de Ingredientes */}
      <div className="recipe-workbench-preview-row">
        <div className="recipe-mini-grid-container" title="Esquema da bancada 3×3 dos ermos">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
            const slotItem = grid[idx];
            if (!slotItem) {
              return <div key={idx} className="recipe-mini-cell empty" />;
            }

            const slotName =
              grid_names[idx] || (typeof slotItem === 'string' ? slotItem : 'Item');
            const matchedStatus = ingredientsStatus.find(
              (i: any) =>
                i.id === slotItem ||
                (i.name && i.name.toLowerCase() === slotName.toLowerCase()),
            );
            const hasStock = matchedStatus && matchedStatus.owned > 0;

            return (
              <div
                key={idx}
                className={`recipe-mini-cell filled ${hasStock ? 'has-item' : 'missing-item'}`}
                title={`${slotName} (${hasStock ? 'Disponível na mochila' : 'Faltando'})`}
              >
                {hasStock ? '✓' : '•'}
              </div>
            );
          })}
        </div>

        <div className="recipe-ingredients-list">
          {ingredientsStatus.map((ing: any, iIdx: number) => (
            <div
              key={iIdx}
              className={`recipe-ingredient-row ${ing.isSatisfied ? 'has-all' : 'is-missing'}`}
            >
              <span className="recipe-ing-name" title={ing.name}>
                {ing.name}
              </span>

              <div className="recipe-ing-count-group">
                <span className={ing.owned >= ing.needed ? 'recipe-ing-have' : 'recipe-ing-need'}>
                  {ing.owned} / {ing.needed}
                </span>

                {ing.missing > 0 && (
                  <span className="recipe-ing-missing-tag">Falta {ing.missing}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Ações Rápidas: Montar na Bancada / Notas */}
      <div className="recipe-card-actions">
        {mode === 'player' && onAssembleOnWorkbench && (
          <button
            type="button"
            className="recipe-action-btn-assemble"
            onClick={() => {
              onAssembleOnWorkbench(recipe);
              if (onCloseCompendium) onCloseCompendium();
            }}
            title="Dispor automaticamente os ingredientes disponíveis na bancada 3x3"
          >
            <Wrench size={14} />
            <span>Montar na Bancada</span>
          </button>
        )}

        {mode === 'player' && (
          <button
            type="button"
            className={`recipe-action-btn-notes ${personalNote ? 'has-note' : ''}`}
            onClick={onToggleNote}
            title="Anotações pessoais do Jurado sobre esta fórmula"
          >
            <Feather size={14} />
          </button>
        )}
      </div>

      {/* Caixa de Anotação Expansível */}
      {mode === 'player' && isNoteExpanded && (
        <div className="recipe-card-note-box">
          <input
            type="text"
            value={personalNote}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Anotação pessoal (ex: onde encontrar materiais)..."
            className="recipe-card-note-input"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}

export default RecipeBookView;
