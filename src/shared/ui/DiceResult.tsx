import { clsx } from 'clsx';
import { AlertOctagon, CheckCircle2, Sparkles, XCircle } from 'lucide-react';
import React from 'react';

export type DiceResultTone = 'critico' | 'brilhante' | 'sucesso' | 'falha' | 'desastre';

export interface DiceResultProps extends React.HTMLAttributes<HTMLDivElement> {
  tone: DiceResultTone;
  total: number;
  peso: number;
  label?: string;
  keptDice?: number[];
  modifier?: number;
  className?: string;
}

export const DiceResult: React.FC<DiceResultProps> = ({
  tone,
  total,
  peso,
  label,
  keptDice,
  modifier = 0,
  className = '',
  ...props
}) => {
  const configs = {
    critico: {
      border: 'border-[#f5b65b]',
      bg: 'bg-gradient-to-r from-[#f5b65b]/20 via-[#f5b65b]/10 to-transparent',
      text: 'text-[#ffd59a]',
      icon: <Sparkles className="w-5 h-5 text-[#f5b65b] animate-pulse" />,
      title: 'Crítico! (+1 Inspiração)',
    },
    brilhante: {
      border: 'border-[#30d158]/60',
      bg: 'bg-gradient-to-r from-[#30d158]/15 via-[#30d158]/5 to-transparent',
      text: 'text-[#86efac]',
      icon: <Sparkles className="w-5 h-5 text-[#30d158]" />,
      title: 'Sucesso Brilhante',
    },
    sucesso: {
      border: 'border-[#30d158]/40',
      bg: 'bg-gradient-to-r from-[#30d158]/10 to-transparent',
      text: 'text-[#86efac]',
      icon: <CheckCircle2 className="w-5 h-5 text-[#30d158]" />,
      title: 'Sucesso',
    },
    falha: {
      border: 'border-[#ff453a]/40',
      bg: 'bg-gradient-to-r from-[#ff453a]/10 to-transparent',
      text: 'text-[#fca5a5]',
      icon: <XCircle className="w-5 h-5 text-[#ff453a]" />,
      title: 'Falha',
    },
    desastre: {
      border: 'border-[#ff453a]',
      bg: 'bg-gradient-to-r from-[#ff453a]/25 via-[#ff453a]/10 to-transparent',
      text: 'text-[#fca5a5]',
      icon: <AlertOctagon className="w-5 h-5 text-[#ff453a] animate-pulse" />,
      title: 'Desastre Rúnico! (Duplo 1)',
    },
  }[tone];

  return (
    <div
      className={clsx(
        'rounded-xl border p-4 transition-all duration-300',
        configs.border,
        configs.bg,
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {configs.icon}
          <div>
            <div className={clsx('font-serif font-bold text-base tracking-wide', configs.text)}>
              {label || configs.title}
            </div>
            {keptDice && keptDice.length > 0 && (
              <div className="text-xs text-white/60 font-mono mt-0.5">
                Dados: [{keptDice.join(' + ')}]{' '}
                {modifier !== 0 && `${modifier > 0 ? '+' : ''}${modifier}`} = {total} (vs Peso{' '}
                {peso})
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className={clsx('font-mono font-bold text-2xl', configs.text)}>{total}</div>
          <div className="text-[11px] font-serif text-white/50 uppercase tracking-widest">
            Total
          </div>
        </div>
      </div>
    </div>
  );
};
