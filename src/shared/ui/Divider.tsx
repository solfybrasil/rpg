import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string;
}

export const Divider: React.FC<DividerProps> = ({ className, color, ...props }) => {
  return (
    <div
      className={twMerge('rule my-2', className)}
      style={color ? { color } : undefined}
      {...props}
    >
      <b />
    </div>
  );
};
