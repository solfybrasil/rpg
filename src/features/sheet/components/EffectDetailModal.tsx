import { AlertTriangle, Clock, ShieldCheck, X } from 'lucide-react';
import React from 'react';

interface EffectDetailModalProps {
  effect: any;
  onClose: () => void;
}

export const EffectDetailModal: React.FC<EffectDetailModalProps> = ({ effect, onClose }) => {
  if (!effect) return null;

  const name = typeof effect === 'string' ? effect : effect.name || effect.efeito_id || 'Efeito';
  const desc = effect.descricao || effect.desc || 'Efeito ou condição ativa sobre o corpo ou a alma do herói.';
  const duration = effect.restante !== undefined ? `${effect.restante} ${effect.unidade || 'rodadas'}` : (effect.duracao || 'Ativo');
  const howToRemove = effect.como_sai || effect.cura || 'Descanso ou intervenção médica/mística do Confessor.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-[var(--solid-2)] border-2 border-amber-500/50 p-5 shadow-2xl flex flex-col gap-3.5">
        <div className="flex items-center justify-between border-b border-[var(--hair)] pb-2.5">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="text-base font-bold font-cinzel uppercase tracking-wider text-[var(--gold-bright)] m-0">
              {name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--text-2)]">
          <Clock className="h-3.5 w-3.5 text-[var(--gold)]" />
          <span>Duração: <strong className="text-[var(--text)]">{duration}</strong></span>
        </div>

        <div className="p-3 rounded-xl bg-[var(--solid)] border border-[var(--hair)] text-xs text-[var(--text-2)] leading-relaxed">
          {desc}
        </div>

        <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--hair)] text-xs text-[var(--text-3)]">
          <strong className="block text-[var(--gold-dim)] font-cinzel mb-0.5">COMO REMOVER:</strong>
          {howToRemove}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--surface-2)] text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
