import { BookOpen, Plus, Sparkles, Trash2, Undo2 } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import type { GrimorioSpell } from '../../grimoire/api';
import type { HeroSpellRow } from '../api/useDMGrimoire';
import type { HeroSpellActions } from './DMGrimoireHubView';
import type { CatalogStatusFilter } from './DMSpellsCatalogTab';
import { ActionButton, EmptyState, SpellRow, circleLabel, spellStatus } from './spellUi';

interface Props {
  hero: { id: string; name: string; inspiration?: number | null; level?: number | null } | null;
  catalog: GrimorioSpell[];
  rows: Map<number, HeroSpellRow>;
  loading: boolean;
  actions: HeroSpellActions;
  onOpenCatalog: (status: CatalogStatusFilter) => void;
}

interface Entry {
  spell: GrimorioSpell;
  row: HeroSpellRow;
}

/** Grimório de um herói: o que ele conhece e o que está estudando. */
export function DMHeroSpellsTab({ hero, catalog, rows, loading, actions, onOpenCatalog }: Props) {
  const { known, studying } = useMemo(() => {
    const byId = new Map(catalog.map((s) => [Number(s.id), s]));
    const k: Entry[] = [];
    const st: Entry[] = [];
    for (const [id, row] of rows) {
      const spell = byId.get(id) ?? row.magias;
      if (!spell) continue;
      const status = spellStatus(row);
      if (status === 'conhece') k.push({ spell, row });
      else if (status === 'estudo') st.push({ spell, row });
    }
    const sort = (a: Entry, b: Entry) => a.spell.circulo - b.spell.circulo || a.spell.nome.localeCompare(b.spell.nome);
    return { known: k.sort(sort), studying: st.sort(sort) };
  }, [catalog, rows]);

  if (!hero) return <EmptyState title="Selecione um herói" />;
  if (loading) return <p className="py-10 text-center text-sm text-[var(--muted)]">Abrindo o grimório…</p>;

  return (
    <div className="flex flex-col gap-6">
      {/* Resumo */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between p-4 border border-[var(--gold-lo)] bg-[var(--stone)]">
        <div className="flex gap-6">
          <Stat label="Conhece" value={known.length} />
          <Stat label="Em estudo" value={studying.length} />
          <Stat label="Inspiração" value={hero.inspiration ?? 0} />
        </div>
        <div className="flex gap-2">
          <ActionButton icon={Plus} variant="gold" onClick={() => onOpenCatalog('nenhum')} testId="dm-open-catalog-for-hero-btn">
            Adicionar magias
          </ActionButton>
        </div>
      </div>

      <Section
        title="Em estudo"
        hint="Liberadas pelo Mestre ou com marcas de Inspiração. Ensine agora ou espere o herói completar."
        entries={studying}
        empty="Nenhuma magia em estudo."
        render={({ spell, row }) => (
          <SpellRow
            key={spell.id}
            spell={spell}
            status="estudo"
            row={row}
            onOpen={() => actions.open(spell)}
            actions={
              <>
                <ActionButton variant="goldLine" icon={Sparkles} onClick={() => actions.teach(spell)} testId={`dm-teach-now-${spell.id}`}>
                  <span className="hidden sm:inline">Ensinar</span>
                </ActionButton>
                <ActionButton icon={Undo2} title="Desfazer 1 marca" onClick={() => actions.undo(spell)} />
                <ActionButton icon={Trash2} variant="danger" title="Remover" onClick={() => actions.remove(spell)} />
              </>
            }
          />
        )}
      />

      <Section
        title="Conhece"
        hint={null}
        entries={known}
        empty={
          <EmptyState icon={BookOpen} title={`${hero.name} ainda não conhece magias`}>
            <button
              type="button"
              onClick={() => onOpenCatalog('nenhum')}
              className="text-[var(--gold-hi)] underline cursor-pointer"
            >
              Abrir o catálogo
            </button>{' '}
            para ensinar ou liberar magias.
          </EmptyState>
        }
        render={({ spell, row }) => (
          <SpellRow
            key={spell.id}
            spell={spell}
            status="conhece"
            row={row}
            onOpen={() => actions.open(spell)}
            actions={
              <>
                <ActionButton icon={Undo2} title="Desaprender" onClick={() => actions.undo(spell)} testId={`dm-undo-spell-${spell.id}`} />
                <ActionButton icon={Trash2} variant="danger" title="Remover" onClick={() => actions.remove(spell)} testId={`dm-remove-spell-${spell.id}`} />
              </>
            }
          />
        )}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="font-['Cinzel',serif] text-xl tabular-nums text-[var(--gold-hi)]">{value}</span>
      <span className="font-['Cinzel',serif] text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{label}</span>
    </div>
  );
}

function Section({
  title,
  hint,
  entries,
  empty,
  render,
}: {
  title: string;
  hint: string | null;
  entries: Entry[];
  empty: React.ReactNode;
  render: (e: Entry) => React.ReactNode;
}) {
  // Agrupa por círculo
  const groups = new Map<number, Entry[]>();
  for (const e of entries) {
    const list = groups.get(e.spell.circulo) ?? [];
    list.push(e);
    groups.set(e.spell.circulo, list);
  }
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-['Cinzel',serif] text-sm tracking-[0.12em] uppercase text-[var(--text)]">
          {title} <span className="text-[var(--muted)]">({entries.length})</span>
        </h3>
        {hint && entries.length > 0 && <p className="hidden md:block text-xs italic text-[var(--muted)]">{hint}</p>}
      </div>
      {entries.length === 0 ? (
        typeof empty === 'string' ? (
          <p className="text-sm italic text-[var(--muted)] py-3">{empty}</p>
        ) : (
          empty
        )
      ) : (
        [...groups.entries()].map(([c, list]) => (
          <div key={c} className="flex flex-col">
            <p className="px-1 pb-1 font-['Cinzel',serif] text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              {circleLabel(c)}
            </p>
            <div className="flex flex-col border border-[var(--iron)] border-b-0">
              {list.map((e) => (
                <div key={String(e.spell.id)} className="h-16">
                  {render(e)}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
