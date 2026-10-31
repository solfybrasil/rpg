import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  ChevronRight,
  ChevronLeft,
  Scroll,
  Hash,
  Bookmark,
} from 'lucide-react';
import { rulebook, RuleChapter } from '../../../data/rules';

export const CodexTab: React.FC = () => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(rulebook.chapters[0].id);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filtragem de capítulos por busca
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return rulebook.chapters;
    const q = searchQuery.toLowerCase();
    return rulebook.chapters.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subtitle?.toLowerCase().includes(q) ||
        c.content.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const currentChapter = useMemo(() => {
    return (
      rulebook.chapters.find((c) => c.id === selectedChapterId) ||
      filteredChapters[0] ||
      rulebook.chapters[0]
    );
  }, [selectedChapterId, filteredChapters]);

  const currentIndex = rulebook.chapters.findIndex((c) => c.id === currentChapter.id);
  const prevChapter = currentIndex > 0 ? rulebook.chapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex < rulebook.chapters.length - 1 ? rulebook.chapters[currentIndex + 1] : null;

  return (
    <div className="space-y-6" data-testid="codex-tab">
      {/* Top Search & Codex Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/80 border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20">
            <Scroll size={20} />
          </div>
          <div>
            <h2 className="font-serif font-bold text-sm text-[var(--text-1)]">
              {rulebook.title} · v{rulebook.version}
            </h2>
            <p className="text-xs text-[var(--gold-dim)] font-serif italic">
              "{rulebook.epigraph}"
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar regras, termos e tabelas..."
            data-testid="codex-search-input"
            className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-[var(--text-1)] placeholder-white/40 focus:outline-none focus:border-[var(--gold)] transition-colors"
          />
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chapters Index Sidebar */}
        <aside className="lg:col-span-4 space-y-2">
          <div className="flex items-center justify-between px-2 pb-1 text-xs font-serif uppercase tracking-wider text-white/50">
            <span>Capítulos ({filteredChapters.length})</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[10px] text-[var(--gold)] hover:underline cursor-pointer"
              >
                Limpar busca
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredChapters.length === 0 ? (
              <div className="p-6 text-center text-xs text-white/40 font-serif border border-dashed border-white/10 rounded-xl">
                Nenhum capítulo corresponde a "{searchQuery}".
              </div>
            ) : (
              filteredChapters.map((chapter) => {
                const isSelected = chapter.id === currentChapter.id;
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    data-testid={`codex-chapter-${chapter.id}`}
                    onClick={() => setSelectedChapterId(chapter.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-[var(--gold)]/10 border-[var(--gold)]/80 text-[var(--text-1)] shadow-sm'
                        : 'bg-neutral-900/60 border-white/5 text-white/70 hover:bg-neutral-900 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg text-xs font-mono font-bold shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-[var(--gold)] text-black'
                          : 'bg-white/5 text-white/40'
                      }`}
                    >
                      {chapter.number < 10 ? `0${chapter.number}` : chapter.number}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4
                        className={`font-serif text-xs font-bold leading-snug truncate ${
                          isSelected ? 'text-[var(--gold)]' : 'text-[var(--text-1)]'
                        }`}
                      >
                        {chapter.title}
                      </h4>
                      {chapter.subtitle && (
                        <p className="text-[11px] text-[var(--text-2)] font-serif truncate mt-0.5">
                          {chapter.subtitle}
                        </p>
                      )}
                    </div>

                    <ChevronRight
                      size={14}
                      className={`shrink-0 mt-1 transition-transform ${
                        isSelected ? 'text-[var(--gold)] translate-x-0.5' : 'text-white/20'
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Reader Area */}
        <main className="lg:col-span-8 bg-neutral-900/80 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Chapter Header */}
          <div className="border-b border-white/10 pb-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--gold-dim)]">
              <Bookmark size={13} />
              Capítulo {currentChapter.number} de {rulebook.chapters.length}
            </div>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[var(--text-1)]">
              {currentChapter.title}
            </h1>
            {currentChapter.subtitle && (
              <p className="text-sm font-serif text-[var(--gold)] italic">
                {currentChapter.subtitle}
              </p>
            )}
          </div>

          {/* Chapter Content in Newsreader Editorial Typography */}
          <article className="prose prose-invert max-w-none font-serif text-[var(--text-1)] leading-relaxed text-sm sm:text-base space-y-4">
            {currentChapter.content.split('\n\n').map((paragraph, idx) => {
              const trimmed = paragraph.trim();
              if (trimmed.startsWith('### ')) {
                return (
                  <h3
                    key={idx}
                    className="font-serif font-bold text-lg text-[var(--gold)] pt-4 pb-1 border-b border-white/5 flex items-center gap-2"
                  >
                    <Hash size={16} className="text-[var(--gold)]/60" />
                    {trimmed.replace('### ', '')}
                  </h3>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h2
                    key={idx}
                    className="font-serif font-bold text-xl text-[var(--text-1)] pt-5 pb-1 border-b border-white/10"
                  >
                    {trimmed.replace('## ', '')}
                  </h2>
                );
              }
              if (trimmed.startsWith('- ')) {
                const items = trimmed.split('\n');
                return (
                  <ul key={idx} className="list-disc pl-5 space-y-1.5 text-white/80">
                    {items.map((it, i) => (
                      <li key={i}>{it.replace(/^-\s*/, '')}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} className="text-white/80 leading-relaxed">
                  {trimmed}
                </p>
              );
            })}
          </article>

          {/* Navigation Controls */}
          <div className="border-t border-white/10 pt-5 flex items-center justify-between gap-4">
            {prevChapter ? (
              <button
                type="button"
                data-testid="codex-prev-btn"
                onClick={() => setSelectedChapterId(prevChapter.id)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-serif text-xs text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <ChevronLeft size={14} />
                <div className="text-left">
                  <div className="text-[10px] text-white/40 uppercase">Anterior</div>
                  <div className="truncate max-w-[140px] font-bold">{prevChapter.title}</div>
                </div>
              </button>
            ) : (
              <div />
            )}

            {nextChapter ? (
              <button
                type="button"
                data-testid="codex-next-btn"
                onClick={() => setSelectedChapterId(nextChapter.id)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--gold)]/10 hover:bg-[var(--gold)]/20 border border-[var(--gold)]/30 font-serif text-xs text-[var(--gold)] transition-all cursor-pointer"
              >
                <div className="text-right">
                  <div className="text-[10px] text-[var(--gold-dim)] uppercase">Próximo</div>
                  <div className="truncate max-w-[140px] font-bold">{nextChapter.title}</div>
                </div>
                <ChevronRight size={14} />
              </button>
            ) : (
              <div />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
