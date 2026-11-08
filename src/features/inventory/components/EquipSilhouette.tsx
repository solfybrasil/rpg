import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  Crown,
  Gem,
  HandMetal,
  Lock,
  Shield,
  Sparkles,
  Sword,
} from 'lucide-react';
import React from 'react';
import { type EquipSlotKey, type InventoryItemRecord, canEquipInSlot } from '../../../entities/item';
import { SlotItem } from './BackpackSlot';

export interface EquipSilhouetteProps {
  equippedMap: Record<EquipSlotKey, InventoryItemRecord | null>;
  selectedItem: InventoryItemRecord | null;
  defense: number;
  heroPortrait?: string | null;
  onSelectSlot: (slotKey: EquipSlotKey, item: InventoryItemRecord | null) => void;
  onEquip?: (item: InventoryItemRecord, slotKey: EquipSlotKey) => void;
}

interface EquippedSlotProps {
  slotKey: EquipSlotKey;
  label: string;
  iconPlaceholder: React.ReactNode;
  item: InventoryItemRecord | null;
  isSelected: boolean;
  selectedItem: InventoryItemRecord | null;
  mainHandItem?: InventoryItemRecord | null;
  blocked?: boolean;
  blockedReason?: string;
  onSelect: (item: InventoryItemRecord) => void;
  onEquip?: (item: InventoryItemRecord, slotKey: EquipSlotKey) => void;
}

const DraggableEquippedSlotItem = React.memo(function DraggableEquippedSlotItem({
  item,
  slotKey,
  isSelected,
  onClick,
}: {
  item: InventoryItemRecord;
  slotKey: EquipSlotKey;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `equipped-${item.id}`,
    data: { item, isEquipped: true, slotKey },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
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
  );
});

const EquippedSlot = React.memo(function EquippedSlot({
  slotKey,
  label,
  iconPlaceholder,
  item,
  isSelected,
  selectedItem,
  mainHandItem,
  blocked = false,
  blockedReason,
  onSelect,
  onEquip,
}: EquippedSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `equip-${slotKey}`,
    data: { slotKey, isEquipSlot: true },
    disabled: blocked,
  });

  const rarity = (item?.rarity || 'comum').toLowerCase();
  const rarityClass = item ? `rarity-${rarity}` : '';
  const canEquipSelected =
    !blocked &&
    Boolean(selectedItem && !item && canEquipInSlot(selectedItem, slotKey, mainHandItem));

  return (
    <div className="modern-doll-slot-wrapper">
      <span className="modern-doll-slot-label">{label}</span>
      <div
        ref={setNodeRef}
        className={`modern-doll-slot ${item ? 'occupied' : 'empty'} ${isSelected ? 'selected' : ''} ${rarityClass} ${isOver ? 'is-over' : ''} ${blocked ? 'blocked' : ''} ${canEquipSelected ? 'can-equip' : ''}`}
        onClick={() => {
          if (item) {
            onSelect(item);
          } else if (canEquipSelected && onEquip && selectedItem) {
            onEquip(selectedItem, slotKey);
          }
        }}
        title={
          blocked
            ? blockedReason || 'Slot bloqueado'
            : item
            ? `${item.name} (${item.rarity || 'Comum'})\n[Slot: ${label}]\nToque para selecionar`
            : canEquipSelected && selectedItem
            ? `Toque para equipar "${selectedItem.name}" aqui!`
            : `Slot de ${label} (Vazio)\nArraste item compatível aqui`
        }
      >
        {blocked ? (
          <div className="modern-doll-blocked-content">
            <Lock size={14} />
            <span className="modern-doll-blocked-tag">2 MÃOS</span>
          </div>
        ) : item ? (
          <DraggableEquippedSlotItem
            item={item}
            slotKey={slotKey}
            isSelected={isSelected}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
          />
        ) : (
          <div className="modern-doll-empty-icon">{iconPlaceholder}</div>
        )}
      </div>
    </div>
  );
});

export const EquipSilhouette: React.FC<EquipSilhouetteProps> = ({
  equippedMap,
  selectedItem,
  defense,
  heroPortrait,
  onSelectSlot,
  onEquip,
}) => {
  const mainHandItem = equippedMap.main_hand;
  const isMainHandTwoHanded = Boolean(
    mainHandItem?.two_handed ||
      mainHandItem?.equippable_as === 'two_hands' ||
      mainHandItem?.equippable_as === 'two_handed',
  );

  const handleSelectSlotItem = (item: InventoryItemRecord) => {
    const foundSlot = (Object.keys(equippedMap) as EquipSlotKey[]).find(
      (k) => equippedMap[k]?.id === item.id,
    );
    if (foundSlot) {
      onSelectSlot(foundSlot, item);
    }
  };

  return (
    <div className="modern-armory-card">
      <div className="modern-armory-header">
        <h3 className="modern-armory-title">
          <Shield size={16} style={{ color: '#c9a961' }} />
          Arsenal Equipado
        </h3>
        <div className="modern-armory-defense-pill" title="Defesa Total: Base + Bônus de Equipamento">
          DEFESA {defense}
        </div>
      </div>

      <div className="modern-doll-stage">
        {heroPortrait && (
          <div
            className="modern-doll-backdrop"
            style={{ backgroundImage: `url(${heroPortrait})` }}
          />
        )}
        <div className="modern-doll-backdrop-gradient" />

        <div className="modern-doll-grid">
          {/* Linha 1: Cabeça | Amuleto | Mãos */}
          <EquippedSlot
            slotKey="head"
            label="Cabeça"
            iconPlaceholder={<Crown size={16} />}
            item={equippedMap.head}
            isSelected={Boolean(selectedItem && equippedMap.head && selectedItem.id === equippedMap.head.id)}
            selectedItem={selectedItem}
            mainHandItem={mainHandItem}
            onSelect={handleSelectSlotItem}
            onEquip={onEquip}
          />

          <EquippedSlot
            slotKey="amulet"
            label="Amuleto"
            iconPlaceholder={<Gem size={18} />}
            item={equippedMap.amulet}
            isSelected={Boolean(selectedItem && equippedMap.amulet && selectedItem.id === equippedMap.amulet.id)}
            selectedItem={selectedItem}
            mainHandItem={mainHandItem}
            onSelect={handleSelectSlotItem}
            onEquip={onEquip}
          />

          <EquippedSlot
            slotKey="hands"
            label="Mãos"
            iconPlaceholder={<HandMetal size={16} />}
            item={equippedMap.hands}
            isSelected={Boolean(selectedItem && equippedMap.hands && selectedItem.id === equippedMap.hands.id)}
            selectedItem={selectedItem}
            mainHandItem={mainHandItem}
            onSelect={handleSelectSlotItem}
            onEquip={onEquip}
          />

          {/* Linha 2: Mão Principal | Armadura | Mão Secundária */}
          <EquippedSlot
            slotKey="main_hand"
            label="Mão Principal"
            iconPlaceholder={<Sword size={18} />}
            item={equippedMap.main_hand}
            isSelected={Boolean(selectedItem && equippedMap.main_hand && selectedItem.id === equippedMap.main_hand.id)}
            selectedItem={selectedItem}
            mainHandItem={mainHandItem}
            onSelect={handleSelectSlotItem}
            onEquip={onEquip}
          />

          <EquippedSlot
            slotKey="chest"
            label="Armadura"
            iconPlaceholder={<Shield size={18} />}
            item={equippedMap.chest}
            isSelected={Boolean(selectedItem && equippedMap.chest && selectedItem.id === equippedMap.chest.id)}
            selectedItem={selectedItem}
            mainHandItem={mainHandItem}
            onSelect={handleSelectSlotItem}
            onEquip={onEquip}
          />

          <EquippedSlot
            slotKey="off_hand"
            label="Mão Secundária"
            iconPlaceholder={<Shield size={18} />}
            item={equippedMap.off_hand}
            isSelected={Boolean(selectedItem && equippedMap.off_hand && selectedItem.id === equippedMap.off_hand.id)}
            selectedItem={selectedItem}
            mainHandItem={mainHandItem}
            blocked={isMainHandTwoHanded}
            blockedReason="Empunhadura de 2 Mãos na Mão Principal"
            onSelect={handleSelectSlotItem}
            onEquip={onEquip}
          />

          {/* Linha 3: Anel I | Centro | Anel II */}
          <EquippedSlot
            slotKey="ring_1"
            label="Anel I"
            iconPlaceholder={<Sparkles size={16} />}
            item={equippedMap.ring_1}
            isSelected={Boolean(selectedItem && equippedMap.ring_1 && selectedItem.id === equippedMap.ring_1.id)}
            selectedItem={selectedItem}
            mainHandItem={mainHandItem}
            onSelect={handleSelectSlotItem}
            onEquip={onEquip}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span
              style={{
                fontSize: '0.7rem',
                color: '#7a7060',
                fontFamily: 'var(--font-mono, monospace)',
                letterSpacing: '0.08em',
              }}
            >
              ✦ ARSENAL ✦
            </span>
          </div>

          <EquippedSlot
            slotKey="ring_2"
            label="Anel II"
            iconPlaceholder={<Sparkles size={16} />}
            item={equippedMap.ring_2}
            isSelected={Boolean(selectedItem && equippedMap.ring_2 && selectedItem.id === equippedMap.ring_2.id)}
            selectedItem={selectedItem}
            mainHandItem={mainHandItem}
            onSelect={handleSelectSlotItem}
            onEquip={onEquip}
          />
        </div>
      </div>
    </div>
  );
};
