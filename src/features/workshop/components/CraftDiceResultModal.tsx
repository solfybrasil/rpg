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
      <div className="relative w-full max-w-md bg-[#14120e] border border-[rgba(201,169,97,0.35)] rounded-2xl p-6 shadow-[0_12px_48px_rgba(0,0,0,0.9)] flex flex-col items-center text-center">
        {/* Top gold bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[rgba(201,169,97,0.6)] to-transparent pointer-events-none" />

        {/* Botão fechar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#9a917f] hover:text-[#f5ede0] rounded-full bg-[#1e1a14] border border-[rgba(201,169,97,0.25)] transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Notificação de Receita Descoberta */}
        {recipeDiscovered && (
          <div className="mb-3 px-3 py-1 rounded-full bg-[#2a133d] border border-[#a855f7]/60 text-[#d8b4fe] font-['Cinzel',serif] text-xs flex items-center gap-1.5 animate-bounce">
            <Sparkles size={14} />
            <span>Fórmula Descoberta e Gravada no Livro!</span>
          </div>
        )}

        {/* Título do Resultado */}
        <div className="mb-4">
          <h2
            className={`text-xl font-['Cinzel',serif] font-bold tracking-wider uppercase ${
              outcome === 'critico' || isBrilliant
                ? 'text-[#ffd27a] drop-shadow-[0_0_12px_rgba(255,210,122,0.5)]'
                : isSuccess
                  ? 'text-[#86efac]'
                  : 'text-[#fca5a5]'
            }`}
          >
            {outcome === 'critico' && '★ CRÍTICO ABSOLUTO ★'}
            {outcome === 'brilhante' && '✨ SUCESSO BRILHANTE ✨'}
            {outcome === 'sucesso' && '✓ SUCESSO NA CRIAÇÃO'}
            {outcome === 'falha' && '✕ FALHA NO PROCESSO'}
            {outcome === 'desastre' && '⚠ DESASTRE DOS ELEMENTOS'}
          </h2>
          <span className="text-xs text-[#9a917f] font-serif italic">
            {isSuccess
              ? 'A harmonia das matérias moldou o item com maestria.'
              : 'As matérias não resistiram à pressão da criação.'}
          </span>
        </div>

        {/* Dados 2d6 */}
        <div className="flex items-center gap-3 my-2">
          <div className="w-14 h-14 rounded-xl bg-[#0d0c0a] border-2 border-[rgba(201,169,97,0.3)] flex items-center justify-center font-['Cinzel',serif] text-2xl font-bold text-[#f5ede0] shadow-lg">
            {dice1}
          </div>
          <span className="text-xl font-['Cinzel',serif] text-[#8c8272]">+</span>
          <div className="w-14 h-14 rounded-xl bg-[#0d0c0a] border-2 border-[rgba(201,169,97,0.3)] flex items-center justify-center font-['Cinzel',serif] text-2xl font-bold text-[#f5ede0] shadow-lg">
            {dice2}
          </div>
          <span className="text-xl font-['Cinzel',serif] text-[#8c8272]">+</span>
          <div className="flex flex-col items-center">
            <span className="font-['Cinzel',serif] text-xs text-[#9a917f]">Mod</span>
            <span className="font-['Cinzel',serif] text-lg font-bold text-[#ffd27a]">+{modifier}</span>
          </div>
          <span className="text-xl font-['Cinzel',serif] text-[#8c8272]">=</span>
          <div
            className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center font-['Cinzel',serif] shadow-lg ${
              isSuccess
                ? 'bg-[#0f2416] border-[#22c55e] text-[#86efac]'
                : 'bg-[#291111] border-[#ef4444] text-[#fca5a5]'
            }`}
          >
            <span className="text-xl font-bold">{total}</span>
            <span className="text-[9px] text-[#9a917f]">vs {peso}</span>
          </div>
        </div>

        {/* Detalhes de bônus do minigame se houve */}
        {minigameBonus > 0 && (
          <div className="text-[11px] font-['Cinzel',serif] text-[#ffd27a] mt-1">
            + {minigameBonus} bônus aplicado pelo minigame de habilidade
          </div>
        )}

        {/* Produto Entregue na Mochila */}
        {isSuccess && recipe && (
          <div className="w-full my-4 p-3 rounded-xl bg-[#0d0c0a] border border-[rgba(201,169,97,0.25)] flex items-center gap-3 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-lg bg-[#14120e] border border-[rgba(201,169,97,0.2)] flex items-center justify-center flex-shrink-0">
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
                <span className="text-sm font-['Cinzel',serif] font-bold text-[#f5ede0] truncate">
                  {recipe.result_name}
                </span>
                <span className="text-xs font-['Cinzel',serif] font-bold text-[#ffd27a]">
                  ×{finalYieldQty}
                </span>
              </div>
              <span className="text-[11px] font-['Cinzel',serif] text-[#86efac]">
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
              className={`w-full py-2.5 px-4 rounded-xl font-['Cinzel',serif] text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                playerInspiration > 0
                  ? 'bg-[#2a1d12] border-[rgba(201,169,97,0.5)] text-[#f5ede0] hover:border-[#c9a961] cursor-pointer'
                  : 'bg-[#14120e] border-[rgba(201,169,97,0.15)] text-[#8c8272] cursor-not-allowed'
              }`}
            >
              <RotateCcw size={14} />
              <span>Rolar Novamente (Gasta 1 Inspiração · Tem: {playerInspiration})</span>
            </button>

            <button
              type="button"
              onClick={onBreakOath}
              disabled={isResolving}
              className="w-full py-2 px-4 rounded-xl font-['Cinzel',serif] text-xs font-bold flex items-center justify-center gap-2 bg-[#2a133d] border border-[#a855f7]/60 text-[#d8b4fe] hover:bg-[#3b1b54] cursor-pointer transition-all"
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
          className="mt-2 w-full py-2.5 rounded-xl bg-[#1e1a14] hover:bg-[#262018] border border-[rgba(201,169,97,0.3)] font-['Cinzel',serif] text-xs font-bold text-[#f5ede0] uppercase tracking-wider transition-colors cursor-pointer"
        >
          {isSuccess ? 'Coletar e Fechar' : 'Aceitar e Fechar'}
        </button>
      </div>
    </div>
  );
};
