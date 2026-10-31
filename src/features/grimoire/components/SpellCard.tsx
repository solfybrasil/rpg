import React from 'react';
import { Sparkles, BookOpen, Flame, Droplets, Skull, Shield, Eye, Clock } from 'lucide-react';
import type { Spell, SpellCheckStatus } from '../types';

export const FONTE_CORES: Record<string, string> = {
  Peste: '#7d8a3c',
  Fogo: '#b8433a',
  Som: '#5b7fa6',
  Sangue: '#8e2a24',
  Sombra: '#6b6456',
  Luz: '#c9a961',
  Arcana: '#4a9084',
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
  const corFonte = FONTE_CORES[fonte] || '#c9a961';
  const custoFoco = Number(magia.custo_foco ?? circulo);

  return (
    <div className="flex flex-col justify-between p-3.5 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-[var(--gold-dim)] transition-colors shadow-sm gap-3">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: corFonte }}
              title={`Fonte: ${fonte}`}
            />
            <h4
              onClick={onInspect}
              className="font-cinzel font-semibold text-sm text-[var(--text-1)] hover:text-[var(--gold-bright)] cursor-pointer truncate transition-colors"
            >
              {magia.nome}
            </h4>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Focus Pill */}
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950/60 text-sky-300 border border-sky-800/70">
              {custoFoco} {custoFoco === 1 ? 'FOCO' : 'FOCO'}
            </span>
            {/* Circle Badge */}
            <span className="px-1.5 py-0.5 rounded text-[10px] font-cinzel font-semibold bg-[var(--surface)] text-[var(--gold)] border border-[var(--border)]">
              {circulo === 0 ? 'TRUQUE' : `CÍRC ${circulo}`}
            </span>
          </div>
        </div>

        {/* Subtitle / School */}
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-3)] mt-1">
          <span>{magia.escola || fonte}</span>
          {magia.raridade && magia.raridade !== 'Comum' && (
            <>
              <span>•</span>
              <span className="text-[var(--gold-dim)]">{magia.raridade}</span>
            </>
          )}
          {fonte === 'Peste' && (
            <>
              <span>•</span>
              <span className="text-amber-500 font-semibold flex items-center gap-1">
                <Skull size={10} /> Risco Peste
              </span>
            </>
          )}
        </div>

        {/* Short Summary */}
        <p className="text-xs text-[var(--text-2)] line-clamp-2 mt-2 leading-relaxed">
          {magia.resumo || magia.descricao || 'Fórmula mística ancestral.'}
        </p>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/60 gap-2">
        <button
          type="button"
          onClick={onInspect}
          className="text-[11px] font-cinzel text-[var(--text-3)] hover:text-[var(--text-1)] px-2 py-1 rounded transition-colors flex items-center gap-1"
        >
          <BookOpen size={12} />
          <span>Detalhes</span>
        </button>

        {mode === 'known' && (
          <button
            type="button"
            onClick={onCast}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--gold)] hover:bg-[var(--gold-bright)] text-black font-cinzel font-semibold text-xs transition-colors shadow-sm active:scale-95 cursor-pointer"
          >
            <Flame size={13} className="fill-black" />
            <span>Conjurar</span>
          </button>
        )}

        {mode === 'learn' && avaliacao && (
          <div className="flex items-center gap-2">
            {avaliacao.jaAprendida ? (
              <span className="text-[11px] text-[var(--gold-dim)] font-cinzel">✓ Aprendida</span>
            ) : (
              <button
                type="button"
                onClick={onInvest}
                disabled={!avaliacao.pode || inspiracaoAtual <= 0}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-cinzel transition-colors ${
                  avaliacao.pode && inspiracaoAtual > 0
                    ? 'bg-[var(--surface)] text-[var(--gold)] border border-[var(--gold)] hover:bg-[var(--gold)] hover:text-black cursor-pointer'
                    : 'bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed'
                }`}
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
