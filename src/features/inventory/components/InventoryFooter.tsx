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
    <footer className="w-full bg-[#0c0c0e]/90 border-t border-white/[0.08] px-4 py-2 flex items-center justify-between text-xs select-none backdrop-blur-md shrink-0">
      {/* Moedas */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-[#f5b65b]">
          <Coins className="w-3.5 h-3.5" />
          <span className="font-serif font-bold text-[11px] text-white/50 uppercase tracking-wider">
            Tesouro:
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          {/* Ouro */}
          <span className="flex items-center gap-1 text-amber-300 font-bold" title="Moedas de Ouro">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shadow-sm shadow-amber-400/50" />
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
      <div className="flex items-center gap-3 text-white/60 font-mono text-[11px]">
        <div className="flex items-center gap-1.5" title="Slots ocupados na mochila">
          <Package className="w-3.5 h-3.5 text-white/40" />
          <span className={occupiedCount >= 40 ? 'text-red-400 font-bold' : 'text-white/80'}>
            {occupiedCount} / 40
          </span>
          <span className="text-[10px] text-white/40">slots</span>
        </div>

        <span className="text-white/20">|</span>

        <div className="flex items-center gap-1" title="Carga total estimada">
          <span className="text-white/80">{totalWeight}</span>
          <span className="text-[10px] text-white/40">carga</span>
        </div>
      </div>
    </footer>
  );
};
