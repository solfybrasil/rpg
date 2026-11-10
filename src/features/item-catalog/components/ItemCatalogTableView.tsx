import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Eye,
  Gift,
  Pencil,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Sword,
} from 'lucide-react';
import React, { useRef } from 'react';
import { Badge, Button, CoinsBadge } from '../../../shared/ui/index.ts';
import type { ItemCatalog } from '../api/types.ts';
import { getItemRarityBadgeVariant } from './ItemCatalogCardGrid.tsx';

interface ItemCatalogTableViewProps {
  items: ItemCatalog[];
  totalCount: number;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onSelectItem: (item: ItemCatalog) => void;
  onEditItem: (item: ItemCatalog) => void;
  onGiveItem: (item: ItemCatalog) => void;
  onArchiveItem?: (item: ItemCatalog) => void;
  onGenerateImage?: (item: ItemCatalog) => void;
  generatingItemId?: string | null;
  isLoading?: boolean;
}

export const ItemCatalogTableView: React.FC<ItemCatalogTableViewProps> = ({
  items,
  totalCount,
  page,
  totalPages,
  onPageChange,
  onSelectItem,
  onEditItem,
  onGiveItem,
  onArchiveItem,
  onGenerateImage,
  generatingItemId,
  isLoading,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-[#a8947c] space-y-3">
        <Sparkles className="h-8 w-8 animate-pulse text-[#f5b65b]" />
        <p className="font-serif italic text-sm">Consultando catálogo de artigos no servidor...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-white/5 rounded-2xl bg-[#121215]/60">
        <Skull className="h-10 w-10 text-white/20 mb-3" />
        <h3 className="font-serif text-base text-[#ebe6d6]">Nenhum Artigo Encontrado</h3>
        <p className="font-serif text-xs text-white/50 max-w-sm mt-1">
          Nenhum artigo corresponde aos filtros aplicados. Tente ajustar o texto ou os filtros.
        </p>
      </div>
    );
  }

  const from = (page - 1) * 40 + 1;
  const to = Math.min(page * 40, totalCount);

  return (
    <div className="flex flex-col gap-3">
      {/* Dense Virtualized Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121215]/90 shadow-2xl backdrop-blur-md">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 border-b border-white/10 bg-[#18181d] px-4 py-3 text-[11px] font-serif font-bold uppercase tracking-wider text-white/60">
          <div className="col-span-5 sm:col-span-4 flex items-center gap-2">
            <span>Artigo</span>
          </div>
          <div className="col-span-3 sm:col-span-2 text-center">
            <span>Raridade</span>
          </div>
          <div className="hidden sm:col-span-2 sm:block text-center">
            <span>Combate / Def</span>
          </div>
          <div className="col-span-2 text-right">
            <span>Preço</span>
          </div>
          <div className="col-span-2 sm:col-span-2 text-right">
            <span>Ações</span>
          </div>
        </div>

        {/* Virtualized Scrollable Body */}
        <div
          ref={parentRef}
          data-testid="item-virtualized-table-container"
          className="overflow-y-auto max-h-[580px] divide-y divide-white/5"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = items[virtualRow.index];
              if (!item) return null;

              const badgeVariant = getItemRarityBadgeVariant(item.rarity);

              return (
                <div
                  key={item.id}
                  data-testid={`item-row-${item.id}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="grid grid-cols-12 items-center gap-2 px-4 py-2 hover:bg-white/[0.04] transition-colors"
                >
                  {/* Item Image + Name */}
                  <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
                    <div
                      onClick={() => onSelectItem(item)}
                      className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#1c1c22] transition-colors hover:border-[#f5b65b]/50"
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          loading="lazy"
                          className="h-9 w-9 object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                            const fallback = (e.currentTarget.parentElement?.querySelector('.tbl-fallback') as HTMLElement);
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span
                        className={`tbl-fallback ${item.image_url ? 'hidden' : 'flex'} text-lg`}
                      >
                        {item.icon || '🗡️'}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onSelectItem(item)}
                        className="text-left font-serif font-bold text-xs sm:text-sm text-[#ebe6d6] hover:text-[#f5b65b] truncate w-full block transition-colors"
                      >
                        {item.name}
                      </button>
                      <p className="text-[10px] text-white/40 truncate">
                        {item.category}
                        {item.subcategory ? ` · ${item.subcategory}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Rarity */}
                  <div className="col-span-3 sm:col-span-2 text-center">
                    <Badge variant={badgeVariant} size="sm">
                      {item.rarity || 'Comum'}
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:col-span-2 sm:flex sm:items-center sm:justify-center gap-2 text-xs font-mono text-white/70">
                    {item.damage_dice && (
                      <span className="flex items-center gap-0.5 text-red-300">
                        <Sword className="h-3 w-3" />
                        {item.damage_dice}
                      </span>
                    )}
                    {Boolean(item.armor_bonus && item.armor_bonus > 0) && (
                      <span className="flex items-center gap-0.5 text-blue-300">
                        <Shield className="h-3 w-3" />+{item.armor_bonus}
                      </span>
                    )}
                    {!item.damage_dice && !item.armor_bonus && (
                      <span className="text-white/20">—</span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="col-span-2 text-right">
                    <CoinsBadge coinsBronze={item.price_bronze || 0} size="sm" />
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 sm:col-span-2 flex items-center justify-end gap-1">
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => onGiveItem(item)}
                      className="px-2 py-1 text-xs"
                      title="Dar a um jogador"
                    >
                      <Gift className="h-3.5 w-3.5 sm:mr-1" />
                      <span className="hidden sm:inline">Dar</span>
                    </Button>

                    {onGenerateImage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onGenerateImage(item)}
                        disabled={generatingItemId === item.id}
                        className="px-2 py-1 text-xs text-[#f5b65b] border-[#f5b65b]/30 hover:border-[#f5b65b] hover:bg-[#f5b65b]/10"
                        title={item.image_url ? 'Regerar imagem com IA' : 'Gerar imagem agora com IA'}
                      >
                        <Sparkles className={`h-3.5 w-3.5 ${generatingItemId === item.id ? 'animate-spin' : ''}`} />
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditItem(item)}
                      className="px-2 py-1 text-xs text-white/70 hover:text-white"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectItem(item)}
                      className="px-1.5 py-1 text-xs text-white/50 hover:text-white"
                      title="Detalhes"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>

                    {onArchiveItem && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onArchiveItem(item)}
                        className={`px-1.5 py-1 text-xs ${
                          item.archived
                            ? 'text-emerald-400 hover:text-emerald-300'
                            : 'text-white/40 hover:text-red-400'
                        }`}
                        title={item.archived ? 'Desarquivar item' : 'Arquivar item'}
                      >
                        {item.archived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#121215]/80 px-4 py-3 shadow-md">
        <p className="text-xs text-white/50 font-serif">
          Mostrando <span className="font-mono text-white/80">{from}</span> a{' '}
          <span className="font-mono text-white/80">{to}</span> de{' '}
          <span className="font-mono font-bold text-[#f5b65b]">{totalCount}</span> artigos
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex items-center gap-1 text-xs"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Anterior</span>
          </Button>

          <span className="px-2 text-xs font-mono text-white/70">
            {page} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex items-center gap-1 text-xs"
          >
            <span>Próxima</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
