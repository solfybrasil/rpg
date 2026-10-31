import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Package } from 'lucide-react';
import React from 'react';
import type { InventoryItemRecord } from '../../../entities/item';

export interface BackpackSlotProps {
  slotIndex: number;
  item: InventoryItemRecord | null;
  isSelected: boolean;
  isRecentlyReceived: boolean;
  isDimmed?: boolean;
  onSelect: (item: InventoryItemRecord) => void;
}

export const BackpackSlot: React.FC<BackpackSlotProps> = React.memo(
  ({ slotIndex, item, isSelected, isRecentlyReceived, isDimmed = false, onSelect }) => {
    const { isOver, setNodeRef: setDroppableRef } = useDroppable({
      id: `slot-${slotIndex}`,
      data: { slotIndex },
    });

    const {
      attributes,
      listeners,
      setNodeRef: setDraggableRef,
      isDragging,
    } = useDraggable({
      id: item ? `item-${item.id}` : `empty-${slotIndex}`,
      data: { item, slotIndex },
      disabled: !item,
    });

    const rarity = (item?.rarity || 'comum').toLowerCase();

    // Rarity class mapping conforme Design Pedra e Pergaminho
    const rarityClass = item
      ? rarity === 'lendario' || rarity === 'artefato'
        ? 'r-leg'
        : rarity === 'epico'
          ? 'r-epic'
          : rarity === 'raro'
            ? 'r-rare'
            : rarity === 'incomum'
              ? 'r-unc'
              : 'r-com'
      : '';

    return (
      <div
        ref={setDroppableRef}
        data-slot-index={slotIndex}
        className={`relative w-full aspect-square min-w-[42px] max-w-[56px] min-h-[42px] max-h-[56px] recess border flex items-center justify-center select-none transition-all duration-150 ${
          isOver
            ? 'border-[var(--gold)] shadow-[inset_0_0_8px_rgba(201,164,92,0.4)]'
            : isSelected
              ? 'border-[var(--gold-hi)] shadow-[inset_0_0_10px_rgba(236,211,149,0.5)]'
              : 'border-[#1a1714]'
        } ${isDimmed ? 'opacity-30' : ''}`}
      >
        {item ? (
          <div
            ref={setDraggableRef}
            {...listeners}
            {...attributes}
            onClick={() => onSelect(item)}
            className={`w-full h-full p-1.5 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing border ${rarityClass} ${
              isDragging ? 'opacity-30 scale-105' : ''
            } ${
              isRecentlyReceived
                ? 'animate-pulse ring-2 ring-[var(--gold)] ring-offset-1 ring-offset-black'
                : ''
            }`}
          >
            {item.icon ? (
              <span className="text-xl leading-none select-none drop-shadow-md">{item.icon}</span>
            ) : (
              <Package className="w-5 h-5 text-current opacity-80" />
            )}

            {/* Quantidade no canto inferior direito */}
            {(item.quantity || 1) > 1 && (
              <span className="absolute bottom-0.5 right-1 text-[9px] font-bold font-['Cinzel',serif] text-white tabular-nums drop-shadow-[0_1px_2px_#000]">
                {item.quantity}
              </span>
            )}

            {/* Indicador de peso */}
            {(item.weight || 0) >= 2 && (
              <span className="absolute top-0.5 left-1 text-[8px] font-mono text-[var(--gold)] opacity-75">
                {item.weight}kg
              </span>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-[var(--iron)]/40 font-mono select-none">
            {slotIndex + 1}
          </span>
        )}
      </div>
    );
  },
);

BackpackSlot.displayName = 'BackpackSlot';
