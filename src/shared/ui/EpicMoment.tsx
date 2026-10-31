import { AnimatePresence, m } from 'motion/react';
import React from 'react';
import { motionTokens } from '../styles/motion';

export interface EpicMomentProps {
  type: 'level_up' | 'plague_surge' | 'fallen_hero' | null;
  level?: number;
  heroName?: string;
  onClose: () => void;
}

/**
 * Componente de Momentos Épicos (--t-epic, fecha com 1 toque)
 * SKILL.md Seção 5: Subir de nível, Peste avançando, Herói caído.
 */
export const EpicMoment: React.FC<EpicMomentProps> = ({
  type,
  level = 2,
  heroName = 'Jurado',
  onClose,
}) => {
  if (!type) return null;

  return (
    <AnimatePresence>
      <dialog
        open
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            onClose();
          }
        }}
        className="fixed inset-0 z-[9999] m-0 h-full w-full max-h-none max-w-none flex items-center justify-center bg-black/85 cursor-pointer backdrop-blur-sm select-none border-none p-0"
      >
        {type === 'level_up' && (
          <m.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: motionTokens.tSlow, ease: motionTokens.easeOut }}
            className="flex flex-col items-center text-center p-8 relative overflow-hidden"
          >
            {/* Raios dourados girando atrás */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25 animate-spin"
              style={{
                animationDuration: '24s',
                background:
                  'radial-gradient(circle, rgba(236,211,149,0.3) 0%, transparent 70%), repeating-conic-gradient(from 0deg, rgba(201,164,92,0.15) 0deg 15deg, transparent 15deg 30deg)',
              }}
            />

            <m.span
              initial={{ letterSpacing: '0.6em', opacity: 0 }}
              animate={{ letterSpacing: '0.22em', opacity: 1 }}
              transition={{ duration: motionTokens.tEpic, ease: motionTokens.easeOut }}
              className="font-['Cinzel',serif] text-sm uppercase text-[var(--gold)] font-bold mb-2"
            >
              Consagração Solene
            </m.span>

            <m.h1
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: motionTokens.easeHeavy, delay: 0.15 }}
              className="font-['Cinzel',serif] text-5xl md:text-6xl font-black text-[var(--gold-hi)] [text-shadow:0_0_25px_rgba(236,211,149,0.6)]"
            >
              NÍVEL {level}
            </m.h1>

            <p className="font-['EB_Garamond',serif] italic text-lg text-[var(--parch)] mt-4 max-w-md">
              A chama de {heroName} arde mais forte contra as cinzas do mundo.
            </p>

            <span className="font-['Cinzel',serif] text-[10px] uppercase tracking-widest text-[var(--muted)] mt-8">
              [ Toque para continuar ]
            </span>
          </m.div>
        )}

        {type === 'plague_surge' && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center p-8 max-w-lg border border-[var(--plague)]/40 bg-[var(--stone)] shadow-2xl relative"
          >
            <div className="absolute inset-0 border-2 border-[var(--plague)]/60 pointer-events-none animate-pulse" />
            <span className="font-['Cinzel',serif] text-xs uppercase text-[var(--plague)] tracking-widest font-bold mb-2">
              A Sombra se Espalha
            </span>
            <h2 className="font-['Cinzel',serif] text-3xl font-black text-stone-200">
              AVANÇO DA PESTE
            </h2>
            <p className="font-['EB_Garamond',serif] italic text-[var(--parch)] mt-3">
              O juramento range sob a corrupção. As marcas da podridão avançam mais um estágio em
              sua carne.
            </p>
            <span className="font-['Cinzel',serif] text-[10px] uppercase tracking-widest text-[var(--muted)] mt-6">
              [ Toque para continuar ]
            </span>
          </m.div>
        )}

        {type === 'fallen_hero' && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center p-8 max-w-md border border-[var(--blood)]/50 bg-[var(--stone)] shadow-2xl"
          >
            <div className="h-16 w-16 rounded-full border-2 border-[var(--blood)] flex items-center justify-center text-[var(--blood)] text-2xl font-bold font-['Cinzel',serif] mb-4">
              †
            </div>
            <h2 className="font-['Cinzel',serif] text-3xl font-bold text-[var(--blood)]">
              HERÓI CAÍDO
            </h2>
            <p className="font-['EB_Garamond',serif] italic text-stone-300 mt-2 text-base">
              A carne tombou na névoa e o sangue esfriou. Apenas o toque do Confessor pode acordar
              sua alma do abismo.
            </p>
            <span className="font-['Cinzel',serif] text-[10px] uppercase tracking-widest text-[var(--muted)] mt-6">
              [ Toque para continuar ]
            </span>
          </m.div>
        )}
      </dialog>
    </AnimatePresence>
  );
};
