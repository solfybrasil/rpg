import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'parchment' | 'stone';
  width?: string | number;
  height?: string | number;
}

/**
 * Esqueleto de Carregamento Temático (SKILL.md Seção 5 e 11)
 * Banido spinners genéricos: pergaminho iluminado com shimmer orgânico.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'parchment',
  width,
  height,
  className,
  style,
  ...props
}) => {
  const isParch = variant === 'parchment';

  return (
    <div
      className={twMerge(
        isParch ? 'skeleton-parch' : 'recess animate-pulse',
        'border border-[var(--iron)]/40',
        className,
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};
