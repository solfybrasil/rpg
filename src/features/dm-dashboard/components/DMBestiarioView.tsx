import React, { useState } from 'react';

interface Monster {
  id: string;
  name: string;
  category: string;
  tier: number;
  hp: number;
  ca: number;
  speed: string;
  attacks: Array<{ name: string; bonus: number; dice: string }>;
  description: string;
  flavor: string;
}

const MONSTERS: Monster[] = [
  {
    id: 'vigia',
    name: 'Vigia sem rosto',
    category: 'Aberração',
    tier: 4,
    hp: 36,
    ca: 14,
    speed: '9m',
    attacks: [
      { name: 'Tentáculo Voraz', bonus: 5, dice: '1d8+3' },
      { name: 'Sussurro da Loucura', bonus: 4, dice: '1d6+2 mental' },
    ],
    description: 'Habita corredores úmidos onde a luz das tochas vacila. Reage violentamente ao som de aço desembainhado.',
    flavor: '“Não possui olhos, mas sabe exatamente onde o sangue corre mais rápido.”',
  },
  {
    id: 'guardiao',
    name: 'Guardião da Cripta',
    category: 'Morto-vivo',
    tier: 6,
    hp: 58,
    ca: 16,
    speed: '6m',
    attacks: [
      { name: 'Montante Quebrada', bonus: 7, dice: '2d6+4' },
      { name: 'Investida de Ferro', bonus: 5, dice: '1d10+3' },
    ],
    description: 'Uma armadura monumental forjada no Primeiro Juramento, mantida de pé apenas por rancor e terra fofa.',
    flavor: '“O juramento foi quebrado, mas a vigília nunca cessou.”',
  },
  {
    id: 'eco',
    name: 'Eco Faminto',
    category: 'Maldição',
    tier: 3,
    hp: 22,
    ca: 12,
    speed: '12m',
    attacks: [
      { name: 'Garras Espectrais', bonus: 4, dice: '1d6+2' },
      { name: 'Voz Roubada', bonus: 3, dice: '1d4 peste' },
    ],
    description: 'Imita vozes de aliados distantes para atrair viajantes solitários para os abismos da peste.',
    flavor: '“Chama pelo seu nome com a voz de sua mãe morta.”',
  },
  {
    id: 'abominacao',
    name: 'Abominação da Aliança',
    category: 'Monstruosidade',
    tier: 8,
    hp: 92,
    ca: 15,
    speed: '9m',
    attacks: [
      { name: 'Chagada Pestilenta', bonus: 8, dice: '2d8+5' },
      { name: 'Vômito de Bílis Negra', bonus: 6, dice: '3d6 peste' },
    ],
    description: 'Amálgama de corpos contaminados fundidos pelo calor da peste. O cheiro de cinzas anuncia sua aproximação.',
    flavor: '“Onde pisa, a grama morre e a pedra estala.”',
  },
];

export function DMBestiarioView() {
  const [selectedMonster, setSelectedMonster] = useState<Monster>(MONSTERS[0]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const rollAttack = (attackName: string, bonus: number, dice: string) => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + bonus;
    showToast(`${selectedMonster.name} — ${attackName}: D20 (${d20}) + ${bonus} = ${total} para acertar! [Dano: ${dice}]`);
  };

  return (
    <div className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '24px clamp(16px, 2.5vw, 38px) 32px' }}>
      {/* ── Page Heading ── */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">Arquivo de criaturas</div>
          <h1>Bestiário</h1>
          <p>Entidades conhecidas e ameaças ainda sem nome.</p>
        </div>
        <button
          className="btn"
          type="button"
          onClick={() => showToast('Cadastro de criatura aberto nos compêndios.')}
        >
          ＋ Nova criatura
        </button>
      </div>

      {/* ── 3 Módulos de Cartão de Destaque ── */}
      <div className="modules" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 0, marginBottom: 22 }}>
        {MONSTERS.slice(0, 3).map((m) => (
          <article key={m.id} className="module-card">
            <div className="module-title">{m.category} · nível {m.tier}</div>
            <div className="module-art"><span className="module-symbol">♞</span></div>
            <div className="module-body">
              <h3>{m.name}</h3>
              <p>{m.description}</p>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setSelectedMonster(m);
                  showToast(`Ficha de ${m.name} aberta no dossiê.`);
                }}
              >
                Ver criatura →
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* ── Dashboard do Monstro Selecionado ── */}
      <div className="dashboard">
        {/* Coluna 1: Lista de Ameaças */}
        <section className="panel roster">
          <div className="panel-head">
            <h2>Catálogo</h2>
            <span>{MONSTERS.length} ameaças</span>
          </div>

          <div className="character-list">
            {MONSTERS.map((m) => {
              const isSelected = selectedMonster.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`character${isSelected ? ' selected' : ''}`}
                  onClick={() => setSelectedMonster(m)}
                >
                  <span className="portrait" style={{ color: 'var(--red)' }}>♞</span>
                  <span>
                    <span className="char-name">{m.name}</span>
                    <span className="char-class">{m.category}</span>
                    <span className="level">Grau de Ameaça {m.tier}</span>
                    <span className="mini-bars">
                      <span className="bar"><i style={{ width: '100%', background: 'linear-gradient(90deg, #642a24, #a84c3c)' }} /></span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Coluna 2: Ficha Dossiê da Criatura */}
        <section className="panel hero-card">
          <div className="hero-art">
            <div className="hero-sigil" style={{ color: 'var(--red)', borderColor: '#8d302b' }}>☠</div>
            <div className="hero-caption">
              <div className="eyebrow">Ameaça sob a névoa</div>
              <h2>{selectedMonster.name}</h2>
              <p>{selectedMonster.flavor}</p>
            </div>
          </div>

          <div className="hero-info">
            <div className="eyebrow">Dossiê de Combate</div>
            <h2>{selectedMonster.name}</h2>
            <div className="subtitle">{selectedMonster.category} · ND {selectedMonster.tier}</div>

            <div className="level-seal" style={{ borderColor: '#8d302b' }}>
              ND
              <b style={{ color: '#ff8a82' }}>{selectedMonster.tier}</b>
            </div>

            <p className="flavor">{selectedMonster.description}</p>

            <div className="vitals">
              <div className="vital">
                <span className="vital-icon" style={{ color: 'var(--red)' }}>♥</span>
                <span className="vital-name">Vida</span>
                <span className="vital-value">{selectedMonster.hp} PV</span>
                <div className="bar"><i style={{ width: '100%', background: 'linear-gradient(90deg, #642a24, #a84c3c)' }} /></div>
              </div>
              <div className="vital">
                <span className="vital-icon">♜</span>
                <span className="vital-name">Defesa</span>
                <span className="vital-value">{selectedMonster.ca} CA</span>
                <div className="bar blue"><i style={{ width: '70%' }} /></div>
              </div>
              <div className="vital">
                <span className="vital-icon">⚡</span>
                <span className="vital-name">Deslocamento</span>
                <span className="vital-value">{selectedMonster.speed}</span>
              </div>
            </div>

            {/* Ataques com Rolo de Dano Imediato */}
            <div style={{ marginTop: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Ações & Ataques</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedMonster.attacks.map((atk) => (
                  <button
                    key={atk.name}
                    type="button"
                    className="quick-action"
                    onClick={() => rollAttack(atk.name, atk.bonus, atk.dice)}
                    style={{ padding: '8px 10px', justifyContent: 'space-between' }}
                  >
                    <span>
                      <strong style={{ color: 'var(--text)', fontSize: 14 }}>{atk.name}</strong>
                      <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>+{atk.bonus} para acertar · Dano {atk.dice}</span>
                    </span>
                    <span className="btn" style={{ padding: '4px 8px', fontSize: 10 }}>Rolar 🎲</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Coluna 3: Ações Rápidas de Monstro */}
        <div className="side-stack">
          <section className="panel">
            <div className="panel-head"><h2>Comandos de Besta</h2></div>
            <div className="quick-list">
              <button className="quick-action" type="button" onClick={() => showToast(`${selectedMonster.name} projetado na arena!`)}>
                <span className="qicon">⚔</span>Projetar na arena
              </button>
              <button className="quick-action" type="button" onClick={() => {
                const roll = Math.floor(Math.random() * 20) + 1;
                showToast(`Iniciativa de ${selectedMonster.name}: ${roll + 2}`);
              }}>
                <span className="qicon">⚄</span>Rolar iniciativa (+2)
              </button>
              <button className="quick-action" type="button" onClick={() => showToast('Tabela de saques: Fragmento de osso corrompido, 14 moedas de bronze.')}>
                <span className="qicon">♧</span>Sortear saque / loot
              </button>
              <button className="quick-action" type="button" onClick={() => showToast('Criatura ocultada na névoa.')}>
                <span className="qicon">☽</span>Ocultar na névoa
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Fraquezas Místicas</h2></div>
            <div style={{ padding: 14, fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
              <p style={{ margin: 0, fontStyle: 'italic' }}>
                Criaturas contaminadas pela Peste sofrem o dobro de dano por prata sagrada e óleo consagrado.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="footer">
        <span>O CONFESSÓRIO DO MESTRE · ARQUIVO DE CAMPANHA</span>
        <span>"O mal assume muitas formas sob a névoa."</span>
      </div>

      {/* ── Toast ── */}
      <div className={`mestre-toast${toast ? ' show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
