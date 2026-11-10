import { DoorOpen, House, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import { useHero, useInventory } from '../../../shared/hooks/baseHooks';
import { useWorldClock } from '../../world-clock/api/clock';
import { useBase } from '../api/baseApi';
import { currentCondition } from '../data/parts';
import { BaseScene } from './BaseScene';
import { PartPanel } from './PartPanel';
import { StoragePanel } from './StoragePanel';
import { partSpots, storageSpots } from './spots';

export function useUsedSlots(items: { storage_id: string }[]) {
  return useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(it.storage_id, (m.get(it.storage_id) ?? 0) + 1);
    return m;
  }, [items]);
}

export type BaseSide = 'in' | 'out';

/**
 * Botão discreto para trocar entre dentro e fora da base. Um ponto vermelho
 * avisa quando alguma parte de fora está danificada.
 */
export function SideToggle({ side, onChange, alert }: { side: BaseSide; onChange: (s: BaseSide) => void; alert?: boolean }) {
  const out = side === 'out';
  return (
    <button
      type="button"
      onClick={() => onChange(out ? 'in' : 'out')}
      data-testid="btn-toggle-side"
      aria-label={out ? 'Voltar para dentro da base' : 'Ver o lado de fora da base'}
      title={out ? 'Entrar' : 'Lado de fora'}
      className="relative h-8 px-2 flex items-center gap-1.5 border border-[var(--iron)]/70 bg-[var(--abyss)]/60 text-[var(--muted)] text-[11px] opacity-70 hover:opacity-100 hover:text-[var(--text)] hover:border-[var(--gold-lo)] focus-visible:opacity-100 transition-[opacity,color,border-color] duration-[var(--t-fast)] cursor-pointer active:translate-y-px"
    >
      {out ? <House className="w-3.5 h-3.5" /> : <DoorOpen className="w-3.5 h-3.5" />}
      <span className="font-['Cinzel',serif] tracking-[0.1em]">{out ? 'Entrar' : 'Fora'}</span>
      {alert && !out && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--blood)] rotate-45" aria-label="Algo precisa de conserto" />
      )}
    </button>
  );
}

/** Base do grupo vista pelo Jogador. */
export function PlayerBaseView({ heroId }: { heroId: string }) {
  const { state, storages, items, parts, partsMissing, loading, missingTables, error } = useBase();
  const { hero } = useHero(heroId);
  const { items: backpack = [] } = useInventory(heroId);
  const { minutos } = useWorldClock();
  const [side, setSide] = useState<BaseSide>('in');
  const [selId, setSelId] = useState<string | null>(null);
  const used = useUsedSlots(items);

  const visibleStorages = useMemo(() => storages.filter((s) => !s.hidden), [storages]);
  const visibleParts = useMemo(() => (partsMissing ? [] : parts.filter((p) => !p.hidden)), [parts, partsMissing]);
  // Arredonda o relógio por hora: o estado das partes não precisa redesenhar a cada minuto.
  const hourMinutes = Math.floor(minutos / 60) * 60;
  const spots = useMemo(
    () => (side === 'in' ? storageSpots(visibleStorages, used, false) : partSpots(visibleParts, hourMinutes, false)),
    [side, visibleStorages, visibleParts, used, hourMinutes],
  );
  const hasOutside = Boolean(state?.exterior_url) || visibleParts.length > 0;
  const damaged = visibleParts.filter((p) => currentCondition(p, hourMinutes) / Math.max(1, p.max_condition) < 0.4).length;

  const selStorage = side === 'in' ? (visibleStorages.find((s) => s.id === selId) ?? null) : null;
  const selPart = side === 'out' ? (visibleParts.find((p) => p.id === selId) ?? null) : null;
  const heroInfo = hero
    ? {
        id: heroId,
        name: String(hero.name ?? 'Jurado'),
        coins: Number(hero.coins_bronze) || 0,
        backpack: backpack as unknown as InventoryItemRecord[],
      }
    : null;

  if (missingTables || error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
        <p className="italic text-[var(--muted)] max-w-xs">
          {missingTables ? 'A base do grupo ainda não foi preparada pelo Mestre.' : `Não foi possível abrir a base: ${error?.message}`}
        </p>
      </div>
    );
  }

  const owned = visibleStorages.filter((s) => s.owned).length;
  const subtitle =
    side === 'in'
      ? visibleStorages.length
        ? `${owned} ${owned === 1 ? 'armazenamento' : 'armazenamentos'}${visibleStorages.length > owned ? ` · ${visibleStorages.length - owned} à venda` : ''}`
        : 'Nada para guardar ainda'
      : visibleParts.length
        ? damaged
          ? `${damaged} ${damaged === 1 ? 'parte precisa' : 'partes precisam'} de conserto`
          : 'Tudo em ordem por fora'
        : 'Nada para cuidar por fora';

  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="player-base" data-side={side}>
      <BaseScene
        key={side}
        url={side === 'in' ? (state?.background_url ?? null) : (state?.exterior_url ?? null)}
        imgW={side === 'in' ? state?.img_w : state?.ext_w}
        imgH={side === 'in' ? state?.img_h : state?.ext_h}
        emptyText={
          side === 'in' ? 'O Mestre ainda não revelou como é a base do grupo.' : 'O Mestre ainda não mostrou o lado de fora.'
        }
        spots={spots}
        dm={false}
        selectedId={selId}
        onSelect={setSelId}
      />

      <div className="absolute top-3 left-3 right-3 z-20 flex items-start justify-between gap-2 pointer-events-none">
        <div className="min-w-0 px-3 py-2 border border-[var(--iron)] bg-[var(--stone)]/95">
          <h1 className="font-['Cinzel',serif] text-sm tracking-[0.14em] text-[var(--gold-hi)] truncate">{state?.name || 'A Base'}</h1>
          <p className={`text-[11px] truncate ${side === 'out' && damaged ? 'text-[#e0645a]' : 'text-[var(--muted)]'}`}>
            {side === 'out' ? `Por fora · ${subtitle}` : subtitle}
          </p>
        </div>
        {hasOutside && (
          <div className="pointer-events-auto">
            <SideToggle
              side={side}
              alert={damaged > 0}
              onChange={(s) => {
                setSelId(null);
                setSide(s);
              }}
            />
          </div>
        )}
      </div>

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--abyss)]/70">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)]" />
        </div>
      )}

      {selStorage && (
        <StoragePanel key={selStorage.id} storage={selStorage} stored={items} onClose={() => setSelId(null)} hero={heroInfo} />
      )}
      {selPart && (
        <PartPanel key={selPart.id} part={selPart} minutes={minutos} stored={items} onClose={() => setSelId(null)} hero={heroInfo} />
      )}
    </div>
  );
}
