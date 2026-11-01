import { Heart, Shield, Utensils, Zap } from 'lucide-react';
import { m } from 'motion/react';
import React from 'react';
import type { CharacterRow } from '../../../shared/hooks/baseHooks';
import { spring } from '../../../shared/styles/motion';
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
  const hp = hero.health ?? 10;
  const maxHp = hero.max_health ?? 10;
  const foco = hero.focus ?? 3;
  const maxFoco = hero.max_focus ?? 3;
  const hunger = Math.max(0, Math.min(10, hero.saciedade ?? 8));
  const hungerInt = Math.round(hunger);
  const vidaMaxFome = hero.vida_max_fome ?? 0;
  const conditions = Array.isArray(hero.conditions) ? hero.conditions : [];

  const hpRatio = maxHp > 0 ? Math.min(1, Math.max(0, hp / maxHp)) : 0;
  const focoRatio = maxFoco > 0 ? Math.min(1, Math.max(0, foco / maxFoco)) : 0;

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
        <m.div
          key={`hp-${hp}`}
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          transition={spring.soft}
        >
          <StonePanel className="p-3 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-['Cinzel',serif] uppercase tracking-wider text-[var(--blood)] font-bold">
                <Heart className="h-4 w-4 text-[var(--blood)]" />
                Vitalidade / Carne
              </span>
              <div className="text-sm font-bold font-['Cinzel',serif] tabular-nums">
                <span
                  className={hp <= 3 ? 'text-[var(--blood)] animate-pulse' : 'text-[var(--gold-hi)]'}
                >
                  <CountUp value={hp} />
                </span>
                <span className="text-[var(--muted)] text-xs font-normal">
                  {' '}
                  / <CountUp value={maxHp} />
                </span>
                {vidaMaxFome > 0 && (
                  <span className="text-[10px] text-[var(--blood)] font-normal ml-1">
                    (-{vidaMaxFome})
                  </span>
                )}
              </div>
            </div>
            <div className="h-2 w-full recess overflow-hidden">
              <m.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: hpRatio }}
                transition={spring.soft}
                className="h-full w-full origin-left bg-gradient-to-r from-[var(--blood)] via-[var(--blood)] to-[var(--ember)]"
              />
            </div>
          </StonePanel>
        </m.div>

        {/* Foco (Mana) */}
        <m.div
          key={`foco-${foco}`}
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          transition={spring.soft}
        >
          <StonePanel className="p-3 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-['Cinzel',serif] uppercase tracking-wider text-[var(--mana)] font-bold">
                <Zap className="h-4 w-4 text-[var(--mana)]" />
                Foco Místico
              </span>
              <div className="text-sm font-bold font-['Cinzel',serif] tabular-nums text-[var(--gold-hi)]">
                <CountUp value={foco} />
                <span className="text-[var(--muted)] text-xs font-normal">
                  {' '}
                  / <CountUp value={maxFoco} />
                </span>
              </div>
            </div>
            <div className="h-2 w-full recess overflow-hidden">
              <m.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: focoRatio }}
                transition={spring.soft}
                className="h-full w-full origin-left bg-gradient-to-r from-[var(--mana)] via-[var(--mana)] to-[var(--gold-lo)]"
              />
            </div>
          </StonePanel>
        </m.div>

        {/* Defesa Canônica em StatSlab */}
        <div className="relative flex items-center">
          <StatSlab
            label="Defesa"
            value={defense}
            unit="10 + Arm. + Ast."
            className="w-full h-full flex flex-col justify-center"
          />
          <Shield className="h-4 w-4 text-[var(--gold)] absolute top-2.5 left-3 pointer-events-none opacity-80" />
        </div>
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
                {hungerStatus.label} (<CountUp value={hungerInt} />
                /10)
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
                    : 'recess border-[var(--iron)] opacity-40'
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
