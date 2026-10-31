import { Coins } from 'lucide-react';
import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface StatusBarProps extends React.HTMLAttributes<HTMLDivElement> {
  heroName: string;
  level?: number;
  coinsBronze?: number;
  portraitUrl?: string;
  onPortraitClick?: () => void;
  rightAction?: React.ReactNode;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  heroName,
  level = 1,
  coinsBronze = 0,
  portraitUrl,
  onPortraitClick,
  rightAction,
  className,
  ...props
}) => {
  // Conversão de moedas (1 PO = 100 PP = 10000 PB, ou ouro resumido)
  const goldApprox = Math.floor(coinsBronze / 100);

  return (
    <header className={twMerge('status h-[52px]', className)} {...props}>
      {/* Esquerda: Retrato, Nome e Nível */}
      <div className="who flex items-center gap-2">
        <button
          type="button"
          onClick={onPortraitClick}
          className="mini-port relative overflow-hidden flex items-center justify-center cursor-pointer hover:border-[var(--gold-hi)] transition-colors"
          title={`Herói: ${heroName}`}
        >
          {portraitUrl ? (
            <img src={portraitUrl} alt={heroName} className="w-full h-full object-cover" />
          ) : (
            <span className="font-['Cinzel',serif] text-xs font-bold text-amber-200">
              {heroName.slice(0, 1)}
            </span>
          )}
        </button>

        <span className="font-['Cinzel',serif] font-bold text-[13px] text-[var(--gold-hi)] tracking-[0.08em]">
          {heroName}
        </span>
        <span className="lvl text-[10px] text-[var(--muted)] tracking-[0.16em] uppercase">
          Nv {level}
        </span>
      </div>

      {/* Direita: Moedas e Ações */}
      <div className="flex items-center gap-4">
        {rightAction}
        <div className="gold-count flex items-center gap-1.5 font-['Cinzel',serif] text-[14px] text-[var(--gold-hi)] tabular-nums">
          <Coins size={16} className="text-[var(--gold)]" />
          <span>{goldApprox}</span>
        </div>
      </div>
    </header>
  );
};
