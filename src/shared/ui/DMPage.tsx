import type { LucideIcon } from 'lucide-react';
import type React from 'react';

/**
 * Peças comuns das telas do Mestre: um cabeçalho enxuto e uma barra de abas.
 * Mantém todos os módulos com a mesma cara (pedra + ouro, cantos retos).
 */

export interface DMPageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export function DMPageHeader({ title, subtitle, actions }: DMPageHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-['Cinzel',serif] text-lg sm:text-xl tracking-[0.14em] text-[var(--gold-hi)]">
          {title}
        </h1>
        {subtitle && <p className="text-sm italic text-[var(--muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export interface DMTab<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  badge?: number;
  testId?: string;
}

export interface DMTabsProps<T extends string> {
  tabs: Array<DMTab<T>>;
  active: T;
  onChange: (id: T) => void;
}

export function DMTabs<T extends string>({ tabs, active, onChange }: DMTabsProps<T>) {
  return (
    <div
      role="tablist"
      className="flex overflow-x-auto border-b border-[var(--iron)] [scrollbar-width:none]"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-testid={tab.testId}
            onClick={() => onChange(tab.id)}
            className={`shrink-0 flex items-center gap-2 h-10 px-4 -mb-px border-b-2 text-[13px] cursor-pointer ${
              isActive
                ? 'border-[var(--gold)] text-[var(--gold-hi)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {tab.label}
            {tab.badge ? (
              <span className="min-w-5 px-1 text-[10px] leading-4 text-center bg-[var(--ember)]/20 text-[var(--ember)] border border-[var(--ember)]/40">
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Indicador on/off compacto para o cabeçalho (ex.: Forja aberta). */
export function DMStatusPill({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 border text-xs ${
        on
          ? 'border-[var(--gold-lo)] text-[var(--gold-hi)]'
          : 'border-[var(--iron)] text-[var(--muted)]'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-[var(--moss)]' : 'bg-[var(--iron)]'}`}
      />
      {label}
    </span>
  );
}

export const DM_PAGE_CLASS = 'flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-4';
