import { Minus, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import { Button, Modal } from '../../../shared/ui';

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

  if (!item) return null;

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
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Descartar Item"
      description={`Tem certeza que deseja abandonar "${item.name}"? Esta ação não pode ser desfeita.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {maxQty > 1 && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-serif">
              <span className="text-white/70 font-bold uppercase tracking-wider">
                Quantidade a Descartar
              </span>
              <span className="text-white/50">Disponível: {maxQty}</span>
            </div>

            <div className="flex items-center justify-center gap-4 bg-white/[0.02] border border-white/[0.08] rounded-xl p-2">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white disabled:opacity-30"
              >
                <Minus className="w-4 h-4" />
              </button>

              <span className="font-mono text-lg font-bold text-[#ff6b62] w-12 text-center">
                {quantity}
              </span>

              <button
                type="button"
                onClick={handleIncrement}
                disabled={quantity >= maxQty}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white disabled:opacity-30"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={loading}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Descartar {quantity > 1 ? `${quantity}x` : ''}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
