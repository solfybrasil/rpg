import {
  Check,
  Edit2,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Trash2,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useGameState } from '../../../shared/hooks/baseHooks';
import { Badge, Button, CoinsBadge, Switch } from '../../../shared/ui/index.ts';
import {
  useDMShopItems,
  useDeleteShopItemMutation,
  usePopulateStarterShopMutation,
  useToggleShopMutation,
  useUpdateShopItemMutation,
} from '../api/useDMShop.ts';
import type { ShopItem } from '../types.ts';
import { ShopItemFormModal } from './ShopItemFormModal.tsx';

export const DMShopControlTab: React.FC = () => {
  const { gameState } = useGameState();
  const { data: items = [], isLoading } = useDMShopItems('MESA');

  const toggleShopMutation = useToggleShopMutation();
  const updateItemMutation = useUpdateShopItemMutation();
  const deleteItemMutation = useDeleteShopItemMutation();
  const populateMutation = usePopulateStarterShopMutation();

  const shopOpen = Boolean(gameState?.shop_open);
  const [shopName, setShopName] = useState(gameState?.shop_name || 'Mercado da Fuligem');
  const [isEditingName, setIsEditingName] = useState(false);

  // Filter search
  const [search, setSearch] = useState('');

  // Modal State
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ShopItem | null>(null);

  // Inline Price Editing State: Map<id, priceString>
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [editingStocks, setEditingStocks] = useState<Record<string, string>>({});

  useEffect(() => {
    if (gameState?.shop_name) {
      setShopName(gameState.shop_name);
    }
  }, [gameState?.shop_name]);

  const handleToggleShop = (checked: boolean) => {
    toggleShopMutation.mutate(
      { shopOpen: checked },
      {
        onSuccess: () => {
          toast.success(
            checked
              ? 'Balcão do mercado aberto! Os jurados podem comprar artigos.'
              : 'Balcão fechado! Compras desabilitadas para os jogadores.',
          );
        },
        onError: (err: any) => {
          toast.error(`Falha ao alterar estado da loja: ${err.message}`);
        },
      },
    );
  };

  const handleSaveShopName = () => {
    if (!shopName.trim()) return;
    toggleShopMutation.mutate(
      { shopName: shopName.trim() },
      {
        onSuccess: () => {
          toast.success(`Nome do mercado atualizado para "${shopName.trim()}".`);
          setIsEditingName(false);
        },
      },
    );
  };

  const handlePopulateStarter = async () => {
    if (
      !window.confirm(
        'Deseja abastecer o mercado com os 30 artigos iniciais recomendados de Aldrenor?',
      )
    ) {
      return;
    }

    try {
      const added = await populateMutation.mutateAsync();
      toast.success(`Mercado abastecido! ${added} novos artigos adicionados à vitrine.`);
    } catch (err: any) {
      toast.error(`Erro ao povoar mercado: ${err.message}`);
    }
  };

  const handleSaveInlinePrice = async (itemId: string) => {
    const newPrice = editingPrices[itemId];
    if (newPrice === undefined || isNaN(newPrice)) return;

    try {
      await updateItemMutation.mutateAsync({
        id: itemId,
        updates: { price_bronze: Math.max(0, newPrice) },
      });
      setEditingPrices((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      toast.success('Preço atualizado com sucesso!');
    } catch (err: any) {
      toast.error(`Falha ao salvar preço: ${err.message}`);
    }
  };

  const handleSaveInlineStock = async (itemId: string) => {
    const rawStock = editingStocks[itemId];
    if (rawStock === undefined) return;

    const stockVal = rawStock.trim() === '' ? null : Number(rawStock);
    try {
      await updateItemMutation.mutateAsync({
        id: itemId,
        updates: { stock: stockVal },
      });
      setEditingStocks((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      toast.success('Estoque atualizado!');
    } catch (err: any) {
      toast.error(`Falha ao salvar estoque: ${err.message}`);
    }
  };

  const handleToggleItemActive = async (item: ShopItem) => {
    try {
      await updateItemMutation.mutateAsync({
        id: item.id,
        updates: { active: !item.active },
      });
      toast.success(
        item.active ? `"${item.name}" ocultado da vitrine.` : `"${item.name}" visível na vitrine.`,
      );
    } catch (err: any) {
      toast.error(`Falha ao alterar vitrine: ${err.message}`);
    }
  };

  const handleDeleteItem = async (item: ShopItem) => {
    if (!window.confirm(`Remover "${item.name}" definitivamente do mercado?`)) return;

    try {
      await deleteItemMutation.mutateAsync(item.id);
      toast.success(`Artigo "${item.name}" removido da loja.`);
    } catch (err: any) {
      toast.error(`Falha ao deletar item: ${err.message}`);
    }
  };

  const filteredItems = items.filter((it) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (it.name || '').toLowerCase().includes(s) ||
      (it.category || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Shop Header & Switch Card */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-5 rounded-2xl border border-white/10 bg-[#121215]/90 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#f5b65b]/40 bg-[#f5b65b]/10 text-[#f5b65b] shadow-md">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="rounded-lg border border-[#f5b65b] bg-black/50 px-2 py-1 text-sm font-serif font-bold text-[#ebe6d6] focus:outline-none"
                  />
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={handleSaveShopName}
                    className="px-2 py-1 text-xs"
                  >
                    Salvar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-bold text-[#ebe6d6]">{shopName}</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="text-white/40 hover:text-white"
                    title="Editar nome do estabelecimento"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-white/50 font-serif">
              {shopOpen
                ? 'Balcão aberto aos jogadores: compras e vendas ativas em tempo real.'
                : 'Estabelecimento fechado pelo Mestre.'}
            </p>
          </div>
        </div>

        {/* Big Switch for Loja Aberta */}
        <div className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/10">
          <div className="flex flex-col text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#ebe6d6]">
              {shopOpen ? 'Loja Aberta' : 'Loja Fechada'}
            </span>
            <span className="text-[10px] text-white/40">Visível aos aventureiros</span>
          </div>
          <Switch
            size="lg"
            variant="gold"
            data-testid="toggle-shop-switch"
            checked={shopOpen}
            onCheckedChange={handleToggleShop}
            disabled={toggleShopMutation.isPending}
          />
        </div>
      </div>

      {/* Action Strip: Search, Populate Starter, Add Item */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl border border-white/10 bg-[#121215]/80">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            data-testid="shop-search-input"
            placeholder="Filtrar artigos da vitrine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none font-serif"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePopulateStarter}
            disabled={populateMutation.isPending}
            className="flex items-center gap-1.5 text-xs text-white/80 font-serif"
            title="Povoar com 30 artigos clássicos de Aldrenor"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Povoar 30 Iniciais</span>
          </Button>

          <Button
            variant="gold"
            size="sm"
            data-testid="add-shop-item-btn"
            onClick={() => {
              setItemToEdit(null);
              setFormModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Artigo na Loja</span>
          </Button>
        </div>
      </div>

      {/* Table of Shop Items with Inline Price Editing */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121215]/90 shadow-2xl backdrop-blur-md">
        <div className="grid grid-cols-12 gap-2 border-b border-white/10 bg-[#18181d] px-4 py-3 text-[11px] font-serif font-bold uppercase tracking-wider text-white/60">
          <div className="col-span-5 sm:col-span-4">Artigo da Vitrine</div>
          <div className="col-span-2 text-center">Raridade</div>
          <div className="col-span-3 sm:col-span-3 text-center">Preço (Bronze) Editável</div>
          <div className="hidden sm:col-span-2 sm:block text-center">Estoque</div>
          <div className="col-span-2 sm:col-span-1 text-right">Ações</div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-white/40 font-serif">
            Consultando artigos da loja no servidor...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-xs text-white/40 font-serif">
            Nenhum artigo encontrado. Clique em "Povoar 30 Iniciais" para abastecer o mercado.
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
            {filteredItems.map((item) => {
              const currentEditedPrice = editingPrices[item.id];
              const priceValue = currentEditedPrice !== undefined ? currentEditedPrice : item.price_bronze;
              const hasPriceChanged = currentEditedPrice !== undefined && currentEditedPrice !== item.price_bronze;

              const currentEditedStock = editingStocks[item.id];
              const stockValue = currentEditedStock !== undefined ? currentEditedStock : (item.stock ?? '');
              const hasStockChanged = currentEditedStock !== undefined && currentEditedStock !== String(item.stock ?? '');

              return (
                <div
                  key={item.id}
                  data-testid={`shop-item-row-${item.id}`}
                  className="grid grid-cols-12 items-center gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Item Image + Name */}
                  <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#1a1a20] text-lg">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-8 w-8 object-contain rounded"
                        />
                      ) : (
                        <span>{item.icon || '🎒'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif font-bold text-xs sm:text-sm text-[#ebe6d6] truncate">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-white/40 truncate">{item.category}</p>
                    </div>
                  </div>

                  {/* Rarity */}
                  <div className="col-span-2 text-center">
                    <Badge variant="default" size="sm">
                      {item.rarity || 'Comum'}
                    </Badge>
                  </div>

                  {/* Inline Price Editing Column */}
                  <div className="col-span-3 sm:col-span-3 flex flex-col sm:flex-row items-center justify-center gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        data-testid={`inline-price-input-${item.id}`}
                        value={priceValue}
                        onChange={(e) =>
                          setEditingPrices((prev) => ({
                            ...prev,
                            [item.id]: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-18 sm:w-20 rounded-lg border border-white/15 bg-black/50 px-2 py-1 text-center font-mono text-xs font-bold text-[#f5b65b] focus:border-[#f5b65b] focus:outline-none"
                      />
                      {hasPriceChanged && (
                        <button
                          type="button"
                          data-testid={`save-inline-price-btn-${item.id}`}
                          onClick={() => handleSaveInlinePrice(item.id)}
                          className="h-7 w-7 rounded-lg bg-[#f5b65b] text-black flex items-center justify-center hover:bg-[#ffd59a] shadow-sm"
                          title="Salvar novo preço"
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </button>
                      )}
                    </div>
                    <CoinsBadge coinsBronze={priceValue} size="sm" className="hidden sm:inline-flex" />
                  </div>

                  {/* Inline Stock Column */}
                  <div className="hidden sm:col-span-2 sm:flex sm:items-center sm:justify-center gap-1">
                    <input
                      type="number"
                      min={0}
                      placeholder="∞"
                      value={stockValue}
                      onChange={(e) =>
                        setEditingStocks((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="w-14 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-center font-mono text-xs text-white/80 focus:border-[#f5b65b] focus:outline-none"
                      title="Estoque disponível (vazio para ilimitado)"
                    />
                    {hasStockChanged && (
                      <button
                        type="button"
                        onClick={() => handleSaveInlineStock(item.id)}
                        className="h-6 w-6 rounded-lg bg-emerald-500 text-black flex items-center justify-center"
                        title="Salvar estoque"
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </button>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setItemToEdit(item);
                        setFormModalOpen(true);
                      }}
                      className="px-1.5 py-1 text-xs text-white/50 hover:text-white"
                      title="Editar artigo completo"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item)}
                      className="px-1.5 py-1 text-xs text-white/40 hover:text-red-400"
                      title="Remover da vitrine"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      <ShopItemFormModal
        item={itemToEdit}
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
      />
    </div>
  );
};
