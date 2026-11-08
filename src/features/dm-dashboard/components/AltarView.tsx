/**
 * AltarView.tsx
 * Visual e UX 1:1 de confessor_mestre_elden_ring.html
 * Estrutura HTML, interações e classes do fonte.
 * Dados reais via useDmDashboard().
 */
import { useNavigate } from '@tanstack/react-router';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { fromBronze } from '../../../entities/item';
import { useDmDashboard } from '../hooks/useDmDashboard';
import type { HeroDashboardItem } from '../types';
import { GiveItemModal } from './GiveItemModal';
import { HeroDetailModal } from './HeroDetailModal';

const DICE_TYPES = [
  { sides: 4, label: 'd4' },
  { sides: 6, label: 'd6' },
  { sides: 8, label: 'd8' },
  { sides: 10, label: 'd10' },
  { sides: 12, label: 'd12' },
  { sides: 20, label: 'd20' },
  { sides: 100, label: 'd%' },
];

export const AltarView = memo(function AltarView() {
  const navigate = useNavigate();
  const {
    heroes,
    isLoading,
    modifyHealth,
    modifyFocus,
    modifyPlague,
    modifySaciedade,
    giveItem,
    removeItem,
    applyCondition,
    removeCondition,
    updateHeroVitals,
  } = useDmDashboard();

  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [giveItemTarget, setGiveItemTarget] = useState<HeroDashboardItem | null>(null);
  const [detailModalTarget, setDetailModalTarget] = useState<HeroDashboardItem | null>(null);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [activeSides, setActiveSides] = useState<number>(20);
  const [isRolling, setIsRolling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Herói selecionado (padrão: primeiro da lista)
  const selectedHero = useMemo(() => {
    if (!heroes.length) return null;
    const found = heroes.find((h) => h.id === selectedHeroId);
    return found || heroes[0];
  }, [heroes, selectedHeroId]);

  // Porcentagens de barra memoizadas
  const { hpPct, focusPct, plaguePct, sacPct } = useMemo(() => {
    if (!selectedHero) return { hpPct: 0, focusPct: 0, plaguePct: 0, sacPct: 0 };
    return {
      hpPct: Math.round((selectedHero.health / (selectedHero.maxHealth || 1)) * 100),
      focusPct: Math.round((selectedHero.focus / (selectedHero.maxFocus || 1)) * 100),
      plaguePct: Math.round((selectedHero.plague / 10) * 100),
      sacPct: Math.round((selectedHero.saciedade / 10) * 100),
    };
  }, [selectedHero]);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // Rolar dado com animação fluida
  const rollDice = useCallback((sides: number) => {
    setActiveSides(sides);
    setIsRolling(true);
    let ticks = 0;
    const interval = setInterval(() => {
      setDiceResult(Math.floor(Math.random() * sides) + 1);
      ticks++;
      if (ticks >= 7) {
        clearInterval(interval);
        const final = Math.floor(Math.random() * sides) + 1;
        setDiceResult(final);
        setIsRolling(false);
        showToast(`Rolagem d${sides}: Resultado ${final}${final === 20 ? ' — CRÍTICO!' : ''}`);
      }
    }, 45);
  }, [showToast]);

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--gold)', fontFamily: 'Cinzel, serif' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✧</div>
          <div style={{ fontSize: 12, letterSpacing: '0.17em', textTransform: 'uppercase' }}>
            Consultando os Tomos do Confessório...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* ── MAIN CONTENT ── */}
      <div className="main-content" style={{ flex: 1, overflow: 'visible' }}>

        {/* ── Page Heading ── */}
        <div className="page-heading">
          <div>
            <div className="eyebrow">Arquivo de campanha / Sessão ativa</div>
            <h1>O legado dos sem-luz</h1>
            <p>Que a chama resista à longa noite.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Mesa de dados rápida */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#15120f', border: '1px solid var(--line-soft)',
              padding: '6px 10px', borderRadius: 2
            }}>
              {DICE_TYPES.map(({ sides, label }) => (
                <button
                  key={sides}
                  type="button"
                  onClick={() => rollDice(sides)}
                  style={{
                    background: activeSides === sides && diceResult !== null ? 'var(--gold)' : 'transparent',
                    border: 'none',
                    color: activeSides === sides && diceResult !== null ? '#0d0a07' : 'var(--muted)',
                    fontFamily: 'Cinzel, serif',
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '3px 7px',
                    cursor: 'pointer',
                    borderRadius: 2,
                    transition: '0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
              <div style={{
                minWidth: 34, height: 24,
                background: '#0d0b09', border: '1px solid var(--line-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
                color: 'var(--gold-light)',
                opacity: isRolling ? 0.5 : 1,
                transition: '0.1s',
              }}>
                {diceResult !== null ? diceResult : '—'}
              </div>
            </div>

            <button
              className="btn"
              type="button"
              onClick={() => {
                showToast('Nova sessão iniciada nos registros.');
                navigate({ to: '/mestre/mesa' });
              }}
            >
              ＋ Iniciar sessão
            </button>
          </div>
        </div>

        {heroes.length === 0 ? (
          <div style={{
            display: 'grid', placeItems: 'center', minHeight: 320,
            color: 'var(--muted)', fontFamily: 'Cinzel, serif',
            fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✧</div>
              Nenhum jurado encontrado no confessionário
            </div>
          </div>
        ) : (
          /* ── .dashboard: 3 colunas exatas do HTML fonte ── */
          <div className="dashboard">

            {/* ── COLUNA 1: .panel .roster — Lista de Personagens ── */}
            <section className="panel roster">
              <div className="panel-head">
                <h2>Personagens</h2>
                <span>{heroes.length} / 6</span>
              </div>

              <div className="character-list">
                {heroes.map((hero) => {
                  const isSelected = selectedHero?.id === hero.id;
                  const hpPctHero = Math.round((hero.health / hero.maxHealth) * 100);
                  const focusPctHero = Math.round((hero.focus / hero.maxFocus) * 100);

                  return (
                    <button
                      key={hero.id}
                      type="button"
                      className={`character${isSelected ? ' selected' : ''}`}
                      onClick={() => setSelectedHeroId(hero.id)}
                    >
                      {/* .portrait */}
                      <span className="portrait">
                        {hero.portraitUrl ? (
                          <img src={hero.portraitUrl} alt={hero.name} />
                        ) : (
                          hero.name.slice(0, 1).toUpperCase()
                        )}
                      </span>

                      {/* Info do personagem */}
                      <span>
                        <span className="char-name">{hero.name}</span>
                        <span className="char-class">{hero.caminho}</span>
                        <span className="level">Nível {hero.raw?.level ?? 1}</span>
                        <span className="mini-bars">
                          {/* Barra de Vida */}
                          <span
                            className="bar"
                            style={{ height: 5, background: '#090807', border: '1px solid #57432e', overflow: 'hidden' }}
                          >
                            <i style={{
                              width: `${hpPctHero}%`,
                              background: hero.health <= 3
                                ? 'linear-gradient(90deg, #5a1414, #a82222)'
                                : 'linear-gradient(90deg, #642a24, #a84c3c)',
                            }} />
                          </span>
                          {/* Barra de Foco */}
                          <span className="bar blue">
                            <i style={{ width: `${focusPctHero}%` }} />
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="roster-footer">
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => showToast('Formulário de criação preparado.')}
                >
                  ＋ Novo personagem
                </button>
              </div>
            </section>

            {/* ── COLUNA 2: .panel .hero-card — Personagem em Destaque ── */}
            {selectedHero ? (
              <section className="panel hero-card">
                {/* .hero-art — Arte / Banner do Personagem */}
                <div className="hero-art">
                  {selectedHero.portraitUrl && (
                    <img
                      src={selectedHero.portraitUrl}
                      alt={selectedHero.name}
                      style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover', opacity: 0.32,
                        mixBlendMode: 'luminosity',
                      }}
                    />
                  )}
                  <div className="hero-sigil">✧</div>
                  <div className="hero-caption">
                    <div className="eyebrow">Portador do juramento</div>
                    <h2>{selectedHero.oath ? `"${selectedHero.oath.slice(0, 36)}…"` : 'A chama esquecida'}</h2>
                    <p>
                      {selectedHero.oath
                        ? `"${selectedHero.oath.slice(0, 60)}…"`
                        : '"Nem toda luz oferece salvação."'}
                    </p>
                  </div>
                </div>

                {/* .hero-info — Dados editáveis */}
                <div className="hero-info">
                  <div className="eyebrow">Ficha em destaque</div>
                  <h2>{selectedHero.name}</h2>
                  <div className="subtitle">{selectedHero.caminho} · {selectedHero.race}</div>

                  {/* Selo de Nível */}
                  <div className="level-seal">
                    Nível
                    <b>{selectedHero.raw?.level ?? 1}</b>
                  </div>

                  {/* Lore / Voto */}
                  <p className="flavor">
                    {selectedHero.oath || 'Um juramento ainda o guia, mesmo quando o mundo insiste em cair.'}
                  </p>

                  {/* .vitals — barras com steppers táteis */}
                  <div className="vitals">
                    {/* Vida */}
                    <div className="vital">
                      <span className="vital-icon">♥</span>
                      <span className="vital-name">Vida</span>
                      <span className="vital-value">
                        {selectedHero.health} / {selectedHero.maxHealth}
                      </span>
                      <div className="bar" style={{ gridColumn: '2/4' }}>
                        <i style={{
                          width: `${hpPct}%`,
                          background: hpPct <= 25
                            ? 'linear-gradient(90deg, #5a1414, #a82222)'
                            : 'linear-gradient(90deg, #642a24, #a84c3c)',
                        }} />
                      </div>
                      <div className="vital-steppers" style={{ gridColumn: '2/4' }}>
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => modifyHealth(selectedHero.id, -1)}
                        >−</button>
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => modifyHealth(selectedHero.id, 1)}
                        >＋</button>
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => modifyHealth(selectedHero.id, 5)}
                          style={{ fontSize: 11 }}
                        >+5</button>
                      </div>
                    </div>

                    {/* Foco */}
                    <div className="vital">
                      <span className="vital-icon">◇</span>
                      <span className="vital-name">Foco</span>
                      <span className="vital-value">
                        {selectedHero.focus} / {selectedHero.maxFocus}
                      </span>
                      <div className="bar blue" style={{ gridColumn: '2/4' }}>
                        <i style={{ width: `${focusPct}%` }} />
                      </div>
                      <div className="vital-steppers" style={{ gridColumn: '2/4' }}>
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => modifyFocus(selectedHero.id, -1)}
                        >−</button>
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => modifyFocus(selectedHero.id, 1)}
                        >＋</button>
                      </div>
                    </div>

                    {/* Peste */}
                    <div className="vital">
                      <span className="vital-icon">☠</span>
                      <span className="vital-name">Peste</span>
                      <span className="vital-value">
                        {selectedHero.plague} / 10
                      </span>
                      <div className="bar" style={{ gridColumn: '2/4' }}>
                        <i style={{
                          width: `${plaguePct}%`,
                          background: 'linear-gradient(90deg, #4a1d6e, #8b3dbc)',
                        }} />
                      </div>
                      <div className="vital-steppers" style={{ gridColumn: '2/4' }}>
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => modifyPlague(selectedHero.id, -1)}
                        >−</button>
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => modifyPlague(selectedHero.id, 1)}
                        >＋</button>
                      </div>
                    </div>

                    {/* Saciedade */}
                    <div className="vital">
                      <span className="vital-icon">♨</span>
                      <span className="vital-name">Saciedade</span>
                      <span className="vital-value">
                        {selectedHero.saciedade} / 10
                      </span>
                      <div className="bar" style={{ gridColumn: '2/4' }}>
                        <i style={{
                          width: `${sacPct}%`,
                          background: 'linear-gradient(90deg, #77643c, #c3a36a)',
                        }} />
                      </div>
                      <div className="vital-steppers" style={{ gridColumn: '2/4' }}>
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => modifySaciedade(selectedHero.id, -1)}
                        >−</button>
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => modifySaciedade(selectedHero.id, 1)}
                        >＋</button>
                      </div>
                    </div>
                  </div>

                  {/* Moedas */}
                  {(() => {
                    const { gold, silver, bronze } = fromBronze(selectedHero.coinsBronze);
                    return (
                      <div style={{
                        marginTop: 12,
                        display: 'flex', gap: 14, fontSize: 14,
                        color: 'var(--muted)',
                        borderTop: '1px solid var(--line-soft)',
                        paddingTop: 10,
                      }}>
                        <span style={{ color: '#ffd700', fontWeight: 600 }}>{gold}o</span>
                        <span style={{ color: '#e0d8d0', fontWeight: 600 }}>{silver}p</span>
                        <span style={{ color: '#cd7f32', fontWeight: 600 }}>{bronze}b</span>
                      </div>
                    );
                  })()}

                  {/* Botões de ação */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => setDetailModalTarget(selectedHero)}
                    >
                      Ver detalhes →
                    </button>
                    <button
                      className="btn secondary"
                      type="button"
                      onClick={() => setGiveItemTarget(selectedHero)}
                    >
                      ♧ Conceder item
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <section className="panel hero-card" style={{ display: 'grid', placeItems: 'center' }}>
                <div style={{ color: 'var(--muted)', fontFamily: 'Cinzel, serif', textAlign: 'center' }}>
                  <div style={{ fontSize: 48, color: 'var(--gold)', marginBottom: 8 }}>✧</div>
                  Selecione um personagem
                </div>
              </section>
            )}

            {/* ── COLUNA 3: .side-stack — Ações Rápidas + Notificações ── */}
            <div className="side-stack">
              {/* Ações Rápidas */}
              <section className="panel">
                <div className="panel-head">
                  <h2>Ações rápidas</h2>
                </div>
                <div className="quick-list">
                  <button
                    className="quick-action"
                    type="button"
                    onClick={() => navigate({ to: '/mestre/mesa' })}
                  >
                    <span className="qicon">⚔</span>Iniciar combate
                  </button>
                  {selectedHero && (
                    <button
                      className="quick-action"
                      type="button"
                      onClick={() => setGiveItemTarget(selectedHero)}
                    >
                      <span className="qicon">♧</span>Adicionar item
                    </button>
                  )}
                  <button
                    className="quick-action"
                    type="button"
                    onClick={() => navigate({ to: '/mestre/campanha' })}
                  >
                    <span className="qicon">▤</span>Registrar evento
                  </button>
                  <button
                    className="quick-action"
                    type="button"
                    onClick={() => navigate({ to: '/mestre/itens' })}
                  >
                    <span className="qicon">▣</span>Abrir inventário
                  </button>
                  <button
                    className="quick-action"
                    type="button"
                    onClick={() => navigate({ to: '/mestre/bestiario' })}
                  >
                    <span className="qicon">♞</span>Consultar bestiário
                  </button>
                  <button
                    className="quick-action"
                    type="button"
                    onClick={() => navigate({ to: '/mestre/grimorio' })}
                  >
                    <span className="qicon">▤</span>Abrir grimórios
                  </button>
                </div>
              </section>

              {/* Notificações / Estado dos Jurados */}
              <section className="panel">
                <div className="panel-head">
                  <h2>Notificações</h2>
                  <span>{heroes.filter((h) => h.health > 0).length} ativos</span>
                </div>
                <div className="notifications">
                  {heroes.slice(0, 3).map((hero) => {
                    const isDanger = hero.health <= 3 && hero.health > 0;
                    const isDead = hero.health === 0;
                    const icon = isDead ? '☠' : isDanger ? '⚔' : '◈';
                    const hpColor = isDead ? '#8d302b' : isDanger ? '#cc6633' : 'var(--gold)';
                    return (
                      <div
                        key={hero.id}
                        className="notice"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedHeroId(hero.id)}
                      >
                        <span className="notice-icon" style={{ color: hpColor }}>{icon}</span>
                        <div>
                          <strong style={{ color: hpColor !== 'var(--gold)' ? hpColor : undefined }}>
                            {hero.name}
                          </strong>
                          <p>
                            Vida {hero.health}/{hero.maxHealth} · Peste {hero.plague}/10
                            {isDead ? ' — Tombado' : isDanger ? ' — Crítico!' : ''}
                          </p>
                          <time>{hero.race} · {hero.caminho}</time>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

          </div>
        )}

        {/* ── 6 MÓDULOS DE ATALHO RÁPIDO DO MESTRE (ESTILO CONFESSÓRIO) ── */}
        <div className="modules">
          <article className="module-card">
            <div className="module-title">Mesa atual</div>
            <div className="module-art"><span className="module-symbol">♜</span></div>
            <div className="module-body">
              <h3>A Cripta Esquecida</h3>
              <p>Capítulo I — O Despertar</p>
              <button className="btn" type="button" onClick={() => navigate({ to: '/mestre/mesa' })}>
                Ver detalhes →
              </button>
            </div>
          </article>

          <article className="module-card">
            <div className="module-title">Bestiário</div>
            <div className="module-art"><span className="module-symbol">♞</span></div>
            <div className="module-body">
              <h3>Criaturas registradas</h3>
              <p>Catálogo de abominações e hereges</p>
              <button className="btn" type="button" onClick={() => navigate({ to: '/mestre/bestiario' })}>
                Abrir bestiário →
              </button>
            </div>
          </article>

          <article className="module-card">
            <div className="module-title">Inventário</div>
            <div className="module-art"><span className="module-symbol">♧</span></div>
            <div className="module-body">
              <h3>Relíquias reunidas</h3>
              <p>Armas forjadas e itens sagrados</p>
              <button className="btn" type="button" onClick={() => navigate({ to: '/mestre/itens' })}>
                Abrir inventário →
              </button>
            </div>
          </article>

          <article className="module-card">
            <div className="module-title">Oficina</div>
            <div className="module-art"><span className="module-symbol">⚒</span></div>
            <div className="module-body">
              <h3>Forja e criação</h3>
              <p>Bancada 3x3 e livro de receitas</p>
              <button className="btn" type="button" onClick={() => navigate({ to: '/mestre/oficina' })}>
                Acessar oficina →
              </button>
            </div>
          </article>

          <article className="module-card">
            <div className="module-title">Grimórios</div>
            <div className="module-art"><span className="module-symbol">▤</span></div>
            <div className="module-body">
              <h3>Círculos de rituais</h3>
              <p>Magias, votos e saberes antigos</p>
              <button className="btn" type="button" onClick={() => navigate({ to: '/mestre/grimorio' })}>
                Abrir grimórios →
              </button>
            </div>
          </article>

          <article className="module-card">
            <div className="module-title">Crônicas</div>
            <div className="module-art"><span className="module-symbol">✧</span></div>
            <div className="module-body">
              <h3>Memória da mesa</h3>
              <p>Registros e linha do tempo da peste</p>
              <button className="btn" type="button" onClick={() => navigate({ to: '/mestre/campanha' })}>
                Ver crônicas →
              </button>
            </div>
          </article>
        </div>

        {/* ── SEÇÃO CRÔNICAS RECENTES ── */}
        <section className="panel activity">
          <div className="panel-head">
            <h2>Crônicas recentes</h2>
            <span>Últimos registros</span>
          </div>
          <div className="activity-grid">
            <div className="activity-item">
              <strong>O SINO SOB A TERRA</strong>
              <p>Uma badalada ecoou sob as ruínas, embora a torre tenha desabado há cem anos.</p>
            </div>
            <div className="activity-item">
              <strong>UM PACTO SILENCIOSO</strong>
              <p>Seraphine reconheceu o selo gravado na porta do santuário.</p>
            </div>
            <div className="activity-item">
              <strong>FIM DA VIGÍLIA</strong>
              <p>A fogueira se apagou. Algo se moveu além do limite da luz.</p>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <div className="footer">
          <span>O CONFESSÓRIO DO MESTRE · ARQUIVO DE CAMPANHA</span>
          <span>"A chama resiste."</span>
        </div>
      </div>

      {/* ── Toast ── */}
      <div className={`mestre-toast${toast ? ' show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>

      {/* ── Modais ── */}
      {giveItemTarget && (
        <GiveItemModal
          hero={giveItemTarget}
          onClose={() => setGiveItemTarget(null)}
          onGiveItem={giveItem}
        />
      )}

      {detailModalTarget && (
        <HeroDetailModal
          hero={detailModalTarget}
          onClose={() => setDetailModalTarget(null)}
          onRemoveItem={removeItem}
          onApplyCondition={applyCondition}
          onRemoveCondition={removeCondition}
          onSaveHeroDetails={updateHeroVitals}
        />
      )}
    </div>
  );
});
