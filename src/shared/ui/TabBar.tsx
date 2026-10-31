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
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div
      className={twMerge('grid gap-1.5', className)}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`slab h-[34px] flex items-center justify-center font-['Cinzel',serif] text-[11px] tracking-[0.16em] uppercase cursor-pointer transition-all ${
              isActive ? 'on text-[var(--gold-hi)]' : 'text-[var(--muted)] hover:text-stone-300'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
