import { clsx } from 'clsx';
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Skeleton } from './Skeleton';

export interface StonePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'active' | 'recess';
  isLoading?: boolean;
  emptyText?: string;
  children?: React.ReactNode;
}

export const StonePanel: React.FC<StonePanelProps> = ({
  variant = 'default',
  isLoading = false,
  emptyText,
  className,
  children,
  ...props
}) => {
  const isEmpty = !isLoading && emptyText && React.Children.count(children) === 0;

  return (
    <div
      className={twMerge(
        clsx(
          variant === 'recess' ? 'recess' : 'slab',
          variant === 'active' && 'on',
          'rounded-none',
          className,
        ),
      )}
      {...props}
    >
      {isLoading ? (
        <div className="p-3 space-y-2">
          <Skeleton variant="stone" height={20} width="45%" />
          <Skeleton variant="stone" height={40} width="100%" />
        </div>
      ) : isEmpty ? (
        <div className="p-4 text-center font-['Cinzel',serif] text-[11px] uppercase tracking-widest text-[var(--muted)]">
          {emptyText}
        </div>
      ) : (
        children
      )}
    </div>
  );
};
