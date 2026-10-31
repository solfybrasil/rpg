import React from 'react';
import type { Missive } from '../types';

export interface MissiveAlertModalProps {
  missive: Missive | null;
  onDismiss: () => void;
}

export const MissiveAlertModal: React.FC<MissiveAlertModalProps> = ({
  missive,
  onDismiss,
}) => {
  if (!missive) return null;

  return (
    <div
      data-testid="missive-alert-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onDismiss}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-[#241712] via-[#1a110d] to-[#120b08] border-2 border-[#8f191d] p-6 md:p-8 text-center shadow-2xl shadow-black/80 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Selo de Cera no Topo */}
        <div className="flex justify-center -mt-12 md:-mt-14 mb-2">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-[#c8423a] via-[#8f191d] to-[#5e1013] border-2 border-[#f5b65b] flex items-center justify-center shadow-xl shadow-[#8f191d]/50 text-2xl md:text-3xl text-[#f5e8c8]">
            ⚜
          </div>
        </div>

        {/* Cabeçalho */}
        <div className="border-b border-[#8f191d]/30 pb-4">
          <h2 className="font-serif text-lg md:text-xl font-bold text-[#f5b65b] tracking-wider uppercase">
            Missiva do Confessor da Mesa
          </h2>
          <div className="text-xs font-serif text-[#a8947c] italic mt-1">
            {missive.priority || 'SAGRADA'} ·{' '}
            {new Date(missive.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        {/* Texto em Newsreader Itálico */}
        <div className="py-2 px-4 max-h-[40vh] overflow-y-auto">
          <p className="font-serif italic text-base md:text-xl leading-relaxed text-[#f5e8c8] tracking-wide">
            "{missive.text}"
          </p>
        </div>

        {/* Botão de Reconhecimento */}
        <div className="pt-2">
          <button
            type="button"
            data-testid="dismiss-missive-alert"
            onClick={onDismiss}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-b from-[#8f191d] to-[#5e1013] text-[#f5e8c8] font-serif text-sm font-semibold tracking-wider border border-[#f5b65b]/50 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#8f191d]/40"
          >
            ⚜ RECONHECER A PALAVRA DO CONFESSOR
          </button>
        </div>
      </div>
    </div>
  );
};
