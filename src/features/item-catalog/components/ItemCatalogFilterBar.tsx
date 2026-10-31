import {
  Download,
  Grid,
  List,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import React from 'react';
import { Button } from '../../../shared/ui/index.ts';
import type { ItemCatalogFilter } from '../api/types.ts';
import { ITEM_CATEGORIES, ITEM_RARITIES } from '../data/constants.ts';

interface ItemCatalogFilterBarProps {
  filter: ItemCatalogFilter;
  onFilterChange: (updates: Partial<ItemCatalogFilter>) => void;
  onReset: () => void;
  onCreateNew: () => void;
  onExportCSV: () => void;
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
  totalCount: number;
}

export const ItemCatalogFilterBar: React.FC<ItemCatalogFilterBarProps> = ({
  filter,
  onFilterChange,
  onReset,
  onCreateNew,
  onExportCSV,
  viewMode,
  onViewModeChange,
  totalCount,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#121215]/80 p-4 shadow-xl backdrop-blur-md">
      {/* Top row: Search input, filter selects and action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            data-testid="item-search-input"
            placeholder="Buscar artigo por nome, propriedades ou descrição..."
            value={filter.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            className="w-full rounded-xl border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-[#ebe6d6] placeholder:text-white/30 focus:border-[#f5b65b] focus:outline-none focus:ring-1 focus:ring-[#f5b65b] font-serif"
          />
        </div>

        {/* Category Select */}
        <select
          data-testid="item-category-select"
          value={filter.category || 'Todos'}
          onChange={(e) =>
            onFilterChange({
              category: e.target.value === 'Todos' ? undefined : e.target.value,
              page: 1,
            })
          }
          className="h-9 rounded-xl border border-white/10 bg-[#1a1a1e] px-3 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
        >
          {ITEM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === 'Todos' ? 'Todas as Categorias' : c}
            </option>
          ))}
        </select>

        {/* Rarity Select */}
        <select
          data-testid="item-rarity-select"
          value={filter.rarity || 'Todas'}
          onChange={(e) =>
            onFilterChange({
              rarity: e.target.value === 'Todas' ? undefined : e.target.value,
              page: 1,
            })
          }
          className="h-9 rounded-xl border border-white/10 bg-[#1a1a1e] px-3 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
        >
          {ITEM_RARITIES.map((r) => (
            <option key={r} value={r}>
              {r === 'Todas' ? 'Todas as Raridades' : r}
            </option>
          ))}
        </select>

        {/* Sort Select */}
        <select
          value={filter.sortBy || 'name'}
          onChange={(e) =>
            onFilterChange({
              sortBy: e.target.value as any,
              page: 1,
            })
          }
          className="h-9 rounded-xl border border-white/10 bg-[#1a1a1e] px-3 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
        >
          <option value="name">Ordenar: Nome (A-Z)</option>
          <option value="rarity">Ordenar: Raridade</option>
          <option value="price">Ordenar: Preço (Maior)</option>
          <option value="recent">Ordenar: Recentes</option>
        </select>

        {/* View Mode Toggle: Grid vs Table */}
        <div className="flex items-center rounded-xl border border-white/10 bg-black/40 p-0.5">
          <button
            type="button"
            data-testid="view-mode-grid"
            onClick={() => onViewModeChange('grid')}
            title="Visualização em Grade de Cards"
            className={`rounded-lg p-1.5 transition-colors ${
              viewMode === 'grid'
                ? 'bg-[#f5b65b] text-black shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="view-mode-table"
            onClick={() => onViewModeChange('table')}
            title="Visualização em Tabela Densa"
            className={`rounded-lg p-1.5 transition-colors ${
              viewMode === 'table'
                ? 'bg-[#f5b65b] text-black shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Action Buttons: Export & Create */}
        <Button
          data-testid="export-csv-btn"
          variant="outline"
          size="sm"
          onClick={onExportCSV}
          title="Exportar artigos em formato CSV"
          className="flex items-center gap-1.5 text-xs text-white/80 font-serif"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Exportar</span>
        </Button>

        <Button
          data-testid="filter-create-item-btn"
          variant="primary"
          size="sm"
          onClick={onCreateNew}
          className="flex items-center gap-1.5 font-cinzel text-xs font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Artigo</span>
        </Button>
      </div>

      {/* Bottom stats row & reset */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2 text-xs text-white/60">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#f5b65b]" />
          <span className="font-mono text-[11px] text-[#f5b65b]">
            <b className="tabular-nums">{totalCount}</b> artigos no catálogo de Aldrenor
          </span>
        </div>

        {(filter.search ||
          filter.category ||
          filter.rarity ||
          filter.sortBy !== 'name') && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/90 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Limpar Filtros
          </button>
        )}
      </div>
    </div>
  );
};
