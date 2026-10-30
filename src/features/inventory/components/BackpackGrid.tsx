import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import React, { useState } from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import { BackpackSlot } from './BackpackSlot';

export interface BackpackGridProps {
  slots: Array<InventoryItemRecord | null>;
  selectedItemId: string | null;
  recentlyReceivedId: string | null;
  searchFilter?: string;
  categoryFilter?: string;
  onSelectSlot: (item: InventoryItemRecord) => void;
  onMoveSlot: (fromSlot: number, toSlot: number) => void;
}

export const BackpackGrid: React.FC<BackpackGridProps> = ({
  slots,
  selectedItemId,
  recentlyReceivedId,
  searchFilter = '',
  categoryFilter = 'todos',
  onSelectSlot,
  onMoveSlot,
}) => {
  const [activeDragItem, setActiveDragItem] = useState<{
    item: InventoryItemRecord;
    slotIndex: number;
  } | null>(null);

  // Sensores otimizados para toque no celular e clique no mouse
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 150,
      tolerance: 5,
    },
  });

  const sensors = useSensors(pointerSensor, touchSensor);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { item: InventoryItemRecord; slotIndex: number };
    if (data?.item) {
      setActiveDragItem(data);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const fromData = active.data.current as { item: InventoryItemRecord; slotIndex: number };
    const toData = over.data.current as { slotIndex: number };

    if (
      fromData &&
      typeof fromData.slotIndex === 'number' &&
      toData &&
      typeof toData.slotIndex === 'number' &&
      fromData.slotIndex !== toData.slotIndex
    ) {
      onMoveSlot(fromData.slotIndex, toData.slotIndex);
    }
  };

  const handleDragCancel = () => {
    setActiveDragItem(null);
  };

  const query = searchFilter.trim().toLowerCase();

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="w-full flex justify-center">
        {/* Grade de 40 slots com 8px de espaço e 56-64px por slot */}
        <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 p-2 max-w-full justify-items-center">
          {slots.map((item, index) => {
            const isSelected = Boolean(item && selectedItemId === item.id);
            const isRecentlyReceived = Boolean(item && recentlyReceivedId === item.id);

            // Filtro de busca e categoria
            let isDimmed = false;
            if (item) {
              if (query && !item.name.toLowerCase().includes(query)) {
                isDimmed = true;
              }
              if (categoryFilter !== 'todos') {
                const cat = (item.category || item.type || '').toLowerCase();
                if (categoryFilter === 'armas' && !cat.includes('arma') && !item.damage_dice) {
                  isDimmed = true;
                } else if (categoryFilter === 'alquimia' && !cat.includes('alquimia') && !cat.includes('poção')) {
                  isDimmed = true;
                } else if (categoryFilter === 'comida' && !cat.includes('comida') && !cat.includes('prato')) {
                  isDimmed = true;
                } else if (categoryFilter === 'reliquias' && !cat.includes('relíquia') && !cat.includes('reliquia')) {
                  isDimmed = true;
                }
              }
            }

            return (
              <BackpackSlot
                key={index}
                slotIndex={index}
                item={item}
                isSelected={isSelected}
                isRecentlyReceived={isRecentlyReceived}
                isDimmed={isDimmed}
                onSelect={onSelectSlot}
              />
            );
          })}
        </div>
      </div>

      {/* Item em elevação visual enquanto arrastado (escala 1.06 + sombra suave) */}
      <DragOverlay dropAnimation={null}>
        {activeDragItem ? (
          <div className="w-14 h-14 rounded-xl border border-[#f5b65b] bg-[#1a1a20] shadow-[0_12px_28px_rgba(0,0,0,0.8),0_0_15px_rgba(245,182,91,0.4)] flex flex-col items-center justify-center p-1 scale-[1.06] select-none pointer-events-none cursor-grabbing">
            {activeDragItem.item.image_url ? (
              <img
                src={activeDragItem.item.image_url}
                alt={activeDragItem.item.name}
                className="w-8 h-8 object-contain rounded"
              />
            ) : (
              <span className="text-xl">{activeDragItem.item.icon || '📦'}</span>
            )}
            {Number(activeDragItem.item.quantity || 1) > 1 && (
              <span className="absolute bottom-1 right-1 font-sans text-xs font-bold text-white bg-black/80 px-1 rounded">
                {activeDragItem.item.quantity}
              </span>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
