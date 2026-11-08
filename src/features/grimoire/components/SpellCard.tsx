import { BookOpen, Flame, Skull, Sparkles } from 'lucide-react';
import React from 'react';
import type { Spell, SpellCheckStatus } from '../types';

export const FONTE_CORES: Record<string, string> = {
  Peste: 'var(--plague)',
  Fogo: 'var(--ember)',
  Som: 'var(--mist)',
  Sangue: 'var(--blood)',
  Sombra: 'var(--iron)',
  Luz: 'var(--gold)',
  Arcana: 'var(--mana)',
};

interface SpellCardProps {
  magia: Spell;
  mode: 'known' | 'learn';
  avaliacao?: SpellCheckStatus;
  inspiracaoAtual?: number;
  onInspect: () => void;
  onCast?: () => void;
  onInvest?: () => void;
}

export const SpellCard: React.FC<SpellCardProps> = ({
  magia,
  mode,
  avaliacao,
  inspiracaoAtual = 0,
  onInspect,
  onCast,
  onInvest,
}) => {
  const circulo = Number(magia.circulo ?? 0);
  const fonte = (magia.fonte as string) || (magia.escola as string) || 'Arcana';
  const corFonte = FONTE_CORES[fonte] || 'var(--gold)';
  const custoFoco = Number(magia.custo_foco ?? circulo);

  return (
    <div className="grimoire-spell-card select-none">
      {/* Top Header */}
      <div>
        <div className="grimoire-spell-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, flex: 1 }}>
            <span
              style={{
                width: 9,
                height: 9,
                transform: 'rotate(45deg)',
                flexShrink: 0,
                backgroundColor: corFonte,
                boxShadow: '0 0 6px ' + corFonte,
              }}
              title={`Fonte: ${fonte}`}
            />
            <button
              type="button"
              onClick={onInspect}
              className="grimoire-spell-title truncate text-left"
            >
              {magia.nome}
            </button>
          </div>

          <div className="grimoire-spell-badges shrink-0">
            {/* Focus Pill */}
            <span
              className="grimoire-spell-source-tag"
              style={{
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#7dd3fc',
                fontWeight: 700,
              }}
            >
              {custoFoco} FOCO
            </span>
            {/* Circle Badge */}
            <span className="grimoire-spell-circle-tag">
              {circulo === 0 ? 'TRUQUE' : `CÍRC ${circulo}`}
            </span>
          </div>
        </div>

        {/* Subtitle / School */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.35rem', fontSize: '0.72rem', color: '#9a917f' }}>
          <span>{magia.escola || fonte}</span>
          {magia.raridade && magia.raridade !== 'Comum' && (
            <>
              <span>•</span>
              <span style={{ color: '#c9a961', textTransform: 'uppercase', fontWeight: 600 }}>
                {magia.raridade}
              </span>
            </>
          )}
          {fonte === 'Peste' && (
            <>
              <span>•</span>
              <span style={{ color: '#ef4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Skull size={10} /> Risco Peste
              </span>
            </>
          )}
        </div>

        {/* Short Summary */}
        <p style={{ fontSize: '0.75rem', color: '#b5aa96', marginTop: '0.45rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {magia.resumo || magia.descricao || 'Fórmula mística ancestral.'}
        </p>
      </div>

      {/* Bottom Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(201, 169, 97, 0.12)', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={onInspect}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8c7b68',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-title, "Cinzel", serif)',
            letterSpacing: '0.04em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.2rem 0.4rem',
            borderRadius: '4px',
          }}
        >
          <BookOpen size={12} />
          <span>Detalhes</span>
        </button>

        {mode === 'known' && (
          <button
            type="button"
            onClick={onCast}
            className="grimoire-card-action-btn primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              height: '28px',
              padding: '0 0.65rem',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Flame size={12} />
            <span>Conjurar</span>
          </button>
        )}

        {mode === 'learn' && avaliacao && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {avaliacao.jaAprendida ? (
              <span style={{ fontSize: '0.72rem', color: '#c9a961', fontWeight: 600 }}>
                ✓ Aprendida
              </span>
            ) : (
              <button
                type="button"
                onClick={onInvest}
                disabled={!avaliacao.pode || inspiracaoAtual <= 0}
                className={`grimoire-card-action-btn ${avaliacao.pode && inspiracaoAtual > 0 ? 'primary' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  height: '28px',
                  padding: '0 0.65rem',
                  fontSize: '0.72rem',
                  cursor: avaliacao.pode && inspiracaoAtual > 0 ? 'pointer' : 'not-allowed',
                  opacity: avaliacao.pode && inspiracaoAtual > 0 ? 1 : 0.5,
                }}
                title={avaliacao.statusText}
              >
                <Sparkles size={11} />
                <span>Estudar ({avaliacao.custo ?? 1} Insp)</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
