import type { LucideIcon } from 'lucide-react';
import type React from 'react';

/** Peças visuais pequenas do editor da mesa (pedra + ouro, cantos retos). */

export function IconButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  danger = false,
  disabled = false,
  shortcut,
  testId,
  size = 'md',
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
  testId?: string;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      data-testid={testId}
      className={`${dim} shrink-0 flex items-center justify-center border cursor-pointer transition-colors duration-[var(--t-fast)] active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-hi)]'
          : danger
            ? 'border-[var(--iron)] bg-[var(--stone)] text-[var(--muted)] hover:text-[#e0645a] hover:border-[var(--blood)]'
            : 'border-[var(--iron)] bg-[var(--stone)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--gold-lo)]'
      }`}
    >
      <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
    </button>
  );
}

export function TextButton({
  children,
  onClick,
  variant = 'stone',
  disabled = false,
  icon: Icon,
  testId,
  className = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'stone' | 'gold' | 'danger';
  disabled?: boolean;
  icon?: LucideIcon;
  testId?: string;
  className?: string;
}) {
  const styles = {
    stone:
      'border-[var(--iron)] bg-[var(--stone)] text-[var(--text)] hover:border-[var(--gold-lo)] hover:text-[var(--gold-hi)]',
    gold: 'border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] hover:brightness-110',
    danger:
      'border-[var(--iron)] bg-[var(--stone)] text-[var(--muted)] hover:border-[var(--blood)] hover:text-[#e0645a]',
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`h-8 px-3 inline-flex items-center justify-center gap-1.5 border text-xs cursor-pointer transition-colors duration-[var(--t-fast)] active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </button>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-['Cinzel',serif] text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between text-xs text-[var(--muted)]">
        {label}
        <span className="tabular-nums text-[var(--gold-hi)]">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 p-0 border-0 accent-[var(--gold)] cursor-pointer"
      />
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 text-xs text-[var(--text)] cursor-pointer"
    >
      {label}
      <span
        className={`relative shrink-0 w-9 h-5 border transition-colors duration-[var(--t-fast)] ${
          checked ? 'border-[var(--gold)] bg-[var(--gold)]/25' : 'border-[var(--iron)] bg-[var(--abyss)]'
        }`}
      >
        <span
          className={`absolute top-[2px] left-[2px] w-3.5 h-3.5 transition-transform duration-[var(--t-fast)] ${
            checked ? 'translate-x-4 bg-[var(--gold-hi)]' : 'translate-x-0 bg-[var(--muted)]'
          }`}
        />
      </span>
    </button>
  );
}

export const inputClass =
  'w-full h-8 px-2.5 text-sm rounded-none border border-[var(--iron)] bg-[var(--abyss)] text-[var(--text)] focus:border-[var(--gold)] outline-none';

export function kindColor(kind: string, isActive = false) {
  if (isActive) return 'var(--gold-hi)';
  if (kind === 'heroi') return 'var(--moss)';
  if (kind === 'npc') return 'var(--mist)';
  return '#d2493c';
}
