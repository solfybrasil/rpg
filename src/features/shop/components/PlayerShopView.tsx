import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  ShoppingCart,
  Coins,
  Shield,
  Sword,
  Sparkles,
  Loader2,
  Package,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useHero, useGameState, useInventory } from '../../../shared/hooks/baseHooks';
import { useSessionStore } from '../../../shared/stores/session';
import { CoinsBadge, Empty } from '../../../shared/ui';
import { fetchShopItems, buyShopItemInDB, sellItemInDB, subscribeToShopRealtime } from '../api';
import type { ShopItem } from '../types';

export const PlayerShopView: React.FC = () => {
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const heroId = sessionHeroId || 'teste_1';
  const { hero, updateHeroAsync } = useHero(heroId);
  const { items: inventoryItems } = useInventory(heroId);
  const { data: gameState } = useGameState();

  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [filterCategory, setFilterCategory] = useState<'all' | 'weapon' | 'armor' | 'consumable'>('all');
  const [loadingAction, setLoadingAction] = useState(false);
  const [buyingItemId, setBuyingItemId] = useState<string | null>(null);
  const [sellingItemId, setSellingItemId] = useState<string | null>(null);

  const shopOpen = gameState?.shop_open ?? true;
  const shopName = gameState?.shop_name || 'Mercado da Fuligem';
  const playerCoins = hero?.coins_bronze ?? 0;

  // Carrega itens da loja
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const items = await fetchShopItems('MESA');
      if (isMounted) setShopItems(items);
    })();

    const unsub = subscribeToShopRealtime('MESA', async () => {
      const items = await fetchShopItems('MESA');
      if (isMounted) setShopItems(items);
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Itens filtrados para compra
  const filteredShopItems = useMemo(() => {
    return (shopItems || []).filter((it) => {
      if (it.active === false) return false;
      if (it.stock !== null && it.stock !== undefined && it.stock <= 0) return false;
      if (filterCategory === 'all') return true;

      const cat = (it.category || '').toLowerCase();
      const eq = (it.equippable_as || '').toLowerCase();

      if (filterCategory === 'weapon') {
        return (
          eq === 'weapon' ||
          eq === 'main_hand' ||
          eq === 'two_hands' ||
          eq === 'two_handed' ||
          cat.includes('arma')
        );
      }
      if (filterCategory === 'armor') {
        return (
          eq === 'armor' ||
          eq === 'shield' ||
          eq === 'off_hand' ||
          cat.includes('armadura') ||
          cat.includes('escudo')
        );
      }
      if (filterCategory === 'consumable') {
        return (
          it.wear_type === 'single_use' ||
          cat.includes('alquimia') ||
          cat.includes('poção') ||
          cat.includes('pocao') ||
          cat.includes('comida') ||
          cat.includes('prato') ||
          cat.includes('consum')
        );
      }
      return true;
    });
  }, [shopItems, filterCategory]);

  // Itens do jogador elegíveis para venda (não equipados e com preço de recompra)
  const sellableItems = useMemo(() => {
    return (inventoryItems || []).filter((it) => {
      if (it.equip_slot) return false;
      return it.price_bronze && Number(it.price_bronze) > 0;
    });
  }, [inventoryItems]);

  // Ação de Compra
  const handleBuy = async (item: ShopItem) => {
    if (!shopOpen) {
      toast.error('As portas estão trancadas pelo Confessor.');
      return;
    }
    if (loadingAction || buyingItemId) return;
    if (playerCoins < item.price_bronze) {
      toast.error('Moedas insuficientes para adquirir este item!');
      return;
    }

    setLoadingAction(true);
    setBuyingItemId(item.id);
    try {
      await buyShopItemInDB(heroId, item.id, 1);
      toast.success(`✨ ${item.name} foi adicionado à sua mochila!`);
    } catch (err: any) {
      console.error('[SHOP] Falha ao comprar:', err);
      toast.error(err.message || 'Erro ao realizar compra.');
    } finally {
      setLoadingAction(false);
      setBuyingItemId(null);
    }
  };

  // Ação de Venda
  const handleSell = async (item: any) => {
    if (!shopOpen) {
      toast.error('As portas estão trancadas pelo Confessor.');
      return;
    }
    if (loadingAction || sellingItemId) return;

    const sellPrice = Math.floor(Number(item.price_bronze) / 2);
    setLoadingAction(true);
    setSellingItemId(item.id);
    try {
      await sellItemInDB(heroId, item.id, 1);
      toast.success(`💰 Você vendeu ${item.name} por +${sellPrice} moedas de bronze!`);
    } catch (err: any) {
      console.error('[SHOP] Falha ao vender:', err);
      toast.error(err.message || 'Erro ao realizar venda.');
    } finally {
      setLoadingAction(false);
      setSellingItemId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* ── CABEÇALHO DA LOJA COM NOME EM CINZEL E DIVISOR ◆ ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--iron)]/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-['Cinzel',serif] text-[var(--gold-hi)] uppercase tracking-widest font-bold">
            <span>Módulo de Comércio</span>
            <span>◆</span>
            <span className={shopOpen ? 'text-[var(--gold)]' : 'text-[var(--blood)]'}>
              {shopOpen ? 'Portas Abertas' : 'Portas Trancadas'}
            </span>
          </div>
          <h1 className="font-['Cinzel',serif] text-2xl md:text-3xl font-bold text-[var(--gold-hi)] tracking-wider mt-1 flex items-center gap-3">
            <Store className="w-6 h-6 text-[var(--gold)]" />
            <span>{shopName}</span>
          </h1>
          <p className="font-serif text-xs md:text-sm text-[var(--muted)] italic mt-0.5">
            Câmbio Oficial: 50 Bronze = 1 Prata · 50 Prata = 1 Ouro (2.500b = 1o)
          </p>
        </div>

        {/* Bolsa Pessoal do Jogador */}
        <div className="flex items-center gap-3 px-4 py-2.5 slab border border-[var(--iron)] shadow-inner">
          <div className="text-right">
            <div className="text-[10px] font-['Cinzel',serif] uppercase tracking-wider text-[var(--gold-hi)] font-bold">
              Sua Bolsa de Moedas
            </div>
            <CoinsBadge coinsBronze={playerCoins} size="md" />
          </div>
        </div>
      </div>

      {/* ── ALERTA QUANDO A LOJA ESTIVER FECHADA (EMPTY STATE) ── */}
      {!shopOpen && (
        <Empty
          data-testid="shop-closed-empty"
          icon={<Lock className="w-10 h-10 text-[var(--blood)]" />}
          title="As portas estão trancadas."
          description="O mercado encontra-se recolhido sob toque de recolher pelo Confessor. Você pode inspecionar os artigos em vitrine, mas as negociações de compra e venda estão temporariamente suspensas."
          className="bg-[var(--blood)]/10 border-[var(--blood)]/40 mb-6"
        />
      )}

      {/* ── NAVEGAÇÃO DE ABAS: COMPRAR / VENDER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--iron)]/60 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('buy')}
            className={`
              flex items-center gap-2 px-4 py-2 font-['Cinzel',serif] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer
              ${
                activeTab === 'buy'
                  ? 'bg-[var(--gold)] text-black border border-[var(--gold-hi)] shadow-md'
                  : 'slab text-[var(--muted)] hover:text-[var(--text)] border border-[var(--iron)]'
              }
            `}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Comprar ({filteredShopItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sell')}
            className={`
              flex items-center gap-2 px-4 py-2 font-['Cinzel',serif] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer
              ${
                activeTab === 'sell'
                  ? 'bg-[var(--gold)] text-black border border-[var(--gold-hi)] shadow-md'
                  : 'slab text-[var(--muted)] hover:text-[var(--text)] border border-[var(--iron)]'
              }
            `}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Vender ({inventoryItems.length})</span>
          </button>
        </div>

        {/* Filtros de Categoria */}
        {activeTab === 'buy' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all' as const, label: 'Todos' },
              { id: 'weapon' as const, label: 'Armas' },
              { id: 'armor' as const, label: 'Armaduras' },
              { id: 'consumable' as const, label: 'Consumíveis' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.id)}
                className={`
                  px-3 py-1 text-[11px] font-['Cinzel',serif] uppercase transition-all whitespace-nowrap cursor-pointer
                  ${
                    filterCategory === cat.id
                      ? 'bg-[var(--gold)] text-black border border-[var(--gold-hi)] font-bold'
                      : 'recess text-[var(--muted)] border border-black hover:text-[var(--text)]'
                  }
                `}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── CONTEÚDO DA ABA COMPRAR ── */}
      {activeTab === 'buy' && (
        <div>
          {filteredShopItems.length === 0 ? (
            <div className="text-center py-16 text-[var(--muted)] font-serif italic">
              <Package className="w-10 h-10 opacity-30 mx-auto mb-3" />
              Nenhum artigo disponível nesta categoria no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredShopItems.map((item) => {
                const canAfford = playerCoins >= item.price_bronze;
                const isBuying = buyingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between p-4 slab border border-[var(--iron)] hover:border-[var(--gold-lo)] transition-all shadow-lg space-y-3"
                  >
                    <div>
                      {/* Ícone, Nome e Categoria */}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 recess border border-black flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{item.icon || '🎒'}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-['Cinzel',serif] text-sm font-bold text-[var(--gold-hi)] truncate">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 slab text-[var(--gold-hi)]">
                              {item.rarity || 'Comum'}
                            </span>
                            {item.category && (
                              <span className="text-[10px] text-[var(--muted)] font-['Cinzel',serif]">
                                {item.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Atributos / Stats */}
                      <div className="flex flex-wrap gap-1.5 mt-3 text-[11px] font-mono">
                        {item.damage_dice && (
                          <span className="px-2 py-0.5 bg-[var(--blood)]/20 text-[#fca5a5] border border-[var(--blood)]/40">
                            Dano: {item.damage_dice}
                            {item.damage_bonus ? ` +${item.damage_bonus}` : ''}
                          </span>
                        )}
                        {(item.armor_bonus ?? 0) > 0 && (
                          <span className="px-2 py-0.5 bg-[var(--mist)]/20 text-[#7dd3fc] border border-[var(--mist)]/40">
                            Defesa +{item.armor_bonus}
                          </span>
                        )}
                        {item.two_handed && (
                          <span className="px-2 py-0.5 bg-[var(--gold)]/20 text-[var(--gold-hi)] border border-[var(--gold-lo)]">
                            2 Mãos
                          </span>
                        )}
                        {item.ranged && (
                          <span className="px-2 py-0.5 slab text-[var(--muted)] border border-[var(--iron)]">
                            À Distância
                          </span>
                        )}
                      </div>

                      {/* Descrição em Garamond */}
                      {item.description && (
                        <p className="font-serif italic text-xs text-[var(--muted)] leading-relaxed mt-2.5 line-clamp-2">
                          "{item.description}"
                        </p>
                      )}
                    </div>

                    {/* Preço e Botão de Compra Dourado */}
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--iron)]/60 mt-2">
                      <CoinsBadge coinsBronze={item.price_bronze} size="sm" />

                      <button
                        type="button"
                        data-testid="buy-shop-item"
                        onClick={() => handleBuy(item)}
                        disabled={!shopOpen || !canAfford || loadingAction}
                        title={
                          !shopOpen
                            ? 'As portas estão trancadas'
                            : !canAfford
                            ? 'Moedas insuficientes'
                            : 'Comprar item'
                        }
                        className={`
                          px-4 py-2 font-['Cinzel',serif] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer
                          ${
                            !shopOpen || !canAfford || loadingAction
                              ? 'recess text-white/30 border border-black cursor-not-allowed'
                              : 'bg-[var(--gold)] text-black border border-[var(--gold-hi)] hover:brightness-110 active:scale-95 shadow-md'
                          }
                        `}
                      >
                        {isBuying ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> Comprando...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3 h-3" />
                            <span>{shopOpen ? 'Comprar' : 'Trancado'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CONTEÚDO DA ABA VENDER (PERTENCES DO JOGADOR) ── */}
      {activeTab === 'sell' && (
        <div>
          {sellableItems.length === 0 ? (
            <div className="text-center py-16 text-white/40 font-serif italic space-y-2">
              <Coins className="w-10 h-10 opacity-30 mx-auto mb-2" />
              <p>Você não possui itens avaliados para venda na sua mochila.</p>
              <p className="text-xs text-white/30">
                Itens equipados devem ser desequipados antes da negociação.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sellableItems.map((item) => {
                const sellValue = Math.floor(Number(item.price_bronze) / 2);
                const isSelling = sellingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/15 transition-all shadow-lg space-y-3"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{item.icon || '🎒'}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-serif text-sm font-bold text-[#f5f5f7] truncate">
                            {item.name}
                          </h3>
                          <div className="text-xs text-[#f5b65b] font-mono mt-0.5">
                            Posse: {item.quantity || 1} un
                          </div>
                        </div>
                      </div>

                      <p className="font-serif italic text-xs text-white/60 leading-relaxed mt-2.5 line-clamp-2">
                        "{item.description || 'Pertence de viagem.'}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] mt-2">
                      <div>
                        <div className="text-[10px] font-serif uppercase tracking-wider text-white/40">
                          Recompra (50%)
                        </div>
                        <CoinsBadge coinsBronze={sellValue} size="sm" />
                      </div>

                      <button
                        type="button"
                        data-testid="sell-shop-item"
                        onClick={() => handleSell(item)}
                        disabled={!shopOpen || loadingAction}
                        title={
                          !shopOpen
                            ? 'As portas estão trancadas'
                            : 'Vender item por 50% do valor'
                        }
                        className={`
                          px-4 py-2 rounded-xl font-serif text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all
                          ${
                            !shopOpen || loadingAction
                              ? 'bg-white/[0.04] text-white/30 border border-white/[0.06] cursor-not-allowed'
                              : 'bg-gradient-to-b from-[#ca8a04] to-[#854d0e] text-[#f5e8c8] border border-[#f5b65b]/60 hover:brightness-110 active:scale-95 shadow-md'
                          }
                        `}
                      >
                        {isSelling ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> Vendendo...
                          </>
                        ) : (
                          <>
                            <Coins className="w-3 h-3" />
                            <span>{shopOpen ? 'Vender' : 'Trancado'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
