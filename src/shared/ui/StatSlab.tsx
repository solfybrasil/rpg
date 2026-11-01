import React from 'react';
import { twMerge } from 'tailwind-merge';
import { CountUp } from './CountUp';

export interface StatSlabProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  unit?: string;
}

export const StatSlab: React.FC<StatSlabProps> = ({ label, value, unit, className, ...props }) => {
  return (
    <div className={twMerge('slab p-2 text-center', className)} {...props}>
      <div className="font-['Cinzel',serif] text-[9px] tracking-[0.16em] uppercase text-[var(--muted)]">
        {label}
      </div>
      <div className="font-['Cinzel',serif] font-bold text-[20px] text-[var(--gold-hi)] tabular-nums leading-tight">
        {typeof value === 'number' ? <CountUp value={value} duration={260} /> : value}
        {unit && <small className="text-[11px] text-[var(--muted)] ml-1 font-normal">{unit}</small>}
      </div>
    </div>
  );
};
