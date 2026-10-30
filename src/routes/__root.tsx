import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Toaster } from 'sonner';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#08080a] text-[#f5f5f7] overflow-hidden select-none">
      <Outlet />
      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}
