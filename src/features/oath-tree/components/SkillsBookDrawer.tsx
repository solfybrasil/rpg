import React from 'react';
import { X, Sparkles, Award, Shield, BookOpen } from 'lucide-react';
import {
  ALL_13_SKILLS,
  calcSkillBonus,
  calcSkillMastery,
  calcSkillNextMilestone,
} from '../../../entities/oath-tree';

interface SkillsBookDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  heroSkills: any[];
  heroInspiration: number;
  onInvestSkill: (skillName: string) => void;
}

export const SkillsBookDrawer: React.FC<SkillsBookDrawerProps> = ({
  isOpen,
  onClose,
  heroSkills = [],
  heroInspiration,
  onInvestSkill,
}) => {
  if (!isOpen) return null;

  // Map hero's skills from view/database
  const skillsMap = new Map<string, any>();
  heroSkills.forEach((s) => {
    const key = (s.pericia || s.name || s.skill || '').toLowerCase().trim();
    if (key) skillsMap.set(key, s);
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-[var(--surface)] border-l border-[var(--border)] p-6 shadow-2xl flex flex-col gap-5 overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--border)] pb-3">
          <div>
            <span className="text-[10px] font-cinzel uppercase text-[var(--gold-dim)] tracking-widest block">
              Evolução Infinita
            </span>
            <h3 className="font-cinzel font-bold text-lg text-[var(--text-1)] mt-0.5">
              Livro das 13 Perícias
            </h3>
            <span className="text-xs text-[var(--text-3)] font-cinzel">
              Inspiração Disponível: <strong className="text-[var(--gold)]">{heroInspiration}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--card)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Skills List */}
        <div className="flex flex-col gap-3">
          {ALL_13_SKILLS.map((skill) => {
            const sKey = skill.name.toLowerCase().trim();
            const heroSkillData = skillsMap.get(sKey);
            const level = Number(heroSkillData?.nivel || heroSkillData?.level || 1);
            const bonus = calcSkillBonus(level);
            const mastery = calcSkillMastery(level);
            const marcas = Number(heroSkillData?.marcas || 0);
            const custoProximo = calcSkillNextMilestone(level);

            return (
              <div
                key={skill.name}
                className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--gold-dim)] transition-colors flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: skill.color }}
                    />
                    <h4 className="font-cinzel font-bold text-sm text-[var(--text-1)]">
                      {skill.name}
                    </h4>
                    <span className="text-[10px] text-[var(--text-3)] font-cinzel">
                      ({skill.region})
                    </span>
                  </div>

                  <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-[var(--surface)] text-[var(--gold)] border border-[var(--gold-dim)]">
                    +{bonus} ({level}º Nível)
                  </span>
                </div>

                {/* Mastery & Marks */}
                <div className="flex items-center justify-between text-xs text-[var(--text-3)] pt-1 border-t border-[var(--border)]/60">
                  <span>
                    Maestria: <strong className="text-[var(--text-2)]">{mastery}</strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono">
                      Progresso: {marcas}/{custoProximo}
                    </span>
                  </div>
                </div>

                {/* Invest Button */}
                <button
                  type="button"
                  onClick={() => onInvestSkill(skill.name)}
                  disabled={heroInspiration <= 0}
                  className="w-full py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--gold)] hover:text-black border border-[var(--gold-dim)] text-[var(--gold)] font-cinzel text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={12} />
                  <span>Evoluir Perícia (+1 Inspiração)</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
