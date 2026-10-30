import { CheckCircle2, Sparkles, X } from 'lucide-react';
import React, { useState } from 'react';
import type { CharacterRow } from '../../../shared/hooks/baseHooks';

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
      specSkill: needsSpec ? chosenSpecSkill || (typeof skills[0] === 'string' ? skills[0] : (skills[0] as any)?.name || 'Atletismo') : undefined,
      newSkill: needsNewSkill ? newSkillInput || 'Sobrevivência' : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--solid-2)] border-2 border-[var(--gold)] p-6 shadow-2xl shadow-amber-500/20 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--hair)] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-bold font-cinzel text-[var(--gold-bright)] uppercase tracking-wider m-0">
              Consagração: Nível {nextLvl}
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

        <p className="text-xs text-[var(--text-2)] font-serif italic m-0">
          A glória dos juramentos expande os limites do seu ser e consagra sua carne.
        </p>

        {/* Universal benefits */}
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--surface)] border border-[var(--hair)] text-xs text-[var(--text)]">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Vida Máxima: <strong>+4</strong> (recupera 4 de Vida imediatamente)</span>
          </div>
          <div className="flex items-center gap-2 text-cyan-400 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Reserva de Foco renovada ao novo teto místico!</span>
          </div>
        </div>

        {/* Choice: Attribute (4, 8, 10) */}
        {needsAttr && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-cinzel font-bold text-[var(--gold-bright)] uppercase tracking-wider">
              Escolha 1 Atributo para aumentar (+1):
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['corpo', 'vontade', 'astucia', 'presenca'].map((attr) => (
                <button
                  key={attr}
                  type="button"
                  onClick={() => setChosenAttr(attr)}
                  className={`py-2 px-1 text-xs font-bold font-cinzel uppercase rounded-lg border transition-all ${
                    chosenAttr === attr
                      ? 'bg-[var(--gold)] text-[var(--accent-ink)] border-[var(--gold-bright)] shadow-md'
                      : 'bg-[var(--solid)] text-[var(--text-2)] border-[var(--hair)] hover:border-[var(--line)]'
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
            <label className="text-xs font-cinzel font-bold text-[var(--gold-bright)] uppercase tracking-wider">
              Escolha 1 Perícia para Especialização (+2):
            </label>
            <select
              value={chosenSpecSkill}
              onChange={(e) => setChosenSpecSkill(e.target.value)}
              className="w-full rounded-xl bg-[var(--solid)] border border-[var(--line)] p-2.5 text-xs text-[var(--text)] font-sans"
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
            <label className="text-xs font-cinzel font-bold text-[var(--gold-bright)] uppercase tracking-wider">
              Nomeie uma Nova Perícia Aprendida (+1):
            </label>
            <input
              type="text"
              placeholder="Ex: Medicina, Rastreamento, Furtividade..."
              value={newSkillInput}
              onChange={(e) => setNewSkillInput(e.target.value)}
              className="w-full rounded-xl bg-[var(--solid)] border border-[var(--line)] p-2.5 text-xs text-[var(--text)] font-sans"
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--hair)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--surface-2)] text-[var(--text-2)] hover:bg-[var(--surface-3)] font-semibold text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isLeveling}
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold font-cinzel text-xs tracking-wider shadow-lg shadow-amber-500/30 hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isLeveling ? 'Consagrando...' : `Confirmar Nível ${nextLvl}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
