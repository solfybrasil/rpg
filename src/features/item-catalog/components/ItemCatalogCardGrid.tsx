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
import React from 'react';
import { Badge, type BadgeVariant, Button, CoinsBadge } from '../../../shared/ui/index.ts';
import type { ItemCatalog } from '../api/types.ts';

export function getItemRarityBadgeVariant(rarity: string | null): BadgeVariant {
  switch ((rarity || '').toLowerCase()) {
    case 'comum':
      return 'comum';
    case 'incomum':
      return 'incomum';
    case 'raro':
      return 'raro';
    case 'épico':
    case 'epico':
    case 'lendário':
    case 'lendario':
      return 'lendario';
    case 'artefato':
      return 'artefato';
    case 'maldito':
      return 'danger';
    default:
      return 'default';
  }
}

export function getItemRarityBorder(rarity: string | null): string {
  switch ((rarity || '').toLowerCase()) {
    case 'artefato':
      return 'border-[#f5b65b]/70 shadow-[0_0_12px_rgba(245,182,91,0.25)]';
    case 'épico':
    case 'epico':
    case 'lendário':
    case 'lendario':
      return 'border-purple-500/60 shadow-[0_0_10px_rgba(168,85,247,0.2)]';
    case 'raro':
      return 'border-blue-500/60 shadow-[0_0_8px_rgba(59,130,246,0.15)]';
    case 'incomum':
      return 'border-emerald-500/50';
    case 'maldito':
      return 'border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.25)]';
    default:
      return 'border-white/10';
  }
}

interface ItemCatalogCardGridProps {
  items: ItemCatalog[];
  totalCount: number;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onSelectItem: (item: ItemCatalog) => void;
  onEditItem: (item: ItemCatalog) => void;
  onGiveItem: (item: ItemCatalog) => void;
  onArchiveItem?: (item: ItemCatalog) => void;
  isLoading?: boolean;
}

export const ItemCatalogCardGrid: React.FC<ItemCatalogCardGridProps> = ({
  items,
  totalCount,
  page,
  totalPages,
  onPageChange,
  onSelectItem,
  onEditItem,
  onGiveItem,
  onArchiveItem,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-[#a8947c] space-y-3">
        <Sparkles className="h-8 w-8 animate-pulse text-[#f5b65b]" />
        <p className="font-serif italic text-sm">Consultando catálogo de artigos de Aldrenor...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-white/5 rounded-2xl bg-[#121215]/60">
        <Skull className="h-10 w-10 text-white/20 mb-3" />
        <h3 className="font-serif text-base text-[#ebe6d6]">Nenhum Artigo Encontrado</h3>
        <p className="font-serif text-xs text-white/50 max-w-sm mt-1">
          Nenhum item do catálogo corresponde aos filtros aplicados. Tente ajustar a busca ou categoria.
        </p>
      </div>
    );
  }

  const from = (page - 1) * 40 + 1;
  const to = Math.min(page * 40, totalCount);

  return (
    <div className="flex flex-col gap-4">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => {
          const badgeVariant = getItemRarityBadgeVariant(item.rarity);
          const borderClass = getItemRarityBorder(item.rarity);

          return (
            <div
              key={item.id}
              data-testid={`item-card-${item.id}`}
              className={`group flex flex-col justify-between rounded-2xl border bg-[#141418] p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${borderClass}`}
            >
              <div>
                {/* 128px Image or Large Slot Thumbnail */}
                <div
                  onClick={() => onSelectItem(item)}
                  className="relative flex h-32 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-[#0d0d10] transition-colors group-hover:border-white/20"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="h-28 w-28 object-contain transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                        const fallback = (e.currentTarget.parentElement?.querySelector('.img-fallback') as HTMLElement);
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`img-fallback ${item.image_url ? 'hidden' : 'flex'} items-center justify-center text-4xl select-none`}
                  >
                    {item.icon || '🗡️'}
                  </div>

                  {/* Rarity & Category floating badges */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant={badgeVariant} size="sm">
                      {item.rarity || 'Comum'}
                    </Badge>
                  </div>

                  {item.archived && (
                    <div className="absolute top-2 right-2 rounded bg-red-950/80 px-1.5 py-0.5 text-[10px] font-bold text-red-300 border border-red-500/40">
                      Arquivado
                    </div>
                  )}
                </div>

                {/* Info Header */}
                <div className="mt-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      onClick={() => onSelectItem(item)}
                      className="cursor-pointer font-serif font-bold text-sm text-[#ebe6d6] hover:text-[#f5b65b] line-clamp-1 transition-colors"
                      title={item.name}
                    >
                      {item.name}
                    </h3>
                  </div>

                  <p className="mt-0.5 text-[11px] text-white/50 truncate">
                    {item.category}
                    {item.subcategory ? ` · ${item.subcategory}` : ''}
                    {item.equippable_as ? ` (${item.equippable_as})` : ''}
                  </p>
                </div>

                {/* Combat & Stat Badges */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-white/70">
                  {item.damage_dice && (
                    <span className="flex items-center gap-1 rounded bg-red-950/30 px-1.5 py-0.5 text-[11px] font-mono text-red-300 border border-red-900/30">
                      <Sword className="h-3 w-3" />
                      {item.damage_dice}
                    </span>
                  )}
                  {Boolean(item.armor_bonus && item.armor_bonus > 0) && (
                    <span className="flex items-center gap-1 rounded bg-blue-950/30 px-1.5 py-0.5 text-[11px] font-mono text-blue-300 border border-blue-900/30">
                      <Shield className="h-3 w-3" />+{item.armor_bonus} Def
                    </span>
                  )}
                  {Boolean(item.attack_bonus && item.attack_bonus !== 0) && (
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] font-mono text-white/80 border border-white/10">
                      Atq +{item.attack_bonus}
                    </span>
                  )}
                  {Boolean(item.durability && item.wear_type === 'repairable') && (
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-white/50 border border-white/5">
                      Dur: {item.durability}/{item.max_durability}
                    </span>
                  )}
                </div>

                {/* Description snippet if any */}
                {item.description && (
                  <p className="mt-2 text-xs text-white/40 line-clamp-2 italic font-serif leading-relaxed">
                    "{item.description}"
                  </p>
                )}
              </div>

              {/* Price & Action Footer */}
              <div className="mt-3.5 pt-2.5 border-t border-white/10">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Preço</span>
                  <CoinsBadge coinsBronze={item.price_bronze || 0} size="sm" />
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="gold"
                    size="sm"
                    data-testid={`give-item-btn-${item.id}`}
                    onClick={() => onGiveItem(item)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5"
                    title="Conceder este item a um jogador"
                  >
                    <Gift className="h-3.5 w-3.5" />
                    <span>Dar a…</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`edit-item-btn-${item.id}`}
                    onClick={() => onEditItem(item)}
                    className="px-2 py-1.5 text-xs text-white/70 hover:text-white"
                    title="Editar propriedades"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`view-item-btn-${item.id}`}
                    onClick={() => onSelectItem(item)}
                    className="px-2 py-1.5 text-xs text-white/50 hover:text-white"
                    title="Ver detalhes"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>

                  {onArchiveItem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onArchiveItem(item)}
                      className={`px-2 py-1.5 text-xs ${
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
            </div>
          );
        })}
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
