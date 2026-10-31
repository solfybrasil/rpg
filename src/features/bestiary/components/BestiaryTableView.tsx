import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Film,
  Flame,
  LayoutGrid,
  Shield,
  Skull,
  Sword,
} from 'lucide-react';
import React, { useRef } from 'react';
import { Badge, Button } from '../../../shared/ui/index.ts';
import type { Creature } from '../api/types.ts';

interface BestiaryTableViewProps {
  creatures: Creature[];
  totalCount: number;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onSelectCreature: (creature: Creature) => void;
  onSendToTable: (creature: Creature) => void;
  onSendToBattle: (creature: Creature) => void;
  onOpenMedia: (creature: Creature) => void;
  isLoading?: boolean;
}

function getTierBadgeVariant(
  tier: string | null,
): 'comum' | 'incomum' | 'raro' | 'lendario' | 'artefato' {
  switch ((tier || '').toLowerCase()) {
    case 'lacaio':
      return 'comum';
    case 'soldado':
      return 'incomum';
    case 'elite':
      return 'raro';
    case 'chefe':
      return 'lendario';
    case 'dragão jovem':
    case 'dragão antigo':
    case 'lendário':
      return 'artefato';
    default:
      return 'incomum';
  }
}

export const BestiaryTableView: React.FC<BestiaryTableViewProps> = ({
  creatures,
  totalCount,
  page,
  totalPages,
  onPageChange,
  onSelectCreature,
  onSendToTable,
  onSendToBattle,
  onOpenMedia,
  isLoading,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: creatures.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-[#a8947c] space-y-3">
        <Flame className="h-8 w-8 animate-pulse text-[#f5b65b]" />
        <p className="font-serif italic text-sm">Consultando bestiário de Aldrenor no servidor...</p>
      </div>
    );
  }

  if (creatures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-white/5 rounded-2xl bg-[#121215]/60">
        <Skull className="h-10 w-10 text-white/20 mb-3" />
        <h3 className="font-cinzel text-base text-[#ebe6d6]">Nenhuma Fera Encontrada</h3>
        <p className="font-serif text-xs text-white/50 max-w-sm mt-1">
          Nenhuma criatura corresponde aos filtros aplicados. Tente ajustar o texto ou os patamares.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Dense Virtualized Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121215]/90 shadow-2xl backdrop-blur-md">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 border-b border-white/10 bg-[#18181d] px-4 py-3 text-[11px] font-serif font-bold uppercase tracking-wider text-white/60">
          <div className="col-span-5 sm:col-span-4 flex items-center gap-2">
            <span>Criatura</span>
          </div>
          <div className="hidden sm:block sm:col-span-2">
            <span>Região</span>
          </div>
          <div className="col-span-3 sm:col-span-2">
            <span>Patamar</span>
          </div>
          <div className="col-span-2 sm:col-span-2 text-right">
            <span>Vida / Def</span>
          </div>
          <div className="col-span-2 sm:col-span-2 text-right pr-2">
            <span>Ações</span>
          </div>
        </div>

        {/* Virtualized Container */}
        <div
          ref={parentRef}
          data-testid="bestiary-virtual-list"
          className="h-[560px] overflow-y-auto divide-y divide-white/5"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const creature = creatures[virtualRow.index];
              if (!creature) return null;

              return (
                <div
                  key={creature.id}
                  data-testid={`creature-row-${creature.id}`}
                  onClick={() => onSelectCreature(creature)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="grid grid-cols-12 gap-2 items-center px-4 py-2 hover:bg-white/[0.04] cursor-pointer transition-colors group"
                >
                  {/* Name + Round Thumbnail */}
                  <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/15 bg-black/60 shadow-inner flex items-center justify-center">
                      {creature.image_url ? (
                        <img
                          src={creature.image_url}
                          alt={creature.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-lg">{creature.icon || '🐺'}</span>
                      )}
                      {creature.plague && (
                        <span
                          className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#ff4d4f] border-2 border-[#121215]"
                          title="Contaminado pela Peste"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-cinzel text-xs font-bold text-[#ebe6d6] group-hover:text-[#f5b65b] transition-colors">
                        {creature.name}
                      </div>
                      <div className="truncate text-[11px] text-white/40 font-serif">
                        {creature.species || creature.category} · Ameaça {creature.threat}/10
                      </div>
                    </div>
                  </div>

                  {/* Region */}
                  <div className="hidden sm:block sm:col-span-2 truncate text-xs text-white/70 font-serif">
                    {creature.region || 'Desconhecida'}
                  </div>

                  {/* Tier Badge */}
                  <div className="col-span-3 sm:col-span-2 flex items-center">
                    <Badge variant={getTierBadgeVariant(creature.tier)}>
                      {creature.tier || 'Soldado'}
                    </Badge>
                  </div>

                  {/* HP / Defense in tabular-nums */}
                  <div className="col-span-2 sm:col-span-2 text-right font-mono text-xs tabular-nums">
                    <span className="text-[#ff4d4f] font-semibold">{creature.max_hp}</span>
                    <span className="text-white/30 mx-1">/</span>
                    <span className="text-[#f5b65b] font-semibold">{creature.defense}</span>
                  </div>

                  {/* Quick Actions */}
                  <div className="col-span-2 sm:col-span-2 flex items-center justify-end gap-1.5 pr-2">
                    {/* Mesa */}
                    <button
                      type="button"
                      data-testid={`send-table-${creature.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendToTable(creature);
                      }}
                      title="Colocar token na Mesa de Batalha"
                      className="rounded-lg p-1.5 text-white/60 hover:text-[#f5b65b] hover:bg-white/10 transition-colors"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>

                    {/* Batalha */}
                    <button
                      type="button"
                      data-testid={`send-battle-${creature.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendToBattle(creature);
                      }}
                      title="Puxar para combate ativo"
                      className="rounded-lg p-1.5 text-white/60 hover:text-[#ff4d4f] hover:bg-white/10 transition-colors"
                    >
                      <Sword className="h-4 w-4" />
                    </button>

                    {/* Mídia */}
                    <button
                      type="button"
                      data-testid={`open-media-${creature.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenMedia(creature);
                      }}
                      title="Mídia de Batalha (Chroma / Idle)"
                      className="hidden sm:block rounded-lg p-1.5 text-white/60 hover:text-[#f5b65b] hover:bg-white/10 transition-colors"
                    >
                      <Film className="h-4 w-4" />
                    </button>

                    {/* Ficha */}
                    <button
                      type="button"
                      data-testid={`view-sheet-${creature.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCreature(creature);
                      }}
                      title="Abrir Ficha Completa"
                      className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#121215]/60 px-4 py-3 text-xs text-white/70">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex items-center gap-1 font-serif text-xs"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Anterior</span>
        </Button>

        <span className="font-mono text-xs tabular-nums text-white/60">
          Página <b className="text-[#f5b65b]">{page}</b> de {totalPages} (
          <b className="text-[#ebe6d6]">{totalCount}</b> feras)
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex items-center gap-1 font-serif text-xs"
        >
          <span>Próxima</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
