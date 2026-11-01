import { CheckCircle2, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import type { CharacterRow } from '../../../shared/hooks/baseHooks';
import { GoldButton } from '../../../shared/ui/GoldButton';
import { Modal } from '../../../shared/ui/Modal';
import { Parchment } from '../../../shared/ui/Parchment';
import { StoneButton } from '../../../shared/ui/StoneButton';

interface LevelUpModalProps {
  hero: CharacterRow;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (choices: {
    boostAttr?: string;
    specSkill?: string;
    newSkill?: string;
  }) => Promise<void> | void;
  isLeveling?: boolean;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  hero,
  isOpen,
  onClose,
  onConfirm,
  isLeveling = false,
}) => {
  const currentLevel = hero.level ?? 1;
  const nextLvl = currentLevel + 1;

  const needsAttr = [4, 8, 10].includes(nextLvl);
  const needsSpec = nextLvl === 5;
  const needsNewSkill = nextLvl === 7;

  const [chosenAttr, setChosenAttr] = useState('corpo');
  const [chosenSpecSkill, setChosenSpecSkill] = useState('');
  const [newSkillInput, setNewSkillInput] = useState('');

  const skills = Array.isArray(hero.skills) ? hero.skills : [];

  const handleConfirm = async () => {
    await onConfirm({
      boostAttr: needsAttr ? chosenAttr : undefined,
      specSkill: needsSpec
        ? chosenSpecSkill ||
          (typeof skills[0] === 'string'
            ? skills[0]
            : (skills[0] as any)?.name || 'Atletismo')
        : undefined,
      newSkill: needsNewSkill ? newSkillInput || 'Sobrevivência' : undefined,
    });
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Consagração: Nível ${nextLvl}`}
      description="A glória dos juramentos expande os limites do seu ser e consagra sua carne."
    >
      <div className="flex flex-col gap-4">
        {/* Resumo descritivo de avanço em Pergaminho com desenrolar */}
        <Parchment unroll seed={88} className="space-y-2.5 p-3.5">
          <p className="text-xs text-[var(--ink-soft)] font-['EB_Garamond',serif] italic m-0 leading-relaxed">
            Ao sobreviver às provações de Aldrenor sem quebrar sua palavra, seu corpo absorve o peso
            do voto e desperta novas reservas de vigor e foco solene.
          </p>
          <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--ink-soft)]/20 text-xs text-[var(--ink)] font-['EB_Garamond',serif]">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--gold-lo)]" />
              <span>
                Vida Máxima: <strong>+4</strong> (recupera 4 de Vida imediatamente)
              </span>
            </div>
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--mana)]" />
              <span>Reserva de Foco renovada ao novo teto místico!</span>
            </div>
          </div>
        </Parchment>

        {/* Choice: Attribute (4, 8, 10) */}
        {needsAttr && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-['Cinzel',serif] font-bold text-[var(--gold-hi)] uppercase tracking-wider">
              Escolha 1 Atributo para aumentar (+1):
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['corpo', 'vontade', 'astucia', 'presenca'].map((attr) => (
                <button
                  key={attr}
                  type="button"
                  onClick={() => setChosenAttr(attr)}
                  className={`py-2 px-1 text-xs font-bold font-['Cinzel',serif] uppercase border transition-all cursor-pointer ${
                    chosenAttr === attr
                      ? 'slab on text-[var(--gold-hi)] border-[var(--gold)]'
                      : 'recess text-[var(--muted)] border-[var(--iron)] hover:border-[var(--gold-lo)]'
                  }`}
                >
                  {attr}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Choice: Specialization (Level 5) */}
        {needsSpec && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-['Cinzel',serif] font-bold text-[var(--gold-hi)] uppercase tracking-wider">
              Escolha 1 Perícia para Especialização (+2):
            </label>
            <select
              value={chosenSpecSkill}
              onChange={(e) => setChosenSpecSkill(e.target.value)}
              className="w-full recess border border-[var(--iron)] p-2.5 text-xs text-[var(--text)] font-['Cinzel',serif]"
            >
              {skills.map((s: any, idx: number) => {
                const name = typeof s === 'string' ? s : s.name || s.pericia || 'Perícia';
                return (
                  <option key={idx} value={name} className="bg-[var(--stone)] text-[var(--text)]">
                    {name}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Choice: New Skill (Level 7) */}
        {needsNewSkill && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-['Cinzel',serif] font-bold text-[var(--gold-hi)] uppercase tracking-wider">
              Nomeie uma Nova Perícia Aprendida (+1):
            </label>
            <input
              type="text"
              placeholder="Ex: Medicina, Rastreamento, Furtividade..."
              value={newSkillInput}
              onChange={(e) => setNewSkillInput(e.target.value)}
              className="w-full recess border border-[var(--iron)] p-2.5 text-xs text-[var(--text)] font-['EB_Garamond',serif]"
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--iron)]">
          <StoneButton title="Cancelar" onClick={onClose} className="w-auto px-4 py-2" />
          <GoldButton
            disabled={isLeveling}
            onClick={handleConfirm}
            className="w-auto px-5 py-2 text-xs font-bold font-['Cinzel',serif] uppercase"
          >
            <Sparkles className="h-4 w-4 inline mr-1" />
            <span>{isLeveling ? 'Consagrando...' : `Confirmar Nível ${nextLvl}`}</span>
          </GoldButton>
        </div>
      </div>
    </Modal>
  );
};
