import { Loader2, Search, Users } from 'lucide-react';
import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { useDmDashboard } from '../hooks/useDmDashboard';
import type { HeroDashboardItem } from '../types';
import { DMModernHeroCard } from './DMModernHeroCard';
import { GiveItemModal } from './GiveItemModal';
import { HeroDetailModal } from './HeroDetailModal';

type FilterType = 'all' | 'online' | 'danger';

const isInDanger = (h: HeroDashboardItem) => h.health <= 3 || h.plague >= 8;

export function AltarView() {
  const {
    heroes,
    isLoading,
    modifyHealth,
    modifyFocus,
    modifyPlague,
    modifySaciedade,
    modifyInspiration,
    toggleExausto,
    applyCondition,
    removeCondition,
    giveItem,
    removeItem,
    updateHeroVitals,
  } = useDmDashboard();

  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [giveItemTarget, setGiveItemTarget] = useState<HeroDashboardItem | null>(null);
  const [detailModalTarget, setDetailModalTarget] = useState<HeroDashboardItem | null>(null);

  const counts = useMemo(
    () => ({
      all: heroes.length,
      online: heroes.filter((h) => h.isOnline).length,
      danger: heroes.filter(isInDanger).length,
    }),
    [heroes],
  );

  const filteredHeroes = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return heroes.filter((h) => {
      if (filter === 'online' && !h.isOnline) return false;
      if (filter === 'danger' && !isInDanger(h)) return false;
      if (term && !h.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [heroes, filter, deferredSearch]);

  // Callbacks estáveis: os cards memoizados não re-renderizam ao abrir um modal.
  const openGiveItem = useCallback((h: HeroDashboardItem) => setGiveItemTarget(h), []);
  const openDetail = useCallback((h: HeroDashboardItem) => setDetailModalTarget(h), []);

  const filters: Array<{ id: FilterType; label: string }> = [
    { id: 'all', label: 'Todos' },
    { id: 'online', label: 'Online' },
    { id: 'danger', label: 'Em perigo' },
  ];

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-['Cinzel',serif] text-lg sm:text-xl tracking-[0.14em] text-[var(--gold-hi)]">
            Jogadores
          </h1>
          <p className="text-sm italic text-[var(--muted)]">
            {counts.online} de {counts.all} online
            {counts.danger > 0 && (
              <span className="text-[#e0645a]"> · {counts.danger} em perigo</span>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <label className="relative flex items-center">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-[var(--muted)] pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar herói…"
              className="h-8 w-full sm:w-48 pl-8 pr-2 text-sm rounded-none"
            />
          </label>
          <div className="flex border border-[var(--iron)] bg-[var(--stone)]">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`flex-1 h-8 px-3 whitespace-nowrap font-['Cinzel',serif] text-[11px] uppercase tracking-[0.1em] cursor-pointer ${
                  filter === f.id
                    ? 'bg-[var(--stone-2)] text-[var(--gold-hi)] shadow-[inset_0_-2px_0_var(--gold)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {f.label} <span className="opacity-60">{counts[f.id]}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center gap-2 py-16 text-[var(--muted)]">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--gold)]" />
          <span className="text-sm">Carregando heróis…</span>
        </div>
      ) : filteredHeroes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16 text-center border border-dashed border-[var(--iron)]">
          <Users className="w-8 h-8 text-[var(--iron)]" />
          <p className="text-sm text-[var(--muted)]">
            {heroes.length === 0 ? 'Nenhum herói cadastrado ainda.' : 'Nenhum herói neste filtro.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredHeroes.map((hero) => (
            <DMModernHeroCard
              key={hero.id}
              hero={hero}
              onModifyHealth={modifyHealth}
              onModifyFocus={modifyFocus}
              onModifyPlague={modifyPlague}
              onModifySaciedade={modifySaciedade}
              onModifyInspiration={modifyInspiration}
              onToggleExausto={toggleExausto}
              onRemoveCondition={removeCondition}
              onOpenGiveItem={openGiveItem}
              onOpenDetailModal={openDetail}
            />
          ))}
        </div>
      )}

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
}
