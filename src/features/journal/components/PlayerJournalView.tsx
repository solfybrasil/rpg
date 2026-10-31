import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Feather,
  FileText,
  AlertCircle,
  Menu,
} from 'lucide-react';
import { useSessionStore } from '../../../shared/stores/session';
import { fetchPlayerNotes, savePlayerNote, deletePlayerNote } from '../api';
import type { PlayerNote, SaveStatus } from '../types';

export const PlayerJournalView: React.FC = () => {
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const heroId = sessionHeroId || 'teste_1';

  const [notes, setNotes] = useState<PlayerNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [activeBody, setActiveBody] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('Salvo');
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeNoteRef = useRef<{ id: string | null; title: string; body: string }>({
    id: null,
    title: '',
    body: '',
  });

  // Carrega notas do Supabase
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const dbNotes = await fetchPlayerNotes(heroId);

        if (isMounted) {
          if (dbNotes && dbNotes.length > 0) {
            setNotes(dbNotes);
            setSelectedNoteId(dbNotes[0].id);
            setActiveTitle(dbNotes[0].title || '');
            setActiveBody(dbNotes[0].body || '');
            activeNoteRef.current = {
              id: dbNotes[0].id,
              title: dbNotes[0].title || '',
              body: dbNotes[0].body || '',
            };
          } else {
            // Cria nota padrão inicial
            try {
              const defaultNote = await savePlayerNote({
                character_id: heroId,
                session_code: 'MESA',
                title: 'Diário de Bordo',
                body: '',
              });
              if (isMounted) {
                setNotes([defaultNote]);
                setSelectedNoteId(defaultNote.id);
                setActiveTitle(defaultNote.title);
                setActiveBody('');
                activeNoteRef.current = {
                  id: defaultNote.id,
                  title: defaultNote.title,
                  body: '',
                };
              }
            } catch (err) {
              console.warn('[JOURNAL] Fallback local note:', err);
              const fallbackNote: PlayerNote = {
                id: 'local_1',
                session_code: 'MESA',
                character_id: heroId,
                title: 'Diário de Bordo',
                body: '',
                updated_at: new Date().toISOString(),
              };
              if (isMounted) {
                setNotes([fallbackNote]);
                setSelectedNoteId(fallbackNote.id);
              }
            }
          }
        }
      } catch (err) {
        console.error('[JOURNAL] Erro ao carregar notas:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [heroId]);

  // Debounce autosave de 800ms
  const triggerAutoSave = useCallback(
    (noteId: string, title: string, body: string) => {
      setSaveStatus('Salvando...');
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(async () => {
        try {
          const saved = await savePlayerNote({
            id: noteId.startsWith('local_') ? undefined : noteId,
            character_id: heroId,
            session_code: 'MESA',
            title,
            body,
          });

          setNotes((prev) => prev.map((n) => (n.id === noteId ? saved : n)));
          setSelectedNoteId(saved.id);
          activeNoteRef.current = { id: saved.id, title: saved.title, body: saved.body };
          setSaveStatus('Salvo');
        } catch (err) {
          console.error('[JOURNAL] Falha no autosave:', err);
          setSaveStatus('Erro ao salvar');
        }
      }, 800);
    },
    [heroId],
  );

  const handleTitleChange = (val: string) => {
    setActiveTitle(val);
    activeNoteRef.current.title = val;
    if (selectedNoteId) {
      triggerAutoSave(selectedNoteId, val, activeBody);
    }
  };

  const handleBodyChange = (val: string) => {
    setActiveBody(val);
    activeNoteRef.current.body = val;
    if (selectedNoteId) {
      triggerAutoSave(selectedNoteId, activeTitle, val);
    }
  };

  const handleCreateNote = async () => {
    try {
      setSaveStatus('Salvando...');
      const newNote = await savePlayerNote({
        character_id: heroId,
        session_code: 'MESA',
        title: 'Nova Anotação',
        body: '',
      });

      setNotes((prev) => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
      setActiveTitle(newNote.title);
      setActiveBody(newNote.body);
      activeNoteRef.current = { id: newNote.id, title: newNote.title, body: newNote.body };
      setSaveStatus('Salvo');
      setMobileSidebarOpen(false);
    } catch (err) {
      console.error('[JOURNAL] Erro ao criar nota:', err);
      setSaveStatus('Erro ao salvar');
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Deseja destruir esta folha do seu diário?')) return;

    try {
      await deletePlayerNote(id);
      const remaining = notes.filter((n) => n.id !== id);
      setNotes(remaining);

      if (selectedNoteId === id) {
        if (remaining.length > 0) {
          setSelectedNoteId(remaining[0].id);
          setActiveTitle(remaining[0].title);
          setActiveBody(remaining[0].body);
          activeNoteRef.current = {
            id: remaining[0].id,
            title: remaining[0].title,
            body: remaining[0].body,
          };
        } else {
          setSelectedNoteId(null);
          setActiveTitle('');
          setActiveBody('');
          activeNoteRef.current = { id: null, title: '', body: '' };
        }
      }
    } catch (err) {
      console.error('[JOURNAL] Erro ao deletar nota:', err);
    }
  };

  const handleSelectNote = (n: PlayerNote) => {
    setSelectedNoteId(n.id);
    setActiveTitle(n.title);
    setActiveBody(n.body);
    activeNoteRef.current = { id: n.id, title: n.title, body: n.body };
    setMobileSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-[#c4b59f] font-serif">
        <BookOpen className="w-8 h-8 text-[#f5b65b] animate-spin mb-4" />
        <p className="italic">Abrindo os pergaminhos do seu diário...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-[#f5b65b]"
            aria-label="Abrir folhas"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif text-xl md:text-2xl font-bold text-[#f5b65b] tracking-wide flex items-center gap-2">
              <Feather className="w-5 h-5" /> Diário de Bordo
            </h1>
            <p className="font-serif text-xs md:text-sm text-white/50 italic">
              Anotações, presságios e segredos da sua jornada pessoal.
            </p>
          </div>
        </div>

        {/* Status discreto de salvamento no canto */}
        <div
          data-testid="autosave-status"
          className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08]"
        >
          {saveStatus === 'Salvo' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158]" />
              <span className="text-[#30d158]/90">Salvo</span>
            </>
          )}
          {saveStatus === 'Salvando...' && (
            <>
              <Clock className="w-3.5 h-3.5 text-[#f5b65b] animate-spin" />
              <span className="text-[#f5b65b]">Salvando...</span>
            </>
          )}
          {saveStatus === 'Erro ao salvar' && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-[#ff453a]" />
              <span className="text-[#ff453a]">Erro</span>
            </>
          )}
        </div>
      </div>

      {/* Grid Principal: Sidebar de Notas + Editor Sem Bordas */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 min-h-[560px] relative">
        {/* Sidebar de Folhas (Mobile drawer & Desktop column) */}
        <div
          className={`
            ${mobileSidebarOpen ? 'block absolute z-20 inset-y-0 left-0 w-72 bg-[#101014] p-4 shadow-2xl rounded-2xl border border-white/15' : 'hidden md:flex'}
            flex-col bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden
          `}
        >
          {/* Botão Nova Folha */}
          <div className="p-3 border-b border-white/[0.08]">
            <button
              type="button"
              onClick={handleCreateNote}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-b from-[#8f191d] to-[#5e1013] text-[#f5e8c8] font-serif text-sm font-semibold tracking-wide border border-[#f5b65b]/40 hover:brightness-110 active:scale-[0.98] transition-all shadow-md"
            >
              <Plus className="w-4 h-4" /> Nova Folha
            </button>
          </div>

          {/* Lista de Folhas */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[520px]">
            {notes.map((n) => {
              const isSelected = n.id === selectedNoteId;
              return (
                <div
                  key={n.id}
                  onClick={() => handleSelectNote(n)}
                  className={`
                    group p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between
                    ${
                      isSelected
                        ? 'bg-[#f5b65b]/15 border border-[#f5b65b]/40 text-[#f5b65b]'
                        : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.05] text-white/80'
                    }
                  `}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-serif text-sm font-semibold truncate">
                      {n.title || 'Sem Título'}
                    </div>
                    <div className="font-serif text-xs text-white/40 truncate italic mt-0.5">
                      {n.body ? n.body.substring(0, 35) : '(Vazio)'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteNote(n.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/40 hover:text-[#ff453a] transition-all"
                    title="Excluir folha"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor de Texto Limpo em Newsreader Sem Bordas */}
        <div className="flex flex-col bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 md:p-8 relative">
          {selectedNoteId ? (
            <div className="flex flex-col flex-1 space-y-4">
              {/* Título sem bordas em Newsreader/Cinzel */}
              <input
                type="text"
                value={activeTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Título da folha..."
                className="w-full bg-transparent border-0 border-b border-white/10 pb-2 text-2xl md:text-3xl font-serif font-bold text-[#f5f5f7] placeholder:text-white/20 focus:outline-none focus:border-[#f5b65b]/50 transition-colors"
              />

              {/* Corpo em Newsreader, espaçamento generoso */}
              <textarea
                value={activeBody}
                onChange={(e) => handleBodyChange(e.target.value)}
                placeholder="Escreva aqui suas impressões da jornada, pistas de juramentos, nomes de aliados ou mapas de criptas..."
                className="w-full flex-1 min-h-[380px] md:min-h-[460px] bg-transparent border-0 text-base md:text-lg font-serif text-[#e8dcce] placeholder:text-white/20 focus:outline-none resize-none leading-relaxed tracking-normal"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-white/40 font-serif p-12">
              <FileText className="w-12 h-12 opacity-30 mb-3" />
              <p className="italic">Selecione ou crie uma folha de diário para começar a escrever.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
