import { CheckCircle2, Sparkles, X } from 'lucide-react';
import React, { useState } from 'react';
import type { CharacterRow } from '../../../shared/hooks/baseHooks';
import { GoldButton } from '../../../shared/ui/GoldButton';
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
  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg slab border-2 border-[var(--gold)] p-6 shadow-2xl flex flex-col gap-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--iron)]/60 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--gold)]" />
            <h3 className="text-lg font-bold font-['Cinzel',serif] text-[var(--gold-hi)] uppercase tracking-wider m-0">
              Consagração: Nível {nextLvl}
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

        <p className="text-xs text-[var(--muted)] font-serif italic m-0">
          A glória dos juramentos expande os limites do seu ser e consagra sua carne.
        </p>

        {/* Universal benefits */}
        <div className="flex flex-col gap-2 p-3 recess border border-black text-xs text-[var(--text)]">
          <div className="flex items-center gap-2 text-[var(--gold-hi)] font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--gold)]" />
            <span>
              Vida Máxima: <strong>+4</strong> (recupera 4 de Vida imediatamente)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[var(--mist)] font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--mist)]" />
            <span>Reserva de Foco renovada ao novo teto místico!</span>
          </div>
        </div>

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
                      ? 'bg-[var(--gold)] text-black border-[var(--gold-hi)] font-bold shadow-md'
                      : 'recess text-[var(--muted)] border-black hover:border-[var(--gold-lo)]'
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
              className="w-full recess border border-black p-2.5 text-xs text-[var(--text)] font-sans"
            >
              {skills.map((s: any, idx: number) => {
                const name = typeof s === 'string' ? s : s.name || s.pericia || 'Perícia';
                return (
                  <option key={idx} value={name}>
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
              className="w-full recess border border-black p-2.5 text-xs text-[var(--text)] font-sans"
            >
            </input>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--iron)]/60">
          <StoneButton variant="ghost" onClick={onClose} size="sm">
            Cancelar
          </StoneButton>
          <GoldButton disabled={isLeveling} onClick={handleConfirm} size="md">
            <Sparkles className="h-4 w-4 inline mr-1" />
            <span>{isLeveling ? 'Consagrando...' : `Confirmar Nível ${nextLvl}`}</span>
          </GoldButton>
        </div>
      </div>
    </div>
  );
};
