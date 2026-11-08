import {
  Check,
  ChevronRight,
  Coins,
  Dice5,
  Gift,
  Minus,
  Package,
  Plus,
  Shield,
  Skull,
  Sparkles,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { fromBronze } from '../../../entities/item';
import type { HeroDashboardItem } from '../types';

interface DMModernHeroCardProps {
  hero: HeroDashboardItem;
  onModifyHealth: (id: string, delta: number) => void;
  onModifyFocus: (id: string, delta: number) => void;
  onModifyPlague: (id: string, delta: number) => void;
  onModifySaciedade: (id: string, delta: number) => void;
  onModifyInspiration: (id: string, delta: number) => void;
  onToggleExausto: (id: string) => void;
  onRemoveCondition: (id: string, conditionName: string) => void;
  onOpenGiveItem: (hero: HeroDashboardItem) => void;
  onOpenDetailModal: (hero: HeroDashboardItem) => void;
}

// Visual feedback flutuante (+1 / -1 / etc.) com aceleração GPU
function spawnFloatingText(el: HTMLElement | null, text: string, color: string) {
  if (!el || typeof document === 'undefined') return;
  const rect = el.getBoundingClientRect();
  const floatEl = document.createElement('div');
  floatEl.textContent = text;
  floatEl.style.position = 'fixed';
  floatEl.style.left = `${rect.left + rect.width / 2 - 12}px`;
  floatEl.style.top = `${rect.top - 16}px`;
  floatEl.style.color = color;
  floatEl.style.pointerEvents = 'none';
  floatEl.style.fontWeight = '700';
  floatEl.style.fontSize = '14px';
  floatEl.style.fontFamily = "'Cinzel', serif";
  floatEl.style.zIndex = '9999';
  floatEl.style.transform = 'translate3d(0, 0, 0)';
  floatEl.style.transition = 'transform 650ms cubic-bezier(0.23, 1, 0.32, 1), opacity 650ms ease-out';
  floatEl.style.opacity = '1';

  document.body.appendChild(floatEl);

  requestAnimationFrame(() => {
    floatEl.style.transform = 'translate3d(0, -26px, 0)';
    floatEl.style.opacity = '0';
  });

  setTimeout(() => floatEl.remove(), 700);
}

function DMModernHeroCardComponent({
  hero,
  onModifyHealth,
  onModifyFocus,
  onModifyPlague,
  onModifySaciedade,
  onModifyInspiration,
  onToggleExausto,
  onRemoveCondition,
  onOpenGiveItem,
  onOpenDetailModal,
}: DMModernHeroCardProps) {
  const prevHpRef = useRef(hero.health);
  const [pulseClass, setPulseClass] = useState('');
  const [quickRoll, setQuickRoll] = useState<number | null>(null);

  // Animação de pulso ao receber cura ou dano
  useEffect(() => {
    const prev = prevHpRef.current;
    if (hero.health !== prev) {
      setPulseClass(
        hero.health < prev
          ? 'ring-2 ring-red-500/80 shadow-[0_0_24px_rgba(239,68,68,0.45)]'
          : 'ring-2 ring-emerald-500/80 shadow-[0_0_24px_rgba(16,185,129,0.45)]',
      );
      prevHpRef.current = hero.health;
      const t = setTimeout(() => setPulseClass(''), 450);
      return () => clearTimeout(t);
    }
  }, [hero.health]);

  const isFallen = hero.health === 0;
  const hpPercent = Math.max(0, Math.min(100, (hero.health / hero.maxHealth) * 100));
  const hpColor = hero.health <= 3 ? '#ff453a' : hpPercent < 60 ? '#ffb340' : '#30d158';

  const stage =
    hero.plague >= 8
      ? { name: 'Transformação', color: '#bf5af2', bg: 'bg-purple-950/60 text-purple-300 border-purple-500/40' }
      : hero.plague >= 4
        ? { name: 'Corrupção', color: '#ff453a', bg: 'bg-red-950/60 text-red-300 border-red-500/40' }
        : { name: 'Mancha', color: '#ffb340', bg: 'bg-amber-950/60 text-amber-300 border-amber-500/40' };

  const { gold, silver, bronze } = fromBronze(hero.coinsBronze);

  const initials =
    hero.name
      .split(/[\s-]+/)
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || hero.name.slice(0, 2).toUpperCase();

  const handleStepAction = useCallback(
    (
      e: React.MouseEvent<HTMLButtonElement>,
      action: () => void,
      text: string,
      color: string,
    ) => {
      e.stopPropagation();
      action();
      spawnFloatingText(e.currentTarget, text, color);
    },
    [],
  );

  const handleQuickDiceRoll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const roll = Math.floor(Math.random() * 20) + 1;
    setQuickRoll(roll);
    spawnFloatingText(
      e.currentTarget as HTMLElement,
      `d20: ${roll}`,
      roll === 20 ? '#fbbf24' : roll === 1 ? '#ef4444' : '#ffffff',
    );
    setTimeout(() => setQuickRoll(null), 2500);
  };

  return (
    <article
      onClick={() => onOpenDetailModal(hero)}
      className={`group relative flex flex-col justify-between p-5 lg:p-6 rounded-2xl cursor-pointer select-none
        bg-gradient-to-b from-[#16100c]/98 via-[#0f0b08]/98 to-[#090604]
        border border-amber-950/45 hover:border-amber-500/60
        shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_36px_rgba(0,0,0,0.75)]
        hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_44px_rgba(0,0,0,0.9)]
        transition-all duration-200 ease-out active:scale-[0.99]
        ${isFallen ? 'opacity-85 border-red-950/70' : ''} ${pulseClass}`}
    >
      {/* ── TOPO DO CARD: ANÉIS CONCÊNTRICOS ÓPTICOS + IDENTIDADE + AÇÕES RÁPIDAS ── */}
      <div className="flex items-start justify-between gap-4 mb-4">
        {/* Anéis de Atividade e Avatar (Proporção Áurea para Desktop) */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Anel de Vida (R = 43) */}
            <circle cx="50" cy="50" r="43" fill="none" stroke={hpColor} strokeWidth="4.5" strokeOpacity="0.2" />
            <circle
              cx="50" cy="50" r="43"
              fill="none" stroke={hpColor} strokeWidth="4.5"
              strokeDasharray="270.18"
              strokeDashoffset={(270.18 * (1 - Math.max(0, Math.min(1, hero.health / hero.maxHealth)))).toFixed(2)}
              strokeLinecap="round"
              className="transition-all duration-400 ease-out"
            />

            {/* Anel de Peste (R = 35) */}
            <circle cx="50" cy="50" r="35" fill="none" stroke={stage.color} strokeWidth="4" strokeOpacity="0.2" />
            <circle
              cx="50" cy="50" r="35"
              fill="none" stroke={stage.color} strokeWidth="4"
              strokeDasharray="219.91"
              strokeDashoffset={(219.91 * (1 - Math.max(0, Math.min(1, hero.plague / 10)))).toFixed(2)}
              strokeLinecap="round"
              className="transition-all duration-400 ease-out"
            />

            {/* Anel de Foco (R = 27) */}
            <circle cx="50" cy="50" r="27" fill="none" stroke="#64d2ff" strokeWidth="3.5" strokeOpacity="0.2" />
            <circle
              cx="50" cy="50" r="27"
              fill="none" stroke="#64d2ff" strokeWidth="3.5"
              strokeDasharray="169.65"
              strokeDashoffset={(169.65 * (1 - Math.max(0, Math.min(1, hero.focus / hero.maxFocus)))).toFixed(2)}
              strokeLinecap="round"
              className="transition-all duration-400 ease-out"
            />
          </svg>

          {/* Avatar no Centro */}
          <div className="absolute inset-3 rounded-full overflow-hidden border border-amber-900/50 bg-[#120c08] flex items-center justify-center text-sm font-['Cinzel',serif] font-bold text-amber-200 shadow-inner">
            {hero.portraitUrl ? (
              <img
                src={hero.portraitUrl}
                alt={hero.name}
                loading="lazy"
                className={`w-full h-full object-cover ${isFallen ? 'grayscale' : ''}`}
              />
            ) : (
              <span>{initials}</span>
            )}
            {isFallen && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-red-500">
                <Skull className="w-6 h-6 animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* Identidade do Jurado */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-['Cinzel',serif] text-lg font-bold text-amber-100 truncate group-hover:text-amber-200 transition-colors">
              {hero.name}
            </h3>
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                hero.isOnline
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : 'bg-stone-600/70 border border-stone-500/40'
              }`}
              title={hero.isOnline ? 'Online na sessão' : 'Desconectado'}
            />
          </div>

          <p className="text-xs font-sans text-stone-400 truncate mt-0.5">
            {hero.race} • {hero.caminho}
          </p>

          {/* Chips de estado rápido */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onToggleExausto(hero.id)}
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-['Cinzel',serif] font-semibold border flex items-center gap-1 transition-all duration-120 active:scale-[0.93] ${
                hero.exausto
                  ? 'bg-amber-950/70 text-amber-300 border-amber-600/60 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                  : 'bg-stone-900/80 text-stone-400 border-stone-800 hover:text-stone-200'
              }`}
            >
              {hero.exausto ? <Zap className="w-3 h-3 text-amber-400" /> : <Check className="w-3 h-3" />}
              <span>{hero.exausto ? 'Exausto' : 'Descansado'}</span>
            </button>

            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-['Cinzel',serif] font-semibold border ${stage.bg}`}>
              {stage.name}
            </span>

            {/* Escudo de Defesa */}
            <span className="px-2 py-0.5 rounded-md text-[10px] font-['Cinzel',serif] bg-black/40 border border-stone-800 text-stone-300 flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-400" />
              <span>Def {hero.defense}</span>
            </span>

            {isFallen && (
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-['Cinzel',serif] font-bold bg-red-950/80 text-red-300 border border-red-600 animate-pulse">
                💀 Caído
              </span>
            )}
            {!isFallen && hero.health <= 3 && (
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-['Cinzel',serif] font-bold bg-red-950/50 text-red-400 border border-red-700/60">
                Crítico
              </span>
            )}
          </div>
        </div>

        {/* Quick D20 roll + Abertura de ficha */}
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleQuickDiceRoll}
            className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 hover:bg-amber-500/25 hover:border-amber-500/50 active:scale-[0.88] flex items-center justify-center transition-all duration-120 shadow-sm"
            title="Rolar d20 rápido para este herói"
          >
            <Dice5 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onOpenDetailModal(hero)}
            className="w-8 h-8 rounded-xl text-stone-400 hover:text-amber-200 hover:bg-white/[0.06] active:scale-[0.88] flex items-center justify-center transition-all duration-120"
            title="Abrir Ficha Completa & Editor"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── BARRAS DE STATUS COM STEPPERS DUPLOS (-5/-1 e +1/+5) PARA COMPUTADOR ── */}
      <div className="grid grid-cols-3 gap-2.5 py-3 border-y border-amber-950/35" onClick={(e) => e.stopPropagation()}>
        {/* VIDA */}
        <div className="flex flex-col items-center justify-between p-2.5 rounded-xl bg-black/45 border border-stone-800/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <span className="text-[10px] font-['Cinzel',serif] uppercase tracking-widest text-stone-400">Vida</span>
          <div className="my-1 font-['Cinzel',serif] text-base font-bold" style={{ color: hpColor }}>
            {hero.health} <span className="text-[11px] text-stone-500 font-normal">/{hero.maxHealth}</span>
          </div>
          {/* Steppers: -1 e +1 com suporte a -5/+5 no desktop */}
          <div className="flex items-center gap-1 mt-1">
            <button
              type="button"
              onClick={(e) => handleStepAction(e, () => onModifyHealth(hero.id, -5), '-5', '#ff453a')}
              aria-label="Diminuir 5 de Vida"
              title="-5 Vida"
              className="px-1.5 h-6 rounded-md flex items-center justify-center bg-stone-900 border border-stone-800 text-[10px] font-bold text-stone-400 hover:border-red-500/60 hover:text-red-400 active:scale-[0.88] transition-all"
            >
              -5
            </button>
            <button
              type="button"
              onClick={(e) => handleStepAction(e, () => onModifyHealth(hero.id, -1), '-1', '#ff453a')}
              aria-label="Diminuir 1 de Vida"
              className="w-6 h-6 rounded-md flex items-center justify-center bg-stone-900 border border-stone-700/80 hover:border-red-500/60 hover:text-red-400 active:scale-[0.88] transition-all"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => handleStepAction(e, () => onModifyHealth(hero.id, 1), '+1', '#30d158')}
              aria-label="Aumentar 1 de Vida"
              className="w-6 h-6 rounded-md flex items-center justify-center bg-stone-900 border border-stone-700/80 hover:border-emerald-500/60 hover:text-emerald-400 active:scale-[0.88] transition-all"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => handleStepAction(e, () => onModifyHealth(hero.id, 5), '+5', '#30d158')}
              aria-label="Aumentar 5 de Vida"
              title="+5 Vida"
              className="px-1.5 h-6 rounded-md flex items-center justify-center bg-stone-900 border border-stone-800 text-[10px] font-bold text-stone-400 hover:border-emerald-500/60 hover:text-emerald-400 active:scale-[0.88] transition-all"
            >
              +5
            </button>
          </div>
        </div>

        {/* FOCO */}
        <div className="flex flex-col items-center justify-between p-2.5 rounded-xl bg-black/45 border border-stone-800/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <span className="text-[10px] font-['Cinzel',serif] uppercase tracking-widest text-stone-400">Foco</span>
          <div className="my-1 font-['Cinzel',serif] text-base font-bold text-[#64d2ff]">
            {hero.focus} <span className="text-[11px] text-stone-500 font-normal">/{hero.maxFocus}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <button
              type="button"
              onClick={(e) => handleStepAction(e, () => onModifyFocus(hero.id, -1), '-1', '#64d2ff')}
              aria-label="Diminuir 1 de Foco"
              className="w-7 h-6 rounded-md flex items-center justify-center bg-stone-900 border border-stone-700/80 hover:border-sky-500/60 hover:text-sky-300 active:scale-[0.88] transition-all"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => handleStepAction(e, () => onModifyFocus(hero.id, 1), '+1', '#64d2ff')}
              aria-label="Aumentar 1 de Foco"
              className="w-7 h-6 rounded-md flex items-center justify-center bg-stone-900 border border-stone-700/80 hover:border-sky-500/60 hover:text-sky-300 active:scale-[0.88] transition-all"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* PESTE */}
        <div className="flex flex-col items-center justify-between p-2.5 rounded-xl bg-black/45 border border-stone-800/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <span className="text-[10px] font-['Cinzel',serif] uppercase tracking-widest text-stone-400">Peste</span>
          <div className="my-1 font-['Cinzel',serif] text-base font-bold" style={{ color: stage.color }}>
            {hero.plague} <span className="text-[11px] text-stone-500 font-normal">/10</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <button
              type="button"
              onClick={(e) => handleStepAction(e, () => onModifyPlague(hero.id, -1), '-1', '#30d158')}
              aria-label="Diminuir 1 de Peste"
              className="w-7 h-6 rounded-md flex items-center justify-center bg-stone-900 border border-stone-700/80 hover:border-emerald-500/60 hover:text-emerald-400 active:scale-[0.88] transition-all"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => handleStepAction(e, () => onModifyPlague(hero.id, 1), '+1', stage.color)}
              aria-label="Aumentar 1 de Peste"
              className="w-7 h-6 rounded-md flex items-center justify-center bg-stone-900 border border-stone-700/80 hover:border-purple-500/60 hover:text-purple-300 active:scale-[0.88] transition-all"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── CONDIÇÕES E EFEITOS ATIVOS ── */}
      {hero.conditions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 my-2.5" onClick={(e) => e.stopPropagation()}>
          {hero.conditions.map((cond) => (
            <span
              key={cond}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-950/40 border border-red-500/30 text-[10px] font-['Cinzel',serif] text-red-200"
            >
              <span>{cond}</span>
              <button
                type="button"
                onClick={() => onRemoveCondition(hero.id, cond)}
                className="hover:text-white transition-colors ml-0.5"
                title={`Remover condição ${cond}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── RODAPÉ DESKTOP: MOEDAS + SACIEDADE + INSPIRAÇÃO + DÁDIVA + FICHA ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mt-3 pt-2 text-xs" onClick={(e) => e.stopPropagation()}>
        {/* Moedas */}
        <div className="flex items-center gap-1.5 text-stone-300 font-['Cinzel',serif] text-xs" title="Moedas de Bronze convertidas">
          <Coins className="w-4 h-4 text-amber-400" />
          <span>
            {gold > 0 && `${gold}o `}
            {silver > 0 && `${silver}p `}
            {bronze}b
          </span>
        </div>

        {/* Fome / Saciedade */}
        <div className="flex items-center gap-1.5 font-['Cinzel',serif] text-xs text-stone-300" title="Nível de saciedade">
          <Utensils className="w-4 h-4 text-amber-500" />
          <span>{hero.saciedade}/10</span>
          <button
            type="button"
            onClick={(e) => handleStepAction(e, () => onModifySaciedade(hero.id, -1), '-1', '#ff8a4c')}
            className="w-5 h-5 rounded bg-stone-900 border border-stone-800 hover:text-white active:scale-[0.85] transition-all flex items-center justify-center text-xs"
          >
            -
          </button>
          <button
            type="button"
            onClick={(e) => handleStepAction(e, () => onModifySaciedade(hero.id, 1), '+1', '#30d158')}
            className="w-5 h-5 rounded bg-stone-900 border border-stone-800 hover:text-white active:scale-[0.85] transition-all flex items-center justify-center text-xs"
          >
            +
          </button>
        </div>

        {/* Inspiração */}
        <button
          type="button"
          onClick={() => onModifyInspiration(hero.id, hero.inspiration >= 2 ? -2 : 1)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-['Cinzel',serif] transition-all duration-120 active:scale-[0.93] ${
            hero.inspiration > 0
              ? 'bg-amber-950/50 border-amber-500/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
              : 'bg-stone-900/60 border-stone-800 text-stone-500 hover:text-stone-300'
          }`}
          title="Clique para alternar Inspiração (0/2, 1/2, 2/2)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{hero.inspiration}/2</span>
        </button>

        {/* Conceder Dádiva */}
        <button
          type="button"
          onClick={() => onOpenGiveItem(hero)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-200 hover:bg-amber-500/25 active:scale-[0.93] transition-all duration-150 font-['Cinzel',serif] font-semibold text-xs shadow-sm"
          title="Conceder Dádiva ou Item do Catálogo"
        >
          <Gift className="w-3.5 h-3.5 text-amber-400" />
          <span>Dádiva</span>
        </button>

        {/* Ficha & Mochila */}
        <button
          type="button"
          onClick={() => onOpenDetailModal(hero)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800/80 border border-stone-700/60 text-stone-200 hover:text-amber-200 hover:border-amber-500/40 active:scale-[0.93] transition-all duration-150 font-['Cinzel',serif] text-xs"
          title="Abrir Detalhe Completo e Ficha Editável"
        >
          <Package className="w-3.5 h-3.5 text-stone-400" />
          <span>Ficha</span>
        </button>
      </div>
    </article>
  );
}

function areHeroPropsEqual(
  prev: DMModernHeroCardProps,
  next: DMModernHeroCardProps,
): boolean {
  const p = prev.hero;
  const n = next.hero;

  if (p.id !== n.id) return false;
  if (p.health !== n.health || p.maxHealth !== n.maxHealth) return false;
  if (p.focus !== n.focus || p.maxFocus !== n.maxFocus) return false;
  if (p.plague !== n.plague) return false;
  if (p.saciedade !== n.saciedade) return false;
  if (p.inspiration !== n.inspiration) return false;
  if (p.exausto !== n.exausto) return false;
  if (p.isOnline !== n.isOnline) return false;
  if (p.coinsBronze !== n.coinsBronze) return false;

  if (p.conditions.length !== n.conditions.length) return false;
  for (let i = 0; i < p.conditions.length; i++) {
    if (p.conditions[i] !== n.conditions[i]) return false;
  }

  return true;
}

export const DMModernHeroCard = memo(DMModernHeroCardComponent, areHeroPropsEqual);
