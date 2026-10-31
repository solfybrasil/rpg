import React, { useEffect } from 'react';
import { X, Sparkles, Shield, Skull, Zap, Clock, Compass, Layers } from 'lucide-react';
import type { Spell } from '../types';
import { FONTE_CORES } from './SpellCard';

interface SpellInspectModalProps {
  magia: Spell | null;
  onClose: () => void;
  onCastFromInspect?: () => void;
}

export const SpellInspectModal: React.FC<SpellInspectModalProps> = ({
  magia,
  onClose,
  onCastFromInspect,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!magia) return null;

  const circulo = Number(magia.circulo ?? 0);
  const fonte = (magia.fonte as string) || (magia.escola as string) || 'Arcana';
  const corFonte = FONTE_CORES[fonte] || '#c9a961';
  const custoFoco = Number(magia.custo_foco ?? circulo);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: corFonte }}
              />
              <h3 className="font-cinzel font-bold text-lg text-[var(--text-1)]">
                {magia.nome}
              </h3>
            </div>
            <p className="text-xs text-[var(--text-3)] mt-0.5 font-cinzel">
              {circulo === 0 ? 'Truque Inato' : `Círculo ${circulo}`} • Fonte {fonte} • Escola de {magia.escola || 'Magia'}
              {magia.raridade && ` • ${magia.raridade}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--card)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Specs Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded bg-[var(--card)] border border-[var(--border)] flex flex-col">
            <span className="text-[10px] text-[var(--text-3)] uppercase font-cinzel">Custo de Foco</span>
            <span className="font-mono font-bold text-sky-400 mt-0.5">{custoFoco} Foco</span>
          </div>
          <div className="p-2 rounded bg-[var(--card)] border border-[var(--border)] flex flex-col">
            <span className="text-[10px] text-[var(--text-3)] uppercase font-cinzel">Alcance</span>
            <span className="text-[var(--text-1)] mt-0.5 truncate">{magia.alcance || 'Curto (3m)'}</span>
          </div>
          <div className="p-2 rounded bg-[var(--card)] border border-[var(--border)] flex flex-col">
            <span className="text-[10px] text-[var(--text-3)] uppercase font-cinzel">Área / Alvo</span>
            <span className="text-[var(--text-1)] mt-0.5 truncate">{magia.area || '1 Alvo'}</span>
          </div>
          <div className="p-2 rounded bg-[var(--card)] border border-[var(--border)] flex flex-col">
            <span className="text-[10px] text-[var(--text-3)] uppercase font-cinzel">Duração</span>
            <span className="text-[var(--text-1)] mt-0.5 truncate">{magia.duracao || 'Instantânea'}</span>
          </div>
        </div>

        {/* Description in Newsreader */}
        <div className="p-3.5 rounded bg-[var(--card)] border border-[var(--border)] flex flex-col gap-1.5">
          <span className="text-[10px] font-cinzel uppercase text-[var(--gold-dim)] tracking-wider">
            Descrição do Feitiço
          </span>
          <p className="font-newsreader italic text-[var(--text-2)] text-sm leading-relaxed whitespace-pre-line">
            {magia.descricao || magia.resumo || 'Nenhuma descrição detalhada documentada nos antigos códices.'}
          </p>
        </div>

        {/* Effects: Sucesso, Brilhante, Falha */}
        {(magia.efeito_sucesso || magia.efeito_brilhante || magia.efeito_falha) && (
          <div className="flex flex-col gap-2">
            {magia.efeito_sucesso && (
              <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-900/40 text-xs">
                <span className="font-cinzel font-semibold text-emerald-400 block mb-0.5">
                  Sucesso (Total ≥ Peso):
                </span>
                <span className="text-[var(--text-2)]">{magia.efeito_sucesso}</span>
              </div>
            )}
            {magia.efeito_brilhante && (
              <div className="p-2.5 rounded bg-amber-950/20 border border-amber-900/40 text-xs">
                <span className="font-cinzel font-semibold text-amber-400 block mb-0.5">
                  Sucesso Brilhante (Total ≥ Peso + 5):
                </span>
                <span className="text-[var(--text-2)]">{magia.efeito_brilhante}</span>
              </div>
            )}
            {magia.efeito_falha && (
              <div className="p-2.5 rounded bg-rose-950/20 border border-rose-900/40 text-xs">
                <span className="font-cinzel font-semibold text-rose-400 block mb-0.5">
                  Falha (Total &lt; Peso):
                </span>
                <span className="text-[var(--text-2)]">{magia.efeito_falha}</span>
              </div>
            )}
          </div>
        )}

        {/* Ampliar */}
        {magia.ampliar && (
          <div className="p-3 rounded bg-[var(--card)] border border-[var(--border)] text-xs">
            <span className="text-[10px] font-cinzel uppercase text-[var(--gold)] block mb-1">
              Ampliação de Poder (+1 Foco por nível)
            </span>
            <span className="text-[var(--text-2)]">{magia.ampliar}</span>
          </div>
        )}

        {/* Risco Peste */}
        {fonte === 'Peste' && (
          <div className="p-3 rounded bg-amber-950/30 border border-amber-700/50 flex items-start gap-2.5 text-xs">
            <Skull size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-cinzel font-semibold text-amber-300 block">
                Risco do Contágio da Peste
              </span>
              <p className="text-[var(--text-2)] mt-0.5">
                Magias da fonte Peste colocam o conjurador sob risco imediato de contrair a mácula sobrenatural.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-cinzel text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--card)] transition-colors"
          >
            Fechar
          </button>
          {onCastFromInspect && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onCastFromInspect();
              }}
              className="px-4 py-2 rounded bg-[var(--gold)] hover:bg-[var(--gold-bright)] text-black font-cinzel font-semibold text-xs transition-colors shadow-sm"
            >
              Preparar Conjuração
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
