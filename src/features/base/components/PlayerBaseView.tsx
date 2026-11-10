import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import { useHero, useInventory } from '../../../shared/hooks/baseHooks';
import { useBase } from '../api/baseApi';
import { BaseScene } from './BaseScene';
import { StoragePanel } from './StoragePanel';

export function useUsedSlots(items: { storage_id: string }[]) {
  return useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(it.storage_id, (m.get(it.storage_id) ?? 0) + 1);
    return m;
  }, [items]);
}

/** Base do grupo vista pelo Jogador. */
export function PlayerBaseView({ heroId }: { heroId: string }) {
  const { state, storages, items, loading, missingTables, error } = useBase();
  const { hero } = useHero(heroId);
  const { items: backpack = [] } = useInventory(heroId);
  const [selId, setSelId] = useState<string | null>(null);
  const used = useUsedSlots(items);
  const visible = useMemo(() => storages.filter((s) => !s.hidden), [storages]);
  const selected = visible.find((s) => s.id === selId) ?? null;
  const owned = visible.filter((s) => s.owned).length;

  if (missingTables || error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
        <p className="italic text-[var(--muted)] max-w-xs">
          {missingTables ? 'A base do grupo ainda não foi preparada pelo Mestre.' : `Não foi possível abrir a base: ${error?.message}`}
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="player-base">
      <BaseScene state={state} storages={visible} used={used} mode="player" selectedId={selId} onSelect={setSelId} />

      <div className="absolute top-3 left-3 z-20 px-3 py-2 border border-[var(--iron)] bg-[var(--stone)]/95 pointer-events-none">
        <h1 className="font-['Cinzel',serif] text-sm tracking-[0.14em] text-[var(--gold-hi)]">{state?.name || 'A Base'}</h1>
        <p className="text-[11px] text-[var(--muted)]">
          {visible.length
            ? `${owned} ${owned === 1 ? 'armazenamento' : 'armazenamentos'}${visible.length > owned ? ` · ${visible.length - owned} à venda` : ''}`
            : 'Nada para guardar ainda'}
        </p>
      </div>

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--abyss)]/70">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)]" />
        </div>
      )}

      {selected && (
        <StoragePanel
          key={selected.id}
          storage={selected}
          stored={items}
          onClose={() => setSelId(null)}
          hero={
            hero
              ? {
                  id: heroId,
                  name: String(hero.name ?? 'Jurado'),
                  coins: Number(hero.coins_bronze) || 0,
                  backpack: backpack as unknown as InventoryItemRecord[],
                }
              : null
          }
        />
      )}
    </div>
  );
}
