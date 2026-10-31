import { Check, Flame, Gift, Shield, User, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal, Stepper } from '../../../shared/ui/index.ts';
import { fetchHeroesForGive, giveCatalogItem } from '../api/index.ts';
import type { HeroTarget, ItemCatalog } from '../api/types.ts';

const FALLBACK_HEROES: HeroTarget[] = [
  {
    id: 'kaelis_moonfire',
    name: 'Kaelis Moonfire',
    title: 'O Conjurador Arcano',
    avatar_icon: '🧙‍♂️',
  },
  {
    id: 'malenia',
    name: 'Malenia',
    title: 'A Lâmina Carmesim',
    avatar_icon: '⚔️',
  },
  {
    id: 'tor_bjorn',
    name: 'Tor-Bjorn',
    title: 'O Bárbaro do Norte',
    avatar_icon: '🛡️',
  },
];

interface GiveItemSelectorModalProps {
  item: ItemCatalog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const GiveItemSelectorModal: React.FC<GiveItemSelectorModalProps> = ({
  item,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [heroes, setHeroes] = useState<HeroTarget[]>(FALLBACK_HEROES);
  const [selectedHeroId, setSelectedHeroId] = useState<string>('kaelis_moonfire');
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setQuantity(item?.default_quantity || 1);
      fetchHeroesForGive().then((data) => {
        if (data && data.length > 0) {
          setHeroes(data);
          if (!data.some((h) => h.id === selectedHeroId)) {
            setSelectedHeroId(data[0].id);
          }
        }
      });
    }
  }, [open, item]);

  if (!item) return null;

  const handleGive = async () => {
    if (!selectedHeroId) {
      toast.error('Selecione um herói destinatário');
      return;
    }

    const hero = heroes.find((h) => h.id === selectedHeroId);
    setIsSubmitting(true);
    try {
      await giveCatalogItem(item.id, selectedHeroId, quantity);
      toast.success(
        `Concedido ${quantity}x "${item.name}" para ${hero?.name || selectedHeroId}!`,
        {
          description: 'O item foi enviado diretamente para o inventário do aventureiro.',
        },
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(`Falha ao conceder item: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Conceder "${item.name}"`}
      description="Selecione o herói destinatário e a quantidade que surgirá em sua algibeira."
      className="max-w-md bg-[#121215] border border-white/10"
    >
      <div className="space-y-4 pt-2">
        {/* Item Preview Strip */}
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#f5b65b]/40 bg-[#1c1c22]">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="h-10 w-10 object-contain rounded"
              />
            ) : (
              <span className="text-2xl">{item.icon || '🗡️'}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-serif text-sm font-bold text-[#ebe6d6] truncate">
              {item.name}
            </h4>
            <p className="text-xs text-white/50 truncate">
              {item.category} {item.rarity ? `· ${item.rarity}` : ''}
            </p>
          </div>
        </div>

        {/* Hero Avatar Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Destinatário (Herói)
          </label>
          <div className="grid grid-cols-1 gap-2">
            {heroes.map((hero) => {
              const isSelected = selectedHeroId === hero.id;
              return (
                <button
                  key={hero.id}
                  type="button"
                  data-testid={`hero-target-${hero.id}`}
                  onClick={() => setSelectedHeroId(hero.id)}
                  className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? 'border-[#f5b65b] bg-[#f5b65b]/10 shadow-[0_0_12px_rgba(245,182,91,0.2)]'
                      : 'border-white/10 bg-[#18181d] hover:border-white/20 hover:bg-[#202026]'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg ${
                      isSelected
                        ? 'border-[#f5b65b] bg-[#f5b65b]/20 text-[#f5b65b]'
                        : 'border-white/10 bg-black/40 text-white/60'
                    }`}
                  >
                    {hero.avatar_icon || <User className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isSelected ? 'text-[#f5b65b]' : 'text-[#ebe6d6]'
                      }`}
                    >
                      {hero.name}
                    </p>
                    {hero.title && (
                      <p className="text-xs text-white/40 truncate">{hero.title}</p>
                    )}
                  </div>
                  {isSelected && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5b65b] text-black">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#18181d] p-3">
          <span className="text-xs font-semibold text-white/80 font-serif">
            Quantidade de Unidades:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={99}
              data-testid="give-item-quantity"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
              className="h-8 w-16 rounded-lg border border-white/15 bg-black/50 text-center font-mono text-sm font-bold text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-white/60 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            data-testid="confirm-give-item-btn"
            variant="gold"
            onClick={handleGive}
            disabled={isSubmitting || !selectedHeroId}
            className="flex items-center gap-1.5"
          >
            <Gift className="h-4 w-4" />
            <span>{isSubmitting ? 'Concedendo...' : 'Conceder Artigo'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
