import React from 'react';
import { X, Sparkles, Check, Lock, AlertCircle, Award } from 'lucide-react';
import type { OathTreeNode } from '../../../entities/oath-tree';

interface NodeDetailSheetProps {
  node: OathTreeNode | null;
  state: 'done' | 'avail' | 'lvlock' | 'locked';
  currentMarks: number;
  heroInspiration: number;
  heroLevel: number;
  onClose: () => void;
  onInvest: () => void;
  isInvesting?: boolean;
}

const TIPO_LABELS: Record<string, string> = {
  hub: 'Nó Central do Juramento',
  entry: 'Portão de Entrada da Região',
  minor: 'Talento Menor',
  notable: 'Talento Notável',
  skill: 'Perícia Treinada',
  key: 'Talento Supremo (Key Node)',
};

export const NodeDetailSheet: React.FC<NodeDetailSheetProps> = ({
  node,
  state,
  currentMarks,
  heroInspiration,
  heroLevel,
  onClose,
  onInvest,
  isInvesting,
}) => {
  if (!node) return null;

  const custoTotal = node.custo ?? 1;
  const isDone = state === 'done';
  const canInvest = state === 'avail' && heroInspiration > 0 && !isDone;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div>
            <span className="text-[10px] font-cinzel uppercase text-[var(--gold-dim)] tracking-wider block">
              Região: {node.reg} • {TIPO_LABELS[node.tipo] || node.tipo}
            </span>
            <h3 className="font-cinzel font-bold text-lg text-[var(--text-1)] mt-0.5">
              {node.nm}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--card)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Description in Newsreader */}
        <div className="p-3.5 rounded-lg bg-[var(--card)] border border-[var(--border)]">
          <p className="font-newsreader italic text-[var(--text-2)] text-sm leading-relaxed whitespace-pre-line">
            {node.ds || 'O poder do Juramento ressoa neste nó primordial.'}
          </p>
        </div>

        {/* Status & Level Badge */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded bg-[var(--card)] border border-[var(--border)] flex flex-col">
            <span className="text-[10px] font-cinzel text-[var(--text-3)] uppercase">Nível Requerido</span>
            <span className="font-semibold text-[var(--text-1)] mt-0.5">
              Nível {node.lv ?? 1} (Você: {heroLevel})
            </span>
          </div>

          <div className="p-2.5 rounded bg-[var(--card)] border border-[var(--border)] flex flex-col">
            <span className="text-[10px] font-cinzel text-[var(--text-3)] uppercase">Custo de Inspiração</span>
            <span className="font-semibold text-[var(--gold)] mt-0.5">
              {custoTotal} {custoTotal === 1 ? 'Inspiração' : 'Inspirações'}
            </span>
          </div>
        </div>

        {/* Marks progress */}
        {!isDone && custoTotal > 1 && (
          <div className="p-3 rounded bg-[var(--card)] border border-[var(--border)] flex items-center justify-between">
            <span className="text-xs font-cinzel text-[var(--text-2)]">Progresso de Marcas:</span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: custoTotal }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < currentMarks
                      ? 'bg-[var(--gold)]'
                      : 'bg-black/50 border border-zinc-700'
                  }`}
                />
              ))}
              <span className="font-mono text-xs text-[var(--text-1)] font-bold ml-1">
                {currentMarks}/{custoTotal}
              </span>
            </div>
          </div>
        )}

        {/* State Banner */}
        {isDone ? (
          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 flex items-center gap-2 text-emerald-300 text-xs font-cinzel font-semibold">
            <Check size={16} />
            <span>Nó Desbloqueado e Ativo no Jurado</span>
          </div>
        ) : state === 'lvlock' ? (
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 flex items-center gap-2 text-amber-300 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>Requer Nível {node.lv} para liberar este nó.</span>
          </div>
        ) : state === 'locked' ? (
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2 text-zinc-400 text-xs">
            <Lock size={16} className="shrink-0" />
            <span>Bloqueado. Precisa estar ligado a um nó já liberado.</span>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-[var(--card)] border border-[var(--gold-dim)]/50 flex items-center gap-2 text-[var(--gold)] text-xs font-cinzel">
            <Sparkles size={16} className="shrink-0" />
            <span>Nó disponível para investimento!</span>
          </div>
        )}

        {/* Invest Action */}
        {!isDone && (
          <button
            type="button"
            disabled={!canInvest || isInvesting}
            onClick={onInvest}
            className="w-full py-2.5 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold-bright)] text-black font-cinzel font-bold text-xs uppercase tracking-wider transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles size={15} className="fill-black" />
            <span>
              {isInvesting
                ? 'Gravando Juramento...'
                : `Investir 1 Inspiração (${heroInspiration} disponível)`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
