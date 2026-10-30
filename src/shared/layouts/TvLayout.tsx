import { Outlet } from '@tanstack/react-router';
import type React from 'react';

export const TvLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#08080a] text-[#f5f5f7] overflow-hidden select-none">
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {children ?? <Outlet />}
      </main>
    </div>
  );
};
