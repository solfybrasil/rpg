import { clsx } from 'clsx';
import { FlaskConical, Scroll, Shield, Sparkles } from 'lucide-react';
import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface BeltItem {
  id: string;
  name: string;
  quantity: number;
  rarity?: 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';
  icon?: React.ReactNode;
}

export interface BeltProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: BeltItem[];
  onItemClick?: (item: BeltItem) => void;
}

export const Belt: React.FC<BeltProps> = ({ items = [], onItemClick, className, ...props }) => {
  // Até 4 slots rápidos
  const slots: (BeltItem | null)[] = [
    items[0] || null,
    items[1] || null,
    items[2] || null,
    items[3] || null,
  ];

  const getRarityClass = (r?: string) => {
    switch (r) {
      case 'incomum':
        return 'r-unc';
      case 'raro':
        return 'r-rare';
      case 'epico':
        return 'r-epic';
      case 'lendario':
        return 'r-leg';
      default:
        return 'r-com';
    }
  };

  const defaultIcons = [
    <FlaskConical key="1" size={18} className="text-[var(--blood)]" />,
    <FlaskConical key="2" size={18} className="text-[var(--mist)]" />,
    <Scroll key="3" size={18} className="text-[var(--gold)]" />,
    <Shield key="4" size={18} className="text-[var(--moss)]" />,
  ];

  const slotKeys = ['belt-slot-1', 'belt-slot-2', 'belt-slot-3', 'belt-slot-4'];

  return (
    <div className={twMerge('belt', className)} {...props}>
      {slots.map((item, idx) => {
        const slotKey = slotKeys[idx];
        if (!item) {
          return (
            <div
              key={slotKey}
              className="w-[26px] h-[36px] border border-black/60 bg-black/40 flex items-center justify-center text-white/10"
            >
              <span className="text-[10px]">·</span>
            </div>
          );
        }

        return (
          <button
            key={item.id || slotKey}
            type="button"
            onClick={() => onItemClick?.(item)}
            title={item.name}
            className={twMerge(
              'w-[26px] h-[36px] flex items-center justify-center relative border cursor-pointer hover:brightness-125 transition-all',
              getRarityClass(item.rarity),
            )}
          >
            {item.icon ?? defaultIcons[idx % defaultIcons.length]}
            <small className="absolute right-[2px] bottom-0 font-['Cinzel',serif] text-[9px] text-[var(--muted)]">
              {item.quantity}
            </small>
          </button>
        );
      })}
    </div>
  );
};
