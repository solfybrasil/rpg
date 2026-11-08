import React, { useState } from 'react';
import { useDmDashboard } from '../hooks/useDmDashboard';
import { GiveItemModal } from './GiveItemModal';

interface ItemCatalogItem {
  id: string;
  name: string;
  category: string;
  rarity: string;
  price: string;
  description: string;
  effect: string;
  symbol: string;
}

const ITEMS: ItemCatalogItem[] = [
  {
    id: '1',
    name: 'Lâmina do Ocaso',
    category: 'Arma',
    rarity: 'Rara',
    price: '25 prata (250b)',
    description: 'Uma espada escurecida forjada em aço de meteorito que retém o calor da última luz do crepúsculo.',
    effect: '+1 de dano cortante contra criaturas da peste.',
    symbol: '⚔',
  },
  {
    id: '2',
    name: 'Frasco de Seiva Âmbar',
    category: 'Consumível',
    rarity: 'Incomum',
    price: '12 prata (120b)',
    description: 'Um líquido dourado, espesso e morno ao toque, recolhido da Raiz Ancestral.',
    effect: 'Cura 2d4+2 pontos de Vida imediatamente.',
    symbol: '♧',
  },
  {
    id: '3',
    name: 'Manto do Penitente',
    category: 'Armadura',
    rarity: 'Épica',
    price: '1 ouro (1000b)',
    description: 'Costurado com fios de prata sobre tecido de luto dos monges do Confessório.',
    effect: '+2 em testes de resistência contra corrupção da peste.',
    symbol: '♜',
  },
  {
    id: '4',
    name: 'Broche do Juramento Alvo',
    category: 'Relíquia',
    rarity: 'Lendária',
    price: 'Inestimável',
    description: 'Um relicário que pulsa com o batimento cardíaco do fundador do pacto.',
    effect: 'Uma vez por sessão, impede que um jurado morra quando reduzido a 0 PV.',
    symbol: '✧',
  },
  {
    id: '5',
    name: 'Óleo de Prata Sagrada',
    category: 'Consumível',
    rarity: 'Comum',
    price: '4 prata (40b)',
    description: 'Unguento para untar lâminas de aço antes da batalha.',
    effect: 'Concede dano sagrado à arma por 3 rounds.',
    symbol: '🧪',
  },
  {
    id: '6',
    name: 'Escudo das Brasas Frias',
    category: 'Armadura',
    rarity: 'Rara',
    price: '30 prata (300b)',
    description: 'Escudo forjado na fornalha que extinguiu o primeiro fogo da peste.',
    effect: 'Absorve 3 pontos de qualquer dano elemental.',
    symbol: '🛡',
  },
];

export function DMItensView() {
  const { heroes, giveItem } = useDmDashboard();
  const [selectedItem, setSelectedItem] = useState<ItemCatalogItem>(ITEMS[0]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [giveTargetHero, setGiveTargetHero] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const filtered = ITEMS.filter(
    (item) => categoryFilter === 'all' || item.category.toLowerCase() === categoryFilter.toLowerCase(),
  );

  return (
    <div className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '24px clamp(16px, 2.5vw, 38px) 32px' }}>
      {/* ── Page Heading ── */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">Tesouro e equipamento</div>
          <h1>Inventário & Relíquias</h1>
          <p>Objetos recuperados, artefatos e equipamento de campanha.</p>
        </div>
        <button
          className="btn"
          type="button"
          onClick={() => showToast('Formulário de novo item aberto.')}
        >
          ＋ Adicionar item
        </button>
      </div>

      {/* ── 3 Módulos de Cartão de Destaque ── */}
      <div className="modules" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 0, marginBottom: 22 }}>
        {ITEMS.slice(0, 3).map((item) => (
          <article key={item.id} className="module-card">
            <div className="module-title">{item.category} · {item.rarity.toLowerCase()}</div>
            <div className="module-art"><span className="module-symbol">{item.symbol}</span></div>
            <div className="module-body">
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setSelectedItem(item);
                  showToast(`Relíquia ${item.name} selecionada.`);
                }}
              >
                Examinar relíquia →
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* ── Painel de Filtros e Grid ── */}
      <div className="dashboard" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
        {/* Lista de Relíquias */}
        <section className="panel">
          <div className="panel-head">
            <h2>Compêndio de Artigos</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'arma', 'armadura', 'consumível', 'relíquia'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    background: categoryFilter === cat ? 'var(--gold)' : 'transparent',
                    border: 'none',
                    color: categoryFilter === cat ? '#000' : 'var(--muted)',
                    font: '500 10px Cinzel, serif',
                    textTransform: 'uppercase',
                    padding: '3px 7px',
                    borderRadius: 2,
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map((item) => {
              const isSelected = selectedItem.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="quick-action"
                  onClick={() => setSelectedItem(item)}
                  style={{
                    background: isSelected ? 'linear-gradient(90deg, #59402542, #15110d)' : '#100e0b70',
                    borderColor: isSelected ? 'var(--gold)' : 'transparent',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="qicon">{item.symbol}</span>
                    <div>
                      <strong style={{ color: isSelected ? 'var(--gold-light)' : 'var(--text)', fontSize: 15 }}>
                        {item.name}
                      </strong>
                      <span style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', display: 'block' }}>
                        {item.category} · {item.rarity} · Valor: {item.price}
                      </span>
                    </div>
                  </div>
                  <span className="eyebrow" style={{ color: 'var(--gold)' }}>Ver →</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Dossiê do Item Selecionado & Outorga a Jurado */}
        <section className="panel hero-card" style={{ gridTemplateColumns: '1fr' }}>
          <div className="hero-info" style={{ padding: 22 }}>
            <div className="eyebrow">Examinador de Relíquia</div>
            <h2>{selectedItem.name}</h2>
            <div className="subtitle">{selectedItem.category} · Raridade {selectedItem.rarity}</div>

            <div style={{ marginTop: 14, padding: 10, background: '#120e0b', border: '1px solid var(--line-soft)', borderRadius: 2 }}>
              <span className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>Propriedade Mística:</span>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--gold-light)', fontStyle: 'italic' }}>
                {selectedItem.effect}
              </p>
            </div>

            <p className="flavor" style={{ maxWidth: '100%', marginTop: 14 }}>
              {selectedItem.description}
            </p>

            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Conceder Imediatamente ao Jurado:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {heroes.map((hero) => (
                  <button
                    key={hero.id}
                    type="button"
                    className="btn secondary"
                    style={{ fontSize: 10, padding: '6px 10px' }}
                    onClick={async () => {
                      await giveItem(hero.id, {
                        name: selectedItem.name,
                        category: selectedItem.category,
                        quantity: 1,
                        description: selectedItem.description,
                        rarity: selectedItem.rarity,
                      });
                      showToast(`"${selectedItem.name}" entregue a ${hero.name}!`);
                    }}
                  >
                    ＋ {hero.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <div className="footer">
        <span>O CONFESSÓRIO DO MESTRE · ARQUIVO DE CAMPANHA</span>
        <span>"O ouro compra aço; a virtude sustenta a alma."</span>
      </div>

      {/* ── Toast ── */}
      <div className={`mestre-toast${toast ? ' show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>

      {giveTargetHero && (
        <GiveItemModal
          hero={giveTargetHero}
          onClose={() => setGiveTargetHero(null)}
          onGiveItem={giveItem}
        />
      )}
    </div>
  );
}
