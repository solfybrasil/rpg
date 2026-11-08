import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, SearchX, Sparkles, Unlock, X } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { GrimorioSpell } from '../../grimoire/api';
import type { HeroSpellRow } from '../api/useDMGrimoire';
import type { HeroSpellActions } from './DMGrimoireHubView';
import { ActionButton, EmptyState, SpellRow, spellStatus } from './spellUi';

export type CatalogStatusFilter = 'todas' | 'nenhum' | 'estudo' | 'conhece';

interface Props {
  heroName: string | null;
  catalog: GrimorioSpell[];
  rows: Map<number, HeroSpellRow>;
  loading: boolean;
  actions: HeroSpellActions;
  initialStatus?: CatalogStatusFilter;
}

const ROW_H = 64;

function normalize(t: string) {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const chip = (on: boolean) =>
  `h-8 px-3 shrink-0 border text-xs cursor-pointer transition-colors duration-[var(--t-fast)] ${
    on
      ? 'border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-hi)]'
      : 'border-[var(--iron)] bg-[var(--stone)] text-[var(--muted)] hover:text-[var(--text)]'
  }`;

/** Catálogo completo com busca, filtros e ações rápidas para o herói selecionado. */
export function DMSpellsCatalogTab({ heroName, catalog, rows, loading, actions, initialStatus = 'todas' }: Props) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [circle, setCircle] = useState<number | 'todos'>('todos');
  const [fonte, setFonte] = useState('todas');
  const [status, setStatus] = useState<CatalogStatusFilter>(initialStatus);
  useEffect(() => setStatus(initialStatus), [initialStatus]);

  // Opções vindas dos dados reais (antes eram fixas e não batiam com o catálogo)
  const { circles, fontes } = useMemo(() => {
    const c = new Set<number>();
    const f = new Map<string, number>();
    for (const s of catalog) {
      c.add(s.circulo);
      if (s.fonte) f.set(s.fonte, (f.get(s.fonte) ?? 0) + 1);
    }
    return {
      circles: [...c].sort((a, b) => a - b),
      fontes: [...f.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    };
  }, [catalog]);

  // Índice de busca (sem acento, em minúsculas) calculado uma vez
  const index = useMemo(
    () => catalog.map((s) => normalize(`${s.nome} ${s.escola ?? ''} ${s.fonte ?? ''} ${s.resumo ?? ''}`)),
    [catalog],
  );

  const filtered = useMemo(() => {
    const q = normalize(deferredQuery.trim());
    const terms = q ? q.split(/\s+/) : [];
    const out: GrimorioSpell[] = [];
    catalog.forEach((s, i) => {
      if (circle !== 'todos' && s.circulo !== circle) return;
      if (fonte !== 'todas' && s.fonte !== fonte) return;
      if (status !== 'todas' && spellStatus(rows.get(Number(s.id))) !== status) return;
      if (terms.length && !terms.every((t) => index[i].includes(t))) return;
      out.push(s);
    });
    return out;
  }, [catalog, index, deferredQuery, circle, fonte, status, rows]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 8,
  });
  // Volta ao topo quando o filtro muda
  useEffect(() => {
    parentRef.current?.scrollTo({ top: 0 });
  }, [deferredQuery, circle, fonte, status]);

  const hasFilters = query || circle !== 'todos' || fonte !== 'todas' || status !== 'todas';
  const clear = () => {
    setQuery('');
    setCircle('todos');
    setFonte('todas');
    setStatus('todas');
  };

  const statusTabs: Array<{ id: CatalogStatusFilter; label: string }> = [
    { id: 'todas', label: 'Todas' },
    { id: 'nenhum', label: 'Não conhece' },
    { id: 'estudo', label: 'Em estudo' },
    { id: 'conhece', label: 'Conhece' },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Filtros */}
      <div className="flex flex-col gap-2 p-3 border border-[var(--iron)] bg-[var(--stone)]">
        <div className="flex flex-col md:flex-row gap-2">
          <label className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-[var(--muted)] pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, escola, fonte ou efeito…"
              data-testid="dm-spell-search-input"
              className="w-full h-9 pl-8 pr-2 text-sm rounded-none"
            />
          </label>
          <select
            value={fonte}
            onChange={(e) => setFonte(e.target.value)}
            data-testid="dm-spell-school-select"
            className="h-9 md:w-48 text-sm rounded-none"
            aria-label="Fonte"
          >
            <option value="todas">Todas as fontes</option>
            {fontes.map(([f, n]) => (
              <option key={f} value={f}>
                {f} ({n})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Círculo">
            <button type="button" className={chip(circle === 'todos')} onClick={() => setCircle('todos')}>
              Todos
            </button>
            {circles.map((c) => (
              <button key={c} type="button" className={chip(circle === c)} onClick={() => setCircle(c)}>
                {c === 0 ? 'Truques' : `${c}º`}
              </button>
            ))}
          </div>
          <span className="hidden md:block w-px h-6 bg-[var(--iron)] mx-1" />
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Situação do herói">
            {statusTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={chip(status === t.id)}
                onClick={() => setStatus(t.id)}
                disabled={!heroName && t.id !== 'todas'}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <span>
          <span className="tabular-nums text-[var(--text)]">{filtered.length}</span> de {catalog.length} magias
          {heroName && (
            <>
              {' '}
              · ações para <span className="text-[var(--gold-hi)]">{heroName}</span>
            </>
          )}
        </span>
        {hasFilters && (
          <button type="button" onClick={clear} className="flex items-center gap-1 hover:text-[var(--text)] cursor-pointer">
            <X className="w-3.5 h-3.5" /> Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-[var(--muted)]">Carregando o catálogo…</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={SearchX} title="Nenhuma magia encontrada">
          Ajuste a busca ou{' '}
          <button type="button" onClick={clear} className="text-[var(--gold-hi)] underline cursor-pointer">
            limpe os filtros
          </button>
          .
        </EmptyState>
      ) : (
        <div
          ref={parentRef}
          data-testid="dm-spells-virtual-container"
          className="overflow-y-auto h-[min(640px,calc(100vh-340px))] min-h-[320px] border border-[var(--iron)] border-b-0"
        >
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((v) => {
              const spell = filtered[v.index];
              const row = rows.get(Number(spell.id));
              const st = spellStatus(row);
              return (
                <div
                  key={String(spell.id)}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ROW_H, transform: `translateY(${v.start}px)` }}
                >
                  <SpellRow
                    spell={spell}
                    status={st}
                    row={row}
                    onOpen={() => actions.open(spell)}
                    testId={`dm-spell-card-${spell.id}`}
                    actions={
                      heroName && st !== 'conhece' ? (
                        <>
                          {st === 'nenhum' && (
                            <ActionButton
                              variant="moss"
                              icon={Unlock}
                              title="Liberar para estudo"
                              onClick={() => actions.release(spell)}
                              testId={`dm-liberate-btn-${spell.id}`}
                            >
                              <span className="hidden lg:inline">Liberar</span>
                            </ActionButton>
                          )}
                          <ActionButton
                            variant="goldLine"
                            icon={Sparkles}
                            title="Ensinar agora"
                            onClick={() => actions.teach(spell)}
                            testId={`dm-teach-btn-${spell.id}`}
                          >
                            <span className="hidden sm:inline">Ensinar</span>
                          </ActionButton>
                        </>
                      ) : null
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
