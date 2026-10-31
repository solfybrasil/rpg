import { Heart, Info, Shield, Utensils, Zap } from 'lucide-react';
import React, { useState } from 'react';
import type { CharacterRow } from '../../../shared/hooks/baseHooks';
import { ConditionPill } from '../../../shared/ui/ConditionPill';
import { CountUp } from '../../../shared/ui/CountUp';
import { StatSlab } from '../../../shared/ui/StatSlab';
import { StonePanel } from '../../../shared/ui/StonePanel';

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
        color: 'text-[var(--moss)]',
        desc: 'Recupera +1 Foco no descanso curto',
      };
    }
    if (hunger >= 4.0) {
      return {
        label: 'Normal',
        color: 'text-[var(--gold)]',
        desc: 'Pronto para a marcha',
      };
    }
    if (hunger > 0.0) {
      return {
        label: 'Com Fome',
        color: 'text-[var(--ember)]',
        desc: '-1 em testes de Corpo e Vontade',
      };
    }
    return {
      label: 'Faminto',
      color: 'text-[var(--blood)]',
      desc: 'Desvantagem em testes de Corpo e sem cura natural',
    };
  }, [hunger]);

  return (
    <section className="flex flex-col gap-3 w-full">
      {/* 3 Quick vital cards: Vida, Foco, Defesa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Vida (Carne) */}
        <StonePanel className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-xs font-['Cinzel',serif] uppercase tracking-wider text-[var(--blood)] font-bold">
              <Heart className="h-4 w-4 text-[var(--blood)]" />
              Vitalidade
            </span>
            <div className="text-sm font-bold font-['Cinzel',serif] tabular-nums">
              <span className={hp <= 3 ? 'text-red-400 animate-pulse' : 'text-[var(--gold-hi)]'}>
                <CountUp value={hp} />
              </span>
              <span className="text-[var(--muted)] text-xs font-normal"> / {maxHp}</span>
              {vidaMaxFome > 0 && (
                <span className="text-[10px] text-red-400 font-normal ml-1">(-{vidaMaxFome})</span>
              )}
            </div>
          </div>
          <div className="h-2 w-full recess overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-950 via-[var(--blood)] to-red-500 transition-all duration-400"
              style={{ width: `${Math.min(100, Math.max(0, (hp / maxHp) * 100))}%` }}
            />
          </div>
        </StonePanel>

        {/* Foco (Mana) */}
        <StonePanel className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-xs font-['Cinzel',serif] uppercase tracking-wider text-[var(--mist)] font-bold">
              <Zap className="h-4 w-4 text-[var(--mana)]" />
              Foco Solene
            </span>
            <div className="text-sm font-bold font-['Cinzel',serif] tabular-nums text-[var(--mist)]">
              <CountUp value={foco} />
              <span className="text-[var(--muted)] text-xs font-normal"> / {maxFoco}</span>
            </div>
          </div>
          <div className="h-2 w-full recess overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-950 via-[var(--mana)] to-[var(--mist)] transition-all duration-400"
              style={{ width: `${Math.min(100, Math.max(0, (foco / maxFoco) * 100))}%` }}
            />
          </div>
        </StonePanel>

        {/* Defesa Canônica */}
        <StonePanel className="p-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-['Cinzel',serif] uppercase tracking-wider text-[var(--gold)] font-bold">
              <Shield className="h-4 w-4 text-[var(--gold)]" />
              Defesa Canônica
            </div>
            <p className="text-[10px] text-[var(--muted)] font-['EB_Garamond',serif] italic mt-0.5">
              10 + Armadura + Astúcia
            </p>
          </div>
          <div className="text-2xl font-bold font-['Cinzel',serif] text-[var(--gold-hi)] tabular-nums">
            {defense}
          </div>
        </StonePanel>
      </div>

      {/* Saciedade & Fome (10 Pips Grid) */}
      <StonePanel className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-[var(--gold)] shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-['Cinzel',serif] font-bold uppercase tracking-wider text-[var(--text)]">
                Saciedade:
              </span>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider font-['Cinzel',serif] ${hungerStatus.color}`}
              >
                {hungerStatus.label} ({hungerInt}/10)
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)] font-['EB_Garamond',serif] italic mt-0.5">
              {hungerStatus.desc}
            </p>
          </div>
        </div>

        {/* 10 pips bar */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pip) => {
            const isFilled = pip <= hungerInt;
            return (
              <div
                key={pip}
                className={`h-3 w-4 sm:w-5 border transition-all ${
                  isFilled
                    ? 'bg-[var(--gold)] border-[var(--gold-hi)] shadow-[0_0_6px_rgba(201,164,92,0.4)]'
                    : 'bg-[#0d0b0a] border-[var(--iron)] opacity-40'
                }`}
                title={`Saciedade ${pip}/10`}
              />
            );
          })}
        </div>
      </StonePanel>

      {/* Active conditions list if any */}
      {conditions.length > 0 && (
        <StonePanel className="flex items-center gap-2 flex-wrap p-2.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-['Cinzel',serif] font-bold">
            Condições Ativas:
          </span>
          {conditions.map((cond: any, idx: number) => {
            const name = typeof cond === 'string' ? cond : cond.name || cond.id || 'Efeito';
            const isPlague =
              typeof name === 'string' &&
              (name.toLowerCase().includes('peste') || name.toLowerCase().includes('veneno'));
            return (
              <ConditionPill
                key={idx}
                label={name}
                type={isPlague ? 'plague' : 'buff'}
                onClick={() => onOpenEffectModal(cond)}
              />
            );
          })}
        </StonePanel>
      )}
    </section>
  );
};
