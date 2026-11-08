import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  Droplets,
  Gem,
  Package,
  Shield,
  Sword,
  Utensils,
} from 'lucide-react';
import React from 'react';
import type { InventoryItemRecord } from '../../../entities/item';

export function renderItemFallbackIcon(item: InventoryItemRecord | null | undefined) {
  if (!item) return <Package size={18} style={{ color: '#9a917f' }} />;
  const cat = (item.category || item.type || '').toLowerCase();
  const name = (item.name || '').toLowerCase();

  // Armadura antes de arma: "armadura" contém "arma".
  if (
    cat.includes('armadura') ||
    cat.includes('escudo') ||
    cat.includes('proteção') ||
    cat.includes('protecao') ||
    name.includes('escudo') ||
    name.includes('armadura')
  ) {
    return <Shield size={18} style={{ color: '#88c075' }} />;
  }
  if (
    cat.includes('arma') ||
    cat.includes('lâmina') ||
    cat.includes('lamina') ||
    cat.includes('espada') ||
    name.includes('adaga') ||
    name.includes('espada') ||
    name.includes('machado') ||
    name.includes('arco')
  ) {
    return <Sword size={18} style={{ color: '#e6cf94' }} />;
  }
  if (
    cat.includes('alquimia') ||
    cat.includes('consumível') ||
    cat.includes('consumivel') ||
    cat.includes('poção') ||
    cat.includes('pocao') ||
    cat.includes('elixir') ||
    name.includes('poção') ||
    name.includes('pocao')
  ) {
    return <Droplets size={18} style={{ color: '#5b7fa6' }} />;
  }
  if (
    cat.includes('comida') ||
    cat.includes('prato') ||
    name.includes('ração') ||
    name.includes('racao') ||
    name.includes('assado') ||
    name.includes('pão') ||
    name.includes('pao')
  ) {
    return <Utensils size={18} style={{ color: '#e6cf94' }} />;
  }
  if (
    cat.includes('relíquia') ||
    cat.includes('reliquia') ||
    cat.includes('amuleto') ||
    name.includes('amuleto') ||
    name.includes('anel')
  ) {
    return <Gem size={18} style={{ color: '#c9a961' }} />;
  }
  return <Package size={18} style={{ color: '#9a917f' }} />;
}

export const SlotItem: React.FC<{ item: InventoryItemRecord | null; isSelected?: boolean }> = React.memo(
  function SlotItem({ item }) {
    if (!item) return null;
    const wearType = item.wear_type || 'unlimited';
    const maxUses = item.max_durability ?? 1;
    const curUses = item.durability ?? maxUses;
    const isGift = Boolean(item.metadata?.addedByDM || item.addedByDM);

    return (
      <div className="modern-slot-inner">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="modern-slot-img"
            loading="lazy"
            decoding="async"
            width="40"
            height="40"
          />
        ) : item.icon && !item.icon.startsWith('<') ? (
          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{item.icon}</span>
        ) : (
          <span className="modern-slot-icon-fallback">{renderItemFallbackIcon(item)}</span>
        )}
        {isGift && <span className="modern-slot-dm-gift" title="Dádiva do Confessor">✦</span>}
        {Number(item.quantity || 1) > 1 && (
          <span className="modern-slot-qty">{item.quantity}</span>
        )}
        {wearType === 'durability' && (
          <div className="modern-slot-durability-track">
            <div
              className="modern-slot-durability-bar"
              style={{
                width: `${Math.max(10, Math.min(100, (curUses / maxUses) * 100))}%`,
                backgroundColor:
                  curUses / maxUses <= 0.33
                    ? '#b8433a'
                    : curUses / maxUses <= 0.66
                    ? '#c9a961'
                    : '#6f9a5e',
              }}
            />
          </div>
        )}
      </div>
    );
  },
);

export interface BackpackSlotProps {
  slotIndex: number;
  item: InventoryItemRecord | null;
  isSelected: boolean;
  isRecentlyReceived?: boolean;
  isDimmed?: boolean;
  isHighlighted?: boolean;
  onSelect: (item: InventoryItemRecord) => void;
}

export const BackpackSlot: React.FC<BackpackSlotProps> = React.memo(
  ({
    slotIndex,
    item,
    isSelected,
    isRecentlyReceived = false,
    isDimmed = false,
    isHighlighted = false,
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
    const rarityClass = item ? `rarity-${rarity}` : '';
    const isGift = Boolean(item?.metadata?.addedByDM || item?.addedByDM);

    return (
      <div
        ref={setDroppableRef}
        data-slot-index={slotIndex}
        className={`modern-slot ${item ? 'occupied' : 'empty'} ${isSelected ? 'selected' : ''} ${rarityClass} ${isGift ? 'dm-gift' : ''} ${isOver ? 'is-over' : ''} ${isDimmed ? 'dimmed' : ''} ${isHighlighted ? 'highlighted-search' : ''} ${isRecentlyReceived ? 'animate-pulse' : ''}`}
        onClick={() => {
          if (item) onSelect(item);
        }}
        title={
          item
            ? `${item.name} (${item.rarity || 'Comum'} • ${item.quantity || 1}x)\nCompartimento #${slotIndex + 1}`
            : `Compartimento #${slotIndex + 1} (Vazio)`
        }
      >
        {item ? (
          <div
            ref={setDraggableRef}
            {...listeners}
            {...attributes}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              opacity: isDragging ? 0.3 : 1,
            }}
            className={isDragging ? 'is-dragging' : ''}
          >
            <SlotItem item={item} isSelected={isSelected} />
          </div>
        ) : (
          <span className="modern-slot-dot-index">{slotIndex + 1}</span>
        )}
      </div>
    );
  },
);

BackpackSlot.displayName = 'BackpackSlot';
