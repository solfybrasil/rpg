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
    <div className="slab p-3.5 flex flex-col justify-between gap-3 hover:border-[var(--gold-lo)] transition-colors select-none">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rotate-45 shrink-0 shadow-sm"
              style={{ backgroundColor: corFonte }}
              title={`Fonte: ${fonte}`}
            />
            <button
              type="button"
              onClick={onInspect}
              className="font-['Cinzel',serif] font-bold text-sm text-[var(--text)] hover:text-[var(--gold-hi)] cursor-pointer truncate transition-colors text-left"
            >
              {magia.nome}
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Focus Pill */}
            <span className="px-2 py-0.5 border border-[var(--mana)]/60 bg-[var(--mana)]/10 text-[var(--mist)] text-[10px] font-['Cinzel',serif] font-bold tabular-nums">
              {custoFoco} FOCO
            </span>
            {/* Circle Badge */}
            <span className="px-1.5 py-0.5 border border-[var(--iron)] text-[var(--gold)] text-[10px] font-['Cinzel',serif] font-bold">
              {circulo === 0 ? 'TRUQUE' : `CÍRC ${circulo}`}
            </span>
          </div>
        </div>

        {/* Subtitle / School */}
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] font-['EB_Garamond',serif] italic mt-1">
          <span>{magia.escola || fonte}</span>
          {magia.raridade && magia.raridade !== 'Comum' && (
            <>
              <span>•</span>
              <span className="text-[var(--gold)] font-['Cinzel',serif] text-[9.5px] uppercase">
                {magia.raridade}
              </span>
            </>
          )}
          {fonte === 'Peste' && (
            <>
              <span>•</span>
              <span className="text-[var(--blood)] font-bold flex items-center gap-1">
                <Skull size={10} /> Risco Peste
              </span>
            </>
          )}
        </div>

        {/* Short Summary */}
        <p className="text-xs text-[var(--text)] font-['EB_Garamond',serif] line-clamp-2 mt-2 leading-relaxed">
          {magia.resumo || magia.descricao || 'Fórmula mística ancestral.'}
        </p>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--iron)]/60 gap-2">
        <button
          type="button"
          onClick={onInspect}
          className="text-[11px] font-['Cinzel',serif] uppercase tracking-wider text-[var(--muted)] hover:text-white px-2 py-1 transition-colors flex items-center gap-1"
        >
          <BookOpen size={12} />
          <span>Detalhes</span>
        </button>

        {mode === 'known' && (
          <button
            type="button"
            onClick={onCast}
            className="end-turn h-7 px-3 text-[11px] font-bold font-['Cinzel',serif] text-[var(--abyss)] flex items-center gap-1"
          >
            <Flame size={12} className="fill-current" />
            <span>Conjurar</span>
          </button>
        )}

        {mode === 'learn' && avaliacao && (
          <div className="flex items-center gap-2">
            {avaliacao.jaAprendida ? (
              <span className="text-[11px] text-[var(--gold)] font-['Cinzel',serif]">
                ✓ Aprendida
              </span>
            ) : (
              <button
                type="button"
                onClick={onInvest}
                disabled={!avaliacao.pode || inspiracaoAtual <= 0}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-['Cinzel',serif] uppercase tracking-wider border transition-colors ${
                  avaliacao.pode && inspiracaoAtual > 0
                    ? 'border-[var(--gold)] text-[var(--gold-hi)] hover:bg-[var(--gold-lo)]/20 cursor-pointer'
                    : 'border-[var(--iron)] text-[var(--muted)] opacity-50 cursor-not-allowed'
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
