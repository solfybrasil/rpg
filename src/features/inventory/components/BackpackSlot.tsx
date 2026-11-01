import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Package } from 'lucide-react';
import { m } from 'motion/react';
import React from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import { motionTokens, spring } from '../../../shared/styles/motion';

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
    const isLegendary = rarity === 'lendario' || rarity === 'lendário' || rarity === 'artefato';

    // Rarity class mapping conforme Design Pedra e Pergaminho
    const rarityClass = item
      ? isLegendary
        ? 'r-leg'
        : rarity === 'epico' || rarity === 'épico'
          ? 'r-epic'
          : rarity === 'raro'
            ? 'r-rare'
            : rarity === 'incomum'
              ? 'r-unc'
              : 'r-com'
      : '';

    const itemName = item ? item.name || (item.item_name as string) || 'Item' : '';
    const itemTitle = item
      ? `${itemName}${(item.quantity || 1) > 1 ? ` (${item.quantity}x)` : ''}`
      : `Compartimento ${slotIndex + 1}`;

    return (
      <div
        ref={setDroppableRef}
        data-slot-index={slotIndex}
        data-testid={`backpack-slot-${slotIndex}`}
        className={`relative w-full aspect-square min-w-[42px] max-w-[56px] min-h-[42px] max-h-[56px] recess border flex items-center justify-center select-none transition-colors duration-150 ${
          isOver
            ? 'border-[var(--gold)] shadow-[inset_0_0_8px_rgba(201,164,92,0.4)]'
            : isSelected
              ? 'border-[var(--gold-hi)] shadow-[inset_0_0_10px_rgba(236,211,149,0.5)]'
              : 'border-[var(--iron)]/60'
        } ${isDimmed ? 'opacity-30' : ''}`}
      >
        {item ? (
          <m.div
            ref={setDraggableRef}
            {...listeners}
            {...attributes}
            title={itemTitle}
            onClick={() => onSelect(item)}
            initial={isRecentlyReceived ? { scale: 0.85 } : false}
            animate={
              isDragging
                ? { scale: 1.06 }
                : isRecentlyReceived
                  ? { scale: [1, 1.09, 0.98, 1.06, 1] }
                  : { scale: 1 }
            }
            transition={
              isRecentlyReceived
                ? { duration: 0.65, ease: motionTokens.easeOut }
                : spring.snap
            }
            className={`w-full h-full p-1.5 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing border relative overflow-hidden ${rarityClass} ${
              isDragging
                ? 'opacity-40 shadow-[0_12px_28px_rgba(0,0,0,0.85),0_0_14px_rgba(201,164,92,0.35)] z-20'
                : ''
            } ${
              isRecentlyReceived
                ? 'ring-2 ring-[var(--gold)] shadow-[0_0_14px_rgba(201,164,92,0.55)]'
                : ''
            }`}
          >
            {/* Reflexo diagonal dourado + 6 faíscas douradas ao receber item Lendário/Artefato (SKILL.md Seção 5) */}
            {isRecentlyReceived && isLegendary && (
              <>
                <m.span
                  initial={{ x: '-140%' }}
                  animate={{ x: '160%' }}
                  transition={{ duration: 0.7, ease: motionTokens.easeOut }}
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[var(--gold-hi)]/60 to-transparent -skew-x-12"
                  aria-hidden="true"
                />
                {[0, 1, 2, 3, 4, 5].map((sparkIdx) => (
                  <m.span
                    key={`leg-spark-${sparkIdx}`}
                    initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    animate={{
                      opacity: 0,
                      scale: 0.3,
                      x: (sparkIdx % 2 === 0 ? 1 : -1) * (8 + sparkIdx * 3),
                      y: (sparkIdx < 3 ? -1 : 1) * (8 + sparkIdx * 2),
                    }}
                    transition={{
                      duration: 0.6,
                      delay: sparkIdx * 0.04,
                      ease: motionTokens.easeOut,
                    }}
                    className="pointer-events-none absolute w-1 h-1 rotate-45 bg-[var(--gold-hi)] shadow-[0_0_4px_var(--gold-hi)]"
                    aria-hidden="true"
                  />
                ))}
              </>
            )}

            {item.image_url ? (
              <img
                src={item.image_url}
                alt={itemName}
                className="w-6 h-6 object-contain select-none pointer-events-none"
              />
            ) : (
              <Package size={18} className="text-current opacity-85" />
            )}

            {/* Quantidade no canto inferior direito */}
            {(item.quantity || 1) > 1 && (
              <span className="absolute bottom-0.5 right-1 text-[9px] font-bold font-['Cinzel',serif] text-[var(--text)] tabular-nums drop-shadow-[0_1px_2px_#000]">
                {item.quantity}
              </span>
            )}

            {/* Indicador de peso */}
            {Number(item.weight || 0) >= 2 && (
              <span className="absolute top-0.5 left-1 text-[8px] font-['Cinzel',serif] tabular-nums text-[var(--gold)] opacity-75">
                {String(item.weight)}kg
              </span>
            )}
          </m.div>
        ) : (
          <span className="text-[10px] text-[var(--iron)] font-['Cinzel',serif] tabular-nums select-none opacity-50">
            {slotIndex + 1}
          </span>
        )}
      </div>
    );
  },
);

BackpackSlot.displayName = 'BackpackSlot';
