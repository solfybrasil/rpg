import { Filter, Plus, RotateCcw, Search, Skull } from 'lucide-react';
import React from 'react';
import { Badge, Button } from '../../../shared/ui/index.ts';
import type { CreatureFilter } from '../api/types.ts';
import {
  BESTIARY_CATEGORIES,
  BESTIARY_REGIONS,
  BESTIARY_TIERS,
} from '../data/constants.ts';

interface BestiaryFilterBarProps {
  filter: CreatureFilter;
  onFilterChange: (updates: Partial<CreatureFilter>) => void;
  onReset: () => void;
  onCreateNew: () => void;
  totalCount: number;
}

export const BestiaryFilterBar: React.FC<BestiaryFilterBarProps> = ({
  filter,
  onFilterChange,
  onReset,
  onCreateNew,
  totalCount,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#121215]/80 p-4 shadow-xl backdrop-blur-md">
      {/* Top row: Search input, quick filter selects and Create button */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            data-testid="bestiary-search-input"
            placeholder="Buscar fera por nome, espécie ou descrição..."
            value={filter.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            className="w-full rounded-xl border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-[#ebe6d6] placeholder:text-white/30 focus:border-[#f5b65b] focus:outline-none focus:ring-1 focus:ring-[#f5b65b] font-serif"
          />
        </div>

        {/* Region */}
        <select
          data-testid="bestiary-region-select"
          value={filter.region || 'todas'}
          onChange={(e) =>
            onFilterChange({
              region: e.target.value === 'todas' ? undefined : e.target.value,
              page: 1,
            })
          }
          className="h-9 rounded-xl border border-white/10 bg-[#1a1a1e] px-3 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
        >
          <option value="todas">Todas as Regiões</option>
          {BESTIARY_REGIONS.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>

        {/* Category */}
        <select
          data-testid="bestiary-category-select"
          value={filter.category || 'todas'}
          onChange={(e) =>
            onFilterChange({
              category: e.target.value === 'todas' ? undefined : e.target.value,
              page: 1,
            })
          }
          className="h-9 rounded-xl border border-white/10 bg-[#1a1a1e] px-3 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
        >
          <option value="todas">Todas as Categorias</option>
          {BESTIARY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Tier */}
        <select
          data-testid="bestiary-tier-select"
          value={filter.tier || 'todos'}
          onChange={(e) =>
            onFilterChange({
              tier: e.target.value === 'todos' ? undefined : e.target.value,
              page: 1,
            })
          }
          className="h-9 rounded-xl border border-white/10 bg-[#1a1a1e] px-3 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
        >
          <option value="todos">Todos os Patamares</option>
          {BESTIARY_TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Create Button */}
        <Button
          data-testid="create-creature-btn"
          variant="primary"
          size="sm"
          onClick={onCreateNew}
          className="flex items-center gap-1.5 font-cinzel text-xs font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Fera</span>
        </Button>
      </div>

      {/* Bottom row: Threat scale chips & reset */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2 text-xs text-white/60">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-white/50 font-serif">
            <Skull className="h-3.5 w-3.5 text-[#f5b65b]" />
            Ameaça:
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
              const active =
                (filter.threatMin ?? 1) <= level && level <= (filter.threatMax ?? 10);
              const isSelectedOnly =
                filter.threatMin === level && filter.threatMax === level;

              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    if (isSelectedOnly) {
                      onFilterChange({ threatMin: 1, threatMax: 10, page: 1 });
                    } else {
                      onFilterChange({ threatMin: level, threatMax: level, page: 1 });
                    }
                  }}
                  className={`h-6 w-6 rounded-md font-mono text-[11px] font-bold transition-all ${
                    isSelectedOnly
                      ? 'bg-[#f5b65b] text-black shadow-md shadow-[#f5b65b]/20 scale-105'
                      : active
                        ? 'bg-white/10 text-[#ebe6d6] hover:bg-white/20'
                        : 'bg-white/5 text-white/30 hover:bg-white/10'
                  }`}
                  title={`Filtrar ameaça nível ${level}`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-[#f5b65b]">
            <b className="tabular-nums">{totalCount}</b> feras no catálogo
          </span>
          {(filter.search ||
            filter.region ||
            filter.category ||
            filter.tier ||
            filter.threatMin !== undefined ||
            filter.threatMax !== undefined) && (
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
    </div>
  );
};
