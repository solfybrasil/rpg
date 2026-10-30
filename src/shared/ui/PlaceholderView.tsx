import { Hammer } from 'lucide-react';
import type React from 'react';
import { Card } from './Card.tsx';

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
      <Card variant="gold" className="max-w-md w-full p-8 flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#f5b65b]/15 border border-[#f5b65b]/30 flex items-center justify-center text-[#f5b65b] shadow-inner">
          <Hammer className="w-7 h-7 animate-pulse" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#f5b65b]">
            {category}
          </span>
          <h2 className="text-xl font-serif font-bold text-white tracking-wide">{title}</h2>
        </div>
        <p className="text-xs text-white/60 leading-relaxed">{description}</p>
        <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-white/40">
          Status: Em Construção
        </div>
      </Card>
    </div>
  );
};
