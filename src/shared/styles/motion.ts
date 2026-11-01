/**
 * Motion Tokens, Hooks & Variants — Design Pedra e Pergaminho
 * Conforme SKILL.md seções 3.4, 4, 5 e 8.
 */
import { useEffect, useState } from 'react';

export const motionTokens = {
  // Durações em segundos (para motion/react)
  tInstant: 0.09, // 90ms - toque, pressão
  tFast: 0.16, // 160ms - hover, troca de estado
  tBase: 0.24, // 240ms - trocar aba, abrir lista
  tSlow: 0.42, // 420ms - modal, pergaminho desenrolando
  tEpic: 0.9, // 900ms - subir de nível, crítico, missão concluída
  tReduced: 0.12, // 120ms - fade acessível quando prefers-reduced-motion está ativo

  // Curvas cúbicas Bézier
  easeOut: [0.22, 1, 0.36, 1] as const,
  easeIn: [0.55, 0, 1, 0.45] as const,
  easeHeavy: [0.3, 1.4, 0.5, 1] as const,

  // Molas físicas calibradas (SKILL.md Seção 3.4)
  spring: {
    soft: { type: 'spring', stiffness: 260, damping: 26 } as const,
    snap: { type: 'spring', stiffness: 520, damping: 32 } as const,
  },
} as const;

export const spring = motionTokens.spring;

/**
 * Hook acessível useReducedMotion (SKILL.md Seção 4.5 e Seção 9.2)
 * Respeita tanto `prefers-reduced-motion: reduce` do sistema quanto a preferência salva do usuário.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem('peste_reduce_motion') === 'true';
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    return saved || media;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      const saved = window.localStorage.getItem('peste_reduce_motion') === 'true';
      setReduced(saved || mq.matches);
    };
    update();
    mq.addEventListener('change', update);
    window.addEventListener('storage', update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return reduced;
}

/**
 * Detector de FPS para Celular Fraco (`lowFx`, SKILL.md Seção 8)
 * Se o FPS cair abaixo de 45 por 2 segundos seguidos, liga a flag `lowFx` para desligar partículas e ambiente.
 */
export function useLowFxMonitor(enabled = true): boolean {
  const reduced = useReducedMotion();
  const [lowFx, setLowFx] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('peste_low_fx') === 'true';
  });

  useEffect(() => {
    if (!enabled || reduced || lowFx || typeof window === 'undefined') return;

    let rafId = 0;
    let frames = 0;
    let lastCheck = performance.now();
    let lowSecondsCount = 0;

    const tick = (now: number) => {
      frames++;
      const elapsed = now - lastCheck;
      if (elapsed >= 1000) {
        const fps = (frames * 1000) / elapsed;
        if (!document.hidden && fps < 45) {
          lowSecondsCount++;
          if (lowSecondsCount >= 2) {
            setLowFx(true);
            return;
          }
        } else {
          lowSecondsCount = 0;
        }
        frames = 0;
        lastCheck = now;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, reduced, lowFx]);

  return reduced || lowFx;
}

/**
 * Variantes canônicas de animação de tela e componentes
 * Saída mais rápida que a entrada (~70% do tempo, SKILL.md Seção 4.6)
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

export const reducedMotionVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: motionTokens.tReduced },
  },
  exit: {
    opacity: 0,
    transition: { duration: motionTokens.tInstant },
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
      clipPath: { duration: 0.28, ease: motionTokens.easeIn },
      opacity: { duration: motionTokens.tFast },
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
