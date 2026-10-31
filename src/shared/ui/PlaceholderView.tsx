import { Hammer } from 'lucide-react';
import type React from 'react';
import { StonePanel } from './StonePanel';

export interface PlaceholderViewProps {
  title: string;
  category?: string;
  description?: string;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({
  title,
  category = 'Módulo em Reconstrução',
  description = 'Esta funcionalidade será entregue na sua respectiva etapa conforme o roteiro de telas do projeto.',
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in-50 duration-200">
      <StonePanel className="max-w-md w-full p-8 flex flex-col items-center gap-4 border border-[var(--gold-lo)]">
        <div className="w-14 h-14 bg-black/40 border border-[var(--gold-lo)] flex items-center justify-center text-[var(--gold)] shadow-inner">
          <Hammer className="w-7 h-7 animate-pulse text-[var(--gold)]" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-['Cinzel',serif] uppercase tracking-widest text-[var(--gold)] font-bold">
            {category}
          </span>
          <h2 className="text-xl font-['Cinzel',serif] font-bold text-[var(--gold-hi)] tracking-wide">
            {title}
          </h2>
        </div>
        <p className="text-xs text-[var(--text)] font-['EB_Garamond',serif] leading-relaxed italic">
          {description}
        </p>
        <div className="mt-2 inline-flex items-center px-3 py-1 border border-[var(--iron)] text-[10px] font-['Cinzel',serif] uppercase tracking-wider text-[var(--muted)]">
          Status: Em Construção
        </div>
      </StonePanel>
    </div>
  );
};
