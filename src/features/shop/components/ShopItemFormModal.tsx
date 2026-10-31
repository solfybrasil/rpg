import { Check, Package, Plus, Save, Search, Sparkles, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge, Button, CoinsBadge, Modal } from '../../../shared/ui/index.ts';
import { useCatalogItems } from '../../item-catalog/api/index.ts';
import { useCreateShopItemMutation, useUpdateShopItemMutation } from '../api/useDMShop.ts';
import type { ShopItem } from '../types.ts';

interface ShopItemFormModalProps {
  item: ShopItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShopItemFormModal: React.FC<ShopItemFormModalProps> = ({
  item,
  open,
  onOpenChange,
}) => {
  const isEditing = Boolean(item);
  const createMutation = useCreateShopItemMutation();
  const updateMutation = useUpdateShopItemMutation();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Arma');
  const [rarity, setRarity] = useState('Comum');
  const [priceBronze, setPriceBronze] = useState<number>(50);
  const [stock, setStock] = useState<string>('');
  const [icon, setIcon] = useState('🗡️');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [special, setSpecial] = useState('');

  // Catalog Picker Search
  const [catalogSearch, setCatalogSearch] = useState('');
  const { data: catalogData } = useCatalogItems({ search: catalogSearch, pageSize: 10 });
  const catalogResults = catalogData?.data || [];

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setCategory(item.category || 'Geral');
      setRarity(item.rarity || 'Comum');
      setPriceBronze(item.price_bronze || 50);
      setStock(item.stock !== null && item.stock !== undefined ? String(item.stock) : '');
      setIcon(item.icon || '🎒');
      setImageUrl(item.image_url || '');
      setDescription(item.description || '');
      setSpecial(item.special || '');
    } else {
      setName('');
      setCategory('Arma');
      setRarity('Comum');
      setPriceBronze(50);
      setStock('');
      setIcon('🗡️');
      setImageUrl('');
      setDescription('');
      setSpecial('');
    }
  }, [item, open]);

  const handleSelectFromCatalog = (catItem: any) => {
    setName(catItem.name);
    setCategory(catItem.category || 'Geral');
    setRarity(catItem.rarity || 'Comum');
    setPriceBronze(catItem.price_bronze || 50);
    setIcon(catItem.icon || '🎒');
    setImageUrl(catItem.image_url || '');
    setDescription(catItem.description || '');
    setSpecial(catItem.special || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome do artigo');
      return;
    }

    const payload: Partial<ShopItem> = {
      name: name.trim(),
      category,
      rarity,
      price_bronze: Number(priceBronze) || 0,
      stock: stock.trim() === '' ? null : Number(stock),
      icon: icon.trim() || '🎒',
      image_url: imageUrl.trim() || null,
      description: description.trim() || '',
      special: special.trim() || null,
    };

    try {
      if (isEditing && item) {
        await updateMutation.mutateAsync({ id: item.id, updates: payload });
        toast.success(`Artigo "${name}" atualizado na loja!`);
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(`Artigo "${name}" adicionado à vitrine!`);
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Falha ao salvar item da loja: ${err.message || 'Erro'}`);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? `Editar Artigo: ${name}` : 'Adicionar Artigo à Loja'}
      description="Cadastre ou edite um item à venda no balcão do mercador."
      className="max-w-xl bg-[#121215] border border-white/10"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Quick Pick from Catalog */}
        {!isEditing && (
          <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#f5b65b] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Puxar Rápido do Catálogo Geral
            </span>
            <input
              type="text"
              placeholder="Digite para buscar item cadastrado..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#16161b] px-3 py-1.5 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            />
            {catalogResults.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                {catalogResults.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectFromCatalog(c)}
                    className="flex items-center gap-2 p-1.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-left text-xs truncate"
                  >
                    <span>{c.icon || '🗡️'}</span>
                    <span className="truncate text-white/80">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Identity Inputs */}
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-3 space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Nome do Artigo *
            </label>
            <input
              type="text"
              data-testid="shop-item-form-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            />
          </div>

          <div className="col-span-1 space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Ícone
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={4}
              className="w-full text-center rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-base text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            />
          </div>
        </div>

        {/* Category, Rarity, Price & Stock */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Categoria
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Raridade
            </label>
            <select
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#18181d] px-2 py-1.5 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            >
              <option value="Comum">Comum</option>
              <option value="Incomum">Incomum</option>
              <option value="Raro">Raro</option>
              <option value="Épico">Épico</option>
              <option value="Lendário">Lendário</option>
              <option value="Artefato">Artefato</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Preço (Bronze)
            </label>
            <input
              type="number"
              min={0}
              data-testid="shop-item-form-price"
              value={priceBronze}
              onChange={(e) => setPriceBronze(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Estoque
            </label>
            <input
              type="number"
              min={0}
              placeholder="Ilimitado"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
            />
          </div>
        </div>

        {/* Description & Special */}
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Descrição do Artigo
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none font-serif"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/60 hover:text-white"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            data-testid="confirm-save-shop-item"
            variant="gold"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="flex items-center gap-1.5"
          >
            <Save className="h-4 w-4" />
            <span>{isEditing ? 'Salvar Alterações' : 'Colocar à Venda'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
