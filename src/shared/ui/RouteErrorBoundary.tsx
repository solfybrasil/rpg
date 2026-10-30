import { AlertTriangle, RefreshCw } from 'lucide-react';
import type React from 'react';
import { Button } from './Button.tsx';
import { Card } from './Card.tsx';

export interface RouteErrorProps {
  error?: Error | unknown;
  reset?: () => void;
}

export const RouteErrorBoundary: React.FC<RouteErrorProps> = ({ error, reset }) => {
  const errorMessage =
    error instanceof Error ? error.message : 'Ocorreu um erro inesperado nesta tela.';

  return (
    <div className="flex-1 flex items-center justify-center p-6 text-center">
      <Card
        variant="default"
        className="max-w-md w-full p-6 flex flex-col items-center gap-4 border-[#ff453a]/30 bg-[#ff453a]/5"
      >
        <div className="w-12 h-12 rounded-2xl bg-[#ff453a]/20 border border-[#ff453a]/40 flex items-center justify-center text-[#ff6b62]">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-serif font-bold text-[#ff6b62]">Falha ao carregar tela</h3>
          <p className="text-xs text-white/70 mt-1 font-mono break-all">{errorMessage}</p>
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
      </Card>
    </div>
  );
};

export const LoadingSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 4,
  className,
}) => {
  return (
    <div className={`p-4 flex flex-col gap-3 animate-pulse ${className || ''}`}>
      <div className="h-8 bg-white/10 rounded-xl w-1/3 mb-2" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={`skel-row-${i + 1}`}
          className="h-14 bg-white/5 rounded-xl border border-white/5"
        />
      ))}
    </div>
  );
};
