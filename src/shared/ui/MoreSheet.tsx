import { Link } from '@tanstack/react-router';
import { AnimatePresence, m } from 'motion/react';
import React from 'react';
import { motionTokens } from '../styles/motion';

export interface MoreItem {
  label: string;
  icon: React.ReactNode;
  to: string;
}

export interface MoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: MoreItem[];
}

/**
 * Menu "Mais" do Jogador (SKILL.md Seção 5)
 * Sobe de baixo (--t-slow) com ícones em cascata escalonada (20ms cada).
 */
export const MoreSheet: React.FC<MoreSheetProps> = ({ isOpen, onClose, items }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.tFast }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 z-40 backdrop-blur-xs"
          />
          <m.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: motionTokens.tSlow, ease: motionTokens.easeOut }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto slab p-5 border-t border-[var(--gold-lo)]"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--iron)]">
              <span className="font-['Cinzel',serif] text-xs font-bold uppercase tracking-widest text-[var(--gold-hi)]">
                Grimório de Abas
              </span>
              <button
                type="button"
                onClick={onClose}
                className="text-[var(--muted)] hover:text-white text-xs font-['Cinzel',serif] uppercase tracking-wider"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {items.slice(0, 12).map((item, index) => (
                <m.div
                  key={item.to}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: Math.min(index, 10) * 0.02,
                    duration: motionTokens.tBase,
                    ease: motionTokens.easeOut,
                  }}
                >
                  <Link
                    to={item.to}
                    onClick={onClose}
                    className="flex flex-col items-center justify-center p-2.5 slab hover:border-[var(--gold-lo)] text-center transition-all group active:scale-95"
                  >
                    <div className="text-[var(--gold)] mb-1.5 transition-transform group-hover:scale-110">
                      {item.icon}
                    </div>
                    <span className="font-['Cinzel',serif] text-[9.5px] uppercase tracking-wider text-[var(--text)] group-hover:text-[var(--gold-hi)]">
                      {item.label}
                    </span>
                  </Link>
                </m.div>
              ))}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
};
