import { Droplets } from 'lucide-react';
import { m } from 'motion/react';
import React from 'react';
import { getPlagueStage } from '../../../entities/hero';
import { motionTokens } from '../../../shared/styles/motion';
import { CountUp } from '../../../shared/ui/CountUp';
import { Parchment } from '../../../shared/ui/Parchment';
import { StonePanel } from '../../../shared/ui/StonePanel';

interface PlagueTrackerProps {
  plague: number;
}

const PLAGUE_BANDS = [
  { id: 'limpo', label: 'Limpo', range: '0' },
  { id: 'mancha', label: 'Mancha', range: '1–3' },
  { id: 'corrupcao', label: 'Corrupção', range: '4–7' },
  { id: 'transformacao', label: 'Transformação', range: '8–10' },
];

export const PlagueTracker: React.FC<PlagueTrackerProps> = ({ plague }) => {
  const currentPlague = Math.max(0, Math.min(10, plague ?? 0));
  const stage = getPlagueStage(currentPlague);
  const isAdvanced = currentPlague >= 4;
  const isCritical = currentPlague >= 8;

  const stageNote = isCritical
    ? `${stage.descricao} A marca rompeu os véus mortais: cada batimento cobra seu tributo em sangue e aproxima sua alma da perdição eterna.`
    : isAdvanced
      ? `${stage.descricao} Sussurros febris ecoam nas veias e exigem penitência antes que a promessa apodreça por completo.`
      : `${stage.descricao} Enquanto a palavra jurada for mantida com honra, a mácula dorme silenciosa sob a pele.`;

  return (
    <m.div
      key={`plague-stage-${stage.id}-${currentPlague}`}
      initial={
        currentPlague > 0
          ? {
              scale: 0.99,
              x: isCritical ? -4 : isAdvanced ? -2 : 0,
            }
          : false
      }
      animate={{ scale: 1, x: 0 }}
      transition={{ duration: motionTokens.tBase, ease: motionTokens.easeOut }}
    >
      <StonePanel
        className={`flex flex-col gap-3 p-4 ${
          isCritical
            ? 'border-[var(--blood)]'
            : isAdvanced
              ? 'border-[var(--plague)]'
              : ''
        }`}
      >
        {/* Header with Stage Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Droplets
              className={`h-4 w-4 shrink-0 ${
                isCritical ? 'text-[var(--blood)] animate-pulse' : 'text-[var(--plague)]'
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text)] font-['Cinzel',serif]">
              Peste do Juramento
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border font-['Cinzel',serif] ${
                isCritical
                  ? 'border-[var(--blood)] text-[var(--blood)] bg-[var(--blood)]/15'
                  : 'border-[var(--plague)] text-[var(--plague)] bg-[var(--plague)]/10'
              }`}
            >
              Estágio: {stage.nome}
            </span>
            <span className="text-sm font-bold tabular-nums font-['Cinzel',serif] text-[var(--gold-hi)]">
              <CountUp value={currentPlague} />
              <small className="text-[var(--muted)] text-xs font-normal"> / 10</small>
            </span>
          </div>
        </div>

        {/* 4 Stage Bands Bar */}
        <div className="grid grid-cols-4 gap-1.5 p-1 recess">
          {PLAGUE_BANDS.map((band) => {
            const isActiveBand =
              (band.id === 'limpo' && currentPlague === 0) ||
              (band.id === 'mancha' && currentPlague >= 1 && currentPlague <= 3) ||
              (band.id === 'corrupcao' && currentPlague >= 4 && currentPlague <= 7) ||
              (band.id === 'transformacao' && currentPlague >= 8);

            const activeStyle =
              band.id === 'transformacao'
                ? 'border-[var(--blood)] bg-[var(--blood)]/25 text-[var(--gold-hi)]'
                : band.id === 'corrupcao' || band.id === 'mancha'
                  ? 'border-[var(--plague)] bg-[var(--plague)]/20 text-[var(--gold-hi)]'
                  : 'border-[var(--gold)] bg-[var(--gold-lo)]/20 text-[var(--gold-hi)]';

            return (
              <div
                key={band.id}
                className={`p-2 text-center transition-all border ${
                  isActiveBand
                    ? activeStyle
                    : 'border-[var(--iron)]/40 bg-black/30 opacity-60'
                }`}
              >
                <div className="font-['Cinzel',serif] text-[10px] uppercase font-bold text-[var(--text)]">
                  {band.label}
                </div>
                <div className="text-[9px] font-['Cinzel',serif] tabular-nums text-[var(--muted)]">
                  {band.range}
                </div>
              </div>
            );
          })}
        </div>

        {/* Texto descritivo longo (>1 frase) em Pergaminho */}
        <Parchment seed={64} className="p-3">
          <p
            className={`text-xs font-['EB_Garamond',serif] italic m-0 leading-relaxed ${
              isCritical ? 'text-[var(--blood)] font-semibold' : 'text-[var(--ink)]'
            }`}
          >
            {stageNote}
          </p>
        </Parchment>
      </StonePanel>
    </m.div>
  );
};
