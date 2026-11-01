import { Coins, Package } from 'lucide-react';
import { m } from 'motion/react';
import React from 'react';
import type { CoinsBreakdown } from '../../../entities/item';
import { spring } from '../../../shared/styles/motion';
import { CountUp } from '../../../shared/ui/CountUp';

export interface InventoryFooterProps {
  coins: CoinsBreakdown;
  occupiedCount: number;
  totalWeight: number;
  maxLoad?: number;
}

export const InventoryFooter: React.FC<InventoryFooterProps> = ({
  coins,
  occupiedCount,
  totalWeight,
  maxLoad = 20,
}) => {
  const currentLoad = totalWeight;
  const loadPct = Math.max(0, Math.min(1, maxLoad > 0 ? currentLoad / maxLoad : 0));
  const isOverloaded = currentLoad >= maxLoad;

  return (
    <footer className="w-full slab border-t border-[var(--iron)] px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs select-none shrink-0">
      {/* Moedas */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-[var(--gold)]">
          <Coins className="w-3.5 h-3.5" />
          <span className="font-['Cinzel',serif] font-bold text-[11px] text-[var(--gold-hi)] uppercase tracking-wider">
            Tesouro:
          </span>
        </div>

        <div className="flex items-center gap-2.5 font-['Cinzel',serif] text-[11px] tabular-nums">
          {/* Ouro */}
          <span
            className="flex items-center gap-1 text-[var(--gold-hi)] font-bold"
            title="Moedas de Ouro"
          >
            <span className="w-2 h-2 rotate-45 bg-[var(--gold)] inline-block shadow-[0_0_4px_var(--gold)]" />
            <CountUp value={coins.gold} suffix="o" />
          </span>

          {/* Prata */}
          <span
            className="flex items-center gap-1 text-[var(--text)] font-bold"
            title="Moedas de Prata"
          >
            <span className="w-2 h-2 rotate-45 bg-[var(--text)] inline-block opacity-80" />
            <CountUp value={coins.silver} suffix="p" />
          </span>

          {/* Bronze */}
          <span
            className="flex items-center gap-1 text-[var(--gold-lo)] font-bold"
            title="Moedas de Bronze"
          >
            <span className="w-2 h-2 rotate-45 bg-[var(--gold-lo)] inline-block" />
            <CountUp value={coins.bronze} suffix="b" />
          </span>
        </div>
      </div>

      {/* Espaço e Barra de Carga */}
      <div className="flex items-center gap-3 text-[var(--muted)] font-['Cinzel',serif] text-[11px] tabular-nums">
        <div className="flex items-center gap-1.5" title="Slots ocupados na mochila">
          <Package className="w-3.5 h-3.5 text-[var(--muted)]" />
          <span
            className={
              occupiedCount >= 40 ? 'text-[var(--blood)] font-bold' : 'text-[var(--text)]'
            }
          >
            <CountUp value={occupiedCount} /> / 40
          </span>
          <span className="text-[10px] text-[var(--muted)] uppercase">slots</span>
        </div>

        <span className="text-[var(--iron)]">|</span>

        <div className="flex items-center gap-2" title="Carga total estimada">
          <div className="w-16 h-2 recess border border-[var(--iron)] p-0.5 overflow-hidden">
            <m.div
              initial={false}
              animate={{ scaleX: loadPct }}
              transition={spring.soft}
              className={`h-full w-full origin-left ${
                isOverloaded ? 'bg-[var(--blood)]' : 'bg-[var(--gold)]'
              }`}
            />
          </div>
          <span className={isOverloaded ? 'text-[var(--blood)] font-bold' : 'text-[var(--text)]'}>
            <CountUp value={currentLoad} />
          </span>
          <span className="text-[10px] text-[var(--muted)] uppercase">carga</span>
        </div>
      </div>
    </footer>
  );
};
