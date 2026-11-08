import React, { memo, useCallback, useState } from 'react';

interface ChronicleEntry {
  id: string;
  title: string;
  time: string;
  content: string;
  author: string;
}

const CHRONICLES: ChronicleEntry[] = [
  {
    id: '1',
    title: 'O SINO SOB A TERRA',
    time: 'Ato I · Noite da Queima',
    content: 'Uma badalada ecoou sob as ruínas, embora a torre tenha desabado há cem anos. Os jurados sentiram a vibração nas solas das botas.',
    author: 'Registrado pelo Mestre',
  },
  {
    id: '2',
    title: 'UM PACTO SILENCIOSO',
    time: 'Ato I · Manhã das Cinzas',
    content: 'Seraphine reconheceu o selo gravado na porta de ferro do santuário. Ninguém ousou cruzar sem a lâmina de prata desembainhada.',
    author: 'Registrado pelo Mestre',
  },
  {
    id: '3',
    title: 'FIM DA VIGÍLIA',
    time: 'Ato I · Madrugada',
    content: 'A fogueira se apagou com um sopro frio de podridão. Algo colossal se moveu além do limite da luz das tochas.',
    author: 'Registrado pelo Mestre',
  },
];

export const DMCampanhaView = memo(function DMCampanhaView() {
  const [entries, setEntries] = useState<ChronicleEntry[]>(CHRONICLES);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const handleAddChronicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      showToast('Preencha título e relato da crônica.');
      return;
    }

    const entry: ChronicleEntry = {
      id: Date.now().toString(),
      title: newTitle.trim().toUpperCase(),
      time: 'Ato I · Sessão Ativa',
      content: newContent.trim(),
      author: 'Mestre da Mesa',
    };

    setEntries([entry, ...entries]);
    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
    showToast('Crônica selada nos anais da campanha!');
  };

  return (
    <div className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '24px clamp(16px, 2.5vw, 38px) 32px' }}>
      {/* ── Page Heading ── */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">Memória da campanha</div>
          <h1>Crônicas</h1>
          <p>Os registros que sobreviveram à noite.</p>
        </div>
        <button
          className="btn"
          type="button"
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? '✕ Cancelar' : '＋ Nova crônica'}
        </button>
      </div>

      {/* Formulário de Nova Crônica */}
      {isAdding && (
        <form onSubmit={handleAddChronicle} className="panel" style={{ padding: 18, marginBottom: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Selar Novo Registro nos Anais</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="text"
              placeholder="Título da Crônica (ex: A QUEDA DO CAVALIER)..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', background: '#120e0b', border: '1px solid var(--line-soft)', color: 'var(--text)', font: '500 13px Cinzel, serif' }}
            />
            <textarea
              rows={3}
              placeholder="Relato dos acontecimentos, decisões dos jurados e consequências da peste..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: '#120e0b', border: '1px solid var(--line-soft)', color: 'var(--text)', fontSize: 15 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn secondary" type="button" onClick={() => setIsAdding(false)}>Cancelar</button>
              <button className="btn" type="submit">Gravar Crônica ✧</button>
            </div>
          </div>
        </form>
      )}

      {/* Painel Principal de Crônicas da Sessão */}
      <section className="panel">
        <div className="panel-head">
          <h2>Registros da sessão</h2>
          <span>{entries.length} entradas históricas</span>
        </div>
        <div className="activity-grid">
          {entries.map((item) => (
            <div key={item.id} className="activity-item">
              <strong>{item.title}</strong>
              <span style={{ fontSize: 11, color: 'var(--gold)', display: 'block', marginBottom: 4, letterSpacing: '0.08em' }}>
                {item.time}
              </span>
              <p>{item.content}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <div className="footer">
        <span>O CONFESSÓRIO DO MESTRE · ARQUIVO DE CAMPANHA</span>
        <span>"A história é escrita com as cinzas dos esquecidos."</span>
      </div>

      {/* ── Toast ── */}
      <div className={`mestre-toast${toast ? ' show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
});
