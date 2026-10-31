/**
 * Motion Tokens & Constants — Design Pedra e Pergaminho
 * Conforme SKILL.md seção 3.4 e 4.
 */

export const motionTokens = {
  // Durações em segundos (para framer-motion / motion/react)
  tInstant: 0.09, // 90ms - toque, pressão
  tFast: 0.16, // 160ms - hover, troca de estado
  tBase: 0.24, // 240ms - trocar aba, abrir lista
  tSlow: 0.42, // 420ms - modal, pergaminho desenrolando
  tEpic: 0.9, // 900ms - subir de nível, crítico, missão concluída

  // Curvas cúbicas Bézier
  easeOut: [0.22, 1, 0.36, 1] as const,
  easeIn: [0.55, 0, 1, 0.45] as const,
  easeHeavy: [0.3, 1.4, 0.5, 1] as const,

  // Molas físicas calibradas
  spring: {
    soft: { type: 'spring', stiffness: 260, damping: 26 } as const,
    snap: { type: 'spring', stiffness: 520, damping: 32 } as const,
  },
} as const;

/**
 * Variantes canônicas de animação de tela e componentes
 */
export const tabTransitionVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.tBase,
      ease: motionTokens.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: 6,
    transition: {
      duration: motionTokens.tFast,
      ease: motionTokens.easeIn,
    },
  },
};

export const parchmentUnrollVariants = {
  hidden: { clipPath: 'inset(0 0 100% 0)', opacity: 0 },
  visible: {
    clipPath: 'inset(0 0 0% 0)',
    opacity: 1,
    transition: {
      clipPath: { duration: motionTokens.tSlow, ease: motionTokens.easeOut },
      opacity: { duration: motionTokens.tFast, ease: 'linear' },
    },
  },
  exit: {
    clipPath: 'inset(0 0 100% 0)',
    opacity: 0,
    transition: {
      clipPath: { duration: motionTokens.tFast, ease: motionTokens.easeIn },
      opacity: { duration: motionTokens.tInstant },
    },
  },
};

export const waxStampVariants = {
  initial: { scale: 1.4, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: motionTokens.tSlow,
      ease: motionTokens.easeHeavy,
    },
  },
};
