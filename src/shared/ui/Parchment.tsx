import { clsx } from 'clsx';
import { m } from 'motion/react';
import React, { useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { useTornEdge } from '../hooks/useTornEdge';
import { motionTokens, useReducedMotion } from '../styles/motion';
import { Skeleton } from './Skeleton';

export interface ParchmentProps extends React.HTMLAttributes<HTMLDivElement> {
  seed?: number;
  torn?: boolean;
  unroll?: boolean;
  isLoading?: boolean;
  emptyText?: string;
  children?: React.ReactNode;
}

/**
 * Pergaminho com Borda Rasgada Procedural (SKILL.md Seção 5 e 6)
 * Suporta desenrolar vertical com clip-path e atraso do texto.
 */
export const Parchment: React.FC<ParchmentProps> = ({
  seed = 42,
  torn = true,
  unroll = false,
  isLoading = false,
  emptyText,
  className,
  children,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  useTornEdge(containerRef, seed, !torn);

  const shouldUnroll = unroll && !reducedMotion;
  const isEmpty = !isLoading && emptyText && React.Children.count(children) === 0;

  const innerBody = isLoading ? (
    <div className="space-y-2 py-1">
      <Skeleton variant="parchment" height={16} width="60%" />
      <Skeleton variant="parchment" height={14} width="90%" />
      <Skeleton variant="parchment" height={14} width="75%" />
    </div>
  ) : isEmpty ? (
    <p className="font-['EB_Garamond',serif] italic text-sm text-[var(--ink-soft)] text-center py-2">
      {emptyText}
    </p>
  ) : (
    children
  );

  const content = (
    <div
      ref={containerRef}
      className={twMerge(clsx('parch p-4', torn && 'torn', className))}
      {...props}
    >
      {shouldUnroll ? (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08, duration: motionTokens.tBase }}
        >
          {innerBody}
        </m.div>
      ) : (
        innerBody
      )}
    </div>
  );

  return (
    <div className="parch-wrap w-full">
      {shouldUnroll ? (
        <m.div
          initial={{ clipPath: 'inset(0 0 100% 0)' }}
          animate={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{
            clipPath: 'inset(0 0 100% 0)',
            transition: { duration: motionTokens.tSlow * 0.7, ease: motionTokens.easeIn },
          }}
          transition={{ duration: motionTokens.tSlow, ease: motionTokens.easeOut }}
        >
          {content}
        </m.div>
      ) : (
        content
      )}
    </div>
  );
};
