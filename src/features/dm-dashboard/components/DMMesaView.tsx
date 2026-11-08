import React, { useState } from 'react';
import { useDmDashboard } from '../hooks/useDmDashboard';

export function DMMesaView() {
  const { heroes, modifyHealth } = useDmDashboard();
  const [toast, setToast] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [showTacticalCanvas, setShowTacticalCanvas] = useState(false);

  // Lista de combatentes dinâmica mesclando heróis e inimigos da sessão
  const combatants = [
    ...heroes.map((h, i) => ({
      id: h.id,
      name: h.name,
      type: 'hero' as const,
      hp: h.health,
      maxHp: h.maxHealth,
      initiative: 18 - i * 3,
      status: h.health <= 3 ? 'Perigo' : 'Pronto',
    })),
    {
      id: 'enemy-1',
      name: 'Aberração da Peste',
      type: 'enemy' as const,
      hp: 18,
      maxHp: 24,
      initiative: 14,
      status: 'Sangrando (-2/t)',
    },
    {
      id: 'enemy-2',
      name: 'Herege do Sino',
      type: 'enemy' as const,
      hp: 12,
      maxHp: 12,
      initiative: 9,
      status: 'Atento',
    },
  ].sort((a, b) => b.initiative - a.initiative);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const advanceTurn = () => {
    if (currentTurnIdx >= combatants.length - 1) {
      setCurrentTurnIdx(0);
      setRound((r) => r + 1);
      showToast(`Iniciando Round ${round + 1}!`);
    } else {
      setCurrentTurnIdx((idx) => idx + 1);
      showToast(`Turno de ${combatants[currentTurnIdx + 1]?.name}`);
    }
  };

  return (
    <div className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '24px clamp(16px, 2.5vw, 38px) 32px' }}>
      {/* ── Page Heading ── */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">Campanha / Registro de sessão</div>
          <h1>A Cripta Esquecida</h1>
          <p>Capítulo I — O Despertar · Round {round}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn secondary"
            type="button"
            onClick={() => setShowTacticalCanvas(!showTacticalCanvas)}
          >
            {showTacticalCanvas ? '♜ Ver Painel da Mesa' : '⚔ Projetar Grid Tático'}
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => showToast('Evento de campanha registrado nos anais.')}
          >
            ＋ Registrar evento
          </button>
        </div>
      </div>

      {/* ── 3 Módulos de Estado de Cena (Idêntico ao HTML Fonte) ── */}
      <div className="modules" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 0, marginBottom: 22 }}>
        <article className="module-card">
          <div className="module-title">Localização</div>
          <div className="module-art"><span className="module-symbol">♜</span></div>
          <div className="module-body">
            <h3>Galeria dos Sinos</h3>
            <p>Uma passagem úmida conduz até as criptas inferiores. Eco de goteiras e runas desgastadas.</p>
            <button className="btn" type="button" onClick={() => showToast('Localização marcada no mapa.')}>
              Selecionar local →
            </button>
          </div>
        </article>

        <article className="module-card">
          <div className="module-title">Objetivo ativo</div>
          <div className="module-art"><span className="module-symbol">✧</span></div>
          <div className="module-body">
            <h3>O sino de osso</h3>
            <p>Descubra quem continua tocando o sino sob a terra há cem anos ininterruptos.</p>
            <button className="btn" type="button" onClick={() => showToast('Objetivo atualizado para a guilda.')}>
              Marcar objetivo →
            </button>
          </div>
        </article>

        <article className="module-card">
          <div className="module-title">Estado da sessão</div>
          <div className="module-art"><span className="module-symbol">⌛</span></div>
          <div className="module-body">
            <h3>Vigília noturna</h3>
            <p>Perigo elevado. A Peste se propaga pelo ar frio. Descanso longo bloqueado.</p>
            <button className="btn" type="button" onClick={() => showToast('Estado da sessão salvo.')}>
              Atualizar estado →
            </button>
          </div>
        </article>
      </div>

      {/* ── Seção Interativa de Combate & Iniciativa ── */}
      {showTacticalCanvas ? (
        <section className="panel" style={{ padding: 24, minHeight: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="panel-head" style={{ width: '100%', marginBottom: 16 }}>
            <h2>Grid Isométrico da Arena</h2>
            <span>Névoa de Guerra Ativa</span>
          </div>
          <div style={{
            width: '100%',
            height: '380px',
            background: 'radial-gradient(circle, #1a130c 0%, #0c0907 85%)',
            border: '1px dashed var(--line)',
            borderRadius: 2,
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gridTemplateRows: 'repeat(5, 1fr)',
            gap: 2,
            padding: 10,
          }}>
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                style={{
                  border: '1px dashed rgba(111, 85, 54, 0.25)',
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 16,
                  cursor: 'pointer',
                }}
                onClick={() => showToast(`Célula ${i + 1} selecionada no grid.`)}
              >
                {i === 11 && <span title="Sir Corvus (HP 8/10)">⚔</span>}
                {i === 19 && <span title="Aberração (HP 18/24)" style={{ color: 'var(--red)' }}>💀</span>}
                {i === 22 && <span title="Lady Morrigan (HP 6/8)">✦</span>}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18 }}>
          {/* Rastreador de Iniciativa */}
          <section className="panel">
            <div className="panel-head">
              <h2>Ordem de Iniciativa & Ações</h2>
              <span>Round {round} · Turno #{currentTurnIdx + 1}</span>
            </div>

            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {combatants.map((c, idx) => {
                const isCurrent = idx === currentTurnIdx;
                const isEnemy = c.type === 'enemy';
                return (
                  <div
                    key={c.id}
                    className="quick-action"
                    style={{
                      background: isCurrent ? 'linear-gradient(90deg, #59402542, #15110d)' : '#100e0b70',
                      borderColor: isCurrent ? 'var(--gold)' : 'transparent',
                      padding: '10px 14px',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="qicon" style={{ color: isEnemy ? 'var(--red)' : 'var(--gold)' }}>
                        {isEnemy ? '💀' : '♙'}
                      </span>
                      <div>
                        <strong style={{ color: isCurrent ? 'var(--gold-light)' : isEnemy ? '#e8584a' : 'var(--text)' }}>
                          #{idx + 1} {c.name} {isCurrent && '✦ (AGINDO)'}
                        </strong>
                        <span style={{ fontSize: 13, color: 'var(--muted)', display: 'block' }}>
                          Iniciativa: {c.initiative} · Status: {c.status}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, color: c.hp <= 3 ? 'var(--red)' : 'var(--gold-light)', fontWeight: 700 }}>
                        {c.hp}/{c.maxHp} PV
                      </span>
                      {c.type === 'hero' && (
                        <div style={{ display: 'flex', gap: 3 }}>
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => modifyHealth(c.id, -1)}
                          >−</button>
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => modifyHealth(c.id, 1)}
                          >＋</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: 12, borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn secondary" type="button" onClick={() => { setRound(1); setCurrentTurnIdx(0); showToast('Combate reiniciado.'); }}>
                Reiniciar
              </button>
              <button className="btn" type="button" onClick={advanceTurn}>
                Avançar Turno (Próximo Combatente) →
              </button>
            </div>
          </section>

          {/* Registro de Batalha & Clima */}
          <section className="panel">
            <div className="panel-head">
              <h2>Registro da Arena</h2>
              <span>Ao Vivo</span>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div className="notice">
                <span className="notice-icon">⚔</span>
                <div>
                  <strong>Sir Corvus desferiu golpe</strong>
                  <p>Causou 8 de dano cortante na Aberração da Peste.</p>
                  <time>neste round</time>
                </div>
              </div>
              <div className="notice">
                <span className="notice-icon">☣</span>
                <div>
                  <strong>Névoa Corrompida</strong>
                  <p>Todos os combatentes na cripta acumulam +1 ponto de Peste.</p>
                  <time>há 1 round</time>
                </div>
              </div>
              <div className="notice">
                <span className="notice-icon">✧</span>
                <div>
                  <strong>Inspiração Sagrada</strong>
                  <p>Lady Morrigan concedeu bênção ao grupo.</p>
                  <time>há 2 rounds</time>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="footer">
        <span>O CONFESSÓRIO DO MESTRE · ARQUIVO DE CAMPANHA</span>
        <span>"A lâmina e o voto resistem."</span>
      </div>

      {/* ── Toast ── */}
      <div className={`mestre-toast${toast ? ' show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
