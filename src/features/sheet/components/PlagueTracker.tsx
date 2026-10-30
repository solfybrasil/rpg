import { Droplets } from 'lucide-react';
import React from 'react';
import { getPlagueStage } from '../../../entities/hero';

interface PlagueTrackerProps {
  plague: number;
}

const PLAGUE_BANDS = [
  { id: 'limpo', label: 'Limpo', range: '0', color: '#38bdf8', bg: 'bg-sky-500/20', border: 'border-sky-400' },
  { id: 'mancha', label: 'Mancha', range: '1–3', color: '#60a5fa', bg: 'bg-blue-500/20', border: 'border-blue-400' },
  { id: 'corrupcao', label: 'Corrupção', range: '4–7', color: '#c084fc', bg: 'bg-purple-500/20', border: 'border-purple-400' },
  { id: 'transformacao', label: 'Transformação', range: '8–10', color: '#f87171', bg: 'bg-rose-500/20', border: 'border-rose-400' },
];

export const PlagueTracker: React.FC<PlagueTrackerProps> = ({ plague }) => {
  const currentPlague = Math.max(0, Math.min(10, plague ?? 0));
  const stage = getPlagueStage(currentPlague);

  return (
    <section className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--line)] shadow-sm relative overflow-hidden">
      {/* Header with Stage Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 shrink-0" style={{ color: stage.cor }} />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text)] font-cinzel">
            Peste do Juramento
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
            style={{
              color: stage.cor,
              backgroundColor: `${stage.cor}22`,
              borderColor: `${stage.cor}66`,
            }}
          >
            Estágio: {stage.nome}
          </span>
          <span className="text-sm font-bold tabular-nums" style={{ color: stage.cor }}>
            {currentPlague}
            <small className="text-[var(--text-3)] text-xs font-normal"> / 10</small>
          </span>
        </div>
      </div>

      {/* 4 Colored Stage Bands Bar */}
      <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[var(--solid)] border border-[var(--hair)]">
        {PLAGUE_BANDS.map((band) => {
          const isActiveBand =
            (band.id === 'limpo' && currentPlague === 0) ||
            (band.id === 'mancha' && currentPlague >= 1 && currentPlague <= 3) ||
            (band.id === 'corrupcao' && currentPlague >= 4 && currentPlague <= 7) ||
            (band.id === 'transformacao' && currentPlague >= 8);

          return (
            <div
              key={band.id}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all border ${
                isActiveBand
                  ? `${band.bg} ${band.border} shadow-sm`
                  : 'border-transparent opacity-40 hover:opacity-60'
              }`}
            >
              <span
                className="text-[10px] sm:text-xs font-bold font-cinzel uppercase tracking-wider"
                style={{ color: band.color }}
              >
                {band.label}
              </span>
              <span className="text-[9px] text-[var(--text-3)] tabular-nums">{band.range}</span>
            </div>
          );
        })}
      </div>

      {/* 10 Segment Pips with Current Marker */}
      <div className="relative pt-2 pb-1">
        <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pip) => {
            const isFilled = pip <= currentPlague;
            const pipStage = getPlagueStage(pip);

            return (
              <div
                key={pip}
                className="h-2.5 sm:h-3 rounded-sm transition-all border"
                style={{
                  backgroundColor: isFilled ? pipStage.cor : 'var(--solid)',
                  borderColor: isFilled ? pipStage.cor : 'var(--hair)',
                  opacity: isFilled ? 1 : 0.25,
                  boxShadow: isFilled ? `0 0 6px ${pipStage.cor}66` : 'none',
                }}
                title={`Peste marca ${pip}/10 (${pipStage.nome})`}
              />
            );
          })}
        </div>
      </div>

      {/* Stage Description Footer */}
      <p className="text-xs text-[var(--text-2)] font-serif italic m-0">
        “{stage.descricao}”
      </p>
    </section>
  );
};
