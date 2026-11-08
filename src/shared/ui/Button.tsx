import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const sizeClasses = {
      sm: 'px-2.5 py-1 text-xs font-bold gap-1.5',
      md: 'px-3.5 py-2 text-sm font-bold gap-2',
      lg: 'px-5 py-2.5 text-base font-bold gap-2.5',
    }[size];

    const variantClasses = {
      primary:
        "end-turn text-[#1a1208] font-['Cinzel',serif] tracking-widest uppercase hover:brightness-110 active:scale-[0.99] border border-[#3a2a10]",
      secondary:
        'slab text-[var(--text)] border border-[var(--iron)] hover:border-[var(--gold-lo)] active:scale-[0.99]',
      danger:
        'bg-[var(--blood)]/20 text-red-300 border border-[var(--blood)] hover:bg-[var(--blood)]/30 active:scale-[0.99]',
      ghost:
        'bg-transparent text-[var(--muted)] hover:text-white hover:bg-black/40 active:scale-[0.99]',
      outline:
        'bg-black/40 text-[var(--gold-hi)] border border-[var(--gold-lo)] hover:border-[var(--gold)] active:scale-[0.99]',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={twMerge(
          clsx(
            "inline-flex items-center justify-center transition-all duration-150 cursor-pointer select-none rounded-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98] font-['Cinzel',serif]",
            sizeClasses,
            variantClasses,
            className,
          ),
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);
Button.displayName = 'Button';
