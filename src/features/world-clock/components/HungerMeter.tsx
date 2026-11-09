import { Utensils } from 'lucide-react';
import { estadoFome } from '../../../shared/lib/fome';

/** 10 losangos de saciedade na cor do estado (Saciado → Faminto). */
export function HungerPips({ value, size = 8 }: { value: number; size?: number }) {
  const est = estadoFome(value);
  const v = Math.max(0, Math.min(10, Math.round(value)));
  return (
    <span className="inline-flex items-center gap-[3px]" aria-label={`Saciedade ${v} de 10`} role="img">
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className="rotate-45 transition-colors duration-[var(--t-base)]"
          style={{
            width: size,
            height: size,
            background: i < v ? est.cor : 'transparent',
            border: `1px solid ${i < v ? est.cor : 'var(--iron)'}`,
          }}
        />
      ))}
    </span>
  );
}

/** Bloco completo: ícone, estado, pontos e efeito em jogo. */
export function HungerMeter({
  value,
  vidaPerdida = 0,
  compact = false,
}: {
  value: number;
  vidaPerdida?: number;
  compact?: boolean;
}) {
  const est = estadoFome(value);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Utensils className="w-3.5 h-3.5 shrink-0" style={{ color: est.cor }} />
        <span className="font-['Cinzel',serif] text-[11px] uppercase tracking-[0.14em]" style={{ color: est.cor }}>
          {est.nome}
        </span>
        <span className="ml-auto font-['Cinzel',serif] text-sm tabular-nums text-[var(--text)]">
          {Math.round(value)}
          <span className="text-[var(--muted)]">/10</span>
        </span>
      </div>
      <HungerPips value={value} size={compact ? 7 : 9} />
      {!compact && (
        <p className="text-xs italic text-[var(--muted)]">
          {est.efeito}
          {vidaPerdida > 0 && <span className="not-italic text-[#e0645a]"> · −{vidaPerdida} Vida máx. pela fome</span>}
        </p>
      )}
    </div>
  );
}
