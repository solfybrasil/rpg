import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'gold' | 'emerald' | 'crimson';
  label?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  id?: string;
  className?: string;
  'data-testid'?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  size = 'md',
  variant = 'gold',
  label,
  description,
  icon,
  id,
  className = '',
  'data-testid': testId,
}) => {
  const switchId = id || (label ? `switch-${Math.random().toString(36).substr(2, 9)}` : undefined);

  // Sizing definitions
  const trackSize = {
    sm: 'w-8 h-4 p-0.5',
    md: 'w-12 h-6 p-0.5',
    lg: 'w-16 h-8 p-1',
  }[size];

  const thumbSize = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  const thumbTranslate = {
    sm: checked ? 'translate-x-4' : 'translate-x-0',
    md: checked ? 'translate-x-6' : 'translate-x-0',
    lg: checked ? 'translate-x-8' : 'translate-x-0',
  }[size];

  // Active track styling
  const activeColor = {
    gold: 'bg-[#f5b65b] shadow-[0_0_15px_rgba(245,182,91,0.35)]',
    emerald: 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.35)]',
    crimson: 'bg-[#ff453a] shadow-[0_0_15px_rgba(255,69,58,0.35)]',
  }[variant];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onCheckedChange(!checked);
    }
  };

  const switchButton = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={switchId}
      data-testid={testId}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#f5b65b]/50 disabled:cursor-not-allowed disabled:opacity-40 ${trackSize} ${
        checked ? activeColor : 'bg-neutral-800 border border-white/10'
      } ${className}`}
    >
      <span
        className={`pointer-events-none inline-flex items-center justify-center rounded-full bg-white shadow-md transform ring-0 transition duration-200 ease-in-out ${thumbSize} ${thumbTranslate}`}
      >
        {icon && <span className="text-[10px] text-black select-none">{icon}</span>}
      </span>
    </button>
  );

  if (!label && !description) {
    return switchButton;
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col select-none">
        {label && (
          <label
            htmlFor={switchId}
            className="text-xs font-semibold uppercase tracking-wider text-[#ebe6d6] cursor-pointer"
          >
            {label}
          </label>
        )}
        {description && (
          <span className="text-[11px] text-white/50 font-serif leading-tight">
            {description}
          </span>
        )}
      </div>
      {switchButton}
    </div>
  );
};
