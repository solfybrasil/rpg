import { AlertTriangle, RefreshCw } from 'lucide-react';
import type React from 'react';
import { Button } from './Button.tsx';
import { Skeleton } from './Skeleton.tsx';
import { StonePanel } from './StonePanel.tsx';

export interface RouteErrorProps {
  error?: Error | unknown;
  reset?: () => void;
}

export const RouteErrorBoundary: React.FC<RouteErrorProps> = ({ error, reset }) => {
  const errorMessage =
    error instanceof Error ? error.message : 'Ocorreu um erro inesperado nesta tela.';

  return (
    <div className="flex-1 flex items-center justify-center p-6 text-center select-none">
      <StonePanel className="max-w-md w-full p-6 flex flex-col items-center gap-4 border-[var(--blood)]/50 bg-[var(--stone)]">
        <div className="w-12 h-12 bg-[var(--blood)]/20 border border-[var(--blood)]/50 flex items-center justify-center text-[var(--blood)]">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-['Cinzel',serif] font-bold text-[var(--blood)]">
            Falha ao carregar tela
          </h3>
          <p className="text-xs text-[var(--muted)] mt-1 font-mono break-all">{errorMessage}</p>
        </div>
        {reset && (
          <Button
            variant="secondary"
            size="sm"
            onClick={reset}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Tentar de novo
          </Button>
        )}
      </StonePanel>
    </div>
  );
};

export const LoadingSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 4,
  className,
}) => {
  return (
    <div className={`p-4 flex flex-col gap-3 ${className || ''}`}>
      <Skeleton variant="stone" height={32} width="40%" className="mb-2" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={`skel-row-${i + 1}`} variant="parchment" height={56} className="w-full" />
      ))}
    </div>
  );
};
