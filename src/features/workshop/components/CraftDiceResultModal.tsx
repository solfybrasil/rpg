import { AlertCircle, CheckCircle, Flame, RotateCcw, ShieldAlert, Sparkles, X } from 'lucide-react';
import React from 'react';
import type { CraftRollResult, GridRecipeRecord } from '../../../entities/recipe';

interface CraftDiceResultModalProps {
  isOpen: boolean;
  recipe?: GridRecipeRecord | null;
  rollResult: CraftRollResult | null;
  minigameBonus: number;
  playerInspiration: number;
  isResolving: boolean;
  recipeDiscovered?: boolean;
  onReroll: () => void;
  onBreakOath: () => void;
  onClose: () => void;
}

export const CraftDiceResultModal: React.FC<CraftDiceResultModalProps> = ({
  isOpen,
  recipe,
  rollResult,
  minigameBonus,
  playerInspiration,
  isResolving,
  recipeDiscovered,
  onReroll,
  onBreakOath,
  onClose,
}) => {
  if (!isOpen || !rollResult) return null;

  const { dice1, dice2, modifier, total, peso, outcome, isBrilliant, yieldMultiplier } = rollResult;
  const isSuccess = ['sucesso', 'brilhante', 'critico'].includes(outcome);
  const isFailure = outcome === 'falha' || outcome === 'desastre';

  const finalYieldQty = (recipe?.result_qty || 1) * yieldMultiplier;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Botão fechar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-full bg-neutral-900 border border-neutral-800"
        >
          <X size={18} />
        </button>

        {/* Notificação de Receita Descoberta */}
        {recipeDiscovered && (
          <div className="mb-3 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/60 text-purple-300 font-mono text-xs flex items-center gap-1.5 animate-bounce">
            <Sparkles size={14} />
            <span>Fórmula Descoberta e Gravada no Livro!</span>
          </div>
        )}

        {/* Título do Resultado */}
        <div className="mb-4">
          <h2
            className={`text-xl font-mono font-bold tracking-wider uppercase ${
              outcome === 'critico' || isBrilliant
                ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,182,91,0.5)]'
                : isSuccess
                  ? 'text-emerald-400'
                  : 'text-red-400'
            }`}
          >
            {outcome === 'critico' && '★ CRÍTICO ABSOLUTO ★'}
            {outcome === 'brilhante' && '✨ SUCESSO BRILHANTE ✨'}
            {outcome === 'sucesso' && '✓ SUCESSO NA CRIAÇÃO'}
            {outcome === 'falha' && '✕ FALHA NO PROCESSO'}
            {outcome === 'desastre' && '⚠ DESASTRE DOS ELEMENTOS'}
          </h2>
          <span className="text-xs text-neutral-400 font-serif italic">
            {isSuccess
              ? 'A harmonia das matérias moldou o item com maestria.'
              : 'As matérias não resistiram à pressão da criação.'}
          </span>
        </div>

        {/* Dados 2d6 */}
        <div className="flex items-center gap-3 my-2">
          <div className="w-14 h-14 rounded-xl bg-neutral-900 border-2 border-neutral-700 flex items-center justify-center font-mono text-2xl font-bold text-white shadow-lg">
            {dice1}
          </div>
          <span className="text-xl font-mono text-neutral-500">+</span>
          <div className="w-14 h-14 rounded-xl bg-neutral-900 border-2 border-neutral-700 flex items-center justify-center font-mono text-2xl font-bold text-white shadow-lg">
            {dice2}
          </div>
          <span className="text-xl font-mono text-neutral-500">+</span>
          <div className="flex flex-col items-center">
            <span className="font-mono text-xs text-neutral-400">Mod</span>
            <span className="font-mono text-lg font-bold text-amber-400">+{modifier}</span>
          </div>
          <span className="text-xl font-mono text-neutral-500">=</span>
          <div
            className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center font-mono shadow-lg ${
              isSuccess
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                : 'bg-red-950/40 border-red-500 text-red-300'
            }`}
          >
            <span className="text-xl font-bold">{total}</span>
            <span className="text-[9px] text-neutral-400">vs {peso}</span>
          </div>
        </div>

        {/* Detalhes de bônus do minigame se houve */}
        {minigameBonus > 0 && (
          <div className="text-[11px] font-mono text-amber-300 mt-1">
            + {minigameBonus} bônus aplicado pelo minigame de habilidade
          </div>
        )}

        {/* Produto Entregue na Mochila */}
        {isSuccess && recipe && (
          <div className="w-full my-4 p-3 rounded-xl bg-neutral-900/90 border border-emerald-900/60 flex items-center gap-3 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center flex-shrink-0">
              {recipe.image_url ? (
                <img
                  src={recipe.image_url}
                  alt={recipe.result_name}
                  className="w-10 h-10 object-contain drop-shadow"
                />
              ) : (
                <span className="text-2xl">📦</span>
              )}
            </div>
            <div className="text-left flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-white truncate">
                  {recipe.result_name}
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  ×{finalYieldQty}
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                {isBrilliant ? 'Rendimento Dobrado (+100%) entregue na mochila!' : 'Item adicionado à sua mochila!'}
              </span>
            </div>
          </div>
        )}

        {/* Ações em caso de falha: Reroll ou Juramento */}
        {isFailure && (
          <div className="w-full my-4 space-y-2">
            <button
              type="button"
              onClick={onReroll}
              disabled={playerInspiration <= 0 || isResolving}
              className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                playerInspiration > 0
                  ? 'bg-amber-950/60 border-amber-600 text-amber-200 hover:bg-amber-900/60 cursor-pointer'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-600 cursor-not-allowed'
              }`}
            >
              <RotateCcw size={14} />
              <span>Rolar Novamente (Gasta 1 Inspiração · Tem: {playerInspiration})</span>
            </button>

            <button
              type="button"
              onClick={onBreakOath}
              disabled={isResolving}
              className="w-full py-2 px-4 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 bg-purple-950/40 border border-purple-800/60 text-purple-300 hover:bg-purple-900/50 cursor-pointer transition-all"
            >
              <ShieldAlert size={14} />
              <span>Quebrar Juramento (+1 Praga para Forçar Sucesso)</span>
            </button>
          </div>
        )}

        {/* Botão Concluir */}
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-mono text-xs font-bold text-neutral-200 uppercase tracking-wider transition-colors cursor-pointer"
        >
          {isSuccess ? 'Coletar e Fechar' : 'Aceitar e Fechar'}
        </button>
      </div>
    </div>
  );
};
