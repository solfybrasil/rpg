import { AnimatePresence, m } from 'motion/react';
import React from 'react';

export interface FloatingItem {
  id: string;
  value: number;
  type: 'damage' | 'heal' | 'focus';
}

export interface FloatingNumberProps {
  items: FloatingItem[];
  onComplete?: (id: string) => void;
}

/**
 * Números Flutuantes de Dano e Cura (SKILL.md Seção 5)
 * Dano em carmim (-5) e cura em verde musgo (+4).
 */
export const FloatingNumberContainer: React.FC<FloatingNumberProps> = ({ items, onComplete }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible flex items-center justify-center z-50">
      <AnimatePresence>
        {items.map((item) => {
          const isDamage = item.type === 'damage';
          const isHeal = item.type === 'heal';
          const colorClass = isDamage
            ? 'text-[#e8584a] [text-shadow:0_0_8px_rgba(232,88,74,0.8)]'
            : isHeal
              ? 'text-[var(--moss)] [text-shadow:0_0_8px_rgba(127,163,107,0.8)]'
              : 'text-[var(--mist)] [text-shadow:0_0_8px_rgba(127,166,207,0.8)]';

          const text = isDamage
            ? `-${Math.abs(item.value)}`
            : isHeal
              ? `+${Math.abs(item.value)}`
              : `${item.value}`;

          return (
            <m.div
              key={item.id}
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: -32, scale: 1.25 }}
              exit={{ opacity: 0, y: -50, scale: 1 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              onAnimationComplete={() => onComplete?.(item.id)}
              className={`absolute font-['Cinzel',serif] font-black text-2xl tracking-wider select-none ${colorClass}`}
            >
              {text}
            </m.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
