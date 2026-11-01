import { Compass, ScrollText, Sparkles } from 'lucide-react';
import React from 'react';
import { Divider } from '../../../shared/ui/Divider';
import { Parchment } from '../../../shared/ui/Parchment';

interface OathGiftCardProps {
  oath?: string | null;
  oathType?: string | null;
  oathPower?: string | null;
  oathItem?: string | null;
  gift?: string | null;
  level?: number | null;
}

const GIFT_STAGES = [
  {
    stage: 1,
    title: 'Despertar',
    reqLevel: 1,
    desc: 'Primeira centelha do voto impressa na carne.',
  },
  {
    stage: 2,
    title: 'Manifestação',
    reqLevel: 3,
    desc: 'Canalização instintiva sob perigo iminente.',
  },
  {
    stage: 3,
    title: 'Afinidade',
    reqLevel: 5,
    desc: 'Ressonância profunda e expansão mística.',
  },
  {
    stage: 4,
    title: 'Transcendente',
    reqLevel: 7,
    desc: 'Dom plenamente consagrado à promessa.',
  },
];

export const OathGiftCard: React.FC<OathGiftCardProps> = ({
  oath,
  oathType,
  oathPower,
  oathItem,
  gift,
  level = 1,
}) => {
  const currentLevel = level ?? 1;

  // Calcula estágio ativo do dom baseado no nível
  const activeStage = currentLevel >= 7 ? 4 : currentLevel >= 5 ? 3 : currentLevel >= 3 ? 2 : 1;

  return (
    <Parchment seed={77} className="flex flex-col gap-4 p-5 space-y-2">
      {/* Decorative top header */}
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-2 text-xs font-['Cinzel',serif] font-bold tracking-widest text-[var(--ink)] uppercase">
          <ScrollText className="h-4 w-4 text-[var(--gold-lo)]" />
          <span>A Palavra Empenhada</span>
        </div>
        {oathType && (
          <span className="text-[10px] text-[var(--ink-soft)] tracking-wider uppercase font-['Cinzel',serif] mt-0.5 font-bold">
            Voto de {oathType}
          </span>
        )}

        <Divider className="my-2 max-w-xs text-[var(--gold-lo)]" />

        {/* Large Garamond italic oath statement */}
        <p className="font-['EB_Garamond',serif] italic text-lg sm:text-xl text-[var(--ink)] max-w-xl text-center leading-relaxed">
          “{oath || 'Minha palavra é a pedra sobre a qual construo meu destino.'}”
        </p>

        <Divider className="my-2 max-w-xs text-[var(--gold-lo)]" />
      </div>

      {/* Gift and Power Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
        <div className="p-3 border border-[var(--ink-soft)]/20 bg-black/5">
          <div className="flex items-center gap-1.5 text-xs font-['Cinzel',serif] font-bold text-[var(--ink)] uppercase mb-1">
            <Sparkles className="h-3.5 w-3.5 text-[var(--gold-lo)]" />
            <span>Dom do Voto: {gift || 'Despertar da Vontade'}</span>
          </div>
          <p className="text-xs text-[var(--ink-soft)] font-['EB_Garamond',serif] italic leading-relaxed">
            {oathPower ||
              'A energia canalizada através da promessa ressoa em cada ação sob perigo.'}
          </p>
        </div>

        <div className="p-3 border border-[var(--ink-soft)]/20 bg-black/5">
          <div className="flex items-center gap-1.5 text-xs font-['Cinzel',serif] font-bold text-[var(--ink)] uppercase mb-1">
            <Compass className="h-3.5 w-3.5 text-[var(--gold-lo)]" />
            <span>Foco Material do Voto</span>
          </div>
          <p className="text-xs text-[var(--ink-soft)] font-['EB_Garamond',serif] italic leading-relaxed">
            {oathItem || 'Um amuleto rúnico talhado em pedra de cinzas, portado no peito.'}
          </p>
        </div>
      </div>

      {/* 4 Stages Progression */}
      <div className="border-t border-[var(--ink-soft)]/20 pt-3">
        <span className="text-[10px] font-['Cinzel',serif] uppercase tracking-wider text-[var(--ink-soft)] font-bold block mb-2">
          Estágios de Despertar do Dom:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {GIFT_STAGES.map((st) => {
            const isUnlocked = st.stage <= activeStage;
            return (
              <div
                key={st.stage}
                className={`p-2 border transition-all ${
                  isUnlocked
                    ? 'border-[var(--gold-lo)] bg-[var(--gold-lo)]/15 text-[var(--ink)] font-bold'
                    : 'border-[var(--ink-soft)]/20 bg-transparent text-[var(--ink-soft)] opacity-60'
                }`}
              >
                <div className="font-['Cinzel',serif] text-[10px] uppercase">
                  {st.stage}. {st.title}
                </div>
                <div className="text-[9px] font-['EB_Garamond',serif] italic mt-0.5">
                  Nível {st.reqLevel}+ — {st.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Parchment>
  );
};
