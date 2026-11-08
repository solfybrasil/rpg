import React, { useState } from 'react';

interface Ritual {
  id: string;
  name: string;
  grade: string;
  symbol: string;
  focusCost: number;
  plagueCost: number;
  castingTime: string;
  range: string;
  description: string;
  effect: string;
}

const RITUALS: Ritual[] = [
  {
    id: '1',
    name: 'Véu das Cinzas',
    grade: 'Ritual · Grau II',
    symbol: '✧',
    focusCost: 1,
    plagueCost: 0,
    castingTime: '1 Ação',
    range: 'Toque',
    description: 'Abafa passos e sussurros, envolvendo os jurados em névoa cinzenta indistinguível da escuridão.',
    effect: 'Concede +4 em testes de Furtividade para até 3 aliados por 10 minutos.',
  },
  {
    id: '2',
    name: 'Estrela Afogada',
    grade: 'Feitiço · Grau III',
    symbol: '◇',
    focusCost: 2,
    plagueCost: 1,
    castingTime: '1 Ação',
    range: '18 metros',
    description: 'Uma centelha fria de luz azulada que queima a carne impura e revela rastros da peste.',
    effect: 'Causa 3d8 de dano radiante frio. Se o alvo possuir peste, causa 1d8 adicional.',
  },
  {
    id: '3',
    name: 'O Nome Sob a Pedra',
    grade: 'Conhecimento Proibido',
    symbol: '☠',
    focusCost: 3,
    plagueCost: 2,
    castingTime: '10 minutos',
    range: 'Local',
    description: 'Uma invocação incompleta, raspada das lápides ancestrais antes do Grande Incêndio.',
    effect: 'O conjurador questiona um espírito sepultado. Recebe 3 respostas verdadeiras.',
  },
  {
    id: '4',
    name: 'Círculo do Expurgo',
    grade: 'Ritual · Grau I',
    symbol: '⚜',
    focusCost: 1,
    plagueCost: 0,
    castingTime: '1 Turno',
    range: 'Raio de 3m',
    description: 'Traçado com giz bento e sal nos paralelepípedos.',
    effect: 'Criaturas contaminadas pela peste não conseguem atravessar a barreira por 1 minuto.',
  },
];

export function DMGrimorioView() {
  const [selectedRitual, setSelectedRitual] = useState<Ritual>(RITUALS[0]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const castRitual = (r: Ritual) => {
    const roll = Math.floor(Math.random() * 20) + 1;
    showToast(`Teste de Conjuração (${r.name}): D20 rolou ${roll}! Custo: ${r.focusCost} Foco.`);
  };

  return (
    <div className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '24px clamp(16px, 2.5vw, 38px) 32px' }}>
      {/* ── Page Heading ── */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">Conhecimento arcano</div>
          <h1>Grimórios</h1>
          <p>Magias, rituais e conhecimentos proibidos.</p>
        </div>
        <button
          className="btn"
          type="button"
          onClick={() => showToast('Inscrição de novo ritual aberta no tomo.')}
        >
          ＋ Novo grimório
        </button>
      </div>

      {/* ── 3 Módulos de Cartão de Destaque ── */}
      <div className="modules" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 0, marginBottom: 22 }}>
        {RITUALS.slice(0, 3).map((r) => (
          <article key={r.id} className="module-card">
            <div className="module-title">{r.grade}</div>
            <div className="module-art"><span className="module-symbol">{r.symbol}</span></div>
            <div className="module-body">
              <h3>{r.name}</h3>
              <p>{r.description}</p>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setSelectedRitual(r);
                  showToast(`Ritual ${r.name} selecionado.`);
                }}
              >
                Consultar ritual →
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* ── Painel de Rituais & Conjuração ── */}
      <div className="dashboard" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Catálogo de Rituais */}
        <section className="panel">
          <div className="panel-head">
            <h2>Círculos de Sabedoria Arcana</h2>
            <span>{RITUALS.length} rituais</span>
          </div>

          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {RITUALS.map((r) => {
              const isSelected = selectedRitual.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  className="quick-action"
                  onClick={() => setSelectedRitual(r)}
                  style={{
                    background: isSelected ? 'linear-gradient(90deg, #59402542, #15110d)' : '#100e0b70',
                    borderColor: isSelected ? 'var(--gold)' : 'transparent',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="qicon">{r.symbol}</span>
                    <div>
                      <strong style={{ color: isSelected ? 'var(--gold-light)' : 'var(--text)', fontSize: 15 }}>
                        {r.name}
                      </strong>
                      <span style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', display: 'block' }}>
                        {r.grade} · Custo: {r.focusCost} Foco {r.plagueCost > 0 && `· +${r.plagueCost} Peste`}
                      </span>
                    </div>
                  </div>
                  <span className="eyebrow" style={{ color: 'var(--gold)' }}>Ver →</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Ficha do Ritual Selecionado */}
        <section className="panel hero-card" style={{ gridTemplateColumns: '1fr' }}>
          <div className="hero-info" style={{ padding: 22 }}>
            <div className="eyebrow">Compêndio de Ritos Sagrados</div>
            <h2>{selectedRitual.name}</h2>
            <div className="subtitle">{selectedRitual.grade}</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 14 }}>
              <div style={{ padding: 8, background: '#120e0b', border: '1px solid var(--line-soft)', borderRadius: 2 }}>
                <span className="eyebrow">Tempo de Ação:</span>
                <div style={{ fontSize: 14, color: 'var(--gold-light)', fontWeight: 600 }}>{selectedRitual.castingTime}</div>
              </div>
              <div style={{ padding: 8, background: '#120e0b', border: '1px solid var(--line-soft)', borderRadius: 2 }}>
                <span className="eyebrow">Alcance Místico:</span>
                <div style={{ fontSize: 14, color: 'var(--gold-light)', fontWeight: 600 }}>{selectedRitual.range}</div>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 10, background: '#120e0b', border: '1px solid var(--line-soft)', borderRadius: 2 }}>
              <span className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>Efeito do Rito:</span>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', fontStyle: 'italic' }}>
                {selectedRitual.effect}
              </p>
            </div>

            <p className="flavor" style={{ maxWidth: '100%', marginTop: 14 }}>
              {selectedRitual.description}
            </p>

            <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', justifyContent: 'space-between' }}>
              <button
                className="btn secondary"
                type="button"
                onClick={() => showToast(`Custo de ${selectedRitual.focusCost} de Foco descontado da mesa.`)}
              >
                Gastar Foco ({selectedRitual.focusCost})
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => castRitual(selectedRitual)}
              >
                ✧ Rolar Teste de Conjuração 🎲
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <div className="footer">
        <span>O CONFESSÓRIO DO MESTRE · ARQUIVO DE CAMPANHA</span>
        <span>"O verbo é a primeira e última centelha da luz."</span>
      </div>

      {/* ── Toast ── */}
      <div className={`mestre-toast${toast ? ' show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
