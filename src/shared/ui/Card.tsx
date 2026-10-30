import { clsx } from 'clsx';
import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'sunken' | 'elevated' | 'gold' | 'interactive';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-white/[0.04] border border-white/[0.08] shadow-sm',
      sunken: 'bg-black/30 border border-white/[0.04]',
      elevated: 'bg-[#141417] border border-white/[0.12] shadow-lg shadow-black/40',
      gold: 'bg-gradient-to-b from-[#f5b65b]/10 to-transparent border border-[#f5b65b]/30 shadow-sm shadow-[#f5b65b]/10',
      interactive:
        'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.15] active:scale-[0.99] transition-all cursor-pointer',
    }[variant];

    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            'rounded-2xl p-4 transition-colors relative overflow-hidden',
            variantClasses,
            className,
          ),
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = 'Card';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gold' | 'danger' | 'success' | 'plague' | 'blue';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-xs',
  }[size];

  const variantClasses = {
    default: 'bg-white/10 text-white/80 border border-white/10',
    gold: 'bg-[#f5b65b]/20 text-[#ffd59a] border border-[#f5b65b]/40',
    danger: 'bg-[#ff453a]/20 text-[#ff6b62] border border-[#ff453a]/40',
    success: 'bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/40',
    plague: 'bg-[#ffb340]/20 text-[#ffb340] border border-[#ffb340]/40',
    blue: 'bg-[#0a84ff]/20 text-[#64d2ff] border border-[#0a84ff]/40',
  }[variant];

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center font-medium rounded-full uppercase tracking-wider',
          sizeClasses,
          variantClasses,
          className,
        ),
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export interface BarProps {
  value: number;
  max: number;
  type?: 'vida' | 'foco' | 'xp' | 'peste';
  label?: string;
  showNumbers?: boolean;
  className?: string;
}

export const Bar: React.FC<BarProps> = ({
  value,
  max,
  type = 'vida',
  label,
  showNumbers = true,
  className,
}) => {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));

  const barColors = {
    vida: 'bg-gradient-to-r from-[#ff453a] to-[#ff6b62]',
    foco: 'bg-gradient-to-r from-[#0a84ff] to-[#64d2ff]',
    xp: 'bg-gradient-to-r from-[#bf5af2] to-[#da8aff]',
    peste: 'bg-gradient-to-r from-[#ffb340] to-[#ffd60a]',
  }[type];

  return (
    <div className={twMerge('w-full flex flex-col gap-1', className)}>
      {(label || showNumbers) && (
        <div className="flex justify-between items-center text-xs text-white/70 font-mono">
          {label && <span className="font-sans font-medium text-white/90">{label}</span>}
          {showNumbers && (
            <span>
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10">
        <div
          className={twMerge('h-full rounded-full transition-all duration-300', barColors)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export interface SlotProps extends React.HTMLAttributes<HTMLDivElement> {
  empty?: boolean;
  active?: boolean;
  rarity?: string;
}

export const Slot: React.FC<SlotProps> = ({
  className,
  empty = false,
  active = false,
  children,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'w-14 h-14 rounded-xl border flex items-center justify-center relative transition-all select-none',
          empty
            ? 'bg-black/20 border-white/[0.08] hover:border-white/20'
            : 'bg-white/[0.05] border-white/[0.15] shadow-sm',
          active && 'ring-2 ring-[#f5b65b] border-[#f5b65b]',
          className,
        ),
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className,
}) => {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size];

  return (
    <div className={twMerge('flex items-center justify-center', className)}>
      <div
        className={twMerge(
          'border-2 border-white/20 border-t-[#f5b65b] rounded-full animate-spin',
          sizeClass,
        )}
      />
    </div>
  );
};

export const Empty: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, description, icon, action }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
      {icon && <div className="text-white/30 mb-3 text-3xl">{icon}</div>}
      <h4 className="text-sm font-semibold text-white/80 font-serif">{title}</h4>
      {description && <p className="text-xs text-white/50 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
