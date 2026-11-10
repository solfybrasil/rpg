import { useQuery } from '@tanstack/react-query';
import { Coins, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHeroes } from '../../../shared/hooks/baseHooks';
import { formatCoins } from '../../base/data/kinds';
import { FxCanvas } from '../../battle-map/components/FxCanvas';
import { CHEST_FX, CHEST_OPEN_AT } from '../../battle-map/engine/FxSprite';
import { ItemThumb, rarityColor } from '../../market/components/ItemThumb';
import { type TreasureChest, availableFor, fetchChest, useChestActions, useChests } from '../api/treasureApi';
import { TIERS } from '../data/loot';

/** Janela do baú: anima a tampa abrindo e mostra o que dá para pegar. */
export function ChestModal({
  chestId,
  heroId,
  heroName,
  onClose,
  onOpened,
}: {
  chestId: string;
  heroId: string;
  heroName: string;
  onClose: () => void;
  /** Chamado uma vez quando o baú é aberto (ex.: abrir a peça no mapa). */
  onOpened?: (chest: TreasureChest) => void;
}) {
  const { chests } = useChests('player');
  const listed = chests.find((c) => c.id === chestId);
  const fallback = useQuery({
    queryKey: ['treasure', 'one', chestId],
    queryFn: () => fetchChest(chestId),
    enabled: !listed,
    staleTime: 3_000,
  });
  const chest = listed ?? fallback.data ?? null;
  const actions = useChestActions();
  const { heroes } = useHeroes();
  const names = useMemo(() => new Map(heroes.map((h) => [String(h.id), String(h.name ?? h.id)])), [heroes]);
  const openedRef = useRef(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (chest && !openedRef.current) {
      openedRef.current = true;
      onOpened?.(chest);
    }
    const t = setTimeout(() => setRevealed(true), 900); // a tampa abre em ~0,8 s
    return () => clearTimeout(t);
  }, [chest, onOpened]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const can = chest ? availableFor(chest, heroId) : { items: [], coins: 0 };
  const busy = actions.take.isPending;
  const takeKeys = (keys: string[], coins: boolean) =>
    chest && actions.take.mutate({ chestId: chest.id, keys, coins, heroId, heroName });

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-label={chest?.name ?? 'Baú'}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/75 cursor-default animate-[fadeIn_var(--t-fast)_ease-out]" onClick={onClose} />
      <div
        className="relative w-full max-w-[440px] max-h-[90dvh] overflow-y-auto bg-[var(--stone)] border border-[var(--gold-lo)] shadow-[0_0_60px_rgba(201,164,92,0.15)] animate-[fadeIn_var(--t-base)_var(--ease-out)] font-[family-name:var(--body)] text-[var(--text)]"
        data-testid="chest-modal"
      >
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute top-2 right-2 z-10 w-9 h-9 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
          <X className="w-5 h-5" />
        </button>
        <div className="flex justify-center pt-4 bg-[radial-gradient(ellipse_at_50%_80%,rgba(201,164,92,0.18),transparent_65%)]">
          <FxCanvas id={CHEST_FX} mode="toStill" at={CHEST_OPEN_AT} className="w-[264px] h-[168px]" />
        </div>
        <header className="px-4 pb-2 text-center">
          <h2 className="font-['Cinzel',serif] text-lg tracking-[0.12em] text-[var(--gold-hi)]">{chest?.name ?? 'Abrindo…'}</h2>
          {chest && <p className="text-xs italic text-[var(--muted)]">{TIERS[chest.tier]?.frase}</p>}
        </header>

        {chest && revealed && (
          <div className="px-4 pb-4 flex flex-col gap-2 animate-[fadeIn_var(--t-base)_var(--ease-out)]">
            <ul className="flex flex-col gap-1.5" data-testid="chest-loot">
              {chest.items.map((it) => {
                const mine = can.items.some((x) => x.key === it.key);
                const reserved = !it.taken_by && it.for && it.for !== heroId;
                return (
                  <li
                    key={it.key}
                    className={`flex items-center gap-3 p-1.5 pr-2 border border-[var(--iron)] bg-[var(--stone-2)] ${mine ? '' : 'opacity-50'}`}
                  >
                    <span className="w-12 shrink-0">
                      <ItemThumb item={it} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm truncate">
                        {it.qty > 1 ? `${it.qty}× ` : ''}
                        {it.name}
                      </span>
                      <span className="block text-[11px]">
                        <span style={{ color: rarityColor(it.rarity) === '#3D3833' ? 'var(--muted)' : rarityColor(it.rarity) }}>{it.rarity}</span>
                        {it.taken_by && <span className="text-[var(--muted)]"> · levado por {it.taken_by === heroId ? 'você' : (names.get(it.taken_by) ?? 'outro')}</span>}
                        {reserved && <span className="text-[var(--muted)]"> · para {names.get(it.for as string) ?? 'outro jurado'}</span>}
                      </span>
                    </span>
                    {mine && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => takeKeys([it.key], false)}
                        data-testid={`take-${it.key}`}
                        className="h-8 px-3 border border-[var(--gold)] text-[var(--gold-hi)] text-xs font-['Cinzel',serif] cursor-pointer hover:bg-[var(--gold)]/10 active:translate-y-px disabled:opacity-50"
                      >
                        Pegar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {chest.coins > 0 && (
              <div className={`flex items-center gap-3 p-2 border border-[var(--iron)] bg-[var(--stone-2)] ${can.coins ? '' : 'opacity-50'}`}>
                <Coins className="w-5 h-5 text-[var(--gold)]" />
                <span className="flex-1 text-sm tabular-nums">{formatCoins(chest.coins)}</span>
                {can.coins ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => takeKeys([], true)}
                    data-testid="take-coins"
                    className="h-8 px-3 border border-[var(--gold)] text-[var(--gold-hi)] text-xs font-['Cinzel',serif] cursor-pointer hover:bg-[var(--gold)]/10 disabled:opacity-50"
                  >
                    Pegar
                  </button>
                ) : (
                  <span className="text-[11px] text-[var(--muted)]">
                    levadas por {chest.coins_taken_by === heroId ? 'você' : (names.get(chest.coins_taken_by ?? '') ?? 'outro')}
                  </span>
                )}
              </div>
            )}
            {can.items.length + (can.coins ? 1 : 0) > 1 ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => takeKeys(can.items.map((i) => i.key), Boolean(can.coins))}
                data-testid="take-all"
                className="h-11 mt-1 border border-[var(--gold-lo)] bg-[var(--gold)] text-[var(--abyss)] font-['Cinzel',serif] text-sm tracking-[0.1em] cursor-pointer active:translate-y-px disabled:opacity-50"
              >
                {busy ? 'Guardando…' : 'Pegar tudo'}
              </button>
            ) : !can.items.length && !can.coins ? (
              <p className="py-2 text-center text-sm italic text-[var(--muted)]">
                {chest.status === 'liberado' || chest.status === 'vazio' ? 'Não sobrou nada para você aqui.' : 'Este baú ainda está trancado.'}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

