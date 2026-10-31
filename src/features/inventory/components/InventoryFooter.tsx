import { Coins, Package } from 'lucide-react';
import React from 'react';
import type { CoinsBreakdown } from '../../../entities/item';

export interface InventoryFooterProps {
  coins: CoinsBreakdown;
  occupiedCount: number;
  totalWeight: number;
}

export const InventoryFooter: React.FC<InventoryFooterProps> = ({
  coins,
  occupiedCount,
  totalWeight,
}) => {
  return (
    <footer className="w-full slab border-t border-[var(--iron)] px-4 py-2 flex items-center justify-between text-xs select-none shrink-0">
      {/* Moedas */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-[var(--gold)]">
          <Coins className="w-3.5 h-3.5" />
          <span className="font-['Cinzel',serif] font-bold text-[11px] text-[var(--gold-hi)] uppercase tracking-wider">
            Tesouro:
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          {/* Ouro */}
          <span className="flex items-center gap-1 text-[var(--gold-hi)] font-bold" title="Moedas de Ouro">
            <span className="w-2 h-2 rounded-full bg-[var(--gold)] inline-block shadow-sm shadow-[var(--gold)]/50" />
            {coins.gold}o
          </span>

          {/* Prata */}
          <span className="flex items-center gap-1 text-slate-300 font-bold" title="Moedas de Prata">
            <span className="w-2 h-2 rounded-full bg-slate-300 inline-block shadow-sm shadow-slate-300/50" />
            {coins.silver}p
          </span>

          {/* Bronze */}
          <span className="flex items-center gap-1 text-amber-700 font-bold" title="Moedas de Bronze">
            <span className="w-2 h-2 rounded-full bg-amber-700 inline-block shadow-sm shadow-amber-700/50" />
            {coins.bronze}b
          </span>
        </div>
      </div>

      {/* Espaço e Carga */}
      <div className="flex items-center gap-3 text-[var(--muted)] font-mono text-[11px]">
        <div className="flex items-center gap-1.5" title="Slots ocupados na mochila">
          <Package className="w-3.5 h-3.5 text-[var(--muted)]" />
          <span className={occupiedCount >= 40 ? 'text-[var(--blood)] font-bold' : 'text-[var(--text)]'}>
            {occupiedCount} / 40
          </span>
          <span className="text-[10px] text-[var(--muted)]">slots</span>
        </div>

        <span className="text-[var(--iron)]">|</span>

        <div className="flex items-center gap-1" title="Carga total estimada">
          <span className="text-[var(--text)]">{totalWeight}</span>
          <span className="text-[10px] text-[var(--muted)]">carga</span>
        </div>
      </div>
    </footer>
  );
};
