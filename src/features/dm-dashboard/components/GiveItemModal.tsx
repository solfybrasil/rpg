import { Loader2 } from 'lucide-react';
import type React from 'react';
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
      toast.error('Selecione um item do catálogo ou informe um nome customizado.');
      return;
    }

    setIsSubmitting(true);
    try {
      const name = selectedItem ? selectedItem.name : customName.trim();
      const cat = selectedItem ? selectedItem.category : 'Dádiva';
      const desc =
        customDesc.trim() ||
        (selectedItem ? 'Item oficial concedido pelo Mestre.' : 'Dádiva forjada pelo Mestre.');

      await onGiveItem(hero.id, {
        name,
        category: cat,
        quantity: Math.max(1, quantity),
        image_url: selectedItem?.id ? undefined : null,
        description: desc,
        rarity: selectedItem?.rarity || 'comum',
      });

      toast.success(`Dádiva "${name}" concedida a ${hero.name}!`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao conceder item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(8, 6, 4, 0.88)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="panel-head">
          <h2>
            <span style={{ color: 'var(--gold)', marginRight: 6 }}>♧</span>
            Conceder Dádiva a {hero.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Corpo do formulário */}
        <form onSubmit={handleSubmit} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Busca no Compêndio</div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar arma, poção, pergaminho ou relíquia..."
              style={{
                width: '100%',
                padding: '9px 12px',
                background: '#120e0b',
                border: '1px solid var(--line-soft)',
                color: 'var(--text)',
                fontFamily: 'Crimson Pro, Georgia, serif',
                fontSize: 16,
                borderRadius: 2,
              }}
            />
          </div>

          {/* Lista de itens encontrados */}
          <div style={{ border: '1px solid var(--line-soft)', borderRadius: 2, background: '#100e0b70' }}>
            <div style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--line-soft)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              font: '500 11px Cinzel, serif',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
            }}>
              <span>Itens no Catálogo ({catalogItems.length})</span>
              {isLoading && <Loader2 size={13} className="animate-spin" />}
            </div>

            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, padding: 4 }}>
              {catalogItems.length === 0 && !isLoading && (
                <div style={{ padding: 14, textAlign: 'center', color: 'var(--muted)', fontSize: 14, fontStyle: 'italic' }}>
                  Nenhum item encontrado. Preencha o nome customizado abaixo para forjar.
                </div>
              )}
              {catalogItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItem(isSelected ? null : item)}
                    className="quick-action"
                    style={{
                      padding: '8px 12px',
                      background: isSelected ? 'linear-gradient(90deg, #59402542, #15110d)' : '#100e0b70',
                      borderColor: isSelected ? 'var(--gold)' : 'transparent',
                    }}
                  >
                    <span className="qicon" style={{ fontSize: 16 }}>{item.category === 'arma' ? '⚔' : item.category === 'armadura' ? '♜' : '♧'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: 14, color: isSelected ? 'var(--gold-light)' : 'var(--text)' }}>{item.name}</strong>
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>{item.category} · {item.rarity || 'comum'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item Customizado caso não seja do catálogo */}
          {!selectedItem && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10, background: '#120e0b', border: '1px solid var(--line-soft)', borderRadius: 2 }}>
              <div className="eyebrow">Ou Forjar Artigo Customizado</div>
              <input
                type="text"
                placeholder="Nome do item ou bênção..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: '#15120f',
                  border: '1px solid var(--line-soft)',
                  color: 'var(--text)',
                  fontSize: 15,
                  borderRadius: 2,
                }}
              />
              <textarea
                placeholder="Descrição narrativa ou efeito..."
                rows={2}
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: '#15120f',
                  border: '1px solid var(--line-soft)',
                  color: 'var(--text)',
                  fontSize: 14,
                  borderRadius: 2,
                  resize: 'none',
                }}
              />
            </div>
          )}

          {/* Quantidade e Ação */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)', font: '500 11px Cinzel, serif' }}>QUANTIDADE:</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >−</button>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold-light)', minWidth: 20, textAlign: 'center' }}>{quantity}</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setQuantity((q) => q + 1)}
              >＋</button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn" disabled={isSubmitting}>
                {isSubmitting ? 'Outorgando...' : 'Outorgar Dádiva →'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
