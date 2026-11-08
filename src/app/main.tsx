import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { routeTree } from '../routeTree.gen.ts';
import { queryClient } from '../shared/supabase/queryClient.ts';
import { RouteErrorBoundary } from '../shared/ui/RouteErrorBoundary.tsx';
import { LoadingSkeleton } from '../shared/ui/RouteErrorBoundary.tsx';
import './main.css';

// Configuração do TanStack Router
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPendingComponent: () => <LoadingSkeleton />,
  defaultErrorComponent: ({ error, reset }) => <RouteErrorBoundary error={error} reset={reset} />,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
