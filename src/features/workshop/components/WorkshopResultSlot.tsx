import { AlertTriangle, Sparkles } from 'lucide-react';
import React from 'react';
import type { GridRecipeRecord, StationPrerequisites, WorkshopStation } from '../../../entities/recipe';

interface WorkshopResultSlotProps {
  station: WorkshopStation;
  matchedRecipe?: GridRecipeRecord | null;
  isKnown: boolean;
  canCraft: boolean;
  prerequisites: StationPrerequisites;
  playerModifier: number;
  successChancePct: number;
  isCrafting: boolean;
  onStartCraft: () => void;
}

export const WorkshopResultSlot: React.FC<WorkshopResultSlotProps> = ({
  station,
  matchedRecipe,
  isKnown,
  canCraft,
  prerequisites,
  playerModifier,
  successChancePct,
  isCrafting,
  onStartCraft,
}) => {
  const getActionBtnImages = () => {
    switch (station) {
      case 'forja':
        return {
          default: '/assets/forja/martelar.webp',
          active: '/assets/forja/martelar_apertado.webp',
          disabled: '/assets/forja/martelar_desligado.webp',
          title: prerequisites.forgeReady ? 'MARTELAR NA BIGORNA' : 'FORJA APAGADA',
          subtitle: prerequisites.forgeReady ? 'Inicia o minigame do martelo e teste' : 'Aguarde o Mestre acender a forja',
        };
      case 'alquimia':
        return {
          default: '/assets/alquimia/preparar.webp',
          active: '/assets/alquimia/preparar_apertado.webp',
          disabled: '/assets/alquimia/preparar_desligado.webp',
          title: prerequisites.canOperate ? 'DESTILAR NO CALDEIRÃO' : 'SEM REQUISITOS',
          subtitle: 'Inicia o minigame das bolhas de vapor',
        };
      case 'cozinha':
        return {
          default: '/assets/cozinha/cozinhar.webp',
          active: '/assets/cozinha/cozinhar_apertado.webp',
          disabled: '/assets/cozinha/cozinhar_desligado.webp',
          title: prerequisites.forgeReady ? 'COZINHAR NA GRELHA' : 'FOGO APAGADO',
          subtitle: 'Prepara o prato e testa a culinária',
        };
    }
  };

  const btnConfig = getActionBtnImages();
  const isButtonEnabled = canCraft && prerequisites.canOperate && !isCrafting;
  const btnImgSrc = !isButtonEnabled
    ? btnConfig.disabled
    : isCrafting
      ? btnConfig.active
      : btnConfig.default;

  return (
    <div className="flex flex-col items-center bg-neutral-900/60 rounded-xl border border-neutral-800 p-3 max-w-sm w-full shadow-inner">
      <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2">
        Produto Resultante
      </span>

      {/* Palco do Produto */}
      <div className="relative w-24 h-24 rounded-xl border-2 border-amber-900/40 bg-neutral-950/80 flex items-center justify-center p-2 mb-3 shadow-[0_0_15px_rgba(0,0,0,0.8)] overflow-hidden">
        {matchedRecipe ? (
          isKnown ? (
            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              {matchedRecipe.image_url ? (
                <img
                  src={matchedRecipe.image_url}
                  alt={matchedRecipe.result_name}
                  className="w-16 h-16 object-contain drop-shadow-[0_0_10px_rgba(245,182,91,0.3)]"
                />
              ) : (
                <span className="text-3xl">
                  {station === 'forja' ? '⚔️' : station === 'alquimia' ? '🧪' : '🍲'}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center animate-pulse">
              <span className="text-4xl font-serif text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.5)]">
                ?
              </span>
            </div>
          )
        ) : (
          <span className="text-3xl text-neutral-700 font-mono select-none">∅</span>
        )}

        {/* Brilho de Brasas / Vapor no fundo */}
        {matchedRecipe && (
          <div className="absolute inset-0 bg-gradient-to-t from-amber-600/10 via-transparent to-transparent pointer-events-none" />
        )}
      </div>

      {/* Descrição e Estatísticas da Receita */}
      {matchedRecipe ? (
        isKnown ? (
          <div className="text-center w-full space-y-1.5 mb-3">
            <h3 className="text-sm font-mono font-bold text-amber-200">
              {matchedRecipe.result_name}
              {(matchedRecipe.result_qty || 1) > 1 ? ` (${matchedRecipe.result_qty}x)` : ''}
            </h3>
            <p className="text-[11px] text-neutral-400 line-clamp-2 px-2 font-serif italic">
              {matchedRecipe.description || 'Receita tradicional forjada sob juramento.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300">
                Peso {matchedRecipe.peso}
              </span>
              <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">
                Mod: +{playerModifier}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
                Chance: {successChancePct}%
              </span>
              {matchedRecipe.rarity && (
                <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-purple-300">
                  {matchedRecipe.rarity}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center w-full space-y-1 mb-3 px-2">
            <h3 className="text-sm font-mono font-bold text-purple-300 flex items-center justify-center gap-1">
              <Sparkles size={14} /> Fórmula Oculta
            </h3>
            <p className="text-[11px] text-purple-200/70 font-serif italic">
              Combinação exata de uma fórmula não registrada no seu livro. O Peso é desconhecido até o golpe final!
            </p>
          </div>
        )
      ) : (
        <p className="text-[11px] text-neutral-500 font-serif italic text-center mb-3 px-2">
          Organize os materiais na grade 3×3 para revelar o que suas mãos são capazes de moldar.
        </p>
      )}

      {/* Avisos de Pré-requisitos Pendentes */}
      {!prerequisites.canOperate && (
        <div className="w-full mb-3 p-2 rounded-lg bg-red-950/40 border border-red-800/50 flex items-start gap-2 text-left">
          <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-[11px] text-red-300 font-mono">
            {prerequisites.missingReasons.map((reason, idx) => (
              <div key={idx}>• {reason}</div>
            ))}
          </div>
        </div>
      )}

      {/* Botão Oficial Themed de Ação */}
      <button
        type="button"
        onClick={onStartCraft}
        disabled={!isButtonEnabled}
        className={`relative w-full max-w-[260px] h-[52px] rounded-lg overflow-hidden flex items-center justify-center transition-transform active:scale-95 ${
          !isButtonEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:brightness-110'
        }`}
      >
        <img
          src={btnImgSrc}
          alt={btnConfig.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-2 select-none">
          <span className="text-xs font-mono font-bold tracking-wider text-amber-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {btnConfig.title}
          </span>
          <span className="text-[9px] font-mono text-amber-200/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {btnConfig.subtitle}
          </span>
        </div>
      </button>
    </div>
  );
};
