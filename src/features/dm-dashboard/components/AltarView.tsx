import { AlertTriangle, Filter, Loader2, Sparkles, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDmDashboard } from '../hooks/useDmDashboard';
import type { HeroDashboardItem } from '../types';
import { DMModernHeroCard } from './DMModernHeroCard';
import { GiveItemModal } from './GiveItemModal';
import { HeroDetailModal } from './HeroDetailModal';

type FilterType = 'all' | 'online' | 'danger';

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
  const [giveItemTarget, setGiveItemTarget] = useState<HeroDashboardItem | null>(null);
  const [detailModalTarget, setDetailModalTarget] = useState<HeroDashboardItem | null>(null);

  // Filtros de exibição
  const filteredHeroes = useMemo(() => {
    return heroes.filter((h) => {
      if (filter === 'online') return h.isOnline;
      if (filter === 'danger') return h.health <= 3 || h.plague >= 8;
      return true;
    });
  }, [heroes, filter]);

  const onlineCount = useMemo(() => heroes.filter((h) => h.isOnline).length, [heroes]);
  const dangerCount = useMemo(
    () => heroes.filter((h) => h.health <= 3 || h.plague >= 8).length,
    [heroes],
  );

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* ── HEADER DO ALTAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-amber-500 text-lg">⚜</span>
            <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-wider text-amber-100">
              PAINEL DOS JOGADORES & ALTAR
            </h1>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            Controle em tempo real de vida, foco, peste, condições e arsenal dos Jurados.
          </p>
        </div>

        {/* Barra de Filtros */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-900/90 border border-stone-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition ${
              filter === 'all'
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Todos ({heroes.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('online')}
            className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold flex items-center gap-1.5 transition ${
              filter === 'online'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Online ({onlineCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('danger')}
            className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold flex items-center gap-1.5 transition ${
              filter === 'danger'
                ? 'bg-red-500/20 border border-red-500/40 text-red-200'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span>Perigo ({dangerCount})</span>
          </button>
        </div>
      </div>

      {/* ── GRID DOS HEROES (APPLE MODERN CARDS) ── */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
          <span className="font-heading text-sm">Sincronizando com o altar...</span>
        </div>
      ) : filteredHeroes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-stone-800 rounded-2xl">
          <Users className="w-10 h-10 text-stone-600 mb-3" />
          <p className="font-heading text-sm text-stone-300">Nenhum herói encontrado neste filtro.</p>
          <p className="text-xs text-stone-500 mt-1">
            Alterne o filtro acima para ver todos os personagens cadastrados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
              onOpenGiveItem={(h) => setGiveItemTarget(h)}
              onOpenDetailModal={(h) => setDetailModalTarget(h)}
            />
          ))}
        </div>
      )}

      {/* ── MODAIS ── */}
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
