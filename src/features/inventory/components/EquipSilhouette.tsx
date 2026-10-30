import {
  Crown,
  Gem,
  HandMetal,
  HelpCircle,
  Package,
  Shield,
  ShieldAlert,
  Sparkles,
  Sword,
  Shirt,
} from 'lucide-react';
import React from 'react';
import type { EquipSlotKey, InventoryItemRecord } from '../../../entities/item';

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
  { key: 'off_hand', label: 'Escudo', icon: <Shield className="w-4 h-4 text-white/40" /> },
  { key: 'ring_1', label: 'Anel I', icon: <Sparkles className="w-4 h-4 text-white/40" /> },
  { key: 'ring_2', label: 'Anel II', icon: <Sparkles className="w-4 h-4 text-white/40" /> },
];

export const EquipSilhouette: React.FC<EquipSilhouetteProps> = ({
  equippedMap,
  onSelectSlot,
}) => {
  return (
    <div className="w-full bg-[#101014]/60 border border-white/[0.06] rounded-2xl p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] font-serif font-bold text-[#f5b65b] uppercase tracking-wider">
          Equipamento Ativo
        </span>
        <span className="text-[10px] text-white/40 font-mono">
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
              className={`relative flex flex-col items-center justify-center h-16 rounded-xl border transition-all text-center p-1 group select-none ${
                item
                  ? `bg-white/[0.04] hover:bg-white/[0.08] cursor-pointer ${
                      rarity === 'artefato'
                        ? 'border-amber-400/80 shadow-[0_0_12px_rgba(245,182,91,0.25)]'
                        : rarity === 'lendario'
                        ? 'border-purple-400/70 shadow-[0_0_10px_rgba(191,90,242,0.2)]'
                        : rarity === 'raro'
                        ? 'border-blue-400/60'
                        : rarity === 'incomum'
                        ? 'border-emerald-400/60'
                        : 'border-white/20'
                    }`
                  : 'bg-transparent border-dashed border-white/10 hover:border-white/25 hover:bg-white/[0.02]'
              }`}
              title={item ? `${item.name} (${label})` : `Slot de ${label} (Vazio)`}
            >
              {item ? (
                <>
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-8 h-8 object-cover rounded-md mb-0.5"
                    />
                  ) : (
                    <div className="w-8 h-8 flex items-center justify-center text-lg">
                      {item.icon || '⚔️'}
                    </div>
                  )}
                  <span className="text-[9px] font-serif text-white/90 truncate w-full px-0.5 leading-tight">
                    {item.name}
                  </span>
                </>
              ) : (
                <>
                  <div className="mb-0.5 transition-transform group-hover:scale-110">{icon}</div>
                  <span className="text-[9px] font-sans text-white/40 tracking-tight">{label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
