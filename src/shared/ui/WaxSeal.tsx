import { type HTMLMotionProps, m } from 'motion/react';
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { motionTokens } from '../styles/motion';

export interface WaxSealProps extends HTMLMotionProps<'div'> {
  children?: React.ReactNode;
  isStamping?: boolean;
}

/**
 * Selo de Cera Vermelho (SKILL.md Seção 5 e 6)
 * Efeito de carimbo físico: escala 1.4 -> 1 com --ease-heavy.
 */
export const WaxSeal: React.FC<WaxSealProps> = ({
  className,
  children,
  isStamping = false,
  ...props
}) => {
  return (
    <m.div
      initial={isStamping ? { scale: 1.4, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        duration: motionTokens.tSlow,
        ease: motionTokens.easeHeavy,
      }}
      className={twMerge('wax shrink-0 select-none font-bold', className)}
      {...props}
    >
      {children}
    </m.div>
  );
};
