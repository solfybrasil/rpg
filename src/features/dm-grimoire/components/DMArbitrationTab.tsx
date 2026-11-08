import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, CheckCheck, Flag, Pencil, Search } from 'lucide-react';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import type { GrimorioSpell } from '../../grimoire/api';
import { ActionButton, EmptyState, SpellRow, hasNarrativeEffect } from './spellUi';

interface Props {
  catalog: GrimorioSpell[];
  onOpen: (s: GrimorioSpell) => void;
  onEdit: (s: GrimorioSpell) => void;
  onApprove: (s: GrimorioSpell) => void;
  onFlag: (s: GrimorioSpell) => void;
}

type View = 'revisar' | 'narrativo';
const ROW_H = 64;

/**
 * Revisão do Mestre:
 * - "Para revisar": magias marcadas (revisar_mestre). Aprovar tira da fila.
 * - "Efeito narrativo": só consulta — magias cujo efeito depende do julgamento do Mestre.
 */
export function DMArbitrationTab({ catalog, onOpen, onEdit, onApprove, onFlag }: Props) {
  const [view, setView] = useState<View>('revisar');
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query).trim().toLowerCase();

  const { review, narrative } = useMemo(
    () => ({
      review: catalog.filter((s) => s.revisar_mestre),
      narrative: catalog.filter((s) => hasNarrativeEffect(s)),
    }),
    [catalog],
  );

  const list = useMemo(() => {
    const base = view === 'revisar' ? review : narrative;
    if (!q) return base;
    return base.filter((s) => `${s.nome} ${s.escola} ${s.resumo}`.toLowerCase().includes(q));
  }, [view, review, narrative, q]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: list.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 8,
  });

  const tab = (id: View, label: string, n: number, testId: string) => (
    <button
      type="button"
      onClick={() => setView(id)}
      data-testid={testId}
      className={`h-9 px-3 border text-sm cursor-pointer ${
        view === id
          ? 'border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-hi)]'
          : 'border-[var(--iron)] bg-[var(--stone)] text-[var(--muted)] hover:text-[var(--text)]'
      }`}
    >
      {label} <span className="tabular-nums opacity-70">{n}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm italic text-[var(--muted)]">
        {view === 'revisar'
          ? 'Magias que pedem sua decisão antes de entrar em jogo. Abra para ler, edite se preciso e aprove.'
          : 'Magias com efeito narrativo: o resultado depende do seu julgamento na mesa. Não há nada a aprovar aqui.'}
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-1">
          {tab('revisar', 'Para revisar', review.length, 'dm-arbitration-filter-flag')}
          {tab('narrativo', 'Efeito narrativo', narrative.length, 'dm-arbitration-filter-narrative')}
        </div>
        <label className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-[var(--muted)] pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            data-testid="dm-arbitration-search-input"
            className="w-full h-9 pl-8 pr-2 text-sm rounded-none"
          />
        </label>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={CheckCheck} title={view === 'revisar' && !q ? 'Fila vazia' : 'Nada encontrado'}>
          {view === 'revisar' && !q ? 'Todas as magias estão aprovadas para jogo.' : null}
        </EmptyState>
      ) : (
        <div
          ref={parentRef}
          className="overflow-y-auto h-[min(640px,calc(100vh-320px))] min-h-[280px] border border-[var(--iron)] border-b-0"
        >
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((v) => {
              const s = list[v.index];
              return (
                <div
                  key={String(s.id)}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ROW_H, transform: `translateY(${v.start}px)` }}
                >
                  <SpellRow
                    spell={s}
                    status="nenhum"
                    onOpen={() => onOpen(s)}
                    actions={
                      <>
                        <ActionButton icon={Pencil} title="Editar" onClick={() => onEdit(s)} />
                        {s.revisar_mestre ? (
                          <ActionButton variant="moss" icon={Check} onClick={() => onApprove(s)} title="Aprovar para jogo">
                            <span className="hidden sm:inline">Aprovar</span>
                          </ActionButton>
                        ) : (
                          <ActionButton icon={Flag} onClick={() => onFlag(s)} title="Marcar para revisão" />
                        )}
                      </>
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
