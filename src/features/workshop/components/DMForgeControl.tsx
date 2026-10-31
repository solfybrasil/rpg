import { Flame, Power } from 'lucide-react';
import React from 'react';
import { useGameState } from '../../../shared/hooks/baseHooks';
import { useToggleForgeMutation } from '../api/useWorkshop';

export const DMForgeControl: React.FC = () => {
  const { gameState, isLoading } = useGameState();
  const toggleMutation = useToggleForgeMutation();

  const isAvailable = Boolean(gameState?.forge_available);

  const handleToggle = () => {
    toggleMutation.mutate({ forgeAvailable: !isAvailable });
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 shadow-md">
      <div className="flex items-center gap-2.5">
        <div
          className={`p-2 rounded-lg border transition-all ${
            isAvailable
              ? 'bg-amber-950/60 border-amber-500/80 text-amber-400 shadow-[0_0_12px_rgba(245,182,91,0.3)] animate-pulse'
              : 'bg-neutral-900 border-neutral-800 text-neutral-500'
          }`}
        >
          <Flame size={18} />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
            Status da Forja (Mestre)
          </span>
          <span className="text-[11px] font-mono text-neutral-400">
            {isAvailable ? 'Forja acesa · Jogadores podem forjar' : 'Forja apagada · Criação bloqueada'}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={isLoading || toggleMutation.isPending}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all active:scale-95 cursor-pointer ${
          isAvailable
            ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md'
            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
        }`}
      >
        <Power size={13} />
        <span>{isAvailable ? 'Apagar' : 'Acender'}</span>
      </button>
    </div>
  );
};
