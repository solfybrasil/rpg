import { AlertTriangle, Award, BookOpen, Library } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHeroes } from '../../../shared/hooks/baseHooks';
import { DMPageHeader, DMTabs, DM_PAGE_CLASS } from '../../../shared/ui/DMPage';
import type { GrimorioSpell } from '../../grimoire/api';
import {
  type HeroSpellRow,
  useAllHeroSpells,
  useAllSpellsCatalog,
  useAlternarRevisaoMutation,
  useDesfazerMarcaMutation,
  useEnsinarMagiaMutation,
  useLiberarMagiaMutation,
  useRemoverMagiaMutation,
} from '../api/useDMGrimoire';
import { DMArbitrationTab } from './DMArbitrationTab';
import { DMHeroSpellsTab } from './DMHeroSpellsTab';
import { DMOathTreeTab } from './DMOathTreeTab';
import { DMSpellEditorSheet } from './DMSpellEditorSheet';
import { type CatalogStatusFilter, DMSpellsCatalogTab } from './DMSpellsCatalogTab';
import { SpellDetailDrawer } from './spellUi';

type DMSubTab = 'grimorio' | 'catalogo' | 'provacoes' | 'arvores';

export interface HeroSpellActions {
  teach: (spell: GrimorioSpell) => void;
  release: (spell: GrimorioSpell) => void;
  undo: (spell: GrimorioSpell) => void;
  remove: (spell: GrimorioSpell) => void;
  open: (spell: GrimorioSpell) => void;
  edit: (spell: GrimorioSpell) => void;
}

const HERO_KEY = 'mestre.grimorio.heroi';

export function DMGrimoireHubView() {
  const [activeTab, setActiveTab] = useState<DMSubTab>('grimorio');
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatusFilter>('todas');

  // ── Heróis (todos do banco) ──
  const { heroes = [] } = useHeroes();
  const [heroId, setHeroId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(HERO_KEY);
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (heroes.length && (!heroId || !heroes.some((h) => h.id === heroId))) setHeroId(heroes[0].id);
  }, [heroes, heroId]);
  useEffect(() => {
    if (!heroId) return;
    try {
      localStorage.setItem(HERO_KEY, heroId);
    } catch {
      // sem armazenamento
    }
  }, [heroId]);
  const hero = heroes.find((h) => h.id === heroId) ?? null;

  // ── Dados ──
  const { data: catalog = [], isLoading: catalogLoading } = useAllSpellsCatalog();
  const { data: allRows = [] } = useAllHeroSpells();

  const rowsByHero = useMemo(() => {
    const map = new Map<string, Map<number, HeroSpellRow>>();
    for (const r of allRows) {
      let m = map.get(r.character_id);
      if (!m) map.set(r.character_id, (m = new Map()));
      m.set(Number(r.magia_id), r);
    }
    return map;
  }, [allRows]);
  const heroRows = useMemo(() => (heroId && rowsByHero.get(heroId)) || new Map<number, HeroSpellRow>(), [rowsByHero, heroId]);

  const reviewCount = useMemo(() => catalog.filter((s) => s.revisar_mestre).length, [catalog]);

  // ── Ações ──
  const ensinar = useEnsinarMagiaMutation();
  const liberar = useLiberarMagiaMutation();
  const desfazer = useDesfazerMarcaMutation();
  const remover = useRemoverMagiaMutation();
  const revisao = useAlternarRevisaoMutation();

  const [detailId, setDetailId] = useState<GrimorioSpell['id'] | null>(null);
  const [editing, setEditing] = useState<GrimorioSpell | null>(null);
  const detailSpell = useMemo(
    () => (detailId == null ? null : (catalog.find((s) => s.id === detailId) ?? null)),
    [catalog, detailId],
  );

  const vars = useCallback(
    (spell: GrimorioSpell) => ({ characterId: heroId as string, magiaId: spell.id, magiaNome: spell.nome }),
    [heroId],
  );

  const actions: HeroSpellActions = useMemo(
    () => ({
      teach: (s) => heroId && ensinar.mutate(vars(s)),
      release: (s) => heroId && liberar.mutate(vars(s)),
      undo: (s) => heroId && desfazer.mutate(vars(s)),
      remove: (s) => {
        if (heroId && window.confirm(`Remover "${s.nome}" do grimório de ${hero?.name ?? 'herói'}?`)) {
          remover.mutate(vars(s));
        }
      },
      open: (s) => setDetailId(s.id),
      edit: (s) => setEditing(s),
    }),
    // mutate é estável no TanStack Query
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [heroId, hero?.name, vars],
  );

  const showHeroBar = activeTab !== 'provacoes';

  return (
    <div className={DM_PAGE_CLASS}>
      <DMPageHeader
        title="Grimórios"
        subtitle={catalogLoading ? 'Carregando magias…' : `${catalog.length} magias no catálogo`}
      />

      <DMTabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'grimorio', label: 'Grimório do herói', icon: BookOpen, testId: 'dm-tab-grimorio' },
          { id: 'catalogo', label: 'Catálogo', icon: Library, testId: 'dm-tab-catalogo' },
          { id: 'provacoes', label: 'Revisão', icon: AlertTriangle, badge: reviewCount, testId: 'dm-tab-provacoes' },
          { id: 'arvores', label: 'Árvores', icon: Award, testId: 'dm-tab-arvores' },
        ]}
      />

      {showHeroBar && (
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]" role="radiogroup" aria-label="Herói">
          <span className="shrink-0 font-['Cinzel',serif] text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Herói
          </span>
          {heroes.map((h) => {
            const selected = h.id === heroId;
            const known = [...(rowsByHero.get(h.id)?.values() ?? [])].filter((r) => r.aprendida).length;
            return (
              <button
                key={h.id}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`dm-hero-btn-${h.id}`}
                onClick={() => setHeroId(h.id)}
                className={`shrink-0 h-10 pl-1.5 pr-3 flex items-center gap-2 border cursor-pointer transition-colors duration-[var(--t-fast)] ${
                  selected
                    ? 'border-[var(--gold)] bg-[var(--gold)]/12 text-[var(--gold-hi)]'
                    : 'border-[var(--iron)] bg-[var(--stone)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <span className="w-7 h-7 flex items-center justify-center border border-[var(--gold-lo)] bg-[var(--abyss)] font-['Cinzel',serif] text-xs overflow-hidden">
                  {h.avatar_icon && /^(https?:|\/)/.test(h.avatar_icon) ? (
                    <img src={h.avatar_icon} alt="" className="w-full h-full object-cover" />
                  ) : (
                    h.name.slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="text-sm">{h.name}</span>
                <span className="text-[11px] tabular-nums opacity-70">{known}</span>
              </button>
            );
          })}
          {heroes.length === 0 && <span className="text-sm italic text-[var(--muted)]">Nenhum herói cadastrado.</span>}
        </div>
      )}

      <div>
        {activeTab === 'grimorio' && (
          <DMHeroSpellsTab
            hero={hero}
            catalog={catalog}
            rows={heroRows}
            loading={catalogLoading}
            actions={actions}
            onOpenCatalog={(status) => {
              setCatalogStatus(status);
              setActiveTab('catalogo');
            }}
          />
        )}
        {activeTab === 'catalogo' && (
          <DMSpellsCatalogTab
            heroName={hero?.name ?? null}
            catalog={catalog}
            rows={heroRows}
            loading={catalogLoading}
            actions={actions}
            initialStatus={catalogStatus}
          />
        )}
        {activeTab === 'provacoes' && (
          <DMArbitrationTab
            catalog={catalog}
            onOpen={actions.open}
            onEdit={actions.edit}
            onApprove={(s) => revisao.mutate({ magia: s, novoValor: false })}
            onFlag={(s) => revisao.mutate({ magia: s, novoValor: true })}
          />
        )}
        {activeTab === 'arvores' && heroId && (
          <DMOathTreeTab selectedHeroId={heroId} onSelectHeroId={setHeroId} hideHeroSelector />
        )}
      </div>

      {detailSpell && (
        <SpellDetailDrawer
          spell={detailSpell}
          onClose={() => setDetailId(null)}
          actions={{
            heroName: hero?.name ?? null,
            row: heroRows.get(Number(detailSpell.id)),
            onTeach: () => actions.teach(detailSpell),
            onRelease: () => actions.release(detailSpell),
            onUndo: () => actions.undo(detailSpell),
            onRemove: () => actions.remove(detailSpell),
            onEdit: () => setEditing(detailSpell),
            onToggleReview: () => revisao.mutate({ magia: detailSpell, novoValor: !detailSpell.revisar_mestre }),
          }}
        />
      )}

      {editing && (
        <DMSpellEditorSheet magia={editing} open onOpenChange={(open) => !open && setEditing(null)} />
      )}
    </div>
  );
}
