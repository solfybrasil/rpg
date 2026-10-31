import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface AttrSlabProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  value: number;
  modifier: number;
  highlight?: boolean;
}

export const AttrSlab: React.FC<AttrSlabProps> = ({
  name,
  value,
  modifier,
  highlight = false,
  className,
  ...props
}) => {
  const modFormatted = modifier >= 0 ? `+${modifier}` : `${modifier}`;

  return (
    <div
      className={twMerge(
        'slab flex items-center justify-between p-2 px-3',
        highlight && 'on',
        className,
      )}
      {...props}
    >
      <div>
        <div className="font-['Cinzel',serif] text-[9px] tracking-[0.1em] uppercase text-[var(--muted)]">
          {name}
        </div>
        <div className="font-['Cinzel',serif] font-bold text-[22px] text-[var(--gold-hi)] leading-none tabular-nums">
          {value}
        </div>
      </div>

      {/* Losango do modificador a 45 graus */}
      <div className="w-[24px] h-[24px] border border-[var(--gold-lo)] flex items-center justify-center transform rotate-45 mr-1 bg-black/40">
        <span className="transform -rotate-45 font-['Cinzel',serif] text-[11px] font-bold text-[var(--gold)] tabular-nums">
          {modFormatted}
        </span>
      </div>
    </div>
  );
};
