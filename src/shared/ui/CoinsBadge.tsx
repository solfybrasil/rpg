import { clsx } from 'clsx';
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
    lg: 'text-base font-semibold',
  }[size];

  if (total === 0) {
    return (
      <div className={clsx('inline-flex items-center gap-1 text-[#a8947c]', textSize, className)}>
        <span className="text-[#d97706]">0b</span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 font-mono tracking-wide',
        textSize,
        className,
      )}
      title={`${total} moedas de bronze`}
    >
      {gold > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[#f59e0b] font-bold">
          <span className="text-xs">🪙</span> {gold}o
        </span>
      )}
      {(silver > 0 || gold > 0) && (
        <span className="inline-flex items-center gap-0.5 text-[#cbd5e1] font-semibold">
          <span className="text-xs">🥈</span> {silver}p
        </span>
      )}
      <span className="inline-flex items-center gap-0.5 text-[#d97706] font-semibold">
        <span className="text-xs">🥉</span> {bronze}b
      </span>
    </div>
  );
};
