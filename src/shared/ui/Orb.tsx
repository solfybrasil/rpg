import { clsx } from 'clsx';
import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface OrbProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'hp' | 'focus';
  current: number;
  max: number;
  label?: string;
  onClick?: () => void;
}

export const Orb: React.FC<OrbProps> = ({
  variant = 'hp',
  current,
  max,
  label,
  className,
  onClick,
  ...props
}) => {
  const fraction = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const defaultLabel = variant === 'hp' ? 'VIDA' : 'FOCO';

  return (
    <div
      onClick={onClick}
      className={twMerge(
        clsx(
          'orb',
          variant === 'hp' ? 'hp' : 'focus mp',
          onClick && 'cursor-pointer hover:scale-105 transition-transform',
          className,
        ),
      )}
      style={
        {
          '--f': fraction,
        } as React.CSSProperties
      }
      {...props}
    >
      <div className="liq" />
      <div className="glass" />
      <div className="val">
        {current}
        <small>{label ?? defaultLabel}</small>
      </div>
    </div>
  );
};
