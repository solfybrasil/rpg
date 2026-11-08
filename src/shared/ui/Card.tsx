import { clsx } from 'clsx';
import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'sunken' | 'elevated' | 'gold' | 'interactive';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'slab',
      sunken: 'recess',
      elevated: 'slab border-[var(--iron)] shadow-[0_12px_28px_rgba(0,0,0,0.85)]',
      gold: 'slab on',
      interactive:
        'slab hover:border-[var(--gold-lo)] active:scale-[0.99] transition-all cursor-pointer',
    }[variant];

    return (
      <div
        ref={ref}
        className={twMerge(
          clsx('p-4 transition-colors relative rounded-none', variantClasses, className),
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = 'Card';

export type BadgeVariant =
  | 'default'
  | 'gold'
  | 'danger'
  | 'success'
  | 'plague'
  | 'blue'
  | 'accent'
  | 'comum'
  | 'incomum'
  | 'raro'
  | 'lendario'
  | 'artefato'
  | 'neutral'
  | 'warning';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
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

  const variantClasses: Record<string, string> = {
    default: 'bg-black/40 text-[var(--text)] border border-[var(--iron)]',
    neutral: 'bg-black/30 text-[var(--muted)] border border-[var(--iron)]',
    gold: 'bg-[var(--gold-lo)]/20 text-[var(--gold-hi)] border border-[var(--gold-lo)]',
    accent: 'bg-[var(--gold-lo)]/25 text-[var(--gold-hi)] border border-[var(--gold)]',
    danger: 'bg-[var(--blood)]/20 text-red-300 border border-[var(--blood)]',
    warning: 'bg-[#e08a3c]/20 text-[#ecd395] border border-[#e08a3c]',
    success: 'bg-[var(--moss)]/20 text-[var(--moss)] border border-[var(--moss)]',
    plague: 'bg-[var(--plague)]/20 text-[var(--plague)] border border-[var(--plague)]',
    blue: 'bg-[var(--mana)]/20 text-[#7fa6cf] border border-[var(--mana)]',
    comum: 'r-com border',
    incomum: 'r-unc border',
    raro: 'r-rare border',
    lendario: 'r-leg border',
    artefato:
      'bg-[var(--gold-lo)]/30 text-[var(--gold-hi)] border border-[var(--gold)] shadow-[0_0_8px_rgba(201,164,92,0.3)]',
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center font-['Cinzel',serif] font-bold uppercase tracking-wider select-none rounded-none",
          sizeClasses,
          variantClasses[variant] || variantClasses.default,
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
    vida: 'bg-gradient-to-r from-[#e8584a] via-[#a3291f] to-[#4a0d08]',
    foco: 'bg-gradient-to-r from-[#6d9ae6] via-[#2c5fb8] to-[#0d1f45]',
    xp: 'bg-gradient-to-r from-[#8c6a22] to-[#c9a45c]',
    peste: 'bg-gradient-to-r from-[#5a5f66] to-[#8a8f96]',
  }[type];

  return (
    <div className={twMerge('w-full flex flex-col gap-1', className)}>
      {(label || showNumbers) && (
        <div className="flex justify-between items-center text-xs font-['Cinzel',serif] text-[var(--muted)] tabular-nums">
          {label && (
            <span className="font-bold text-[var(--text)] uppercase tracking-wider">{label}</span>
          )}
          {showNumbers && (
            <span>
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2.5 bg-[#0a0908] border border-[var(--iron)] p-0.5 rounded-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
        <div
          className={twMerge('h-full transition-all duration-300 rounded-none', barColors)}
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
          'w-14 h-14 border flex items-center justify-center relative transition-all select-none rounded-none',
          empty
            ? 'recess hover:border-[var(--iron)]'
            : 'slab hover:border-[var(--gold-lo)] shadow-sm',
          active && 'border-[var(--gold)] shadow-[0_0_8px_rgba(201,164,92,0.4)]',
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
          'border-2 border-[var(--iron)] border-t-[var(--gold)] rounded-full animate-spin',
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
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-[var(--iron)] bg-black/40 rounded-none slab">
      {icon && <div className="text-[var(--gold-lo)] mb-3 text-3xl">{icon}</div>}
      <h4 className="text-sm font-bold text-[var(--gold-hi)] font-['Cinzel',serif] uppercase tracking-wider">
        {title}
      </h4>
      {description && (
        <p className="text-xs text-[var(--muted)] font-['EB_Garamond',serif] italic mt-1 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
