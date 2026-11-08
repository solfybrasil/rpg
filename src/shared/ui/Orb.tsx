import { clsx } from 'clsx';
import { m } from 'motion/react';
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { CountUp } from './CountUp';
import { type FloatingItem, FloatingNumberContainer } from './FloatingNumber';

export interface OrbProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'hp' | 'focus';
  current: number;
  max: number;
  label?: string;
  isDamaged?: boolean;
  isHealing?: boolean;
  floatingItems?: FloatingItem[];
  onFloatingComplete?: (id: string) => void;
  onClick?: () => void;
}

/**
 * Orbe de Vidro (SKILL.md Seção 5 e 6)
 * Vidro com líquido volumétrico que sobe/desce, balanço na superfície,
 * tremor ao tomar dano e bolhas de cura.
 */
export const Orb: React.FC<OrbProps> = ({
  variant = 'hp',
  current,
  max,
  label,
  isDamaged = false,
  isHealing = false,
  floatingItems = [],
  onFloatingComplete,
  className,
  onClick,
  ...props
}) => {
  const fraction = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const defaultLabel = variant === 'hp' ? 'VIDA' : 'FOCO';

  return (
    <m.div
      animate={
        isDamaged
          ? { x: [-2, 2, -2, 2, 0] }
          : isHealing
            ? { scale: [1, 1.04, 1] }
            : { x: 0, scale: 1 }
      }
      transition={{ duration: 0.3 }}
      onClick={onClick}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={max}
      className={twMerge(
        clsx(
          'orb',
          variant === 'hp' ? 'hp' : 'focus mp',
          onClick && 'cursor-pointer hover:scale-105 transition-transform',
          className,
        ),
      )}
      style={
        {
          '--f': fraction,
        } as React.CSSProperties
      }
      {...props}
    >
      <div className="liq" />
      {isHealing && (
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <div className="absolute bottom-2 left-6 h-2 w-2 rounded-full bg-[var(--moss)] animate-ping" />
          <div className="absolute bottom-4 right-6 h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce" />
        </div>
      )}
      <div className="glass" />
      <div className="val">
        <CountUp value={current} duration={300} />
        <small>{label ?? defaultLabel}</small>
      </div>

      {floatingItems.length > 0 && (
        <FloatingNumberContainer items={floatingItems} onComplete={onFloatingComplete} />
      )}
    </m.div>
  );
};
