import { clsx } from 'clsx';
import { Minus, Plus } from 'lucide-react';
import React from 'react';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  onChange,
  min = -99,
  max = 99,
  step = 1,
  label,
  disabled = false,
  className = '',
}) => {
  const handleDecrement = () => {
    if (disabled || value <= min) return;
    onChange(Math.max(min, value - step));
  };

  const handleIncrement = () => {
    if (disabled || value >= max) return;
    onChange(Math.min(max, value + step));
  };

  return (
    <div className={clsx('inline-flex flex-col gap-1 items-center select-none', className)}>
      {label && (
        <span className="text-[10px] font-['Cinzel',serif] uppercase tracking-[0.14em] text-[var(--muted)]">
          {label}
        </span>
      )}
      <div className="inline-flex items-center slab border border-[var(--iron)] p-0.5 rounded-none">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className="w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-white hover:bg-black/40 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title="Diminuir"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <span className="w-10 text-center font-['Cinzel',serif] font-bold text-sm text-[var(--gold-hi)] tabular-nums">
          {value > 0 ? `+${value}` : value}
        </span>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          className="w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-white hover:bg-black/40 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title="Aumentar"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
