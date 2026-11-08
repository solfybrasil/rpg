import React, { useState } from 'react';
import { useDmDashboard } from '../hooks/useDmDashboard';

interface SoundTrack {
  id: string;
  name: string;
  category: string;
  icon: string;
}

const SOUNDS: SoundTrack[] = [
  { id: '1', name: 'Vento dos Ermos', category: 'Ambiência', icon: '🌪' },
  { id: '2', name: 'Sussurros da Peste', category: 'Ambiência', icon: '☣' },
  { id: '3', name: 'Taberna do Confessor', category: 'Ambiência', icon: '🕯' },
  { id: '4', name: 'Lâmina de Prata', category: 'Efeito (SFX)', icon: '⚔' },
  { id: '5', name: 'Trompa de Guerra', category: 'Efeito (SFX)', icon: '🎺' },
  { id: '6', name: 'Rugido da Besta', category: 'Efeito (SFX)', icon: '💀' },
];

export function DMSistemaView() {
  const { heroes } = useDmDashboard();
  const [activeSoundId, setActiveSoundId] = useState<string | null>('1');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(heroes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sessao-confessor-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Fichas e estado da mesa exportados com sucesso!');
  };

  return (
    <div className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '24px clamp(16px, 2.5vw, 38px) 32px' }}>
      {/* ── Page Heading ── */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">Preferências & Utilitários</div>
          <h1>Sistema</h1>
          <p>Configurações da mesa, soundboard e preservação da experiência.</p>
        </div>
        <button
          className="btn"
          type="button"
          onClick={handleExportJson}
        >
          💾 Exportar Backup JSON
        </button>
      </div>

      {/* ── Soundboard da Mesa ── */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <h2>Soundboard & Ambiência Sonora</h2>
          <span>{activeSoundId ? '▶ Reproduzindo' : 'Pausado'}</span>
        </div>
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {SOUNDS.map((snd) => {
            const isPlaying = activeSoundId === snd.id;
            return (
              <button
                key={snd.id}
                type="button"
                className="quick-action"
                onClick={() => {
                  setActiveSoundId(isPlaying ? null : snd.id);
                  showToast(isPlaying ? `Áudio "${snd.name}" pausado.` : `Tocando "${snd.name}" na sessão.`);
                }}
                style={{
                  background: isPlaying ? 'linear-gradient(90deg, #59402542, #15110d)' : '#100e0b70',
                  borderColor: isPlaying ? 'var(--gold)' : 'transparent',
                  padding: '12px 14px',
                }}
              >
                <span className="qicon" style={{ fontSize: 20 }}>{snd.icon}</span>
                <div>
                  <strong style={{ color: isPlaying ? 'var(--gold-light)' : 'var(--text)', fontSize: 15 }}>
                    {snd.name}
                  </strong>
                  <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>
                    {snd.category} · {isPlaying ? '▶ Ativo' : 'Pausado'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Preferências Visuais & Diretrizes ── */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <h2>Preferências Visuais & Arquitetura</h2>
          <span>Peste do Juramento v2.5</span>
        </div>
        <div className="activity-grid">
          <div className="activity-item">
            <strong>ESTÉTICA DO CONFESSÓRIO</strong>
            <p>Interface em fantasia sombria, bronze envelhecido, relevo em carvão e tipografia Cinzel/Crimson Pro.</p>
          </div>
          <div className="activity-item">
            <strong>ACESSIBILIDADE & TECLADO</strong>
            <p>Navegação por teclas Q e E entre as abas principais, atalhos numéricos 1-8 e foco de alto contraste.</p>
          </div>
          <div className="activity-item">
            <strong>DESEMPENHO FLUIDO</strong>
            <p>Renderização leve e reativa sem bibliotecas pesadas de animação em looping, garantindo 60fps constantes.</p>
          </div>
        </div>
      </section>

      {/* ── Códice de Regras Rápidas ── */}
      <section className="panel">
        <div className="panel-head">
          <h2>Códice Rápido de Resolução</h2>
          <span>Guia do Mestre</span>
        </div>
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 14 }}>
          <div style={{ padding: 12, background: '#120e0b', border: '1px solid var(--line-soft)', borderRadius: 2 }}>
            <strong style={{ color: 'var(--gold-light)', font: '500 12px Cinzel, serif', display: 'block', marginBottom: 4 }}>
              ESTÁGIOS DA PESTE
            </strong>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.4 }}>
              <strong>1-3: Mancha</strong> (Sonhos perturbadores).<br />
              <strong>4-7: Corrupção</strong> (-1 em testes físicos sob a luz solar).<br />
              <strong>8-9: Chaga</strong> (Vulnerabilidade a dano sombrio).<br />
              <strong>10: Transformação</strong> (O jurado perde o controle da carne).
            </p>
          </div>

          <div style={{ padding: 12, background: '#120e0b', border: '1px solid var(--line-soft)', borderRadius: 2 }}>
            <strong style={{ color: 'var(--gold-light)', font: '500 12px Cinzel, serif', display: 'block', marginBottom: 4 }}>
              DESCANSO NOS ERMOS
            </strong>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.4 }}>
              <strong>Descanso Rápido:</strong> Recupera metade do Foco máximo e 2 PV. Exige 1 ração de comida.<br />
              <strong>Descanso Longo:</strong> Só é permitido em refúgios ou santuários consagrados.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <div className="footer">
        <span>O CONFESSÓRIO DO MESTRE · ARQUIVO DE CAMPANHA</span>
        <span>"A vigília jamais se encerra."</span>
      </div>

      {/* ── Toast ── */}
      <div className={`mestre-toast${toast ? ' show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
