import { Crown, Gem, HandMetal, Package, Shirt, Sparkles, Sword } from 'lucide-react';
import React from 'react';
import type { EquipSlotKey, InventoryItemRecord } from '../../../entities/item';
import { StonePanel } from '../../../shared/ui/StonePanel';

export interface EquipSilhouetteProps {
  equippedMap: Record<EquipSlotKey, InventoryItemRecord | null>;
  onSelectSlot: (slotKey: EquipSlotKey, item: InventoryItemRecord | null) => void;
}

interface SlotConfig {
  key: EquipSlotKey;
  label: string;
  icon: React.ReactNode;
}

const SLOTS_CONFIG: SlotConfig[] = [
  { key: 'head', label: 'Cabeça', icon: <Crown className="w-4 h-4 text-white/40" /> },
  { key: 'amulet', label: 'Amuleto', icon: <Gem className="w-4 h-4 text-white/40" /> },
  { key: 'chest', label: 'Armadura', icon: <Shirt className="w-4 h-4 text-white/40" /> },
  { key: 'hands', label: 'Mãos', icon: <HandMetal className="w-4 h-4 text-white/40" /> },
  { key: 'main_hand', label: 'Arma', icon: <Sword className="w-4 h-4 text-white/40" /> },
  { key: 'off_hand', label: 'Secundária', icon: <Sparkles className="w-4 h-4 text-white/40" /> },
  { key: 'ring_1', label: 'Anel I', icon: <Sparkles className="w-4 h-4 text-white/40" /> },
  { key: 'ring_2', label: 'Anel II', icon: <Sparkles className="w-4 h-4 text-white/40" /> },
];

export const EquipSilhouette: React.FC<EquipSilhouetteProps> = ({
  equippedMap,
  onSelectSlot,
}) => {
  const getRarityClass = (rarity: string) => {
    switch (rarity) {
      case 'lendario':
      case 'artefato':
        return 'r-leg';
      case 'epico':
        return 'r-epic';
      case 'raro':
        return 'r-rare';
      case 'incomum':
        return 'r-unc';
      default:
        return 'r-com';
    }
  };

  return (
    <StonePanel className="w-full p-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] font-['Cinzel',serif] font-bold text-[var(--gold-hi)] uppercase tracking-wider">
          Silhueta de Equipamento
        </span>
        <span className="text-[10px] text-[var(--muted)] font-mono">
          {Object.values(equippedMap).filter(Boolean).length} / 8 equipados
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {SLOTS_CONFIG.map(({ key, label, icon }) => {
          const item = equippedMap[key];
          const rarity = (item?.rarity || 'comum').toLowerCase();

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectSlot(key, item)}
              className={`flex flex-col items-center justify-center p-2 min-h-[58px] recess border transition-all ${
                item
                  ? `border ${getRarityClass(rarity)} hover:scale-105`
                  : 'border-[#1a1714] hover:border-[var(--iron)]'
              }`}
            >
              <div className="mb-1">
                {item?.icon ? (
                  <span className="text-xl leading-none">{item.icon}</span>
                ) : item ? (
                  <Package className="w-4 h-4 text-current" />
                ) : (
                  icon
                )}
              </div>
              <span className="text-[9px] font-['Cinzel',serif] uppercase tracking-wider text-[var(--muted)] text-center line-clamp-1">
                {item ? item.item_name : label}
              </span>
            </button>
          );
        })}
      </div>
    </StonePanel>
  );
};
