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
    <div className={clsx('inline-flex flex-col gap-1 items-center', className)}>
      {label && (
        <span className="text-[11px] font-serif uppercase tracking-wider text-[#a8947c]">
          {label}
        </span>
      )}
      <div className="inline-flex items-center rounded-lg bg-black/40 border border-white/10 p-0.5">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className="w-8 h-8 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Diminuir"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <span className="w-10 text-center font-mono font-semibold text-sm text-[#f5f5f7]">
          {value > 0 ? `+${value}` : value}
        </span>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          className="w-8 h-8 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Aumentar"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
