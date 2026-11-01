import { Coins } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { CountUp } from './CountUp';

export interface StatusBarProps extends React.HTMLAttributes<HTMLDivElement> {
  heroName: string;
  level?: number;
  coinsBronze?: number;
  portraitUrl?: string;
  onPortraitClick?: () => void;
  rightAction?: React.ReactNode;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  heroName,
  level = 1,
  coinsBronze = 0,
  portraitUrl,
  onPortraitClick,
  rightAction,
  className,
  ...props
}) => {
  // Conversão de moedas (1 PO = 100 PP = 10000 PB, ou ouro resumido)
  const goldApprox = Math.floor(coinsBronze / 100);
  const prevGoldRef = useRef<number>(goldApprox);
  const [coinBurst, setCoinBurst] = useState<number>(0);

  useEffect(() => {
    if (goldApprox !== prevGoldRef.current) {
      setCoinBurst((c) => c + 1);
      prevGoldRef.current = goldApprox;
    }
  }, [goldApprox]);

  return (
    <header className={twMerge('status h-[52px]', className)} {...props}>
      {/* Esquerda: Retrato, Nome e Nível */}
      <div className="who flex items-center gap-2">
        <button
          type="button"
          onClick={onPortraitClick}
          className="mini-port relative overflow-hidden flex items-center justify-center cursor-pointer hover:border-[var(--gold-hi)] transition-colors"
          title={`Herói: ${heroName}`}
        >
          {portraitUrl ? (
            <img src={portraitUrl} alt={heroName} className="w-full h-full object-cover" />
          ) : (
            <span className="font-['Cinzel',serif] text-xs font-bold text-[var(--gold-hi)]">
              {heroName.slice(0, 1)}
            </span>
          )}
        </button>

        <span className="font-['Cinzel',serif] font-bold text-[13px] text-[var(--gold-hi)] tracking-[0.08em]">
          {heroName}
        </span>
        <span className="lvl text-[10px] text-[var(--muted)] tracking-[0.16em] uppercase">
          Nv {level}
        </span>
      </div>

      {/* Direita: Moedas e Ações */}
      <div className="flex items-center gap-4">
        {rightAction}
        <div className="gold-count relative flex items-center gap-1.5 font-['Cinzel',serif] text-[14px] text-[var(--gold-hi)] tabular-nums">
          <AnimatePresence>
            {coinBurst > 0 &&
              [0, 1, 2].map((idx) => (
                <m.span
                  key={`coin-jump-${coinBurst}-${idx}`}
                  initial={{ opacity: 1, y: 14, x: (idx - 1) * 10, scale: 0.7 }}
                  animate={{ opacity: 0, y: -12, x: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.42, delay: idx * 0.06 }}
                  className="pointer-events-none absolute left-0 top-0 w-2.5 h-2.5 rounded-full bg-[var(--gold-hi)] border border-[var(--gold-lo)] shadow-[0_0_6px_rgba(236,211,149,0.8)]"
                />
              ))}
          </AnimatePresence>
          <Coins size={16} className="text-[var(--gold)]" />
          <CountUp value={goldApprox} duration={320} />
        </div>
      </div>
    </header>
  );
};
