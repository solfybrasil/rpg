import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Film,
  Flame,
  Heart,
  Pencil,
  Shield,
  Skull,
  Sword,
} from 'lucide-react';
import React, { memo } from 'react';
import { Badge, type BadgeVariant, Button } from '../../../shared/ui/index.ts';
import type { Creature } from '../api/types.ts';

export function getTierBadgeVariant(tier: string | null): BadgeVariant {
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
    case 'lendario':
      return 'artefato';
    default:
      return 'incomum';
  }
}

export function getTierBorder(tier: string | null): string {
  switch ((tier || '').toLowerCase()) {
    case 'dragão jovem':
    case 'dragão antigo':
    case 'lendário':
    case 'lendario':
      return 'border-[#f5b65b]/70 shadow-[0_0_14px_rgba(245,182,91,0.25)]';
    case 'chefe':
      return 'border-purple-500/60 shadow-[0_0_10px_rgba(168,85,247,0.2)]';
    case 'elite':
      return 'border-blue-500/60 shadow-[0_0_8px_rgba(59,130,246,0.15)]';
    case 'soldado':
      return 'border-[#6f5536] hover:border-[#c5a36a]';
    case 'lacaio':
    default:
      return 'border-[#423326] hover:border-[#6f5536]';
  }
}

interface BestiaryCardGridProps {
  creatures: Creature[];
  totalCount: number;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onSelectCreature: (creature: Creature) => void;
  onEditCreature: (creature: Creature) => void;
  onSendToTable: (creature: Creature) => void;
  onSendToBattle: (creature: Creature) => void;
  onOpenMedia: (creature: Creature) => void;
  isLoading?: boolean;
}

export const BestiaryCardGrid: React.FC<BestiaryCardGridProps> = memo(({
  creatures,
  totalCount,
  page,
  totalPages,
  onPageChange,
  onSelectCreature,
  onEditCreature,
  onSendToTable,
  onSendToBattle,
  onOpenMedia,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-[#a8947c] space-y-3">
        <Flame className="h-8 w-8 animate-pulse text-[#c5a36a]" />
        <p className="font-serif italic text-sm">Consultando bestiário nos anais de Aldrenor...</p>
      </div>
    );
  }

  if (creatures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-[#423326] rounded-2xl bg-[#14110e]/80">
        <Skull className="h-10 w-10 text-white/20 mb-3" />
        <h3 className="font-cinzel text-base text-[#e2d5bd]">Nenhuma Fera Encontrada</h3>
        <p className="font-serif text-xs text-white/50 max-w-sm mt-1">
          Nenhuma criatura corresponde aos filtros aplicados. Tente ajustar os termos de busca ou patamar.
        </p>
      </div>
    );
  }

  const from = (page - 1) * 30 + 1;
  const to = Math.min(page * 30, totalCount);

  return (
    <div className="flex flex-col gap-4">
      {/* Grid of Beast Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {creatures.map((creature) => {
          const badgeVariant = getTierBadgeVariant(creature.tier);
          const borderClass = getTierBorder(creature.tier);

          return (
            <div
              key={creature.id}
              data-testid={`creature-card-${creature.id}`}
              className={`group flex flex-col justify-between rounded-xl border bg-[#191512] p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl ${borderClass}`}
            >
              <div>
                {/* Artwork Thumbnail / Fallback Banner */}
                <div
                  onClick={() => onSelectCreature(creature)}
                  className="relative flex h-36 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-[#423326] bg-[#100e0c] transition-colors group-hover:border-[#c5a36a]"
                >
                  {creature.image_url ? (
                    <img
                      src={creature.image_url}
                      alt={creature.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                        const fallback = (e.currentTarget.parentElement?.querySelector('.img-fallback') as HTMLElement);
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`img-fallback ${creature.image_url ? 'hidden' : 'flex'} flex-col items-center justify-center text-center p-3 select-none text-white/20`}
                  >
                    <Skull className="h-10 w-10 mb-1 text-[#c5a36a]/40" />
                    <span className="text-[11px] font-cinzel text-white/40">{creature.category || 'Fera'}</span>
                  </div>

                  {/* Badges Flutuantes */}
                  <div className="absolute top-2 left-2 flex gap-1 items-center">
                    <Badge variant={badgeVariant} size="sm">
                      {creature.tier || 'Soldado'}
                    </Badge>
                    {creature.threat ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#100e0c]/80 text-[#e4c894] border border-[#6f5536]">
                        ND {creature.threat}
                      </span>
                    ) : null}
                  </div>

                  {creature.plague && (
                    <div className="absolute top-2 right-2 rounded bg-purple-950/90 px-1.5 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/40">
                      Peste
                    </div>
                  )}
                </div>

                {/* Info Header */}
                <div className="mt-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      onClick={() => onSelectCreature(creature)}
                      className="cursor-pointer font-cinzel font-bold text-sm text-[#e2d5bd] hover:text-[#e4c894] line-clamp-1 transition-colors"
                      title={creature.name}
                    >
                      {creature.name}
                    </h3>
                  </div>

                  <p className="mt-0.5 text-[11px] font-serif text-[#a99a82] truncate">
                    {creature.category || 'Monstruosidade'}
                    {creature.region ? ` · ${creature.region}` : ''}
                  </p>
                </div>

                {/* Vitals & Combat Stats Badges */}
                <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="rounded bg-[#211b16] border border-[#423326] py-1 px-1.5">
                    <div className="text-[10px] text-[#a99a82] uppercase tracking-wider font-cinzel flex items-center justify-center gap-1">
                      <Heart className="h-2.5 w-2.5 text-[#8d302b]" /> PV
                    </div>
                    <div className="font-mono font-bold text-[#e2d5bd]">{creature.max_hp}</div>
                  </div>

                  <div className="rounded bg-[#211b16] border border-[#423326] py-1 px-1.5">
                    <div className="text-[10px] text-[#a99a82] uppercase tracking-wider font-cinzel flex items-center justify-center gap-1">
                      <Shield className="h-2.5 w-2.5 text-[#477d8d]" /> DEF
                    </div>
                    <div className="font-mono font-bold text-[#e2d5bd]">{creature.defense}</div>
                  </div>

                  <div className="rounded bg-[#211b16] border border-[#423326] py-1 px-1.5">
                    <div className="text-[10px] text-[#a99a82] uppercase tracking-wider font-cinzel flex items-center justify-center gap-1">
                      <Sword className="h-2.5 w-2.5 text-[#c5a36a]" /> ATQ
                    </div>
                    <div className="font-mono font-bold text-[#e2d5bd]">
                      +{creature.attack_bonus} <span className="text-[10px] font-normal text-[#a99a82]">({creature.damage_dice})</span>
                    </div>
                  </div>
                </div>

                {/* Descrição resumida */}
                {creature.description && (
                  <p className="mt-2 text-xs font-serif italic text-white/60 line-clamp-2 leading-relaxed">
                    "{creature.description}"
                  </p>
                )}
              </div>

              {/* Botões de Ação na Base do Card */}
              <div className="mt-3.5 pt-2.5 border-t border-[#423326] flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectCreature(creature)}
                    title="Olhar Ficha / Dossiê"
                    className="p-1.5 rounded-lg border border-[#423326] bg-[#211b16] hover:bg-[#2b231d] text-[#e2d5bd] hover:text-[#e4c894] transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditCreature(creature)}
                    title="Editar Ficha da Fera"
                    className="p-1.5 rounded-lg border border-[#423326] bg-[#211b16] hover:bg-[#2b231d] text-[#a99a82] hover:text-[#e2d5bd] transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenMedia(creature)}
                    title="Mídia do Token / Chroma"
                    className="p-1.5 rounded-lg border border-[#423326] bg-[#211b16] hover:bg-[#2b231d] text-[#c5a36a] hover:text-[#e4c894] transition-colors"
                  >
                    <Film className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onSendToTable(creature)}
                  title="Posicionar Token na Mesa de Batalha"
                  className="px-2.5 py-1 rounded-lg border border-[#6f5536] bg-gradient-to-b from-[#2a221a] to-[#1c1712] hover:border-[#c5a36a] text-xs font-cinzel font-semibold text-[#e4c894] hover:brightness-110 flex items-center gap-1 transition-all"
                >
                  <Sword className="h-3 w-3" />
                  <span>Mesa</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#423326] pt-3 text-xs text-[#a99a82]">
          <span>
            Exibindo {from}–{to} de {totalCount} criaturas
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-lg border border-[#423326] bg-[#211b16] disabled:opacity-40 text-[#e2d5bd] hover:bg-[#2b231d]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-[#e2d5bd]">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-lg border border-[#423326] bg-[#211b16] disabled:opacity-40 text-[#e2d5bd] hover:bg-[#2b231d]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
