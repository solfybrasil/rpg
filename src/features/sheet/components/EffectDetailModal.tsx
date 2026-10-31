import { AlertTriangle, Clock, X } from 'lucide-react';
import React from 'react';
import { StoneButton } from '../../../shared/ui/StoneButton';

interface EffectDetailModalProps {
  effect: any;
  onClose: () => void;
}

export const EffectDetailModal: React.FC<EffectDetailModalProps> = ({ effect, onClose }) => {
  if (!effect) return null;

  const name = typeof effect === 'string' ? effect : effect.name || effect.efeito_id || 'Efeito';
  const desc =
    effect.descricao ||
    effect.desc ||
    'Efeito ou condição ativa sobre o corpo ou a alma do herói.';
  const duration =
    effect.restante !== undefined
      ? `${effect.restante} ${effect.unidade || 'rodadas'}`
      : effect.duracao || 'Ativo';
  const howToRemove =
    effect.como_sai || effect.cura || 'Descanso ou intervenção médica/mística do Confessor.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md slab border border-[var(--iron)] p-5 shadow-2xl flex flex-col gap-3.5 relative">
        <div className="flex items-center justify-between border-b border-[var(--iron)]/60 pb-2.5">
          <div className="flex items-center gap-2 text-[var(--gold)]">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="text-base font-bold font-['Cinzel',serif] uppercase tracking-wider text-[var(--gold-hi)] m-0">
              {name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <Clock className="h-3.5 w-3.5 text-[var(--gold)]" />
          <span>
            Duração: <strong className="text-[var(--gold-hi)]">{duration}</strong>
          </span>
        </div>

        <div className="p-3 recess border border-black text-xs text-[var(--text)] leading-relaxed">
          {desc}
        </div>

        <div className="p-3 recess border border-black text-xs text-[var(--muted)]">
          <strong className="block text-[var(--gold-hi)] font-['Cinzel',serif] mb-0.5">
            COMO REMOVER:
          </strong>
          {howToRemove}
        </div>

        <div className="flex justify-end pt-2">
          <StoneButton variant="subtle" size="sm" onClick={onClose}>
            Fechar
          </StoneButton>
        </div>
      </div>
    </div>
  );
};
