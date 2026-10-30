import { Award, ChevronRight, History, Sparkles, Skull } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { CharacterRow } from '../../../shared/hooks/baseHooks';
import { getHeroPortrait, getProximoXp } from '../../../entities/hero';

interface HeroHeaderProps {
  hero: CharacterRow;
  heroes: CharacterRow[];
  selectedHeroId: string;
  onSelectHero: (id: string) => void;
  onOpenLevelUp: () => void;
  onToggleInspiration: () => void;
}

export const HeroHeader: React.FC<HeroHeaderProps> = ({
  hero,
  heroes,
  selectedHeroId,
  onSelectHero,
  onOpenLevelUp,
  onToggleInspiration,
}) => {
  const [showXPHistory, setShowXPHistory] = useState(false);
  const nivel = hero.level ?? 1;
  const xp = hero.xp ?? 0;
  const proximoXp = getProximoXp(nivel);
  const isFallen = (hero.health ?? 0) === 0;
  const inspiration = Math.min(2, Math.max(0, hero.inspiration ?? 0));
  const portrait = getHeroPortrait(hero);
  const isEligibleLevelUp = xp >= proximoXp && nivel < 10;

  return (
    <header className="flex flex-col gap-3 rounded-2xl bg-[var(--surface-card)] p-4 sm:p-5 border border-[var(--line)] shadow-xl relative overflow-hidden">
      {/* Fallen alert banner */}
      {isFallen && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-red-200 animate-pulse">
          <Skull className="h-6 w-6 text-red-400 shrink-0" />
          <div className="text-xs sm:text-sm">
            <strong className="block font-semibold text-red-100 font-cinzel tracking-wider">
              JURADO CAÍDO — AGONIZANDO
            </strong>
            Sua carne tombou nas sombras e seus batimentos cessaram. Apenas o fôlego do Confessor pode reerguer sua promessa.
          </div>
        </div>
      )}

      {/* Top action row: Selector for testing & Backpack link */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hair)] pb-3">
        {heroes.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] uppercase tracking-wider text-[var(--text-3)] font-medium">Herói:</span>
            {heroes.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => onSelectHero(h.id)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                  h.id === selectedHeroId
                    ? 'bg-[var(--gold)] text-[var(--accent-ink)] font-bold shadow-md shadow-[var(--gold-glow)]'
                    : 'bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-2)] border border-[var(--hair)]'
                }`}
              >
                {h.name}
              </button>
            ))}
          </div>
        )}

        <Link
          to="/jogador/mochila"
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--gold-bright)] border border-[var(--line)] transition-colors"
        >
          <span>Mochila & Equipamentos</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Portrait, Info & Leveling */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden border-2 border-[var(--line-strong)] bg-[var(--solid)] shadow-lg flex items-center justify-center">
            {portrait ? (
              <img
                src={portrait}
                alt={hero.name}
                className={`h-full w-full object-cover ${isFallen ? 'grayscale contrast-125' : ''}`}
              />
            ) : (
              <span className="text-3xl text-[var(--gold)] font-cinzel">
                {hero.name?.slice(0, 2).toUpperCase() || 'JU'}
              </span>
            )}
          </div>
          <span
            className={`absolute -bottom-2 -right-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border shadow-md ${
              isFallen
                ? 'bg-red-800 text-white border-red-500'
                : 'bg-[var(--solid-2)] text-[var(--gold-bright)] border-[var(--gold-dim)]'
            }`}
          >
            {isFallen ? 'CAÍDO' : `NV ${nivel}`}
          </span>
        </div>

        {/* Identity Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold font-cinzel tracking-wider text-[var(--text)] truncate">
              {hero.name}
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--hair)] text-[var(--text-2)] uppercase tracking-wide">
              {hero.race}
            </span>
            {hero.caminho && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--gold-glow)] border border-[var(--gold-dim)] text-[var(--gold-bright)] uppercase tracking-wide font-cinzel">
                {hero.caminho}
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-[var(--text-3)] font-serif italic mb-2">
            {hero.title || 'Jurado de Aldrenor'}
          </p>

          {/* XP Bar */}
          <div className="max-w-md">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-2)] mb-1">
              <span className="flex items-center gap-1 font-medium font-cinzel tracking-wider text-[var(--gold-dim)]">
                <History className="h-3 w-3" />
                Experiência (XP)
              </span>
              <span className="tabular-nums font-semibold text-[var(--gold-bright)]">
                {xp} / {proximoXp} XP
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--solid)] border border-[var(--hair)] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-400 transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, (xp / proximoXp) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Level Up & Inspiration Actions */}
        <div className="flex sm:flex-col items-center sm:items-end gap-2.5 w-full sm:w-auto mt-2 sm:mt-0">
          {/* Inspiration pill */}
          <button
            type="button"
            onClick={onToggleInspiration}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] text-xs font-semibold text-[var(--gold-bright)] hover:bg-[var(--surface-3)] transition-colors"
            title="Toque para gastar ou conceder Inspiração"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Inspiração:</span>
            <span className="tabular-nums font-bold text-amber-300">{inspiration}/2</span>
          </button>

          {isEligibleLevelUp && (
            <button
              type="button"
              onClick={onOpenLevelUp}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold font-cinzel text-xs tracking-wider border border-amber-300 shadow-lg shadow-amber-500/30 animate-pulse hover:brightness-110 transition-all"
            >
              <Award className="h-4 w-4" />
              <span>Subir de Nível (Nv {nivel + 1})</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
