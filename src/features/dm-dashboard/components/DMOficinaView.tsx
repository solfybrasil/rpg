import React, { useState } from 'react';
import { useDmDashboard } from '../hooks/useDmDashboard';

interface Recipe {
  id: string;
  name: string;
  category: string;
  description: string;
  ingredients: string[];
  result: string;
}

const RECIPES: Recipe[] = [
  {
    id: '1',
    name: 'Pomada de Fogo Fátuo',
    category: 'Alquimia',
    description: 'Ilumina o invisível e afasta névoas por 1 hora.',
    ingredients: ['Seiva Âmbar', 'Pó de Quartzo', 'Cinza Consagrada'],
    result: '1x Pomada Luminosa',
  },
  {
    id: '2',
    name: 'Lâmina das Cinzas',
    category: 'Metalurgia',
    description: 'Arma com têmpera de carvão bento (+1d4 dano de fogo).',
    ingredients: ['Barra de Aço', 'Carvão Místico', 'Óleo Sacro'],
    result: '1x Espada Flamejante',
  },
  {
    id: '3',
    name: 'Tintura da Coruja Cega',
    category: 'Alquimia',
    description: 'Concede visão no escuro e vantagem em testes de percepção.',
    ingredients: ['Olho de Coruja', 'Erva da Lua', 'Água Benta'],
    result: '2x Frasco da Visão',
  },
];

export function DMOficinaView() {
  const { heroes } = useDmDashboard();
  const [toast, setToast] = useState<string | null>(null);
  const [craftSlots, setCraftSlots] = useState<string[]>(Array(9).fill(''));
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>(RECIPES[0]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const handleSlotClick = (index: number) => {
    const icons = ['', '🧪', '🌿', '🔥', '💎', '🪵', '⚜️'];
    const current = craftSlots[index];
    const nextIdx = (icons.indexOf(current) + 1) % icons.length;
    const next = [...craftSlots];
    next[index] = icons[nextIdx];
    setCraftSlots(next);
  };

  const clearBench = () => {
    setCraftSlots(Array(9).fill(''));
    showToast('Bancada esvaziada.');
  };

  const forgeCraft = () => {
    const filled = craftSlots.filter(Boolean).length;
    if (filled === 0) {
      showToast('A bancada está vazia! Adicione reagentes aos slots.');
      return;
    }
    showToast(`✦ Forja realizada com sucesso! Relíquia gerada: ${selectedRecipe.name}`);
  };

  return (
    <div className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '24px clamp(16px, 2.5vw, 38px) 32px' }}>
      {/* ── Page Heading ── */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">Artesanato / Metalurgia</div>
          <h1>Oficina</h1>
          <p>Transforme matéria bruta em relíquias dignas de uma lenda.</p>
        </div>
        <button
          className="btn"
          type="button"
          onClick={() => showToast('Nova fórmula catalogada no grimório.')}
        >
          ＋ Nova receita
        </button>
      </div>

      {/* ── 3 Módulos de Cartão de Destaque ── */}
      <div className="modules" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 0, marginBottom: 22 }}>
        <article className="module-card">
          <div className="module-title">Forja</div>
          <div className="module-art"><span className="module-symbol">⚒</span></div>
          <div className="module-body">
            <h3>Reforjar armamento</h3>
            <p>Melhore armas e proteções usando fragmentos de meteoro e moedas antigas.</p>
            <button className="btn" type="button" onClick={() => showToast('Forja de metalurgia ativada.')}>
              Iniciar forja →
            </button>
          </div>
        </article>

        <article className="module-card">
          <div className="module-title">Alquimia</div>
          <div className="module-art"><span className="module-symbol">♧</span></div>
          <div className="module-body">
            <h3>Preparar elixires</h3>
            <p>Combine ingredientes raros e ervas purificadoras para curar a peste.</p>
            <button className="btn" type="button" onClick={() => showToast('Mesa de alquimia pronta.')}>
              Preparar elixir →
            </button>
          </div>
        </article>

        <article className="module-card">
          <div className="module-title">Materiais</div>
          <div className="module-art"><span className="module-symbol">◈</span></div>
          <div className="module-body">
            <h3>Reserva de materiais</h3>
            <p>Inventário de lingotes, cinzas, essências puras e fragmentos.</p>
            <button className="btn" type="button" onClick={() => showToast('Depósito de reagentes aberto.')}>
              Ver materiais →
            </button>
          </div>
        </article>
      </div>

      {/* ── Bancada 3x3 e Livro de Receitas ── */}
      <div className="dashboard" style={{ gridTemplateColumns: '1.1fr 0.9fr' }}>
        {/* Bancada 3x3 Interativa */}
        <section className="panel" style={{ padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="panel-head" style={{ width: '100%', marginBottom: 16 }}>
            <h2>Bancada de Alquimia & Forja 3x3</h2>
            <span>Clique nos slots para alternar reagentes</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 72px)',
            gridTemplateRows: 'repeat(3, 72px)',
            gap: 10,
            padding: 16,
            background: '#0d0906',
            border: '1px solid var(--line-soft)',
            borderRadius: 2,
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)',
          }}>
            {craftSlots.map((val, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSlotClick(idx)}
                style={{
                  width: 72,
                  height: 72,
                  background: val ? '#1e150e' : '#120d09',
                  border: `1px ${val ? 'solid var(--gold)' : 'dashed var(--line-soft)'}`,
                  color: 'var(--gold-light)',
                  fontSize: 26,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  borderRadius: 2,
                  transition: '0.15s',
                }}
                title="Clique para ciclar reagente"
              >
                {val}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button className="btn secondary" type="button" onClick={clearBench}>
              Limpar Bancada
            </button>
            <button className="btn" type="button" onClick={forgeCraft}>
              ⚒ Forjar Fórmula ({selectedRecipe.name})
            </button>
          </div>
        </section>

        {/* Livro de Receitas Conhecidas */}
        <section className="panel">
          <div className="panel-head">
            <h2>Livro de Fórmulas</h2>
            <span>{RECIPES.length} conhecidas</span>
          </div>

          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {RECIPES.map((r) => {
              const isSelected = selectedRecipe.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  className="quick-action"
                  onClick={() => setSelectedRecipe(r)}
                  style={{
                    background: isSelected ? 'linear-gradient(90deg, #59402542, #15110d)' : '#100e0b70',
                    borderColor: isSelected ? 'var(--gold)' : 'transparent',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <strong style={{ color: isSelected ? 'var(--gold-light)' : 'var(--text)', fontSize: 15 }}>
                      {r.name}
                    </strong>
                    <span style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', display: 'block' }}>
                      {r.category} · Produz: {r.result}
                    </span>
                  </div>
                  <span className="eyebrow" style={{ color: 'var(--gold)' }}>Ver →</span>
                </button>
              );
            })}
          </div>

          {/* Ensinar ao Jurado */}
          <div style={{ padding: 14, borderTop: '1px solid var(--line-soft)' }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Ensinar "{selectedRecipe.name}" a um Jurado:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {heroes.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="btn secondary"
                  style={{ fontSize: 10, padding: '5px 8px' }}
                  onClick={() => showToast(`Receita "${selectedRecipe.name}" ensinada a ${h.name}!`)}
                >
                  ＋ {h.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <div className="footer">
        <span>O CONFESSÓRIO DO MESTRE · ARQUIVO DE CAMPANHA</span>
        <span>"A matéria bruta dobra-se à vontade dos justos."</span>
      </div>

      {/* ── Toast ── */}
      <div className={`mestre-toast${toast ? ' show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
