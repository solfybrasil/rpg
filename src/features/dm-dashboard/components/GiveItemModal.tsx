import { Gift, Loader2, Package, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { searchItemCatalog } from '../api/dmService';
import type { HeroDashboardItem, ItemCatalogRow } from '../types';

interface GiveItemModalProps {
  hero: HeroDashboardItem | null;
  onClose: () => void;
  onGiveItem: (
    heroId: string,
    item: {
      name: string;
      category: string;
      quantity: number;
      image_url?: string | null;
      description?: string;
      rarity?: string;
    },
  ) => Promise<void>;
}

export function GiveItemModal({ hero, onClose, onGiveItem }: GiveItemModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [catalogItems, setCatalogItems] = useState<ItemCatalogRow[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemCatalogRow | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Busca no catálogo do servidor com debounce
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchItemCatalog(searchTerm, category, 20);
        if (active) setCatalogItems(results);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTerm, category]);

  if (!hero) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem && !customName.trim()) {
      toast.error('Selecione um item do catálogo ou informe o nome customizado.');
      return;
    }

    setIsSubmitting(true);
    try {
      const name = selectedItem ? selectedItem.name : customName.trim();
      const cat = selectedItem ? selectedItem.category : 'Dádiva';
      const desc =
        customDesc.trim() ||
        (selectedItem ? `Item oficial concedido pelo Mestre.` : 'Dádiva sagrada forjada pelo Mestre.');

      await onGiveItem(hero.id, {
        name,
        category: cat,
        quantity: Math.max(1, quantity),
        image_url: selectedItem?.id ? undefined : null,
        description: desc,
        rarity: selectedItem?.rarity || 'comum',
      });

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-[#140e0a] border border-[#8c6941]/60 shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-800 bg-[#1a120d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-amber-100">
                Conceder Dádiva a {hero.name}
              </h2>
              <p className="text-xs text-stone-400">
                Busca direta no catálogo de itens do servidor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com busca */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Campo de Busca no Servidor */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar item no catálogo oficial..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-stone-900/90 border border-stone-700/80 text-stone-100 text-sm placeholder:text-stone-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Lista de resultados do catálogo */}
          <div className="border border-stone-800/80 rounded-xl overflow-hidden bg-black/40">
            <div className="p-2 border-b border-stone-800 text-[11px] font-heading uppercase text-stone-400 flex items-center justify-between">
              <span>Catálogo ({catalogItems.length} itens encontrados)</span>
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />}
            </div>

            <div className="max-h-52 overflow-y-auto divide-y divide-stone-800/60">
              {catalogItems.length === 0 && !isLoading && (
                <div className="p-4 text-center text-xs text-stone-500">
                  Nenhum item encontrado no catálogo com o termo pesquisado. Você pode cadastrar um
                  item customizado abaixo.
                </div>
              )}
              {catalogItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedItem(isSelected ? null : item);
                      if (!isSelected) {
                        setCustomName(item.name);
                      }
                    }}
                    className={`w-full text-left p-3 flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-amber-950/60 text-amber-200'
                        : 'hover:bg-stone-900/80 text-stone-300'
                    }`}
                  >
                    <div>
                      <div className="font-heading font-semibold text-xs sm:text-sm">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {item.category} • {item.rarity || 'comum'}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-xs font-heading font-bold text-amber-400">
                        ✓ Selecionado
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuração de Quantidade e Customização */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-800">
            <div>
              <label className="block text-xs font-heading text-stone-400 mb-1">Quantidade</label>
              <input
                type="number"
                min="1"
                max="99"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-heading text-stone-400 mb-1">
                Nome Customizado (Opcional)
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ex: Poção do Alvorecer"
                className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-heading text-stone-400 mb-1">
              Descrição ou Nota (Opcional)
            </label>
            <textarea
              rows={2}
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              placeholder="Instruções ou efeito especial narrado pelo Mestre..."
              className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:border-amber-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-stone-800 bg-[#1a120d]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-heading text-stone-400 hover:text-white transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg font-heading font-bold text-xs uppercase tracking-wider text-stone-950 bg-gradient-to-b from-amber-400 to-amber-600 hover:brightness-110 active:scale-95 transition flex items-center gap-2 shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Gift className="w-4 h-4" />
            )}
            <span>Conceder Item</span>
          </button>
        </div>
      </div>
    </div>
  );
}
