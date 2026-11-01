import { Link } from '@tanstack/react-router';
import { Award, ChevronRight, History, Skull, Sparkles } from 'lucide-react';
import { m } from 'motion/react';
import React from 'react';
import { getHeroPortrait, getProximoXp } from '../../../entities/hero';
import type { CharacterRow } from '../../../shared/hooks/baseHooks';
import { spring } from '../../../shared/styles/motion';
import { CountUp } from '../../../shared/ui/CountUp';
import { GoldButton } from '../../../shared/ui/GoldButton';
import { Parchment } from '../../../shared/ui/Parchment';

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
  const nivel = hero.level ?? 1;
  const xp = hero.xp ?? 0;
  const proximoXp = getProximoXp(nivel);
  const isFallen = (hero.health ?? 0) === 0;
  const inspiration = Math.min(2, Math.max(0, hero.inspiration ?? 0));
  const portrait = getHeroPortrait(hero);
  const isEligibleLevelUp = xp >= proximoXp && nivel < 10;
  const xpRatio = proximoXp > 0 ? Math.min(1, Math.max(0, xp / proximoXp)) : 0;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Fallen alert banner (>1 frase -> Parchment) */}
      {isFallen && (
        <Parchment
          seed={13}
          className="flex items-center gap-3 p-3 border-2 border-[var(--blood)]"
        >
          <Skull className="h-6 w-6 text-[var(--blood)] shrink-0 animate-pulse" />
          <div className="text-xs sm:text-sm text-[var(--ink)] font-['EB_Garamond',serif]">
            <strong className="block font-bold text-[var(--blood)] font-['Cinzel',serif] tracking-wider uppercase">
              JURADO CAÍDO — AGONIZANDO
            </strong>
            Sua carne tombou nas sombras e seus batimentos cessaram. Apenas o fôlego do Confessor
            pode reerguer sua promessa.
          </div>
        </Parchment>
      )}

      {/* Top action row: Selector for testing & Backpack link */}
      <div className="flex flex-wrap items-center justify-between gap-2 slab p-2.5">
        {heroes.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-['Cinzel',serif] tracking-wider text-[var(--muted)] font-bold">
              Herói:
            </span>
            {heroes.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => onSelectHero(h.id)}
                className={`px-2 py-0.5 text-xs font-['Cinzel',serif] tracking-wider uppercase transition-all cursor-pointer ${
                  h.id === selectedHeroId
                    ? 'border border-[var(--gold)] text-[var(--gold-hi)] font-bold shadow-[inset_0_0_8px_rgba(201,164,92,0.3)]'
                    : 'border border-[var(--iron)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {h.name}
              </button>
            ))}
          </div>
        )}

        <Link
          to="/jogador/mochila"
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 text-xs font-['Cinzel',serif] tracking-wider uppercase text-[var(--gold-hi)] hover:brightness-125 transition-colors border border-[var(--iron)] slab"
        >
          <span>Mochila & Equipamentos</span>
          <ChevronRight className="h-3.5 w-3.5 text-[var(--gold)]" />
        </Link>
      </div>

      {/* Hero Card em Pergaminho Rasgado */}
      <Parchment seed={55} className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar com moldura de ouro velho */}
          <div className="relative shrink-0">
            <div className="h-24 w-20 overflow-hidden border border-[var(--gold-lo)] recess flex items-center justify-center">
              {portrait ? (
                <img
                  src={portrait}
                  alt={hero.name}
                  className={`h-full w-full object-cover ${
                    isFallen ? 'grayscale contrast-125' : ''
                  }`}
                />
              ) : (
                <span className="text-3xl text-[var(--gold)] font-['Cinzel',serif] font-bold">
                  {hero.name?.slice(0, 2).toUpperCase() || 'JU'}
                </span>
              )}
            </div>
          </div>

          {/* Identity Details */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="text-2xl font-bold font-['Cinzel',serif] tracking-wider text-[var(--ink)] truncate">
                {hero.name}
              </h1>
              <span className="text-xs text-[var(--ink-soft)] font-['EB_Garamond',serif] italic">
                {hero.race || 'Humano'} {hero.caminho ? `• ${hero.caminho}` : ''}
              </span>
            </div>

            <p className="text-xs text-[var(--ink-soft)] font-['EB_Garamond',serif] italic mt-0.5">
              {hero.title || 'Jurado de Aldrenor'}
            </p>

            {/* XP Bar estilo Ouro Velho com scaleX e spring.soft */}
            <div className="max-w-md mt-2">
              <div className="flex items-center justify-between text-[11px] text-[var(--ink-soft)] mb-0.5 font-['Cinzel',serif]">
                <span className="flex items-center gap-1 font-bold tracking-wider text-[var(--ink)]">
                  <History className="h-3 w-3 text-[var(--gold-lo)]" />
                  Experiência
                </span>
                <span className="tabular-nums font-bold text-[var(--ink)]">
                  <CountUp value={xp} /> / <CountUp value={proximoXp} /> XP
                </span>
              </div>
              <div
                className={`h-2.5 w-full bg-[var(--stone)] border overflow-hidden transition-shadow ${
                  isEligibleLevelUp
                    ? 'border-[var(--gold-hi)] shadow-[0_0_12px_rgba(240,208,128,0.65)]'
                    : 'border-[var(--iron)]'
                }`}
              >
                <m.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: xpRatio }}
                  transition={spring.soft}
                  className={`h-full w-full origin-left bg-gradient-to-r from-[var(--gold-lo)] via-[var(--gold)] to-[var(--gold-hi)] ${
                    isEligibleLevelUp ? 'brightness-125' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Level Seal & Inspiration Actions */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 w-full sm:w-auto">
            <div className="text-center font-['Cinzel',serif] text-[9px] tracking-[0.14em] uppercase text-[var(--ink-soft)]">
              <b className="block text-2xl text-[var(--ink)] leading-none font-black tabular-nums">
                <CountUp value={nivel} />
              </b>
              Nível
            </div>

            {/* Inspiration pill com animação sutil ao alterar */}
            <m.button
              key={`insp-${inspiration}`}
              type="button"
              onClick={onToggleInspiration}
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              transition={spring.soft}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-[var(--gold-lo)] bg-black/10 text-xs font-semibold text-[var(--ink)] hover:bg-black/20 transition-colors font-['Cinzel',serif] cursor-pointer"
              title="Toque para gastar ou conceder Inspiração"
            >
              <Sparkles className="h-3.5 w-3.5 text-[var(--gold-lo)]" />
              <span>Inspiração:</span>
              <span className="tabular-nums font-bold text-[var(--ink)]">
                <CountUp value={inspiration} />
                /2
              </span>
            </m.button>

            {isEligibleLevelUp && (
              <GoldButton
                onClick={onOpenLevelUp}
                className="w-auto px-3 py-1 text-xs tracking-wider font-bold font-['Cinzel',serif] shadow-[0_0_14px_rgba(240,208,128,0.5)]"
              >
                <Award className="h-4 w-4 mr-1 inline" />
                <span>Subir de Nível</span>
              </GoldButton>
            )}
          </div>
        </div>

        {/* Hero lore quote */}
        <p className="font-['EB_Garamond',serif] italic text-xs text-[var(--ink-soft)] pt-2 border-t border-[var(--ink-soft)]/20 leading-relaxed">
          "A névoa guarda o que o juramento esqueceu. A lâmina é a única promessa que não apodrece."
        </p>
      </Parchment>
    </div>
  );
};
