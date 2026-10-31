import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface WaxSealProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const WaxSeal: React.FC<WaxSealProps> = ({ className, children, ...props }) => {
  return (
    <div className={twMerge('wax shrink-0', className)} {...props}>
      {children}
    </div>
  );
};
