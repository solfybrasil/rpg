import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Feather,
  FileText,
  Menu,
  Plus,
  Trash2,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Parchment } from '../../../shared/ui/Parchment';
import { StonePanel } from '../../../shared/ui/StonePanel';
import { useSessionStore } from '../../../shared/stores/session';
import { deletePlayerNote, fetchPlayerNotes, savePlayerNote } from '../api';
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
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              setNotes([fallbackNote]);
              setSelectedNoteId(fallbackNote.id);
              setActiveTitle(fallbackNote.title);
              setActiveBody('');
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

  const triggerAutoSave = useCallback((id: string, title: string, body: string) => {
    setSaveStatus('Salvando...');
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await savePlayerNote({
          id,
          character_id: heroId,
          session_code: 'MESA',
          title: title.trim() || 'Sem Título',
          body,
        });
        setSaveStatus('Salvo');
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, title: title.trim() || 'Sem Título', body } : n,
          ),
        );
      } catch (err) {
        console.error('[JOURNAL] Erro no autosave:', err);
        setSaveStatus('Erro ao salvar');
      }
    }, 1000);
  }, [heroId]);

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
        title: 'Nova Folha',
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
      <div className="flex flex-col items-center justify-center p-16 text-[var(--muted)] font-['EB_Garamond',serif]">
        <BookOpen className="w-8 h-8 text-[var(--gold)] animate-spin mb-4" />
        <p className="italic">Abrindo os pergaminhos do seu diário...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-[var(--iron)] pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 slab text-[var(--gold)]"
            aria-label="Abrir folhas"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-['Cinzel',serif] text-xl font-bold text-[var(--gold-hi)] tracking-wide flex items-center gap-2">
              <Feather className="w-5 h-5 text-[var(--gold)]" /> Diário de Bordo
            </h1>
            <p className="font-['EB_Garamond',serif] text-xs text-[var(--muted)] italic">
              Anotações, presságios e segredos da sua jornada pessoal.
            </p>
          </div>
        </div>

        {/* Status discreto de salvamento */}
        <div
          data-testid="autosave-status"
          className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 slab"
        >
          {saveStatus === 'Salvo' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--moss)]" />
              <span className="text-[var(--moss)] font-['Cinzel',serif] text-[10px] uppercase font-bold">
                Salvo
              </span>
            </>
          )}
          {saveStatus === 'Salvando...' && (
            <>
              <Clock className="w-3.5 h-3.5 text-[var(--gold)] animate-spin" />
              <span className="text-[var(--gold)] font-['Cinzel',serif] text-[10px] uppercase font-bold">
                Gravando...
              </span>
            </>
          )}
          {saveStatus === 'Erro ao salvar' && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-[var(--blood)]" />
              <span className="text-[var(--blood)] font-['Cinzel',serif] text-[10px] uppercase font-bold">
                Erro
              </span>
            </>
          )}
        </div>
      </div>

      {/* Grid Principal: Sidebar de Notas + Editor em Pergaminho */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 min-h-[520px] relative">
        {/* Sidebar de Folhas */}
        <div
          className={`
            ${
              mobileSidebarOpen
                ? 'block absolute z-30 inset-y-0 left-0 w-72 slab p-3 shadow-2xl'
                : 'hidden md:flex'
            }
            flex-col slab overflow-hidden
          `}
        >
          {/* Botão Nova Folha */}
          <div className="p-2 border-b border-[var(--iron)]">
            <button
              type="button"
              onClick={handleCreateNote}
              className="end-turn w-full h-8 text-[11px] font-bold font-['Cinzel',serif] flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Folha
            </button>
          </div>

          {/* Lista de Folhas */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1 max-h-[480px]">
            {notes.map((n) => {
              const isSelected = n.id === selectedNoteId;
              return (
                <div
                  key={n.id}
                  onClick={() => handleSelectNote(n)}
                  className={`
                    group p-2 cursor-pointer transition-all flex items-center justify-between border
                    ${
                      isSelected
                        ? 'border-[var(--gold-lo)] bg-[var(--gold-lo)]/20 text-[var(--gold-hi)]'
                        : 'border-transparent hover:border-[var(--iron)] text-[var(--text)]'
                    }
                  `}
                >
                  <div className="min-w-0 flex-1 pr-1">
                    <div className="font-['Cinzel',serif] text-xs font-bold truncate">
                      {n.title || 'Sem Título'}
                    </div>
                    <div className="font-['EB_Garamond',serif] text-[11px] text-[var(--muted)] truncate italic">
                      {n.body ? n.body.substring(0, 30) : '(Vazio)'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteNote(n.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[var(--muted)] hover:text-red-400 transition-all"
                    title="Excluir folha"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor de Texto em Pergaminho Rasgado */}
        <Parchment seed={44} className="flex flex-col flex-1 p-5 md:p-6 space-y-3 min-h-[480px]">
          {selectedNoteId ? (
            <div className="flex flex-col flex-1 space-y-3">
              {/* Título sobre pergaminho em Cinzel */}
              <input
                type="text"
                value={activeTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Título da folha..."
                className="w-full bg-transparent border-0 border-b border-[var(--ink-soft)]/20 pb-1.5 text-xl font-['Cinzel',serif] font-bold text-[var(--ink)] placeholder:text-[var(--ink-soft)]/40 focus:outline-none focus:border-[var(--gold-lo)] transition-colors"
              />

              {/* Corpo em EB Garamond sobre pergaminho */}
              <textarea
                value={activeBody}
                onChange={(e) => handleBodyChange(e.target.value)}
                placeholder="Escreva aqui suas impressões da jornada, pistas de juramentos, nomes de aliados ou mapas de criptas..."
                className="w-full flex-1 min-h-[360px] bg-transparent border-0 text-base font-['EB_Garamond',serif] text-[var(--ink)] placeholder:text-[var(--ink-soft)]/40 focus:outline-none resize-none leading-relaxed tracking-normal"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-[var(--ink-soft)] font-['EB_Garamond',serif] p-12">
              <FileText className="w-10 h-10 opacity-40 mb-2" />
              <p className="italic">
                Selecione ou crie uma folha de diário para começar a escrever.
              </p>
            </div>
          )}
        </Parchment>
      </div>
    </div>
  );
};
