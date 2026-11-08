import { ArrowRightLeft, Minus, Plus, X } from 'lucide-react';
import React, { useState } from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import type { CharacterRow } from '../../../shared/hooks/baseHooks';

export interface TransferModalProps {
  item: InventoryItemRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentHeroId: string | null | undefined;
  heroes: CharacterRow[];
  onConfirmTransfer: (item: InventoryItemRecord, targetHeroId: string, quantity: number) => Promise<void>;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  item,
  open,
  onOpenChange,
  currentHeroId,
  heroes,
  onConfirmTransfer,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [targetHeroId, setTargetHeroId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Filtra outros heróis
  const otherHeroes = heroes.filter((h) => h.id !== currentHeroId);

  // Inicializa targetHeroId se vazio
  React.useEffect(() => {
    if (!targetHeroId && otherHeroes.length > 0) {
      setTargetHeroId(otherHeroes[0].id);
    }
  }, [otherHeroes, targetHeroId]);

  // Reseta quantidade quando o item muda
  React.useEffect(() => {
    setQuantity(1);
  }, [item]);

  if (!open || !item) return null;

  const maxQty = Math.max(1, Number(item.quantity || 1));

  const handleIncrement = () => {
    setQuantity((q) => Math.min(maxQty, q + 1));
  };

  const handleDecrement = () => {
    setQuantity((q) => Math.max(1, q - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetHeroId || loading) return;

    setLoading(true);
    try {
      await onConfirmTransfer(item, targetHeroId, quantity);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-modal-overlay" onClick={() => onOpenChange(false)}>
      <div className="modern-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modern-modal-header">
          <h3 className="modern-modal-title">Transferir Item</h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="modern-modal-close"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modern-modal-body">
            <p style={{ color: '#b5aa96', fontSize: '0.85rem', margin: 0 }}>
              Entregar exemplar de <strong>"{item.name}"</strong> a outro companheiro de jornada.
            </p>

            {/* Destinatário */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label
                style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#c9a961',
                  fontWeight: 600,
                }}
              >
                Destinatário
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.45rem' }}>
                {otherHeroes.map((h) => {
                  const selected = targetHeroId === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setTargetHeroId(h.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '6px',
                        border: selected
                          ? '1px solid #c9a961'
                          : '1px solid rgba(201, 169, 97, 0.16)',
                        background: selected ? 'rgba(201, 169, 97, 0.18)' : '#0d0c0a',
                        color: selected ? '#f5ede0' : '#b5aa96',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '4px',
                          background: '#1c1812',
                          border: '1px solid rgba(201, 169, 97, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--font-title, "Cinzel", serif)',
                          fontWeight: 'bold',
                          fontSize: '0.75rem',
                          color: '#e6cf94',
                        }}
                      >
                        {h.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{h.name}</span>
                        <span style={{ fontSize: '0.7rem', color: '#8c7b68' }}>
                          {h.title || h.race || 'Companheiro'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantidade (se > 1) */}
            {maxQty > 1 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  borderTop: '1px solid rgba(201, 169, 97, 0.14)',
                  paddingTop: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: '#c9a961',
                    fontWeight: 600,
                  }}
                >
                  <span>QUANTIDADE</span>
                  <span style={{ color: '#8c7b68' }}>Disponível: {maxQty}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    background: '#0d0c0a',
                    border: '1px solid rgba(201, 169, 97, 0.16)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                    className="modern-btn secondary"
                    style={{ width: '32px', height: '32px', padding: 0 }}
                  >
                    <Minus size={14} />
                  </button>

                  <span
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: '#f5ede0',
                      width: '40px',
                      textAlign: 'center',
                    }}
                  >
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={quantity >= maxQty}
                    className="modern-btn secondary"
                    style={{ width: '32px', height: '32px', padding: 0 }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="modern-modal-footer">
            <button
              type="button"
              className="modern-btn secondary"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="modern-btn primary"
              disabled={!targetHeroId || loading}
            >
              <ArrowRightLeft size={14} />
              <span>{loading ? 'Transferindo...' : 'Confirmar Transferência'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
