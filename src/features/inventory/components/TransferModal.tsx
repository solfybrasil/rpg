import { ArrowRightLeft, Minus, Plus, User } from 'lucide-react';
import React, { useState } from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import type { CharacterRow } from '../../../shared/hooks/baseHooks';
import { Button, Modal } from '../../../shared/ui';

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
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Transferir Item"
      description={`Entregar exemplar de "${item.name}" a outro companheiro de jornada.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Destinatário */}
        <div className="space-y-1.5">
          <label className="text-xs font-serif font-bold text-white/70 uppercase tracking-wider">
            Destinatário
          </label>
          <div className="grid grid-cols-1 gap-2">
            {otherHeroes.map((h) => {
              const selected = targetHeroId === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setTargetHeroId(h.id)}
                  className={`flex items-center gap-3 p-3 border transition-all text-left cursor-pointer ${
                    selected
                      ? 'bg-[var(--gold)] text-black border-[var(--gold-hi)] font-bold shadow-md'
                      : 'recess border-black text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <div className="w-8 h-8 slab flex items-center justify-center text-xs font-['Cinzel',serif] font-bold text-[var(--gold-hi)]">
                    {h.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-['Cinzel',serif] font-semibold text-inherit">{h.name}</span>
                    <span className="text-[10px] opacity-75">{h.title || h.race || 'Companheiro'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantidade (se > 1) */}
        {maxQty > 1 && (
          <div className="space-y-1.5 border-t border-[var(--iron)]/60 pt-3">
            <div className="flex justify-between items-center text-xs font-['Cinzel',serif]">
              <span className="text-[var(--gold-hi)] font-bold uppercase tracking-wider">Quantidade</span>
              <span className="text-[var(--muted)]">Disponível: {maxQty}</span>
            </div>

            <div className="flex items-center justify-center gap-4 recess border border-black p-2">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                className="w-8 h-8 slab flex items-center justify-center text-[var(--text)] disabled:opacity-30 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>

              <span className="font-mono text-lg font-bold text-[var(--gold-hi)] w-12 text-center">
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

        {/* Ações */}
        <div className="flex justify-end gap-2 border-t border-[var(--iron)]/60 pt-4">
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
            variant="primary"
            loading={loading}
            disabled={!targetHeroId}
            leftIcon={<ArrowRightLeft className="w-4 h-4" />}
          >
            Confirmar Transferência
          </Button>
        </div>
      </form>
    </Modal>
  );
};
