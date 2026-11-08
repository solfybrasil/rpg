import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  ShoppingCart,
  Coins,
  Package,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useHero, useGameState, useInventory } from '../../../shared/hooks/baseHooks';
import { useSessionStore } from '../../../shared/stores/session';
import { CoinsBadge } from '../../../shared/ui';
import { fetchShopItems, buyShopItemInDB, sellItemInDB, subscribeToShopRealtime } from '../api';
import type { ShopItem } from '../types';
import '../../../styles/features/PlayerShop.css';

export const PlayerShopView: React.FC = () => {
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const heroId = sessionHeroId || 'teste_1';
  const { hero, updateHeroAsync } = useHero(heroId);
  const { items: inventoryItems } = useInventory(heroId);
  const { gameState } = useGameState();

  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [filterCategory, setFilterCategory] = useState<'all' | 'weapon' | 'armor' | 'consumable'>('all');
  const [loadingAction, setLoadingAction] = useState(false);
  const [buyingItemId, setBuyingItemId] = useState<string | null>(null);
  const [sellingItemId, setSellingItemId] = useState<string | null>(null);

  const shopOpen = gameState?.shop_open ?? true;
  const shopName = gameState?.shop_name || 'Mercado da Fuligem';
  const playerCoins = hero?.coins_bronze ?? 0;

  // Carrega itens da loja e escuta mudanças em tempo real
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

  // Itens do jogador que podem ser vendidos
  const sellableItems = useMemo(() => {
    return (inventoryItems || []).filter((it) => {
      if (it.equip_slot) return false;
      return it.price_bronze && Number(it.price_bronze) > 0;
    });
  }, [inventoryItems]);

  // Ação de Compra
  const handleBuy = async (item: ShopItem) => {
    if (loadingAction || buyingItemId) return;
    if (playerCoins < item.price_bronze) {
      toast.error('Moedas de bronze insuficientes para adquirir este artigo!');
      return;
    }

    setLoadingAction(true);
    setBuyingItemId(item.id);

    try {
      await buyShopItemInDB('MESA', heroId, item.id, 1);
      if (updateHeroAsync) {
        await updateHeroAsync({
          coins_bronze: Math.max(0, playerCoins - item.price_bronze),
        });
      }
      toast.success(`✨ ${item.name} foi adicionado à sua mochila de viagem!`);
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
    if (loadingAction || sellingItemId) return;
    const sellValue = Math.floor(Number(item.price_bronze) / 2);

    setLoadingAction(true);
    setSellingItemId(item.id);

    try {
      await sellItemInDB('MESA', heroId, item.id, 1);
      if (updateHeroAsync) {
        await updateHeroAsync({
          coins_bronze: playerCoins + sellValue,
        });
      }
      toast.success(`💰 Você vendeu ${item.name} e recebeu +${sellValue} moedas de bronze!`);
    } catch (err: any) {
      console.error('[SHOP] Falha ao vender:', err);
      toast.error(err.message || 'Erro ao realizar venda.');
    } finally {
      setLoadingAction(false);
      setSellingItemId(null);
    }
  };

  return (
    <div className="player-shop-root">
      {/* ── ALERTA DE MERCADO FECHADO ── */}
      {!shopOpen && (
        <div className="shop-closed-alert">
          <AlertCircle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div>
            <div className="shop-closed-title">
              🔒 MERCADO FECHADO PELO CONFESSOR (MODO VITRINE)
            </div>
            <div className="shop-closed-desc">
              As caravanas estão recolhidas. Você pode consultar os preços e artigos do catálogo, mas as negociações de compra e venda estão temporariamente suspensas.
            </div>
          </div>
        </div>
      )}

      {/* ── BANNER DA LOJA & BOLSA DO JURADO ── */}
      <div className="shop-banner">
        <div className="shop-identity-group">
          <div className="shop-icon-frame">
            <Store size={26} />
          </div>
          <div className="shop-title-area">
            <h1 className="shop-title">
              <span>{shopName}</span>
              <span className={`shop-status-tag ${shopOpen ? 'open' : 'closed'}`}>
                {shopOpen ? 'Aberto' : 'Trancado'}
              </span>
            </h1>
            <p className="shop-exchange-sub">
              Câmbio Oficial: 50 Bronze = 1 Prata • 50 Prata = 1 Ouro (2.500b = 1o)
            </p>
          </div>
        </div>

        {/* Bolsa Pessoal do Jogador */}
        <div className="shop-wallet-box">
          <span className="shop-wallet-kicker">SUA BOLSA DE MOEDAS</span>
          <CoinsBadge coinsBronze={playerCoins} />
        </div>
      </div>

      {/* ── NAVEGAÇÃO DE ABAS & FILTROS ── */}
      <div className="shop-nav-bar">
        <div className="shop-tabs-group">
          <button
            type="button"
            onClick={() => setActiveTab('buy')}
            className={`shop-tab-btn buy ${activeTab === 'buy' ? 'active' : ''}`}
          >
            <ShoppingCart size={14} />
            <span>COMPRAR ITENS ({filteredShopItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sell')}
            className={`shop-tab-btn sell ${activeTab === 'sell' ? 'active' : ''}`}
          >
            <Coins size={14} />
            <span>VENDER PERTENCES ({sellableItems.length})</span>
          </button>
        </div>

        {/* Filtros de Categoria */}
        {activeTab === 'buy' && (
          <div className="shop-filters-group">
            {[
              { id: 'all' as const, label: 'Tudo' },
              { id: 'weapon' as const, label: 'Armas' },
              { id: 'armor' as const, label: 'Armaduras' },
              { id: 'consumable' as const, label: 'Consumíveis' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.id)}
                className={`shop-chip ${filterCategory === cat.id ? 'active' : ''}`}
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
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#8a7860' }}>
              <Package size={34} style={{ margin: '0 auto 0.6rem', opacity: 0.4 }} />
              <p style={{ fontStyle: 'italic', fontFamily: 'var(--font-title, serif)' }}>
                Nenhum artigo disponível nesta categoria no momento.
              </p>
            </div>
          ) : (
            <div className="shop-items-grid">
              {filteredShopItems.map((item) => {
                const canAfford = playerCoins >= item.price_bronze;
                const isBuying = buyingItemId === item.id;
                const isAnyAction = loadingAction || buyingItemId !== null || sellingItemId !== null;

                return (
                  <div key={item.id} className="shop-item-card">
                    <div>
                      {/* Topo: Ícone e Nome */}
                      <div className="shop-item-top">
                        <div className="shop-item-thumb">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} />
                          ) : (
                            <span style={{ fontSize: '1.4rem' }}>{item.icon || '🎒'}</span>
                          )}
                        </div>
                        <div className="shop-item-info">
                          <h4 className="shop-item-name">{item.name}</h4>
                          <div className="shop-item-tags">
                            <span className="shop-tag-rarity">{item.rarity || 'Comum'}</span>
                            {item.category && <span className="shop-tag-cat">{item.category}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Atributos / Stats */}
                      <div className="shop-item-badges">
                        {item.damage_dice && (
                          <span className="shop-badge-stat damage">
                            Dano: {item.damage_dice}{item.damage_bonus ? ` + ${item.damage_bonus}` : ''}
                          </span>
                        )}
                        {(item.armor_bonus ?? 0) > 0 && (
                          <span className="shop-badge-stat defense">
                            Defesa +{item.armor_bonus}
                          </span>
                        )}
                        {item.two_handed && (
                          <span className="shop-badge-stat neutral">2 Mãos</span>
                        )}
                        {item.ranged && (
                          <span className="shop-badge-stat neutral">À Distância</span>
                        )}
                      </div>

                      {/* Descrição em Garamond */}
                      {item.description && (
                        <p className="shop-item-desc">
                          "{item.description}"
                        </p>
                      )}
                    </div>

                    {/* Preço e Botão de Ação */}
                    <div className="shop-item-footer">
                      <CoinsBadge coinsBronze={item.price_bronze} />
                      <button
                        type="button"
                        onClick={() => handleBuy(item)}
                        disabled={!shopOpen || !canAfford || isAnyAction}
                        className="shop-btn-action buy"
                      >
                        {isBuying ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Comprando...</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={13} />
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

      {/* ── CONTEÚDO DA ABA VENDER ── */}
      {activeTab === 'sell' && (
        <div>
          {sellableItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#8a7860' }}>
              <Coins size={34} style={{ margin: '0 auto 0.6rem', opacity: 0.4 }} />
              <p style={{ fontStyle: 'italic', fontFamily: 'var(--font-title, serif)' }}>
                Você não possui artigos avaliados para venda na sua mochila.
              </p>
              <p style={{ fontSize: '0.72rem', color: '#6e5f4d', marginTop: '4px' }}>
                Itens equipados devem ser retirados para os slots gerais antes da negociação.
              </p>
            </div>
          ) : (
            <div className="shop-items-grid">
              {sellableItems.map((item) => {
                const sellValue = Math.floor(Number(item.price_bronze) / 2);
                const isSelling = sellingItemId === item.id;
                const isAnyAction = loadingAction || buyingItemId !== null || sellingItemId !== null;

                return (
                  <div key={item.id} className="shop-item-card">
                    <div>
                      <div className="shop-item-top">
                        <div className="shop-item-thumb">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} />
                          ) : (
                            <span style={{ fontSize: '1.4rem' }}>{item.icon || '🎒'}</span>
                          )}
                        </div>
                        <div className="shop-item-info">
                          <h4 className="shop-item-name">{item.name}</h4>
                          <div className="shop-item-tags">
                            <span className="shop-tag-rarity">{item.rarity || 'Comum'}</span>
                            <span className="shop-tag-cat">Posse: {item.quantity || 1} un</span>
                          </div>
                        </div>
                      </div>

                      <p className="shop-item-desc">
                        "{item.description || 'Pertence de viagem registrado nos anais do Jurado.'}"
                      </p>
                    </div>

                    <div className="shop-item-footer">
                      <div>
                        <div style={{ fontSize: '0.58rem', color: '#8c8272', textTransform: 'uppercase', fontFamily: 'var(--font-title, serif)' }}>
                          Recompra (50%)
                        </div>
                        <CoinsBadge coinsBronze={sellValue} />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSell(item)}
                        disabled={!shopOpen || isAnyAction}
                        className="shop-btn-action sell"
                      >
                        {isSelling ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Vendendo...</span>
                          </>
                        ) : (
                          <>
                            <Coins size={13} />
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
