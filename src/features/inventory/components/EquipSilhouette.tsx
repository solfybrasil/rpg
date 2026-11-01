import { Crown, Gem, HandMetal, Package, Shirt, Sparkles, Sword } from 'lucide-react';
import { m } from 'motion/react';
import React from 'react';
import type { EquipSlotKey, InventoryItemRecord } from '../../../entities/item';
import { spring } from '../../../shared/styles/motion';
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
  { key: 'head', label: 'Cabeça', icon: <Crown className="w-4 h-4 text-[var(--muted)]" /> },
  { key: 'amulet', label: 'Amuleto', icon: <Gem className="w-4 h-4 text-[var(--muted)]" /> },
  { key: 'chest', label: 'Armadura', icon: <Shirt className="w-4 h-4 text-[var(--muted)]" /> },
  { key: 'hands', label: 'Mãos', icon: <HandMetal className="w-4 h-4 text-[var(--muted)]" /> },
  { key: 'main_hand', label: 'Arma', icon: <Sword className="w-4 h-4 text-[var(--muted)]" /> },
  { key: 'off_hand', label: 'Secundária', icon: <Sparkles className="w-4 h-4 text-[var(--muted)]" /> },
  { key: 'ring_1', label: 'Anel I', icon: <Sparkles className="w-4 h-4 text-[var(--muted)]" /> },
  { key: 'ring_2', label: 'Anel II', icon: <Sparkles className="w-4 h-4 text-[var(--muted)]" /> },
];

export const EquipSilhouette: React.FC<EquipSilhouetteProps> = ({
  equippedMap,
  onSelectSlot,
}) => {
  const getRarityClass = (rarity: string) => {
    switch (rarity) {
      case 'lendario':
      case 'lendário':
      case 'artefato':
        return 'r-leg';
      case 'epico':
      case 'épico':
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
        <span className="text-[10px] text-[var(--muted)] font-['Cinzel',serif] tabular-nums">
          {Object.values(equippedMap).filter(Boolean).length} / 8 equipados
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {SLOTS_CONFIG.map(({ key, label, icon }) => {
          const item = equippedMap[key];
          const rarity = (item?.rarity || 'comum').toLowerCase();
          const itemName = item ? item.name || (item.item_name as string) || label : label;

          return (
            <m.button
              key={`${key}-${item?.id || 'empty'}`}
              type="button"
              data-testid={`equipped-slot-${key}`}
              title={itemName}
              initial={item ? { scale: 0.92 } : false}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.96 }}
              transition={spring.snap}
              onClick={() => onSelectSlot(key, item)}
              className={`flex flex-col items-center justify-center p-2 min-h-[58px] recess border transition-colors cursor-pointer ${
                item
                  ? `${getRarityClass(rarity)} hover:brightness-125`
                  : 'border-[var(--iron)]/60 hover:border-[var(--gold-lo)]'
              }`}
            >
              <m.div
                key={item?.id || 'slot-icon'}
                initial={item ? { scale: 1.12 } : false}
                animate={{ scale: 1 }}
                transition={spring.snap}
                className="mb-1 flex items-center justify-center"
              >
                {item?.image_url ? (
                  <img
                    src={item.image_url}
                    alt={itemName}
                    className="w-5 h-5 object-contain select-none pointer-events-none"
                  />
                ) : item ? (
                  <Package size={16} className="text-current" />
                ) : (
                  icon
                )}
              </m.div>
              <span className="text-[9px] font-['Cinzel',serif] uppercase tracking-wider text-[var(--muted)] text-center line-clamp-1">
                {itemName}
              </span>
            </m.button>
          );
        })}
      </div>
    </StonePanel>
  );
};
