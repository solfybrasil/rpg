import { ArrowDownToLine, ArrowUpFromLine, ChevronsUp, Coins, Loader2, Lock, Trash2, X } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import { SlotItem } from '../../inventory/components/BackpackSlot';
import '../../../styles/features/PlayerInventory.css';
import { type BaseItem, type BaseStorage, asRecord, useBaseActions } from '../api/baseApi';
import { formatCoins, kindInfo } from '../data/kinds';

type Picked = { from: 'store'; base: BaseItem } | { from: 'pack'; row: InventoryItemRecord };

interface Props {
  storage: BaseStorage;
  stored: BaseItem[];
  onClose: () => void;
  /** Jogador: herói da sessão. Mestre: sem herói (só vê e retira). */
  hero?: { id: string; name: string; coins: number; backpack: InventoryItemRecord[] } | null;
  dm?: boolean;
  /** 'sheet': gaveta de baixo (Jogador, coluna estreita). 'side': painel à direita (Mestre). */
  layout?: 'sheet' | 'side';
}

const Cell = memo(function Cell({
  item,
  index,
  selected,
  onPick,
  testid,
}: {
  item: InventoryItemRecord | null;
  index: number;
  selected: boolean;
  onPick?: () => void;
  testid?: string;
}) {
  const rarity = (item?.rarity || 'comum').toLowerCase();
  return (
    <button
      type="button"
      disabled={!item}
      onClick={onPick}
      data-testid={testid}
      title={item ? `${item.name}${Number(item.quantity) > 1 ? ` (${item.quantity}×)` : ''}` : `Espaço ${index + 1}`}
      className={`modern-slot !rounded-none ${item ? `occupied rarity-${rarity}` : 'empty cursor-default'} ${selected ? 'selected' : ''}`}
    >
      {item ? <SlotItem item={item} /> : <span className="modern-slot-dot-index">{index + 1}</span>}
    </button>
  );
});

/** Abre um armazenamento: compra, melhoria, e guardar/pegar entre ele e a mochila. */
export function StoragePanel({ storage, stored, onClose, hero, dm, layout = 'sheet' }: Props) {
  const actions = useBaseActions();
  const [picked, setPicked] = useState<Picked | null>(null);
  const info = kindInfo(storage.kind);
  const Icon = info.icon;

  const mine = useMemo(() => stored.filter((s) => s.storage_id === storage.id), [stored, storage.id]);
  const grid = useMemo(() => {
    const g: Array<BaseItem | null> = new Array(storage.slots).fill(null);
    const extra: BaseItem[] = [];
    for (const it of mine) {
      if (it.slot_index >= 0 && it.slot_index < g.length && !g[it.slot_index]) g[it.slot_index] = it;
      else extra.push(it);
    }
    // Itens fora da grade (ex.: espaços reduzidos pelo Mestre) ocupam os vagos ou aparecem no fim.
    for (const it of extra) {
      const i = g.indexOf(null);
      if (i >= 0) g[i] = it;
      else g.push(it);
    }
    return g;
  }, [mine, storage.slots]);
  const used = mine.length;
  const loose = useMemo(
    () =>
      (hero?.backpack ?? [])
        .filter((i) => !i.equip_slot)
        .sort((a, b) => (a.slot_index ?? 99) - (b.slot_index ?? 99)),
    [hero?.backpack],
  );

  const busy = actions.deposit.isPending || actions.withdraw.isPending;
  const pickedRec = picked ? (picked.from === 'store' ? asRecord(picked.base) : picked.row) : null;
  const pickedQty = Number(pickedRec?.quantity) || 1;

  const move = (qty: number) => {
    if (!picked || !hero) return;
    if (picked.from === 'pack') {
      actions.deposit.mutate(
        { row: picked.row, qty, storage, stored, heroId: hero.id, heroName: hero.name },
        { onSuccess: () => setPicked(null) },
      );
    } else {
      actions.withdraw.mutate(
        { stored: picked.base, qty, heroId: hero.id, backpack: hero.backpack },
        { onSuccess: () => setPicked(null) },
      );
    }
  };

  const canUpgrade = storage.owned && storage.level < storage.max_level;
  const coins = hero?.coins ?? 0;

  return (
    <aside
      className={`absolute z-30 flex flex-col bg-[var(--stone)] border-[var(--iron)] font-[family-name:var(--body)] shadow-[0_0_40px_rgba(0,0,0,0.7)] animate-[fadeIn_var(--t-base)_var(--ease-out)] ${
        layout === 'side' ? 'top-0 right-0 bottom-0 w-[400px] max-w-full border-l' : 'left-0 right-0 bottom-0 h-[68%] border-t'
      }`}
      data-testid="storage-panel"
      aria-label={storage.name}
    >
      {/* Cabeçalho */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--iron)]">
        <span className="w-10 h-10 shrink-0 flex items-center justify-center border border-[var(--gold)] text-[var(--gold-hi)] bg-[var(--stone-2)]">
          <Icon className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="font-['Cinzel',serif] text-base tracking-[0.08em] text-[var(--gold-hi)] truncate">{storage.name}</h2>
          <p className="text-xs text-[var(--muted)]">
            {info.label}
            {storage.owned ? (
              <>
                {' · '}
                <span className="tabular-nums">
                  {used}/{storage.slots}
                </span>{' '}
                espaços
                {storage.max_level > 1 && (
                  <span className="tabular-nums">
                    {' · '}nível {storage.level}/{storage.max_level}
                  </span>
                )}
              </>
            ) : (
              ' · à venda'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="w-9 h-9 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {storage.description && (
          <p className="mx-4 mt-3 px-3 py-2 bg-[var(--parch)] text-[var(--ink)] text-[15px] italic leading-snug">
            {storage.description}
          </p>
        )}

        {/* À venda */}
        {!storage.owned && (
          <section className="m-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-[var(--text)]">
              <Lock className="w-4 h-4 text-[var(--muted)]" />
              <span>
                Comprar este {info.label.toLowerCase()} dá ao grupo <b className="tabular-nums">{storage.slots}</b> espaços
                para guardar itens.
              </span>
            </div>
            {hero ? (
              <>
                <p className="text-xs text-[var(--muted)] flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-[var(--gold)]" /> Suas moedas:{' '}
                  <span className="tabular-nums text-[var(--gold-hi)]">{formatCoins(coins)}</span>
                </p>
                <button
                  type="button"
                  disabled={actions.buy.isPending || coins < storage.price_bronze}
                  onClick={() => actions.buy.mutate({ storage, heroId: hero.id }, { onSuccess: () => undefined })}
                  data-testid="btn-buy-storage"
                  className="h-11 flex items-center justify-center gap-2 border border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] font-['Cinzel',serif] text-sm tracking-[0.1em] cursor-pointer active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actions.buy.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Comprar por {formatCoins(storage.price_bronze)}
                </button>
                {coins < storage.price_bronze && (
                  <p className="text-xs italic text-[#e0645a]">Faltam {formatCoins(storage.price_bronze - coins)}.</p>
                )}
              </>
            ) : (
              <p className="text-xs italic text-[var(--muted)]">Preço: {formatCoins(storage.price_bronze)}.</p>
            )}
          </section>
        )}

        {storage.owned && (
          <>
            {/* Conteúdo do armazenamento */}
            <section className="px-4 pt-3">
              <h3 className="mb-2 font-['Cinzel',serif] text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                Guardado aqui
              </h3>
              <div className="grid grid-cols-6 gap-1.5" data-testid="storage-grid">
                {grid.map((b, i) => (
                  <Cell
                    key={b?.id ?? `e${i}`}
                    index={i}
                    item={b ? asRecord(b) : null}
                    selected={picked?.from === 'store' && picked.base.id === b?.id}
                    onPick={b ? () => setPicked({ from: 'store', base: b }) : undefined}
                    testid={b ? `stored-${b.id}` : undefined}
                  />
                ))}
              </div>
              {mine.length === 0 && (
                <p className="mt-2 text-xs italic text-[var(--muted)]">
                  Vazio. {hero ? 'Toque num item da sua mochila para guardar.' : ''}
                </p>
              )}
            </section>

            {/* Mochila do herói */}
            {hero && (
              <section className="px-4 pt-4 pb-3">
                <h3 className="mb-2 font-['Cinzel',serif] text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  Sua mochila
                </h3>
                {loose.length ? (
                  <div className="grid grid-cols-6 gap-1.5" data-testid="pack-grid">
                    {loose.map((row, i) => (
                      <Cell
                        key={row.id}
                        index={i}
                        item={row}
                        selected={picked?.from === 'pack' && picked.row.id === row.id}
                        onPick={() => setPicked({ from: 'pack', row })}
                        testid={`pack-${row.id}`}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-[var(--muted)]">Nada na mochila (itens equipados não aparecem aqui).</p>
                )}
              </section>
            )}

            {canUpgrade && hero && (
              <section className="mx-4 mb-4 p-3 border border-[var(--iron)] bg-[var(--stone-2)] flex items-center gap-3">
                <ChevronsUp className="w-5 h-5 text-[var(--gold)] shrink-0" />
                <div className="flex-1 text-xs text-[var(--text)]">
                  Melhorar para o nível {storage.level + 1}: <b>+{Math.max(1, storage.upgrade_slots)}</b> espaços
                  <span className="block text-[var(--muted)] tabular-nums">
                    {formatCoins(storage.upgrade_price)} · você tem {formatCoins(coins)}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={actions.upgrade.isPending || coins < storage.upgrade_price}
                  onClick={() => actions.upgrade.mutate({ storage, heroId: hero.id })}
                  data-testid="btn-upgrade-storage"
                  className="h-9 px-3 border border-[var(--gold)] text-[var(--gold-hi)] text-xs font-['Cinzel',serif] tracking-[0.08em] cursor-pointer hover:bg-[var(--gold)]/10 active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Melhorar
                </button>
              </section>
            )}
          </>
        )}
      </div>

      {/* Item escolhido */}
      {picked && pickedRec && (
        <footer
          className="border-t border-[var(--gold-lo)] bg-[var(--stone-2)] p-3 flex flex-col gap-2 animate-[fadeIn_var(--t-fast)_var(--ease-out)]"
          data-testid="picked-bar"
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-['Cinzel',serif] text-sm text-[var(--gold-hi)] truncate">
                {pickedRec.name}
                {pickedQty > 1 && <span className="ml-1 text-[var(--muted)] tabular-nums">×{pickedQty}</span>}
              </p>
              <p className="text-xs text-[var(--muted)] truncate">
                {[pickedRec.rarity, pickedRec.category].filter(Boolean).join(' · ')}
                {picked.from === 'store' && picked.base.deposited_by ? ` · guardado por ${picked.base.deposited_by}` : ''}
              </p>
              {pickedRec.description && (
                <p className="mt-1 text-xs italic text-[var(--text)]/80 line-clamp-2">{String(pickedRec.description)}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPicked(null)}
              aria-label="Desmarcar"
              className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            {hero && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => move(pickedQty)}
                  data-testid="btn-move-all"
                  className="flex-1 h-10 flex items-center justify-center gap-2 border border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-hi)] text-sm cursor-pointer active:translate-y-px disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : picked.from === 'pack' ? (
                    <ArrowDownToLine className="w-4 h-4" />
                  ) : (
                    <ArrowUpFromLine className="w-4 h-4" />
                  )}
                  {picked.from === 'pack' ? 'Guardar' : 'Pegar'}
                  {pickedQty > 1 ? ' tudo' : ''}
                </button>
                {pickedQty > 1 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => move(1)}
                    className="h-10 px-3 border border-[var(--iron)] text-[var(--text)] text-sm cursor-pointer hover:border-[var(--gold-lo)] active:translate-y-px disabled:opacity-50"
                  >
                    Só 1
                  </button>
                )}
              </>
            )}
            {dm && picked.from === 'store' && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Tirar "${pickedRec.name}" da base? O item some.`)) {
                    actions.removeItem.mutate(picked.base.id);
                    setPicked(null);
                  }
                }}
                className="flex-1 h-10 flex items-center justify-center gap-2 border border-[var(--blood)] text-[#e0645a] text-sm cursor-pointer hover:bg-[var(--blood)]/10"
              >
                <Trash2 className="w-4 h-4" /> Tirar da base
              </button>
            )}
          </div>
        </footer>
      )}
    </aside>
  );
}
