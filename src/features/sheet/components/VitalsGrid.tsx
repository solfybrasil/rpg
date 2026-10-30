import { Droplets, Heart, Shield, Utensils, Zap, Info } from 'lucide-react';
import React, { useState } from 'react';
import type { CharacterRow } from '../../../shared/hooks/baseHooks';

interface VitalsGridProps {
  hero: CharacterRow;
  defense: number;
  onOpenEffectModal: (effect: any) => void;
}

export const VitalsGrid: React.FC<VitalsGridProps> = ({ hero, defense, onOpenEffectModal }) => {
  const [showDefenseBreakdown, setShowDefenseBreakdown] = useState(false);

  const hp = hero.health ?? 10;
  const maxHp = hero.max_health ?? 10;
  const foco = hero.focus ?? 3;
  const maxFoco = hero.max_focus ?? 3;
  const hunger = Math.max(0, Math.min(10, hero.saciedade ?? 8));
  const hungerInt = Math.round(hunger);
  const vidaMaxFome = hero.vida_max_fome ?? 0;
  const conditions = Array.isArray(hero.conditions) ? hero.conditions : [];

  // Estado da Fome
  const hungerStatus = React.useMemo(() => {
    if (hunger >= 7.0) {
      return {
        label: 'Saciado',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        desc: 'Recupera +1 Foco no descanso curto',
      };
    }
    if (hunger >= 4.0) {
      return {
        label: 'Normal',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/30',
        desc: 'Pronto para a marcha',
      };
    }
    if (hunger > 0.0) {
      return {
        label: 'Com Fome',
        color: 'text-orange-400',
        bg: 'bg-orange-500/10 border-orange-500/30',
        desc: '-1 em testes de Corpo e Vontade',
      };
    }
    return {
      label: 'Faminto',
      color: 'text-red-400',
      bg: 'bg-red-500/20 border-red-500/40',
      desc: 'Desvantagem em testes de Corpo e sem cura natural',
    };
  }, [hunger]);

  return (
    <section className="flex flex-col gap-3">
      {/* 3 Quick vital cards: Vida, Foco, Defesa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Vida (Carne) */}
        <div className="flex flex-col p-3.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--line)] shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-300">
              <Heart className="h-4 w-4 text-rose-400" />
              Vitalidade / Carne
            </span>
            <div className="text-sm font-bold tabular-nums">
              <span className={hp <= 3 ? 'text-red-400 animate-pulse' : 'text-[var(--text)]'}>
                {hp}
              </span>
              <span className="text-[var(--text-3)] text-xs font-normal"> / {maxHp}</span>
              {vidaMaxFome > 0 && (
                <span className="text-[10px] text-red-400 font-normal ml-1">
                  (-{vidaMaxFome})
                </span>
              )}
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--solid)] border border-[var(--hair)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                hp <= 3
                  ? 'bg-gradient-to-r from-red-700 to-red-500'
                  : 'bg-gradient-to-r from-rose-700 via-rose-500 to-rose-400'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, (hp / maxHp) * 100))}%` }}
            />
          </div>
        </div>

        {/* Foco Místico */}
        <div className="flex flex-col p-3.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--line)] shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300">
              <Zap className="h-4 w-4 text-cyan-400" />
              Foco Místico
            </span>
            <div className="text-sm font-bold tabular-nums text-cyan-200">
              {foco}
              <span className="text-[var(--text-3)] text-xs font-normal"> / {maxFoco}</span>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--solid)] border border-[var(--hair)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-700 via-cyan-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, (foco / maxFoco) * 100))}%` }}
            />
          </div>
        </div>

        {/* Defesa Física */}
        <div
          onClick={() => setShowDefenseBreakdown(!showDefenseBreakdown)}
          className="flex flex-col p-3.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--line)] shadow-sm cursor-pointer hover:border-blue-400/50 transition-colors relative"
          title="Toque para ver detalhes do cálculo de Defesa"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-300">
              <Shield className="h-4 w-4 text-blue-400" />
              Defesa
            </span>
            <span className="text-sm font-bold tabular-nums text-blue-200 font-cinzel">
              {defense}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-3)] font-sans flex items-center justify-between">
            <span>Base 7 + Armadura + Escudo</span>
            <Info className="h-3 w-3 text-blue-400/70" />
          </p>

          {showDefenseBreakdown && (
            <div className="absolute top-full left-0 mt-1 z-30 p-2.5 rounded-xl bg-[var(--solid-2)] border border-blue-500/40 text-xs shadow-xl min-w-[200px]">
              <strong className="block text-blue-300 font-semibold mb-1">Cálculo de Defesa</strong>
              <div className="text-[11px] text-[var(--text-2)] font-mono">
                {defense} = 7 (Base) + Equipamentos
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saciedade & Fome (10 Pips Grid) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--line)] shadow-sm">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-amber-400 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text)]">
                Saciedade:
              </span>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${hungerStatus.bg} ${hungerStatus.color}`}
              >
                {hungerStatus.label} ({hungerInt}/10)
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-3)] mt-0.5">{hungerStatus.desc}</p>
          </div>
        </div>

        {/* 10 pips bar */}
        <div className="flex items-center gap-1 w-full sm:w-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pip) => {
            const isFilled = pip <= hungerInt;
            return (
              <div
                key={pip}
                className={`h-3 w-4 sm:w-5 rounded-sm transition-all border ${
                  isFilled
                    ? 'bg-amber-400 border-amber-300 shadow-sm shadow-amber-400/40'
                    : 'bg-[var(--solid)] border-[var(--hair)] opacity-40'
                }`}
                title={`Saciedade ${pip}/10`}
              />
            );
          })}
        </div>
      </div>

      {/* Active conditions list if any */}
      {conditions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--hair)]">
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-3)] font-semibold">
            Efeitos Ativos:
          </span>
          {conditions.map((cond: any, idx: number) => {
            const name = typeof cond === 'string' ? cond : cond.name || cond.id || 'Efeito';
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onOpenEffectModal(cond)}
                className="px-2.5 py-1 text-xs rounded-lg bg-[var(--solid-2)] border border-amber-500/30 text-amber-300 hover:border-amber-400 transition-colors shadow-sm"
              >
                {name}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
