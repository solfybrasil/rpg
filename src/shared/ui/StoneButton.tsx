import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface StoneButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const StoneButton: React.FC<StoneButtonProps> = ({
  icon,
  title,
  subtitle,
  className,
  ...props
}) => {
  return (
    <button type="button" className={twMerge('slab act w-full', className)} {...props}>
      {icon && <div className="text-[var(--gold)] shrink-0">{icon}</div>}
      <div className="text-left leading-tight overflow-hidden">
        <div className="font-['Cinzel',serif] text-xs tracking-[0.1em] text-[var(--text)] uppercase truncate">
          {title}
        </div>
        {subtitle && (
          <small className="font-['EB_Garamond',serif] italic text-[12px] text-[var(--muted)] truncate block">
            {subtitle}
          </small>
        )}
      </div>
    </button>
  );
};
