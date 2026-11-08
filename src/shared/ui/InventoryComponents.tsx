import { Feather, Flame, Gem, Key, Package, Shield, Sparkles, Sword } from 'lucide-react';
import React from 'react';
import { Parchment } from './Parchment';

export interface GridItemData {
  id: string;
  name: string;
  col: number;
  row: number;
  w?: number;
  h?: number;
  rarity?: 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';
  quantity?: number;
  icon?: React.ReactNode;
}

export const ItemCell: React.FC<{
  item: GridItemData;
  isSelected?: boolean;
  onClick?: () => void;
}> = ({ item, isSelected = false, onClick }) => {
  const w = item.w || 1;
  const h = item.h || 1;

  const rarityClass =
    item.rarity === 'lendario'
      ? 'r-leg'
      : item.rarity === 'epico'
        ? 'r-epic'
        : item.rarity === 'raro'
          ? 'r-rare'
          : item.rarity === 'incomum'
            ? 'r-unc'
            : 'r-com';

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        gridArea: `${item.row} / ${item.col} / span ${h} / span ${w}`,
      }}
      className={`item ${rarityClass} ${
        isSelected ? 'outline outline-2 outline-[var(--gold-hi)]' : ''
      } flex items-center justify-center relative cursor-pointer hover:brightness-125 transition-all`}
    >
      <div className={w > 1 || h > 1 ? 'scale-125' : ''}>{item.icon || <Package size={20} />}</div>
      {item.quantity && item.quantity > 1 && (
        <small className="absolute right-1 bottom-0 font-['Cinzel',serif] text-[9px] text-[var(--text)] drop-shadow-md">
          {item.quantity}
        </small>
      )}
    </button>
  );
};

export const InventoryGrid: React.FC<{
  items: GridItemData[];
  selectedId?: string;
  onSelectItem?: (item: GridItemData) => void;
  rows?: number;
  cols?: number;
}> = ({ items, selectedId, onSelectItem, rows = 4, cols = 8 }) => {
  // Gera células de fundo afundadas (recess)
  const backgroundCells = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      backgroundCells.push(
        <div
          key={`cell-${r}-${c}`}
          style={{ gridArea: `${r} / ${c}` }}
          className="cell bg-[#13110f] border border-black shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]"
        />,
      );
    }
  }

  return (
    <div
      className="grid8 grid gap-[3px] p-2 bg-[#0a0908] border border-[#2a2520] relative w-full"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridAutoRows: '36px',
      }}
    >
      {backgroundCells}
      {items.map((it) => (
        <ItemCell
          key={it.id}
          item={it}
          isSelected={it.id === selectedId}
          onClick={() => onSelectItem?.(it)}
        />
      ))}
    </div>
  );
};

export const EquipDoll: React.FC<{
  equipped?: Record<string, { name: string; rarity?: string; icon?: React.ReactNode }>;
  onSlotClick?: (slot: string) => void;
}> = ({ equipped = {}, onSlotClick }) => {
  const slots = [
    { id: 'helm', area: '1/3/2/4', label: 'Elmo' },
    { id: 'amulet', area: '1/4/2/5', label: 'Amuleto' },
    { id: 'weap', area: '2/1/5/2', label: 'Arma' },
    { id: 'armor', area: '2/3/4/4', label: 'Armadura' },
    { id: 'off', area: '2/5/4/6', label: 'Escudo' },
    { id: 'ring1', area: '4/2/5/3', label: 'Anel' },
    { id: 'boots', area: '4/3/5/4', label: 'Botas' },
    { id: 'ring2', area: '4/4/5/5', label: 'Anel' },
  ];

  return (
    <div className="doll recess h-[168px] grid grid-cols-5 grid-rows-4 gap-1 p-2 px-6 w-full">
      {slots.map((s) => {
        const item = equipped[s.id];
        return (
          <button
            type="button"
            key={s.id}
            onClick={() => onSlotClick?.(s.id)}
            style={{ gridArea: s.area }}
            className={`flex items-center justify-center border cursor-pointer transition-all ${
              item
                ? 'item r-rare border-[var(--gold)] text-[var(--gold-hi)]'
                : 'slab border-[#2d2823] text-[var(--muted)] hover:border-[var(--iron)]'
            }`}
            title={item?.name || s.label}
          >
            {item?.icon || (
              <span className="font-['Cinzel',serif] text-[9px] uppercase tracking-wider text-white/30">
                {s.label.slice(0, 3)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export const ItemTooltip: React.FC<{
  name: string;
  rarity?: string;
  effect: string;
  weightKg?: number;
  valueBronze?: number;
  hands?: string;
}> = ({ name, rarity = 'Comum', effect, weightKg = 1, valueBronze = 50, hands = 'Uma mão' }) => {
  return (
    <Parchment className="p-3">
      <div className="flex items-center justify-between border-b border-[var(--ink)]/20 pb-1 mb-2">
        <h3 className="font-['Cinzel',serif] font-bold text-[16px] text-[var(--ink)]">{name}</h3>
        <span className="font-['Cinzel',serif] text-[10px] tracking-[0.16em] uppercase text-[#5d4589] font-bold">
          {rarity}
        </span>
      </div>
      <p className="font-['EB_Garamond',serif] text-[14px] text-[var(--ink)] leading-snug">
        <b>Efeito:</b> {effect}
      </p>
      <div className="flex items-center justify-between font-['Cinzel',serif] text-[10px] text-[var(--ink-soft)] uppercase tracking-wider mt-2 border-t border-[var(--ink)]/15 pt-1 tabular-nums">
        <span>
          {hands} · {weightKg} kg
        </span>
        <span>Valor: {valueBronze} Moedas</span>
      </div>
    </Parchment>
  );
};
