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
      className="modern-modal-overlay animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="modern-modal-box animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0"
        style={{ maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modern-modal-header">
          <div>
            <span style={{ fontSize: '0.62rem', color: '#c9a961', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', fontWeight: 600 }}>
              Região: {node.reg} • {TIPO_LABELS[node.tipo] || node.tipo}
            </span>
            <h3 className="modern-modal-title" style={{ marginTop: '0.2rem' }}>
              {node.nm}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modern-modal-close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Description in Newsreader */}
        <div style={{ background: '#0d0c0a', border: '1px solid rgba(201, 169, 97, 0.16)', borderRadius: '6px', padding: '0.75rem 0.85rem' }}>
          <p style={{ fontFamily: 'var(--font-serif, "EB Garamond", serif)', fontStyle: 'italic', color: '#d5ccba', fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-line', margin: 0 }}>
            {node.ds || 'O poder do Juramento ressoa neste nó primordial.'}
          </p>
        </div>

        {/* Status & Level Badge */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
          <div style={{ background: '#0d0c0a', border: '1px solid rgba(201, 169, 97, 0.16)', borderRadius: '5px', padding: '0.5rem 0.65rem', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.62rem', color: '#8c8272', textTransform: 'uppercase', fontFamily: 'var(--font-title, "Cinzel", serif)' }}>Nível Requerido</span>
            <span style={{ fontWeight: 600, color: '#f5ede0', fontSize: '0.82rem', marginTop: '0.15rem' }}>
              Nível {node.lv ?? 1} (Você: {heroLevel})
            </span>
          </div>

          <div style={{ background: '#0d0c0a', border: '1px solid rgba(201, 169, 97, 0.16)', borderRadius: '5px', padding: '0.5rem 0.65rem', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.62rem', color: '#8c8272', textTransform: 'uppercase', fontFamily: 'var(--font-title, "Cinzel", serif)' }}>Custo</span>
            <span style={{ fontWeight: 600, color: '#e6cf94', fontSize: '0.82rem', marginTop: '0.15rem' }}>
              {custoTotal} {custoTotal === 1 ? 'Inspiração' : 'Inspirações'}
            </span>
          </div>
        </div>

        {/* Marks progress */}
        {!isDone && custoTotal > 1 && (
          <div style={{ background: '#0d0c0a', border: '1px solid rgba(201, 169, 97, 0.16)', borderRadius: '5px', padding: '0.5rem 0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', color: '#b5aa96', fontFamily: 'var(--font-title, "Cinzel", serif)' }}>Progresso de Marcas:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {Array.from({ length: custoTotal }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    backgroundColor: i < currentMarks ? '#c9a961' : 'transparent',
                    border: '1.5px solid rgba(201, 169, 97, 0.4)',
                    boxShadow: i < currentMarks ? '0 0 6px rgba(201, 169, 97, 0.6)' : 'none',
                  }}
                />
              ))}
              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: '#f5ede0', fontWeight: 700, marginLeft: 4 }}>
                {currentMarks}/{custoTotal}
              </span>
            </div>
          </div>
        )}

        {/* State Banner */}
        {isDone ? (
          <div style={{ background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: '6px', padding: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#86efac', fontSize: '0.75rem', fontWeight: 600 }}>
            <Check size={16} />
            <span>Nó Desbloqueado e Ativo no Jurado</span>
          </div>
        ) : state === 'lvlock' ? (
          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', padding: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#fcd34d', fontSize: '0.75rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>Requer Nível {node.lv} para liberar este nó.</span>
          </div>
        ) : state === 'locked' ? (
          <div style={{ background: '#0e0d0a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px', padding: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#8c8272', fontSize: '0.75rem' }}>
            <Lock size={16} style={{ flexShrink: 0 }} />
            <span>Bloqueado. Precisa estar conectado a um nó liberado.</span>
          </div>
        ) : (
          <div style={{ background: 'rgba(201, 169, 97, 0.08)', border: '1px solid rgba(201, 169, 97, 0.25)', borderRadius: '6px', padding: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#e6cf94', fontSize: '0.75rem' }}>
            <Sparkles size={16} style={{ flexShrink: 0 }} />
            <span>Nó disponível para investimento!</span>
          </div>
        )}

        {/* Invest Action */}
        {!isDone && (
          <button
            type="button"
            disabled={!canInvest || isInvesting}
            onClick={onInvest}
            className="modern-btn primary"
            style={{ width: '100%', height: '36px', fontSize: '0.78rem' }}
          >
            <Sparkles size={14} />
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
