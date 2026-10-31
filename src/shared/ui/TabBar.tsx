import { m } from 'motion/react';
import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface TabBarItem {
  id: string;
  label: string;
}

export interface TabBarProps {
  tabs: TabBarItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  layoutId?: string;
}

/**
 * TabBar de Pedra (SKILL.md Seção 5 e 6)
 * O losango e o brilho da placa ativa deslizam entre as abas com layoutId.
 */
export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  layoutId = 'tab-active-indicator',
}) => {
  return (
    <div
      role="tablist"
      className={twMerge('grid gap-1.5 relative', className)}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`slab h-[34px] relative flex items-center justify-center font-['Cinzel',serif] text-[11px] tracking-[0.16em] uppercase cursor-pointer transition-colors ${
              isActive ? 'text-[var(--gold-hi)]' : 'text-[var(--muted)] hover:text-stone-300'
            }`}
          >
            {isActive && (
              <m.div
                layoutId={layoutId}
                className="absolute inset-0 border border-[var(--gold-lo)] pointer-events-none shadow-[inset_0_0_14px_rgba(201,164,92,0.18)]"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              >
                <div className="absolute left-1/2 -top-[4px] -translate-x-1/2 w-[7px] h-[7px] bg-[var(--gold)] rotate-45 shadow-[0_0_6px_rgba(236,211,149,0.7)]" />
              </m.div>
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
