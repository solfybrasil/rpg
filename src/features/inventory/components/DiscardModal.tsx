import { Minus, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import { GoldButton, Modal, Parchment, StoneButton } from '../../../shared/ui';

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

  const itemName = item.name || (item.item_name as string) || 'Artefato';
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
    <Modal open={open} onOpenChange={onOpenChange} title="Descartar Item">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Parchment seed={47} unroll className="p-3">
          <p className="text-xs font-['EB_Garamond',serif] italic text-[var(--ink)] leading-relaxed">
            Tem certeza que deseja abandonar <strong>"{itemName}"</strong> nas cinzas da estrada?
            Esta ação é definitiva e o objeto não poderá ser recuperado.
          </p>
        </Parchment>

        {maxQty > 1 && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-['Cinzel',serif]">
              <span className="text-[var(--gold-hi)] font-bold uppercase tracking-wider">
                Quantidade a Descartar
              </span>
              <span className="text-[var(--muted)] tabular-nums">Disponível: {maxQty}</span>
            </div>

            <div className="flex items-center justify-center gap-4 recess border border-[var(--iron)] p-2">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                className="w-8 h-8 slab flex items-center justify-center text-[var(--text)] disabled:opacity-30 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>

              <span className="font-['Cinzel',serif] tabular-nums text-lg font-bold text-[var(--blood)] w-12 text-center">
                {quantity}
              </span>

              <button
                type="button"
                onClick={handleIncrement}
                disabled={quantity >= maxQty}
                className="w-8 h-8 slab flex items-center justify-center text-[var(--text)] disabled:opacity-30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Ações (Máximo 1 GoldButton) */}
        <div className="flex justify-end gap-2 border-t border-[var(--iron)]/60 pt-4">
          <StoneButton
            type="button"
            title="Cancelar"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-auto px-4 py-2"
          />
          <GoldButton
            type="submit"
            disabled={loading}
            className="w-auto px-4 py-2 inline-flex items-center gap-1.5 text-xs font-['Cinzel',serif] font-bold uppercase tracking-wider"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{loading ? 'Descartando...' : 'Confirmar Descarte'}</span>
          </GoldButton>
        </div>
      </form>
    </Modal>
  );
};
