import { m } from 'motion/react';
import React from 'react';
import { motionTokens } from '../styles/motion';

export interface ToastProps {
  title: string;
  description?: string;
  type?: 'success' | 'damage' | 'gold' | 'info';
  onDismiss?: () => void;
}

/**
 * Toast do Design Pedra e Pergaminho (SKILL.md Seção 5 e 6)
 * Placa de pedra que desce do topo com filete colorido à esquerda e barra dourada regressiva.
 */
export const Toast: React.FC<ToastProps> = ({ title, description, type = 'info', onDismiss }) => {
  const filletColor =
    type === 'damage'
      ? 'var(--blood)'
      : type === 'success'
        ? 'var(--moss)'
        : type === 'gold'
          ? 'var(--gold)'
          : 'var(--mist)';

  return (
    <m.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      transition={{ duration: motionTokens.tBase, ease: motionTokens.easeOut }}
      onClick={onDismiss}
      className="slab p-3.5 pr-6 relative overflow-hidden flex items-start gap-3 cursor-pointer shadow-2xl max-w-sm border-l-4"
      style={{ borderLeftColor: filletColor }}
    >
      <div className="flex-1">
        <h4 className="font-['Cinzel',serif] text-xs font-bold tracking-wider text-[var(--gold-hi)]">
          {title}
        </h4>
        {description && (
          <p className="font-['EB_Garamond',serif] text-xs text-[var(--text)] mt-1">
            {description}
          </p>
        )}
      </div>

      {/* Barra de tempo dourada regressiva */}
      <m.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 3, ease: 'linear' }}
        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--gold)] origin-left"
      />
    </m.div>
  );
};
