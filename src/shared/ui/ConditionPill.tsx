import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface ConditionPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  type?: 'good' | 'bad';
  label: string;
}

export const ConditionPill: React.FC<ConditionPillProps> = ({
  type = 'good',
  label,
  className,
  ...props
}) => {
  const isBad = type === 'bad';

  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1.5 px-2.5 py-1 border font-serif text-[10px] tracking-[0.1em] uppercase bg-black/40',
        isBad ? 'text-[#7fbf5a] border-[#7fbf5a]/40' : 'text-[var(--gold)] border-[var(--gold-lo)]',
        className,
      )}
      {...props}
    >
      <i className="w-1.5 h-1.5 transform rotate-45 bg-current" />
      <span>{label}</span>
    </span>
  );
};
