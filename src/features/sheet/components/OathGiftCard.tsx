import { Compass, Sparkles, ScrollText, ShieldAlert } from 'lucide-react';
import React from 'react';

interface OathGiftCardProps {
  oath?: string | null;
  oathType?: string | null;
  oathPower?: string | null;
  oathItem?: string | null;
  gift?: string | null;
  level?: number | null;
}

const GIFT_STAGES = [
  { stage: 1, title: 'Despertar', reqLevel: 1, desc: 'Primeira centelha do voto impressa na carne.' },
  { stage: 2, title: 'Manifestação', reqLevel: 3, desc: 'Canalização instintiva sob perigo iminente.' },
  { stage: 3, title: 'Afinidade', reqLevel: 5, desc: 'Ressonância profunda e expansão mística.' },
  { stage: 4, title: 'Transcendente', reqLevel: 7, desc: 'Dom plenamente consagrado à promessa.' },
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
  const activeStage =
    currentLevel >= 7 ? 4 : currentLevel >= 5 ? 3 : currentLevel >= 3 ? 2 : 1;

  return (
    <article className="flex flex-col gap-4 p-5 rounded-2xl bg-gradient-to-b from-[var(--surface-card)] to-[var(--solid)] border-2 border-[var(--gold-dim)]/50 shadow-xl relative overflow-hidden">
      {/* Decorative top header */}
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-2 text-xs font-cinzel font-bold tracking-widest text-[var(--gold-bright)] uppercase">
          <ScrollText className="h-4 w-4 text-[var(--gold)]" />
          <span>A Palavra Empenhada</span>
        </div>
        {oathType && (
          <span className="text-[10px] text-[var(--gold-dim)] tracking-wider uppercase mt-0.5">
            Voto de {oathType}
          </span>
        )}

        {/* Ornamental diamond divider */}
        <div className="ornamental-divider my-2 w-full max-w-xs">
          <span className="diamond" />
        </div>

        {/* Large Newsreader italic oath statement */}
        <p className="font-serif italic text-lg sm:text-xl text-[var(--gold-bright)] max-w-xl text-center leading-relaxed">
          “{oath || 'Minha palavra é a pedra sobre a qual construo meu destino.'}”
        </p>

        <div className="ornamental-divider my-2 w-full max-w-xs">
          <span className="diamond" />
        </div>
      </div>

      {/* Poder do Voto & Relíquia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--hair)]">
          <span className="block font-cinzel font-bold text-[var(--gold-dim)] uppercase tracking-wider mb-1">
            Poder do Voto:
          </span>
          <p className="text-[var(--text-2)] font-sans m-0 leading-normal">
            {oathPower || 'Canaliza façanhas sobre-humanas enquanto o voto for mantido com retidão.'}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--hair)]">
          <span className="block font-cinzel font-bold text-[var(--gold-dim)] uppercase tracking-wider mb-1">
            Relíquia Sagrada:
          </span>
          <p className="text-[var(--gold-bright)] font-sans font-medium m-0 leading-normal">
            {oathItem || 'Fragmento sagrado gravado a fogo.'}
          </p>
        </div>
      </div>

      {/* Dom do Voto & 4-Stage Timeline */}
      <div className="pt-2 border-t border-[var(--hair)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-cinzel font-bold text-[var(--text)] uppercase tracking-wider">
              Dom do Voto: <span className="text-sky-300 font-normal">{gift || 'Dom em despertar'}</span>
            </span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
            Estágio {activeStage} de 4
          </span>
        </div>

        {/* 4-point timeline */}
        <div className="relative pt-2 pb-1">
          {/* Connector bar */}
          <div className="absolute top-5 left-4 right-4 h-0.5 bg-[var(--hair)] -z-0" />
          <div
            className="absolute top-5 left-4 h-0.5 bg-sky-400 transition-all duration-500 -z-0"
            style={{ width: `${((activeStage - 1) / 3) * 100}%` }}
          />

          <div className="grid grid-cols-4 gap-1 relative z-10">
            {GIFT_STAGES.map((st) => {
              const isUnlocked = activeStage >= st.stage;
              const isCurrent = activeStage === st.stage;

              return (
                <div key={st.stage} className="flex flex-col items-center text-center">
                  {/* Point dot */}
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                      isCurrent
                        ? 'bg-sky-500 border-sky-300 text-stone-950 shadow-md shadow-sky-500/50 scale-110'
                        : isUnlocked
                        ? 'bg-[var(--solid)] border-sky-400 text-sky-300'
                        : 'bg-[var(--solid)] border-[var(--hair)] text-[var(--text-3)]'
                    }`}
                  >
                    {st.stage}
                  </div>

                  <span
                    className={`text-[10px] sm:text-xs font-cinzel font-semibold mt-1.5 ${
                      isCurrent ? 'text-sky-200' : isUnlocked ? 'text-[var(--text)]' : 'text-[var(--text-3)]'
                    }`}
                  >
                    {st.title}
                  </span>
                  <span className="text-[9px] text-[var(--text-3)] hidden sm:block mt-0.5 max-w-[100px]">
                    {st.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
};
