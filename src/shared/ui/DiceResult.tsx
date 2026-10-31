import { clsx } from 'clsx';
import { AlertOctagon, CheckCircle2, Sparkles, XCircle } from 'lucide-react';
import { type HTMLMotionProps, m } from 'motion/react';
import React from 'react';
import { motionTokens } from '../styles/motion';

export type DiceResultTone = 'critico' | 'brilhante' | 'sucesso' | 'falha' | 'desastre';

export interface DiceResultProps extends HTMLMotionProps<'div'> {
  tone: DiceResultTone;
  total: number;
  peso: number;
  label?: string;
  keptDice?: number[];
  modifier?: number;
  className?: string;
  animated?: boolean;
}

/**
 * Resultado de Rolagem de Dados (SKILL.md Seção 5 e 6)
 * - Dados giram 400ms e total surge com escala 0.6 -> 1.08 -> 1
 * - Selo do resultado: Desastre (--blood), Sucesso (--moss), Brilhante (--gold), Crítico (--ember)
 */
export const DiceResult: React.FC<DiceResultProps> = ({
  tone,
  total,
  peso,
  label,
  keptDice,
  modifier = 0,
  className = '',
  animated = true,
  ...props
}) => {
  const configs = {
    critico: {
      border: 'border-[var(--ember)]',
      bg: 'bg-[radial-gradient(ellipse_at_top,rgba(224,138,60,0.22),transparent_70%)]',
      text: 'text-[var(--ember)]',
      icon: <Sparkles className="w-5 h-5 text-[var(--ember)] animate-pulse" />,
      title: 'Crítico Solene (+1 Inspiração)',
      sealClass: 'border-[var(--ember)] text-[var(--ember)]',
    },
    brilhante: {
      border: 'border-[var(--gold)]',
      bg: 'bg-[radial-gradient(ellipse_at_top,rgba(201,164,92,0.2),transparent_70%)]',
      text: 'text-[var(--gold-hi)]',
      icon: <Sparkles className="w-5 h-5 text-[var(--gold)]" />,
      title: 'Sucesso Brilhante',
      sealClass: 'border-[var(--gold)] text-[var(--gold-hi)]',
    },
    sucesso: {
      border: 'border-[var(--moss)]',
      bg: 'bg-[radial-gradient(ellipse_at_top,rgba(127,163,107,0.18),transparent_70%)]',
      text: 'text-[var(--moss)]',
      icon: <CheckCircle2 className="w-5 h-5 text-[var(--moss)]" />,
      title: 'Sucesso',
      sealClass: 'border-[var(--moss)] text-[var(--moss)]',
    },
    falha: {
      border: 'border-[var(--iron)]',
      bg: 'bg-black/40',
      text: 'text-[var(--muted)]',
      icon: <XCircle className="w-5 h-5 text-[var(--muted)]" />,
      title: 'Falha',
      sealClass: 'border-[var(--iron)] text-[var(--muted)]',
    },
    desastre: {
      border: 'border-[var(--blood)]',
      bg: 'bg-[radial-gradient(ellipse_at_top,rgba(163,41,31,0.25),transparent_70%)]',
      text: 'text-[#e8584a]',
      icon: <AlertOctagon className="w-5 h-5 text-[var(--blood)] animate-pulse" />,
      title: 'Desastre Rúnico (Duplo 1)',
      sealClass: 'border-[var(--blood)] text-[var(--blood)]',
    },
  }[tone];

  return (
    <m.div
      initial={animated ? { scale: 0.85, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: motionTokens.tBase, ease: motionTokens.easeOut }}
      className={clsx(
        'slab p-4 relative overflow-hidden transition-all select-none',
        configs.border,
        configs.bg,
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {configs.icon}
          <div>
            <div
              className={clsx(
                "font-['Cinzel',serif] font-bold text-sm tracking-wide",
                configs.text,
              )}
            >
              {label || configs.title}
            </div>
            {keptDice && keptDice.length > 0 && (
              <div className="text-xs text-[var(--muted)] font-mono tabular-nums mt-0.5">
                Dados: [{keptDice.join(' + ')}]{' '}
                {modifier !== 0 && `${modifier > 0 ? '+' : ''}${modifier}`} (vs Peso {peso})
              </div>
            )}
          </div>
        </div>

        <div className="text-right flex items-center gap-3">
          <m.div
            initial={animated ? { scale: 0.6, opacity: 0 } : false}
            animate={{ scale: [0.6, 1.08, 1], opacity: 1 }}
            transition={{ duration: 0.4, ease: motionTokens.easeHeavy, delay: 0.1 }}
            className={clsx("font-['Cinzel',serif] font-black text-3xl tabular-nums", configs.text)}
          >
            {total}
          </m.div>

          <div
            className={clsx(
              "px-2 py-0.5 text-[9px] font-['Cinzel',serif] uppercase tracking-widest border font-bold",
              configs.sealClass,
            )}
          >
            {tone}
          </div>
        </div>
      </div>
    </m.div>
  );
};
