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
      sm: 'px-2.5 py-1 text-xs font-medium gap-1.5 rounded-lg',
      md: 'px-3.5 py-2 text-sm font-semibold gap-2 rounded-xl',
      lg: 'px-5 py-2.5 text-base font-semibold gap-2.5 rounded-xl',
    }[size];

    const variantClasses = {
      primary:
        'bg-[#f5b65b] text-[#1d1305] hover:bg-[#ffd59a] active:bg-[#9c6c2e] shadow-sm shadow-[#f5b65b]/20 font-serif tracking-wide',
      secondary:
        'bg-white/[0.06] text-[#f5f5f7] border border-white/[0.08] hover:bg-white/[0.10] active:bg-white/[0.04]',
      danger:
        'bg-[#ff453a]/15 text-[#ff6b62] border border-[#ff453a]/30 hover:bg-[#ff453a]/25 active:bg-[#ff453a]/10',
      ghost:
        'bg-transparent text-white/70 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.03]',
      outline:
        'bg-transparent text-[#f5b65b] border border-[#f5b65b]/40 hover:bg-[#f5b65b]/10 active:bg-[#f5b65b]/5',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={twMerge(
          clsx(
            'inline-flex items-center justify-center transition-all duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]',
            sizeClasses,
            variantClasses,
            className,
          ),
        )}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
        <span>{children}</span>
        {!loading && rightIcon}
      </button>
    );
  },
);
Button.displayName = 'Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', size = 'md', loading, children, disabled, ...props }, ref) => {
    const sizeClasses = {
      sm: 'w-7 h-7 p-1 text-xs rounded-lg',
      md: 'w-9 h-9 p-2 text-sm rounded-xl',
      lg: 'w-11 h-11 p-2.5 text-base rounded-xl',
    }[size];

    const variantClasses = {
      primary: 'bg-[#f5b65b] text-[#1d1305] hover:bg-[#ffd59a]',
      secondary: 'bg-white/[0.06] text-[#f5f5f7] border border-white/[0.08] hover:bg-white/[0.10]',
      danger: 'bg-[#ff453a]/15 text-[#ff6b62] border border-[#ff453a]/30 hover:bg-[#ff453a]/25',
      ghost: 'bg-transparent text-white/70 hover:text-white hover:bg-white/[0.06]',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={twMerge(
          clsx(
            'inline-flex items-center justify-center transition-all duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.96]',
            sizeClasses,
            variantClasses,
            className,
          ),
        )}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
      </button>
    );
  },
);
IconButton.displayName = 'IconButton';
