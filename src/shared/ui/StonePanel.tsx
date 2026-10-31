import { clsx } from 'clsx';
import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface StonePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'active' | 'recess';
  children?: React.ReactNode;
}

export const StonePanel: React.FC<StonePanelProps> = ({
  variant = 'default',
  className,
  children,
  ...props
}) => {
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
      {children}
    </div>
  );
};
