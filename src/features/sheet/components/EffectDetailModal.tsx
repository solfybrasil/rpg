import { Clock } from 'lucide-react';
import React from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Parchment } from '../../../shared/ui/Parchment';
import { StoneButton } from '../../../shared/ui/StoneButton';

interface EffectDetailModalProps {
  effect: any;
  onClose: () => void;
}

export const EffectDetailModal: React.FC<EffectDetailModalProps> = ({ effect, onClose }) => {
  const isOpen = Boolean(effect);
  const name = !effect
    ? 'Efeito'
    : typeof effect === 'string'
      ? effect
      : effect.name || effect.efeito_id || 'Efeito';
  const desc =
    effect?.descricao ||
    effect?.desc ||
    'Efeito ou condição ativa sobre o corpo ou a alma do herói.';
  const duration =
    effect?.restante !== undefined
      ? `${effect.restante} ${effect.unidade || 'rodadas'}`
      : effect?.duracao || 'Ativo';
  const howToRemove =
    effect?.como_sai || effect?.cura || 'Descanso ou intervenção médica/mística do Confessor.';

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={name}
      description="Registro solene de condição ativa sobre o Jurado."
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)] font-['Cinzel',serif]">
          <Clock className="h-3.5 w-3.5 text-[var(--gold)]" />
          <span>
            Duração: <strong className="text-[var(--gold-hi)]">{duration}</strong>
          </span>
        </div>

        <Parchment unroll seed={63} className="space-y-3 p-3.5">
          <p className="text-xs text-[var(--ink)] font-['EB_Garamond',serif] leading-relaxed m-0">
            {desc}
          </p>

          <div className="pt-2 border-t border-[var(--ink-soft)]/20 text-xs text-[var(--ink-soft)] font-['EB_Garamond',serif]">
            <strong className="block text-[var(--ink)] font-['Cinzel',serif] text-[10px] tracking-wider uppercase mb-0.5">
              Como Remover:
            </strong>
            {howToRemove}
          </div>
        </Parchment>

        <div className="flex justify-end pt-2 border-t border-[var(--iron)]">
          <StoneButton title="Fechar" onClick={onClose} className="w-auto px-4 py-2" />
        </div>
      </div>
    </Modal>
  );
};
