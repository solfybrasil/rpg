import { clsx } from 'clsx';
import React, { useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { useTornEdge } from '../hooks/useTornEdge';

export interface ParchmentProps extends React.HTMLAttributes<HTMLDivElement> {
  seed?: number;
  torn?: boolean;
  children?: React.ReactNode;
}

export const Parchment: React.FC<ParchmentProps> = ({
  seed = 42,
  torn = true,
  className,
  children,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useTornEdge(containerRef, seed, !torn);

  return (
    <div className="parch-wrap w-full">
      <div
        ref={containerRef}
        className={twMerge(clsx('parch p-4', torn && 'torn', className))}
        {...props}
      >
        {children}
      </div>
    </div>
  );
};
