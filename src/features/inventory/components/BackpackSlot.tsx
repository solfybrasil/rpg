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
  ({
    slotIndex,
    item,
    isSelected,
    isRecentlyReceived,
    isDimmed = false,
    onSelect,
  }) => {
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

    // Rarity border classes
    const rarityBorderClass = item
      ? rarity === 'artefato'
        ? 'border-amber-400/80 shadow-[0_0_10px_rgba(245,182,91,0.25)]'
        : rarity === 'lendario'
        ? 'border-purple-400/70 shadow-[0_0_8px_rgba(191,90,242,0.2)]'
        : rarity === 'raro'
        ? 'border-blue-400/60'
        : rarity === 'incomum'
        ? 'border-emerald-400/60'
        : 'border-white/15'
      : 'border-white/[0.06]';

    return (
      <div
        ref={setDroppableRef}
        data-slot-index={slotIndex}
        className={`relative w-full aspect-square min-w-[56px] max-w-[64px] min-h-[56px] max-h-[64px] rounded-xl border flex items-center justify-center select-none transition-all duration-150 ${
          isOver
            ? 'border-[#f5b65b] bg-[#f5b65b]/20 shadow-[0_0_15px_rgba(245,182,91,0.4)] scale-105'
            : isSelected
            ? 'border-[#f5b65b] bg-white/[0.08]'
            : isRecentlyReceived
            ? 'border-amber-400 bg-amber-500/30 animate-pulse shadow-[0_0_16px_rgba(245,182,91,0.6)]'
            : item
            ? `bg-[#141417] hover:bg-[#1a1a1f] ${rarityBorderClass}`
            : 'bg-white/[0.015] hover:bg-white/[0.03] border-dashed border-white/[0.07]'
        } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
        onClick={() => {
          if (item) onSelect(item);
        }}
        title={
          item
            ? `${item.name} (${item.rarity || 'Comum'})\nCompartimento #${slotIndex + 1}`
            : `Compartimento #${slotIndex + 1} (Vazio)`
        }
      >
        {item ? (
          <div
            ref={setDraggableRef}
            {...listeners}
            {...attributes}
            className={`w-full h-full flex flex-col items-center justify-center p-1 cursor-grab active:cursor-grabbing touch-none transition-transform duration-100 ${
              isDragging ? 'opacity-20 scale-95' : 'opacity-100 hover:scale-[1.03]'
            }`}
          >
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                loading="lazy"
                decoding="async"
                className="w-8 h-8 object-contain rounded pointer-events-none drop-shadow-sm"
              />
            ) : (
              <span className="text-xl select-none leading-none pointer-events-none">
                {item.icon || '📦'}
              </span>
            )}

            {/* Quantidade no canto inferior direito em Inter 12 */}
            {Number(item.quantity || 1) > 1 && (
              <span className="absolute bottom-1 right-1 font-sans text-xs font-bold text-white bg-black/75 px-1 py-0.2 rounded leading-none border border-white/10 shadow-sm pointer-events-none">
                {item.quantity}
              </span>
            )}

            {/* Barra de desgaste/durabilidade sutil */}
            {item.wear_type === 'durability' && item.max_durability && (
              <div className="absolute bottom-1 left-1.5 right-1.5 h-1 bg-black/60 rounded-full overflow-hidden pointer-events-none">
                <div
                  className={`h-full rounded-full ${
                    Number(item.durability || 0) / item.max_durability <= 0.3
                      ? 'bg-red-500'
                      : Number(item.durability || 0) / item.max_durability <= 0.6
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.max(
                      10,
                      Math.min(100, (Number(item.durability || 0) / item.max_durability) * 100),
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <span className="text-[10px] font-sans text-white/15 select-none pointer-events-none">
            {slotIndex + 1}
          </span>
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.slotIndex === next.slotIndex &&
      prev.isSelected === next.isSelected &&
      prev.isRecentlyReceived === next.isRecentlyReceived &&
      prev.isDimmed === next.isDimmed &&
      prev.item?.id === next.item?.id &&
      prev.item?.quantity === next.item?.quantity &&
      prev.item?.durability === next.item?.durability &&
      prev.item?.rarity === next.item?.rarity
    );
  },
);

BackpackSlot.displayName = 'BackpackSlot';
