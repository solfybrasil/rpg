import { Outlet, createRootRoute } from '@tanstack/react-router';
import { LazyMotion, domAnimation } from 'motion/react';
import { Toaster } from 'sonner';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <LazyMotion features={domAnimation}>
      <div className="h-screen w-screen flex flex-col bg-[var(--abyss)] text-[var(--text)] overflow-hidden select-none font-['EB_Garamond',serif]">
        <Outlet />
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          toastOptions={{
            className:
              'slab !bg-[var(--stone)] !border-[var(--iron)] !text-[var(--text)] !rounded-none font-serif',
          }}
        />
      </div>
    </LazyMotion>
  );
}
