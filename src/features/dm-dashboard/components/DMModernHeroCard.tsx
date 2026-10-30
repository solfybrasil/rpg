import {
  Check,
  ChevronRight,
  Coins,
  Gift,
  Minus,
  Package,
  Plus,
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

// Spawn visual feedback flutuante (+1 / -1)
function spawnFloatingText(el: HTMLElement | null, text: string, color: string) {
  if (!el || typeof document === 'undefined') return;
  const rect = el.getBoundingClientRect();
  const floatEl = document.createElement('div');
  floatEl.textContent = text;
  floatEl.className =
    'fixed pointer-events-none font-bold text-sm z-50 animate-out fade-out slide-out-to-top duration-700';
  floatEl.style.color = color;
  floatEl.style.left = `${rect.left + rect.width / 2 - 8}px`;
  floatEl.style.top = `${rect.top - 12}px`;
  document.body.appendChild(floatEl);
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

  // Animação de pulso ao receber cura ou dano
  useEffect(() => {
    const prev = prevHpRef.current;
    if (hero.health !== prev) {
      setPulseClass(hero.health < prev ? 'ring-2 ring-red-500/80' : 'ring-2 ring-emerald-500/80');
      prevHpRef.current = hero.health;
      const t = setTimeout(() => setPulseClass(''), 500);
      return () => clearTimeout(t);
    }
  }, [hero.health]);

  const isFallen = hero.health === 0;
  const hpPercent = Math.max(0, Math.min(100, (hero.health / hero.maxHealth) * 100));
  const hpColor =
    hero.health <= 3 ? '#ff453a' : hpPercent < 60 ? '#ffb340' : '#30d158';

  const stage =
    hero.plague >= 8
      ? { name: 'Transformação', color: '#bf5af2', bg: 'bg-purple-950/60 text-purple-300 border-purple-500/40' }
      : hero.plague >= 4
        ? { name: 'Corrupção', color: '#ff453a', bg: 'bg-red-950/60 text-red-300 border-red-500/40' }
        : { name: 'Mancha', color: '#ffb340', bg: 'bg-amber-950/60 text-amber-300 border-amber-500/40' };

  const { gold, silver, bronze } = fromBronze(hero.coinsBronze);

  const initials = hero.name
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

  return (
    <article
      onClick={() => onOpenDetailModal(hero)}
      className={`group relative flex flex-col justify-between p-4 rounded-xl cursor-pointer select-none transition-all duration-200 border bg-gradient-to-b from-[#18120e]/95 via-[#120d09]/98 to-[#0a0705] shadow-[0_12px_32px_rgba(0,0,0,0.65)] hover:border-amber-500/70 hover:shadow-[0_16px_40px_rgba(0,0,0,0.85)] ${
        isFallen ? 'opacity-85 border-stone-800' : 'border-[#8c6941]/40'
      } ${pulseClass}`}
    >
      {/* ── TOPO: ANÉIS SVG + IDENTIDADE + AÇÕES ── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        {/* Anéis de Atividade e Avatar */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Anel de Vida (R = 42, C ≈ 263.89) */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={hpColor}
              strokeWidth="5"
              strokeOpacity="0.2"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={hpColor}
              strokeWidth="5"
              strokeDasharray="263.89"
              strokeDashoffset={(
                263.89 * (1 - Math.max(0, Math.min(1, hero.health / hero.maxHealth)))
              ).toFixed(2)}
              strokeLinecap="round"
              className="transition-all duration-300"
            />

            {/* Anel de Peste (R = 34, C ≈ 213.63) */}
            <circle
              cx="50"
              cy="50"
              r="34"
              fill="none"
              stroke={stage.color}
              strokeWidth="4.5"
              strokeOpacity="0.2"
            />
            <circle
              cx="50"
              cy="50"
              r="34"
              fill="none"
              stroke={stage.color}
              strokeWidth="4.5"
              strokeDasharray="213.63"
              strokeDashoffset={(
                213.63 * (1 - Math.max(0, Math.min(1, hero.plague / 10)))
              ).toFixed(2)}
              strokeLinecap="round"
              className="transition-all duration-300"
            />

            {/* Anel de Foco (R = 26, C ≈ 163.36) */}
            <circle
              cx="50"
              cy="50"
              r="26"
              fill="none"
              stroke="#64d2ff"
              strokeWidth="4"
              strokeOpacity="0.2"
            />
            <circle
              cx="50"
              cy="50"
              r="26"
              fill="none"
              stroke="#64d2ff"
              strokeWidth="4"
              strokeDasharray="163.36"
              strokeDashoffset={(
                163.36 * (1 - Math.max(0, Math.min(1, hero.focus / hero.maxFocus)))
              ).toFixed(2)}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>

          {/* Avatar no Centro */}
          <div className="absolute inset-2.5 rounded-full overflow-hidden border border-[#8c6941]/50 bg-[#140e0a] flex items-center justify-center text-xs font-heading font-bold text-amber-200">
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
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-red-500">
                <Skull className="w-5 h-5 animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* Identidade do Jurado */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-base font-bold text-amber-200 truncate group-hover:text-amber-100 transition">
              {hero.name}
            </h3>
            {/* Indicador de presença online */}
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                hero.isOnline
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : 'bg-stone-600/70 border border-stone-500/40'
              }`}
              title={hero.isOnline ? 'Jogador online e conectado' : 'Jogador desconectado'}
            />
          </div>

          <p className="font-heading text-xs text-amber-500/80 truncate">
            {hero.race} • {hero.caminho}
          </p>

          {/* Chips de estado rápido */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onToggleExausto(hero.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-heading font-semibold border flex items-center gap-1 transition ${
                hero.exausto
                  ? 'bg-amber-950/70 text-amber-300 border-amber-600/60'
                  : 'bg-stone-900/80 text-stone-400 border-stone-800 hover:text-stone-200'
              }`}
              title={hero.exausto ? 'Exausto ativo! Clique para remover' : 'Descansado. Clique para exaurir'}
            >
              {hero.exausto ? <Zap className="w-3 h-3 text-amber-400" /> : <Check className="w-3 h-3" />}
              <span>{hero.exausto ? 'Exausto' : 'Descansado'}</span>
            </button>

            <span className={`px-2 py-0.5 rounded text-[10px] font-heading font-semibold border ${stage.bg}`}>
              {stage.name}
            </span>

            {isFallen && (
              <span className="px-2 py-0.5 rounded text-[10px] font-heading font-bold bg-red-950/80 text-red-300 border border-red-600 animate-pulse">
                💀 Caído
              </span>
            )}
            {!isFallen && hero.health <= 3 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-heading font-bold bg-red-950/50 text-red-400 border border-red-700/60">
                Crítico
              </span>
            )}
          </div>
        </div>

        {/* Seta para abrir ficha */}
        <button
          type="button"
          onClick={() => onOpenDetailModal(hero)}
          className="text-stone-500 hover:text-amber-300 p-1 transition"
          title="Abrir Ficha Detalhada"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── BARRAS DE STATUS COM STEPPER (- / +) ── */}
      <div className="grid grid-cols-3 gap-2 py-2 border-y border-stone-800/80" onClick={(e) => e.stopPropagation()}>
        {/* VIDA */}
        <div className="flex flex-col items-center justify-between p-2 rounded-lg bg-black/40 border border-stone-800">
          <span className="text-[10px] font-heading uppercase text-stone-400">Vida</span>
          <div className="my-1 font-heading text-sm font-bold" style={{ color: hpColor }}>
            {hero.health} <span className="text-xs text-stone-500 font-normal">/{hero.maxHealth}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => handleStepAction(e, () => onModifyHealth(hero.id, -1), '-1', '#ff453a')}
              aria-label={`Diminuir Vida de ${hero.name}`}
              className="w-6 h-6 rounded flex items-center justify-center bg-stone-900 border border-stone-700 hover:border-red-500/60 hover:text-red-400 active:scale-95 transition"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => handleStepAction(e, () => onModifyHealth(hero.id, 1), '+1', '#30d158')}
              aria-label={`Aumentar Vida de ${hero.name}`}
              className="w-6 h-6 rounded flex items-center justify-center bg-stone-900 border border-stone-700 hover:border-emerald-500/60 hover:text-emerald-400 active:scale-95 transition"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* FOCO */}
        <div className="flex flex-col items-center justify-between p-2 rounded-lg bg-black/40 border border-stone-800">
          <span className="text-[10px] font-heading uppercase text-stone-400">Foco</span>
          <div className="my-1 font-heading text-sm font-bold text-[#64d2ff]">
            {hero.focus} <span className="text-xs text-stone-500 font-normal">/{hero.maxFocus}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => handleStepAction(e, () => onModifyFocus(hero.id, -1), '-1', '#64d2ff')}
              aria-label={`Diminuir Foco de ${hero.name}`}
              className="w-6 h-6 rounded flex items-center justify-center bg-stone-900 border border-stone-700 hover:border-sky-500/60 hover:text-sky-300 active:scale-95 transition"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => handleStepAction(e, () => onModifyFocus(hero.id, 1), '+1', '#64d2ff')}
              aria-label={`Aumentar Foco de ${hero.name}`}
              className="w-6 h-6 rounded flex items-center justify-center bg-stone-900 border border-stone-700 hover:border-sky-500/60 hover:text-sky-300 active:scale-95 transition"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* PESTE */}
        <div className="flex flex-col items-center justify-between p-2 rounded-lg bg-black/40 border border-stone-800">
          <span className="text-[10px] font-heading uppercase text-stone-400">Peste</span>
          <div className="my-1 font-heading text-sm font-bold" style={{ color: stage.color }}>
            {hero.plague} <span className="text-xs text-stone-500 font-normal">/10</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => handleStepAction(e, () => onModifyPlague(hero.id, -1), '-1', '#30d158')}
              aria-label={`Diminuir Peste de ${hero.name}`}
              className="w-6 h-6 rounded flex items-center justify-center bg-stone-900 border border-stone-700 hover:border-emerald-500/60 hover:text-emerald-400 active:scale-95 transition"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => handleStepAction(e, () => onModifyPlague(hero.id, 1), '+1', stage.color)}
              aria-label={`Aumentar Peste de ${hero.name}`}
              className="w-6 h-6 rounded flex items-center justify-center bg-stone-900 border border-stone-700 hover:border-purple-500/60 hover:text-purple-300 active:scale-95 transition"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── CONDIÇÕES E EFEITOS ATIVOS (SE HOUVER) ── */}
      {hero.conditions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 my-2.5" onClick={(e) => e.stopPropagation()}>
          {hero.conditions.map((cond) => (
            <span
              key={cond}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-[11px] font-heading text-amber-200"
            >
              <span>{cond}</span>
              <button
                type="button"
                onClick={() => onRemoveCondition(hero.id, cond)}
                className="hover:text-red-400 transition ml-0.5"
                title={`Remover condição ${cond}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── RODAPÉ: MOEDAS + FOME + INSPIRAÇÃO + DÁDIVA + FICHA ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 text-xs" onClick={(e) => e.stopPropagation()}>
        {/* Moedas */}
        <div className="flex items-center gap-1 text-stone-300 font-heading" title="Moedas de Bronze convertidas">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {gold > 0 && `${gold}o `}
            {silver > 0 && `${silver}p `}
            {bronze}b
          </span>
        </div>

        {/* Fome / Saciedade */}
        <div className="flex items-center gap-1 font-heading text-stone-300" title="Nível de saciedade">
          <Utensils className="w-3.5 h-3.5 text-amber-500" />
          <span>{hero.saciedade}/10</span>
          <button
            type="button"
            onClick={(e) => handleStepAction(e, () => onModifySaciedade(hero.id, -1), '-1', '#ff8a4c')}
            className="w-4 h-4 rounded flex items-center justify-center bg-stone-900 hover:text-white"
          >
            -
          </button>
          <button
            type="button"
            onClick={(e) => handleStepAction(e, () => onModifySaciedade(hero.id, 1), '+1', '#30d158')}
            className="w-4 h-4 rounded flex items-center justify-center bg-stone-900 hover:text-white"
          >
            +
          </button>
        </div>

        {/* Inspiração */}
        <button
          type="button"
          onClick={() => onModifyInspiration(hero.id, hero.inspiration >= 2 ? -2 : 1)}
          className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-heading transition ${
            hero.inspiration > 0
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
              : 'bg-stone-900/60 border-stone-800 text-stone-500 hover:text-stone-300'
          }`}
          title="Clique para alternar Inspiração (0/2, 1/2, 2/2)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{hero.inspiration}/2</span>
        </button>

        {/* Conceder Dádiva / Item */}
        <button
          type="button"
          onClick={() => onOpenGiveItem(hero)}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/35 text-amber-200 hover:bg-amber-500/25 active:scale-95 transition font-heading font-semibold text-[11px]"
          title="Conceder Dádiva ou Item do Catálogo"
        >
          <Gift className="w-3.5 h-3.5 text-amber-400" />
          <span>Dádiva</span>
        </button>

        {/* Ficha & Mochila */}
        <button
          type="button"
          onClick={() => onOpenDetailModal(hero)}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800/80 border border-stone-700/60 text-stone-200 hover:text-amber-200 hover:border-amber-500/40 active:scale-95 transition font-heading text-[11px]"
          title="Abrir Detalhe Completo e Mochila"
        >
          <Package className="w-3.5 h-3.5 text-stone-400" />
          <span>Ficha</span>
        </button>
      </div>
    </article>
  );
}

// Comparador fino para que alterar a vida de 1 herói não re-renderize os cards dos outros heróis
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

  // Comparação rápida de condições
  if (p.conditions.length !== n.conditions.length) return false;
  for (let i = 0; i < p.conditions.length; i++) {
    if (p.conditions[i] !== n.conditions[i]) return false;
  }

  return true;
}

export const DMModernHeroCard = memo(DMModernHeroCardComponent, areHeroPropsEqual);
