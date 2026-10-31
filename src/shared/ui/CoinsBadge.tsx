import { clsx } from 'clsx';
import { Coins } from 'lucide-react';
import React from 'react';
import { fromBronze } from '../../entities/item';

export interface CoinsBadgeProps {
  coinsBronze?: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CoinsBadge: React.FC<CoinsBadgeProps> = ({
  coinsBronze = 0,
  className = '',
  size = 'md',
}) => {
  const { gold, silver, bronze, total } = fromBronze(coinsBronze);

  const textSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base font-bold',
  }[size];

  if (total === 0) {
    return (
      <div
        className={clsx(
          "inline-flex items-center gap-1 text-[var(--muted)] font-['Cinzel',serif] tabular-nums",
          textSize,
          className,
        )}
      >
        <span>0b</span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 font-['Cinzel',serif] font-bold tabular-nums tracking-wider",
        textSize,
        className,
      )}
      title={`${total} moedas de bronze`}
    >
      {gold > 0 && (
        <span className="inline-flex items-center gap-1 text-[var(--gold-hi)]">
          <Coins size={14} className="text-[var(--gold)]" />
          <span>{gold}o</span>
        </span>
      )}
      {(silver > 0 || gold > 0) && (
        <span className="inline-flex items-center gap-0.5 text-slate-300">
          <span>{silver}p</span>
        </span>
      )}
      <span className="inline-flex items-center gap-0.5 text-amber-600">
        <span>{bronze}b</span>
      </span>
    </div>
  );
};
