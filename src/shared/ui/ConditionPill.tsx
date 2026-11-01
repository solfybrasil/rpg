import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface ConditionPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  type?: 'good' | 'bad' | 'plague' | 'blood';
  label: string;
}

export const ConditionPill: React.FC<ConditionPillProps> = ({
  type = 'good',
  label,
  className,
  ...props
}) => {
  const toneClass =
    type === 'bad'
      ? 'text-[var(--moss)] border-[var(--moss)]/45'
      : type === 'plague'
        ? 'text-[var(--plague)] border-[var(--plague)]/45'
        : type === 'blood'
          ? 'text-[var(--blood)] border-[var(--blood)]/50'
          : 'text-[var(--gold)] border-[var(--gold-lo)]';

  return (
    <span
      className={twMerge(
        "inline-flex items-center gap-1.5 px-2.5 py-1 border font-['Cinzel',serif] text-[10px] tracking-[0.1em] uppercase bg-black/40",
        toneClass,
        className,
      )}
      {...props}
    >
      <i className="w-1.5 h-1.5 transform rotate-45 bg-current" />
      <span>{label}</span>
    </span>
  );
};
