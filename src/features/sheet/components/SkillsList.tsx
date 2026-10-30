import { Award, ChevronRight } from 'lucide-react';
import React from 'react';
import { Link } from '@tanstack/react-router';
import { calcSkillBonus, calcSkillMastery } from '../../../entities/hero';

export interface SkillItem {
  name: string;
  pericia?: string;
  bonus?: number;
  nivel?: number;
  maestria?: number;
}

interface SkillsListProps {
  skills?: SkillItem[] | any;
}

function renderSkillDots(nivel: number): string {
  const maxDots = 3;
  const dotsCount = Math.min(maxDots, Math.max(1, nivel));
  let result = '';
  for (let i = 0; i < maxDots; i++) {
    result += i < dotsCount ? '●' : '○';
  }
  return result;
}

export const SkillsList: React.FC<SkillsListProps> = ({ skills }) => {
  const skillList: SkillItem[] = React.useMemo(() => {
    if (!skills) return [];
    if (Array.isArray(skills)) {
      return skills.map((s) => {
        if (typeof s === 'string') {
          return { name: s, bonus: 1, nivel: 1, maestria: 0 };
        }
        const name = s.name || s.pericia || 'Perícia';
        const nivel = s.nivel !== undefined ? Number(s.nivel) : (s.bonus === 2 ? 3 : 1);
        const bonus = s.bonus !== undefined ? Number(s.bonus) : calcSkillBonus(nivel);
        const maestria = s.maestria !== undefined ? Number(s.maestria) : calcSkillMastery(nivel);
        return { name, bonus, nivel, maestria };
      });
    }
    return [];
  }, [skills]);

  return (
    <section className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--line)] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-[var(--gold)]" />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--gold-bright)] font-cinzel m-0">
            Perícias Treinadas
          </h2>
        </div>

        <Link
          to="/jogador/arvore"
          className="text-[11px] font-semibold text-[var(--gold)] hover:underline flex items-center gap-1 font-cinzel"
        >
          <span>Árvore do Juramento</span>
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Skills list with dots and tabular-nums bonus */}
      {skillList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {skillList.map((skill, idx) => {
            const dots = renderSkillDots(skill.nivel ?? 1);
            const bonusStr = (skill.bonus ?? 1) >= 0 ? `+${skill.bonus ?? 1}` : `${skill.bonus}`;

            return (
              <Link
                key={idx}
                to="/jogador/dados"
                search={{ pericia: skill.name }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--solid)] border border-[var(--hair)] hover:border-[var(--gold-dim)] transition-all group shadow-sm text-decoration-none"
                title={`Toque para rolar ${skill.name} no Rolador de Dados`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[var(--text)] font-sans group-hover:text-[var(--gold-bright)] transition-colors truncate">
                    {skill.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-[var(--gold)] tracking-wider">
                      {dots}
                    </span>
                    {(skill.maestria ?? 0) > 0 && (
                      <span className="text-[10px] text-[var(--text-3)] font-sans">
                        · Mst {skill.maestria}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-sm font-bold font-sans tabular-nums text-emerald-400 group-hover:scale-105 transition-transform shrink-0 ml-2">
                  {bonusStr}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-[var(--text-3)] font-serif italic m-0">
          Nenhuma perícia especializada registrada.
        </p>
      )}
    </section>
  );
};
