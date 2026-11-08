import { Droplets } from 'lucide-react';
import React from 'react';
import { getPlagueStage } from '../../../entities/hero';
import { StonePanel } from '../../../shared/ui/StonePanel';

interface PlagueTrackerProps {
  plague: number;
}

const PLAGUE_BANDS = [
  { id: 'limpo', label: 'Limpo', range: '0', color: 'var(--mist)' },
  { id: 'mancha', label: 'Mancha', range: '1–3', color: 'var(--plague)' },
  { id: 'corrupcao', label: 'Corrupção', range: '4–7', color: 'var(--violet)' },
  { id: 'transformacao', label: 'Transformação', range: '8–10', color: 'var(--blood)' },
];

export const PlagueTracker: React.FC<PlagueTrackerProps> = ({ plague }) => {
  const currentPlague = Math.max(0, Math.min(10, plague ?? 0));
  const stage = getPlagueStage(currentPlague);

  return (
    <StonePanel className="flex flex-col gap-3 p-4">
      {/* Header with Stage Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 shrink-0 text-[var(--plague)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text)] font-['Cinzel',serif]">
            Peste do Juramento
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-[var(--plague)] text-[var(--plague)] font-['Cinzel',serif]">
            Estágio: {stage.nome}
          </span>
          <span className="text-sm font-bold tabular-nums font-['Cinzel',serif] text-[var(--gold-hi)]">
            {currentPlague}
            <small className="text-[var(--muted)] text-xs font-normal"> / 10</small>
          </span>
        </div>
      </div>

      {/* 4 Colored Stage Bands Bar */}
      <div className="grid grid-cols-4 gap-1.5 p-1 recess">
        {PLAGUE_BANDS.map((band) => {
          const isActiveBand =
            (band.id === 'limpo' && currentPlague === 0) ||
            (band.id === 'mancha' && currentPlague >= 1 && currentPlague <= 3) ||
            (band.id === 'corrupcao' && currentPlague >= 4 && currentPlague <= 7) ||
            (band.id === 'transformacao' && currentPlague >= 8);

          return (
            <div
              key={band.id}
              className={`p-2 text-center transition-all border ${
                isActiveBand
                  ? 'border-[var(--gold)] bg-[var(--gold-lo)]/20 shadow-[0_0_8px_rgba(201,164,92,0.3)]'
                  : 'border-[var(--iron)]/40 bg-black/30 opacity-60'
              }`}
            >
              <div className="font-['Cinzel',serif] text-[10px] uppercase font-bold text-[var(--text)]">
                {band.label}
              </div>
              <div className="text-[9px] font-mono text-[var(--muted)]">{band.range}</div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] font-['EB_Garamond',serif] italic text-[var(--muted)]">
        {stage.efeito || 'A corrupção dorme sob a pele enquanto a promessa for mantida.'}
      </p>
    </StonePanel>
  );
};
