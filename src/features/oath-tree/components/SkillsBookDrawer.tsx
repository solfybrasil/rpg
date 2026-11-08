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
      className="modern-modal-overlay animate-in fade-in duration-200"
      style={{ justifyContent: 'flex-end', padding: 0 }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          height: '100%',
          background: '#14120e',
          borderLeft: '1px solid rgba(201, 169, 97, 0.22)',
          padding: '1.25rem',
          boxShadow: '0 0 30px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          overflowY: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(201, 169, 97, 0.16)' }}>
          <div>
            <span style={{ fontSize: '0.62rem', color: '#c9a961', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, display: 'block' }}>
              Evolução Infinita
            </span>
            <h3 style={{ fontFamily: 'var(--font-title, "Cinzel", serif)', fontSize: '1.15rem', color: '#f5ede0', margin: '0.2rem 0 0', fontWeight: 600 }}>
              Livro das 13 Perícias
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#9a917f' }}>
              Inspiração Disponível: <strong style={{ color: '#c9a961' }}>{heroInspiration}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modern-modal-close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Skills List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
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
                style={{
                  background: '#0d0c0a',
                  border: '1px solid rgba(201, 169, 97, 0.16)',
                  borderRadius: '6px',
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        backgroundColor: skill.color,
                        boxShadow: `0 0 6px ${skill.color}`,
                      }}
                    />
                    <h4 style={{ fontFamily: 'var(--font-title, "Cinzel", serif)', fontSize: '0.88rem', color: '#f5ede0', margin: 0, fontWeight: 600 }}>
                      {skill.name}
                    </h4>
                    <span style={{ fontSize: '0.68rem', color: '#8c8272' }}>
                      ({skill.region})
                    </span>
                  </div>

                  <span style={{ background: '#14120e', border: '1px solid rgba(201, 169, 97, 0.25)', borderRadius: '4px', padding: '0.1rem 0.4rem', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.72rem', color: '#e6cf94', fontWeight: 700 }}>
                    +{bonus} ({level}º Nível)
                  </span>
                </div>

                {/* Mastery & Marks */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#9a917f' }}>
                  <span>Grau: <strong style={{ color: '#b5aa96' }}>{mastery}</strong></span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {Array.from({ length: custoProximo }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: i < marcas ? '#c9a961' : 'transparent',
                          border: '1.5px solid rgba(201, 169, 97, 0.35)',
                          boxShadow: i < marcas ? '0 0 5px rgba(201, 169, 97, 0.5)' : 'none',
                        }}
                      />
                    ))}
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', marginLeft: 3 }}>
                      {marcas}/{custoProximo}
                    </span>
                  </div>
                </div>

                {/* Invest Action */}
                <button
                  type="button"
                  disabled={heroInspiration <= 0}
                  onClick={() => onInvestSkill(skill.name)}
                  className="modern-btn primary"
                  style={{
                    height: '28px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    width: '100%',
                    opacity: heroInspiration > 0 ? 1 : 0.4,
                    cursor: heroInspiration > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Sparkles size={11} />
                  <span>Investir 1 Inspiração</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
