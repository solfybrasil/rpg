import { Minus, Plus, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import type { InventoryItemRecord } from '../../../entities/item';

export interface DiscardModalProps {
  item: InventoryItemRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDiscard: (item: InventoryItemRecord, quantity: number) => Promise<void>;
}

export const DiscardModal: React.FC<DiscardModalProps> = ({
  item,
  open,
  onOpenChange,
  onConfirmDiscard,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

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
    if (loading) return;

    setLoading(true);
    try {
      await onConfirmDiscard(item, quantity);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-modal-overlay" onClick={() => onOpenChange(false)}>
      <div className="modern-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modern-modal-header">
          <h3 className="modern-modal-title">Descartar Item</h3>
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
              Tem certeza que deseja abandonar <strong>"{item.name}"</strong>? Esta ação não pode ser desfeita.
            </p>

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
                  <span>QUANTIDADE A DESCARTAR</span>
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
                      color: '#f87171',
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
              className="modern-btn danger"
              disabled={loading}
            >
              <Trash2 size={14} />
              <span>{loading ? 'Descartando...' : 'Confirmar Descarte'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
