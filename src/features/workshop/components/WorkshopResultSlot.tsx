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
          btnClass: 'forge-hammer-action-btn',
          bgClass: 'forge-hammer-btn-bg',
          textWrapClass: 'forge-hammer-btn-text-wrap',
          titleClass: 'forge-hammer-btn-title',
          subtitleClass: 'forge-hammer-btn-subtitle',
        };
      case 'alquimia':
        return {
          default: '/assets/alquimia/preparar.webp',
          active: '/assets/alquimia/preparar_apertado.webp',
          disabled: '/assets/alquimia/preparar_desligado.webp',
          title: prerequisites.canOperate ? 'DESTILAR NO CALDEIRÃO' : 'SEM REQUISITOS',
          subtitle: 'Inicia o minigame das bolhas de vapor',
          btnClass: 'alchemy-action-btn',
          bgClass: 'alchemy-action-btn-bg',
          textWrapClass: 'alchemy-action-btn-text-wrap',
          titleClass: 'alchemy-action-btn-title',
          subtitleClass: 'alchemy-action-btn-subtitle',
        };
      case 'cozinha':
        return {
          default: '/assets/cozinha/cozinhar.webp',
          active: '/assets/cozinha/cozinhar_apertado.webp',
          disabled: '/assets/cozinha/cozinhar_desligado.webp',
          title: prerequisites.forgeReady ? 'COZINHAR NA GRELHA' : 'FOGO APAGADO',
          subtitle: 'Prepara o prato e testa a culinária',
          btnClass: 'cozinha-cook-btn',
          bgClass: 'cozinha-cook-btn-bg',
          textWrapClass: 'cozinha-cook-btn-text-wrap',
          titleClass: 'cozinha-cook-btn-title',
          subtitleClass: 'cozinha-cook-btn-subtitle',
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
    <div className="forge-result-col">
      <span className="forge-result-header-label">RESULTADO</span>

      {/* Palco do Ícone Resultante com Moldura e Brilho de Brasas */}
      <div className="forge-result-stage">
        <div className="forge-result-inner-glow">
          {matchedRecipe ? (
            isKnown ? (
              matchedRecipe.image_url ? (
                <img
                  src={matchedRecipe.image_url}
                  alt={matchedRecipe.result_name}
                  className="forge-result-thumb"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span style={{ fontSize: '2.5rem' }}>
                  {matchedRecipe.rarity === 'Artefato' ? '✨' : station === 'forja' ? '⚔️' : station === 'alquimia' ? '🧪' : '🍲'}
                </span>
              )
            ) : (
              <span className="forge-result-unknown-char">?</span>
            )
          ) : (
            <span className="forge-result-empty-char">∅</span>
          )}
        </div>
        <img src="/assets/forja/quadro_resultado.webp" alt="" className="forge-result-frame-img" />
      </div>

      {/* Detalhes da Receita Encontrada */}
      {matchedRecipe ? (
        isKnown ? (
          <>
            <h3 className="forge-result-title">
              {matchedRecipe.result_name} {(matchedRecipe.result_qty || 1) > 1 ? `(${matchedRecipe.result_qty}x)` : ''}
            </h3>
            <p className="forge-result-desc">
              {matchedRecipe.description || (matchedRecipe.category ? `Item da categoria ${matchedRecipe.category}` : 'Receita tradicional forjada sob juramento.')}
            </p>
            <div className="forge-result-pills-row">
              <span className="forge-stat-pill">Peso {matchedRecipe.peso}</span>
              <span className="forge-stat-pill">
                Astúcia + {station === 'forja' ? 'Forja' : station === 'alquimia' ? 'Alquimia' : 'Sobrevivência'} (+{playerModifier})
              </span>
              <span className="forge-stat-pill chance">Chance: {successChancePct}%</span>
              {matchedRecipe.rarity && (
                <span className="forge-stat-pill rarity">{matchedRecipe.rarity}</span>
              )}
            </div>
          </>
        ) : (
          <>
            <h3 className="forge-result-title" style={{ color: '#c084fc' }}>
              <Sparkles size={14} className="inline mr-1" /> Fórmula Oculta
            </h3>
            <p className="forge-result-desc">
              Você combinou os ingredientes exatos de uma receita ainda não registrada no seu Livro. O Peso é desconhecido até a martelada final.
            </p>
          </>
        )
      ) : (
        <p className="forge-result-desc" style={{ color: '#8c7b68', fontStyle: 'italic', margin: '14px 0' }}>
          Organize os materiais na bigorna para revelar o que suas mãos são capazes de moldar.
        </p>
      )}

      {/* Alerta de Requisitos Faltando */}
      {!prerequisites.canOperate && (
        <div className="forge-reqs-alert">
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <div className="space-y-0.5">
            {prerequisites.missingReasons.map((reason, idx) => (
              <div key={idx}>• {reason}</div>
            ))}
          </div>
        </div>
      )}

      {/* Botão Oficial Forjado */}
      <button
        type="button"
        onClick={onStartCraft}
        disabled={!isButtonEnabled}
        className={btnConfig.btnClass}
      >
        <img
          src={btnImgSrc}
          alt={btnConfig.title}
          className={btnConfig.bgClass}
        />
        <div className={btnConfig.textWrapClass}>
          <span className={btnConfig.titleClass}>
            {btnConfig.title}
          </span>
          <span className={btnConfig.subtitleClass}>
            {btnConfig.subtitle}
          </span>
        </div>
      </button>
    </div>
  );
};
