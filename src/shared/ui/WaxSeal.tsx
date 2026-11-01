import { type HTMLMotionProps, m } from 'motion/react';
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { motionTokens } from '../styles/motion';

export interface WaxSealProps extends HTMLMotionProps<'div'> {
  children?: React.ReactNode;
  isStamping?: boolean;
  isBroken?: boolean;
}

/**
 * Selo de Cera Vermelho (SKILL.md Seção 5 e 6)
 * Efeito de carimbo físico: escala 1.4 -> 1 com --ease-heavy e sombra se espalhando.
 */
export const WaxSeal: React.FC<WaxSealProps> = ({
  className,
  children,
  isStamping = false,
  isBroken = false,
  ...props
}) => {
  return (
    <m.div
      initial={
        isStamping
          ? {
              scale: 1.4,
              opacity: 0,
              boxShadow: '0 10px 24px rgba(0,0,0,0.85), inset 0 0 0 4px rgba(0,0,0,0.18)',
            }
          : false
      }
      animate={{
        scale: isBroken ? 0.92 : 1,
        opacity: isBroken ? 0.65 : 1,
        boxShadow: '0 2px 5px rgba(0,0,0,0.5), inset 0 0 0 4px rgba(0,0,0,0.18)',
      }}
      transition={{
        duration: motionTokens.tSlow,
        ease: motionTokens.easeHeavy,
      }}
      className={twMerge('wax relative shrink-0 select-none font-bold', className)}
      {...props}
    >
      {children}
      {isBroken && (
        <svg
          viewBox="0 0 44 44"
          className="pointer-events-none absolute inset-0 w-full h-full text-black/70"
          aria-hidden="true"
        >
          <path d="M14 4 L23 19 L19 25 L29 40" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      )}
    </m.div>
  );
};
