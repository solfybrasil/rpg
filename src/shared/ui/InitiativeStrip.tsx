import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface CombatToken {
  id: string;
  name: string;
  hpPercent: number;
  type: 'ally' | 'foe';
  isCurrentTurn?: boolean;
  avatarBg?: string;
}

export interface InitiativeStripProps extends React.HTMLAttributes<HTMLDivElement> {
  tokens: CombatToken[];
  onTokenClick?: (token: CombatToken) => void;
}

export const InitiativeStrip: React.FC<InitiativeStripProps> = ({
  tokens,
  onTokenClick,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        'init flex justify-between items-center p-2 py-3 w-full bg-black/40 border border-[var(--iron)]',
        className,
      )}
      {...props}
    >
      {tokens.map((tok) => {
        const isNow = Boolean(tok.isCurrentTurn);
        const isAlly = tok.type === 'ally';

        return (
          <button
            type="button"
            key={tok.id}
            onClick={() => onTokenClick?.(tok)}
            className={`tok flex flex-col items-center gap-1 font-['Cinzel',serif] text-[9px] uppercase tracking-[0.08em] cursor-pointer ${
              isNow ? 'now text-[var(--gold-hi)] scale-105' : 'text-[var(--muted)]'
            }`}
          >
            <i
              style={{
                background:
                  tok.avatarBg ||
                  (isAlly
                    ? 'radial-gradient(circle at 50% 35%, #d6a77a, #7a4a2a 60%, #1e120a)'
                    : 'radial-gradient(circle at 50% 40%, #8a8f96, #3a3d42 60%, #111)'),
              }}
              className={`rounded-full block transition-all ${
                isNow
                  ? 'w-[54px] h-[54px] shadow-[0_0_0_2px_#000,0_0_0_4px_var(--gold),0_0_16px_rgba(236,211,149,0.55)]'
                  : isAlly
                    ? 'w-[44px] h-[44px] shadow-[0_0_0_2px_#000,0_0_0_3px_#3e5a3a]'
                    : 'w-[44px] h-[44px] shadow-[0_0_0_2px_#000,0_0_0_3px_#6b1e17]'
              }`}
            />
            <span className="truncate max-w-[60px]">{tok.name}</span>
            <div className="w-[40px] h-[3px] bg-[#2a0d0a] overflow-hidden">
              <b
                style={{ width: `${Math.min(100, Math.max(0, tok.hpPercent))}%` }}
                className="block h-full bg-[var(--blood)]"
              />
            </div>
          </button>
        );
      })}
    </div>
  );
};
