import { Link } from '@tanstack/react-router';
import { AlertTriangle, Compass, RefreshCw } from 'lucide-react';
import type React from 'react';
import { Divider } from './Divider.tsx';
import { Parchment } from './Parchment.tsx';
import { Skeleton } from './Skeleton.tsx';
import { StoneButton } from './StoneButton.tsx';
import { StonePanel } from './StonePanel.tsx';

export interface RouteErrorProps {
  error?: Error | unknown;
  reset?: () => void;
}

export const RouteErrorBoundary: React.FC<RouteErrorProps> = ({ error, reset }) => {
  const errorMessage =
    error instanceof Error ? error.message : 'Ocorreu um erro inesperado nesta tela.';

  return (
    <div className="flex-1 flex items-center justify-center p-6 text-center select-none bg-[var(--abyss)]">
      <StonePanel className="max-w-md w-full p-6 flex flex-col items-center gap-4 border-[var(--blood)]/50">
        <div className="w-12 h-12 bg-[var(--blood)]/15 border border-[var(--blood)]/50 flex items-center justify-center text-[var(--blood)]">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="w-full">
          <h3 className="text-base font-['Cinzel',serif] font-bold text-[var(--blood)] tracking-widest uppercase">
            Falha ao carregar tela
          </h3>
          <Divider className="my-2" />
          <Parchment className="p-3 text-left mt-2" unroll={false}>
            <p className="text-sm font-['EB_Garamond',serif] text-[var(--ink)] break-words">
              {errorMessage}
            </p>
          </Parchment>
        </div>
        {reset && (
          <StoneButton
            onClick={reset}
            icon={<RefreshCw className="w-4 h-4" />}
            label="Tentar de novo"
            sublabel="Recarregar fragmentos desta rota"
            className="w-full justify-center"
          />
        )}
      </StonePanel>
    </div>
  );
};

export const RouteNotFoundBoundary: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center p-6 text-center select-none bg-[var(--abyss)]">
      <StonePanel className="max-w-md w-full p-6 flex flex-col items-center gap-4 border-[var(--gold-lo)]">
        <div className="w-12 h-12 recess border border-[var(--gold-lo)] flex items-center justify-center text-[var(--gold)]">
          <Compass className="w-6 h-6" />
        </div>
        <div className="w-full">
          <span className="text-[10px] font-['Cinzel',serif] tracking-[0.25em] uppercase text-[var(--muted)]">
            Caminho Perdido · 404
          </span>
          <h3 className="text-lg font-['Cinzel',serif] font-bold text-[var(--gold-hi)] mt-1">
            Território Não Cartografado
          </h3>
          <Divider className="my-2" />
          <Parchment className="p-3.5 text-left mt-2">
            <p className="text-sm font-['EB_Garamond',serif] italic text-[var(--ink-soft)] leading-relaxed">
              As brumas da Peste engoliram esta trilha. Nenhuma crônica ou pergaminho registra o
              destino que procuras.
            </p>
          </Parchment>
        </div>
        <Link to="/" className="w-full">
          <StoneButton
            label="Retornar ao Santuário"
            sublabel="Voltar à encruzilhada inicial"
            className="w-full justify-center"
          />
        </Link>
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
