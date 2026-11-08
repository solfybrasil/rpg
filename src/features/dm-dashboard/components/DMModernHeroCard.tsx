import { Coins, Gift, Minus, Plus, Skull, Sparkles, Utensils, X, Zap } from 'lucide-react';
import { memo } from 'react';
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

function plagueStage(plague: number) {
  if (plague >= 8) return { name: 'Transformação', color: 'var(--violet)' };
  if (plague >= 4) return { name: 'Corrupção', color: 'var(--blood)' };
  return { name: 'Mancha', color: 'var(--plague)' };
}

function initialsOf(name: string) {
  return (
    name
      .split(/[\s-]+/)
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || name.slice(0, 2).toUpperCase()
  );
}

interface VitalRowProps {
  label: string;
  value: number;
  max: number;
  color: string;
  heroName: string;
  onStep: (delta: number) => void;
}

function VitalRow({ label, value, max, color, heroName, onStep }: VitalRowProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="grid grid-cols-[3.25rem_1fr_auto_auto] items-center gap-2">
      <span className="font-['Cinzel',serif] text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </span>
      <div className="recess h-2 overflow-hidden">
        <div
          className="h-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="w-11 text-right font-['Cinzel',serif] text-xs tabular-nums text-[var(--text)]">
        {value}
        <span className="text-[var(--muted)]">/{max}</span>
      </span>
      <div className="flex">
        <button
          type="button"
          onClick={() => onStep(-1)}
          aria-label={`Diminuir ${label} de ${heroName}`}
          className="w-7 h-7 flex items-center justify-center border border-[var(--iron)] bg-[var(--stone)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--gold-lo)] active:translate-y-px cursor-pointer"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onStep(1)}
          aria-label={`Aumentar ${label} de ${heroName}`}
          className="w-7 h-7 -ml-px flex items-center justify-center border border-[var(--iron)] bg-[var(--stone)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--gold-lo)] active:translate-y-px cursor-pointer"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

const chip =
  "inline-flex items-center gap-1 px-1.5 py-px border text-[10px] font-['Cinzel',serif] uppercase tracking-[0.08em]";

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
  const isFallen = hero.health <= 0;
  const isCritical = !isFallen && hero.health <= 3;
  const stage = plagueStage(hero.plague);
  const { gold, silver, bronze } = fromBronze(hero.coinsBronze);

  return (
    <article
      className={`slab relative flex flex-col gap-3 p-3 ${isFallen ? 'opacity-75' : ''} ${
        isCritical ? 'border-[var(--blood)]' : ''
      }`}
    >
      {/* Identidade */}
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onOpenDetailModal(hero)}
          className="relative w-11 h-11 shrink-0 recess flex items-center justify-center overflow-hidden cursor-pointer"
          title="Abrir ficha"
        >
          {hero.portraitUrl ? (
            <img
              src={hero.portraitUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className={`w-full h-full object-cover ${isFallen ? 'grayscale' : ''}`}
            />
          ) : (
            <span className="font-['Cinzel',serif] text-sm font-bold text-[var(--gold)]">
              {initialsOf(hero.name)}
            </span>
          )}
          {isFallen && (
            <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-[var(--blood)]">
              <Skull className="w-5 h-5" />
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                hero.isOnline ? 'bg-[var(--moss)]' : 'bg-[var(--iron)]'
              }`}
              title={hero.isOnline ? 'Online' : 'Offline'}
            />
            <button
              type="button"
              onClick={() => onOpenDetailModal(hero)}
              className="truncate text-left font-['Cinzel',serif] text-sm font-bold tracking-[0.06em] text-[var(--gold-hi)] hover:underline cursor-pointer"
            >
              {hero.name}
            </button>
          </div>
          <p className="truncate text-xs italic text-[var(--muted)]">
            {hero.race} · {hero.caminho}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenGiveItem(hero)}
          className="shrink-0 flex items-center gap-1 px-2 h-7 border border-[var(--gold-lo)] text-[var(--gold)] hover:text-[var(--gold-hi)] hover:bg-black/30 font-['Cinzel',serif] text-[10px] uppercase tracking-[0.1em] cursor-pointer"
          title="Conceder item ou dádiva"
        >
          <Gift className="w-3.5 h-3.5" />
          Dar item
        </button>
      </header>

      {/* Vitais */}
      <div className="flex flex-col gap-1.5">
        <VitalRow
          label="Vida"
          value={hero.health}
          max={hero.maxHealth}
          color="var(--blood)"
          heroName={hero.name}
          onStep={(d) => onModifyHealth(hero.id, d)}
        />
        <VitalRow
          label="Foco"
          value={hero.focus}
          max={hero.maxFocus}
          color="var(--mana)"
          heroName={hero.name}
          onStep={(d) => onModifyFocus(hero.id, d)}
        />
        <VitalRow
          label="Peste"
          value={hero.plague}
          max={10}
          color={stage.color}
          heroName={hero.name}
          onStep={(d) => onModifyPlague(hero.id, d)}
        />
      </div>

      {/* Estados e condições */}
      <div className="flex flex-wrap items-center gap-1.5">
        {isFallen && (
          <span className={`${chip} border-[var(--blood)] text-[var(--blood)]`}>Caído</span>
        )}
        {isCritical && (
          <span className={`${chip} border-[var(--blood)] text-[#e0645a]`}>Crítico</span>
        )}
        {hero.plague > 0 && (
          <span className={`${chip} border-[var(--iron)]`} style={{ color: stage.color }}>
            {stage.name}
          </span>
        )}
        <button
          type="button"
          onClick={() => onToggleExausto(hero.id)}
          className={`${chip} cursor-pointer ${
            hero.exausto
              ? 'border-[var(--ember)] text-[var(--ember)]'
              : 'border-[var(--iron)] text-[var(--muted)] hover:text-[var(--text)]'
          }`}
          title={hero.exausto ? 'Remover Exausto' : 'Marcar como Exausto'}
        >
          <Zap className="w-3 h-3" />
          {hero.exausto ? 'Exausto' : 'Descansado'}
        </button>
        {hero.conditions.map((cond) => (
          <span key={cond} className={`${chip} border-[var(--gold-lo)] text-[var(--gold-hi)]`}>
            {cond}
            <button
              type="button"
              onClick={() => onRemoveCondition(hero.id, cond)}
              className="text-[var(--muted)] hover:text-[var(--blood)] cursor-pointer"
              aria-label={`Remover condição ${cond}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Rodapé: recursos secundários */}
      <footer className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--iron)] text-xs text-[var(--muted)]">
        <span className="flex items-center gap-1 tabular-nums" title="Moedas">
          <Coins className="w-3.5 h-3.5 text-[var(--gold)]" />
          {gold > 0 && `${gold}o `}
          {silver > 0 && `${silver}p `}
          {bronze}b
        </span>

        <span className="flex items-center gap-1" title="Saciedade">
          <Utensils className="w-3.5 h-3.5 text-[var(--ember)]" />
          <button
            type="button"
            onClick={() => onModifySaciedade(hero.id, -1)}
            className="w-5 h-5 flex items-center justify-center hover:text-[var(--text)] cursor-pointer"
            aria-label="Diminuir saciedade"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="tabular-nums text-[var(--text)]">{hero.saciedade}/10</span>
          <button
            type="button"
            onClick={() => onModifySaciedade(hero.id, 1)}
            className="w-5 h-5 flex items-center justify-center hover:text-[var(--text)] cursor-pointer"
            aria-label="Aumentar saciedade"
          >
            <Plus className="w-3 h-3" />
          </button>
        </span>

        <button
          type="button"
          onClick={() => onModifyInspiration(hero.id, hero.inspiration >= 2 ? -2 : 1)}
          className={`flex items-center gap-1 cursor-pointer ${
            hero.inspiration > 0 ? 'text-[var(--gold-hi)]' : 'hover:text-[var(--text)]'
          }`}
          title="Inspiração (clique para alternar 0 → 1 → 2)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="tabular-nums">{hero.inspiration}/2</span>
        </button>
      </footer>
    </article>
  );
}

// Só re-renderiza o card do herói que realmente mudou.
function areHeroPropsEqual(prev: DMModernHeroCardProps, next: DMModernHeroCardProps): boolean {
  const p = prev.hero;
  const n = next.hero;
  if (p === n) return true;
  if (
    p.id !== n.id ||
    p.name !== n.name ||
    p.race !== n.race ||
    p.caminho !== n.caminho ||
    p.portraitUrl !== n.portraitUrl ||
    p.health !== n.health ||
    p.maxHealth !== n.maxHealth ||
    p.focus !== n.focus ||
    p.maxFocus !== n.maxFocus ||
    p.plague !== n.plague ||
    p.saciedade !== n.saciedade ||
    p.inspiration !== n.inspiration ||
    p.exausto !== n.exausto ||
    p.isOnline !== n.isOnline ||
    p.coinsBronze !== n.coinsBronze ||
    p.conditions.length !== n.conditions.length
  ) {
    return false;
  }
  for (let i = 0; i < p.conditions.length; i++) {
    if (p.conditions[i] !== n.conditions[i]) return false;
  }
  return (
    prev.onModifyHealth === next.onModifyHealth &&
    prev.onOpenDetailModal === next.onOpenDetailModal &&
    prev.onOpenGiveItem === next.onOpenGiveItem
  );
}

export const DMModernHeroCard = memo(DMModernHeroCardComponent, areHeroPropsEqual);
