import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface GoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

export const GoldButton: React.FC<GoldButtonProps> = ({ className, children, ...props }) => {
  return (
    <button type="button" className={twMerge('end-turn w-full', className)} {...props}>
      {children}
    </button>
  );
};
