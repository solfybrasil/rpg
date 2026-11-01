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
      text: 'text-[var(--blood)]',
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
        animated && tone === 'critico' && 'dice-crit-shake',
        className,
      )}
      {...props}
    >
      {/* Crítico: 6 faíscas âmbar (--ember) */}
      {animated && tone === 'critico' && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <m.span
              key={`crit-spark-${i}`}
              initial={{ opacity: 1, x: '50%', y: '50%', scale: 1 }}
              animate={{
                opacity: 0,
                x: `${20 + i * 12}%`,
                y: `${i % 2 === 0 ? 10 : 85}%`,
                scale: 0.4,
              }}
              transition={{ duration: 0.65, delay: 0.1 + i * 0.04, ease: motionTokens.easeOut }}
              className="absolute w-1.5 h-1.5 rotate-45 bg-[var(--ember)] shadow-[0_0_6px_var(--ember)]"
            />
          ))}
        </div>
      )}

      {/* Desastre: Rachadura cinza da Peste na borda */}
      {tone === 'desastre' && (
        <svg
          viewBox="0 0 320 80"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 w-full h-full text-[var(--plague)] opacity-75"
          aria-hidden="true"
        >
          <path
            d="M0 2 L42 14 L34 28 L68 42 M320 78 L272 62 L284 44 L248 29 M140 0 L152 18 L144 31"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
      )}

      <div className="flex items-center justify-between gap-4 relative z-10">
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
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-['Cinzel',serif] tabular-nums mt-1">
                <span>Dados:</span>
                {keptDice.map((die, idx) => (
                  <m.span
                    key={`die-${idx}-${die}`}
                    initial={animated ? { rotate: -180, scale: 0.5, opacity: 0 } : false}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: motionTokens.easeOut, delay: idx * 0.05 }}
                    className="inline-flex items-center justify-center w-5 h-5 recess border border-[var(--iron)] text-[var(--gold-hi)] font-bold text-[11px]"
                  >
                    {die}
                  </m.span>
                ))}
                <span>
                  {modifier !== 0 && `${modifier > 0 ? '+' : ''}${modifier}`} (vs Peso {peso})
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="text-right flex items-center gap-3">
          <m.div
            initial={animated ? { scale: 0.6, opacity: 0 } : false}
            animate={{ scale: [0.6, 1.08, 1], opacity: 1 }}
            transition={{
              duration: 0.4,
              ease: motionTokens.easeHeavy,
              delay: animated ? 0.32 : 0,
            }}
            className={clsx("font-['Cinzel',serif] font-black text-3xl tabular-nums", configs.text)}
          >
            {total}
          </m.div>

          <m.div
            initial={animated ? { scale: 1.35, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: motionTokens.tBase,
              ease: motionTokens.easeHeavy,
              delay: animated ? 0.52 : 0,
            }}
            className={clsx(
              "px-2 py-0.5 text-[9px] font-['Cinzel',serif] uppercase tracking-widest border font-bold",
              configs.sealClass,
            )}
          >
            {tone}
          </m.div>
        </div>
      </div>
    </m.div>
  );
};
