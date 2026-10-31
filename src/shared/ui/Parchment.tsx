import { clsx } from 'clsx';
import { m } from 'motion/react';
import React, { useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { useTornEdge } from '../hooks/useTornEdge';
import { motionTokens } from '../styles/motion';

export interface ParchmentProps extends React.HTMLAttributes<HTMLDivElement> {
  seed?: number;
  torn?: boolean;
  unroll?: boolean;
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
  className,
  children,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useTornEdge(containerRef, seed, !torn);

  const content = (
    <div
      ref={containerRef}
      className={twMerge(clsx('parch p-4', torn && 'torn', className))}
      {...props}
    >
      {unroll ? (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08, duration: motionTokens.tBase }}
        >
          {children}
        </m.div>
      ) : (
        children
      )}
    </div>
  );

  return (
    <div className="parch-wrap w-full">
      {unroll ? (
        <m.div
          initial={{ clipPath: 'inset(0 0 100% 0)' }}
          animate={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
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
