import { useQuery } from '@tanstack/react-query';
import { Clock, Coins, Lock, MapPin, Minus, Plus, Search, Store, X } from 'lucide-react';
import { memo, useDeferredValue, useMemo, useState } from 'react';
import type { InventoryItemRecord } from '../../../entities/item';
import { useGameState, useHero, useInventory } from '../../../shared/hooks/baseHooks';
import { useSessionStore } from '../../../shared/stores/session';
import { formatCoins } from '../../base/data/kinds';
import { fetchShopItems } from '../../shop/api';
import type { ShopItem } from '../../shop/types';
import { type MarketData, useMarket, useMarketActions } from '../api/marketApi';
import { type StockEntry, sellOffer } from '../data/engine';
import { CAT_LABEL, type CatKey, catKey } from '../data/regions';
import { ItemThumb, rarityColor } from './ItemThumb';

type Entry = StockEntry & { left: number; sold: number };

function restockText(min: number) {
  const h = Math.ceil(min / 60);
  if (h < 24) return `${h} ${h === 1 ? 'hora' : 'horas'}`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? 'dia' : 'dias'}`;
}

const ItemCard = memo(function ItemCard({ e, onOpen }: { e: Entry; onOpen: (e: Entry) => void }) {
  const out = e.left <= 0;
  return (
    <button
      type="button"
      onClick={() => onOpen(e)}
      data-testid={`market-item-${e.item.id}`}
      className={`group flex flex-col text-left bg-[var(--stone-2)] border border-[var(--iron)] hover:border-[var(--gold-lo)] active:translate-y-px cursor-pointer transition-[border-color,opacity] duration-[var(--t-fast)] ${
        out ? 'opacity-45' : ''
      }`}
    >
      <ItemThumb item={e.item} />
      <span className="px-1.5 pt-1 text-[13px] leading-tight text-[var(--text)] line-clamp-2 min-h-[2.4em]">{e.item.name}</span>
      <span className="px-1.5 pb-1.5 flex items-center justify-between gap-1">
        <span
          className={`font-['Cinzel',serif] text-xs tabular-nums ${
            e.tag === 'especialidade' ? 'text-[var(--moss)]' : e.tag === 'escasso' ? 'text-[var(--ember)]' : 'text-[var(--gold-hi)]'
          }`}
        >
          {formatCoins(e.price)}
        </span>
        <span className="text-[10px] text-[var(--muted)] tabular-nums">{out ? 'esgotado' : `×${e.left}`}</span>
      </span>
    </button>
  );
});

/** Mercado do Jogador: o da cidade onde o grupo está. */
export function PlayerMarketView() {
  const heroId = useSessionStore((s) => s.heroId) || 'teste_1';
  const m = useMarket();
  const { gameState } = useGameState();
  const { hero } = useHero(heroId);
  const { items: inventory = [] } = useInventory(heroId);
  const coins = Number(hero?.coins_bronze) || 0;
  const open = gameState?.shop_open ?? true;

  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [cat, setCat] = useState<CatKey | 'all'>('all');
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query.trim().toLowerCase());
  const [openEntry, setOpenEntry] = useState<Entry | null>(null);
  const [openSell, setOpenSell] = useState<InventoryItemRecord | null>(null);

  const legacyQ = useQuery({
    queryKey: ['market', 'legacy-shop'],
    queryFn: () => fetchShopItems('MESA') as Promise<ShopItem[]>,
    staleTime: 30_000,
  });
  const legacy = (legacyQ.data ?? []).filter((it) => it.active !== false && (it.stock == null || it.stock > 0));

  const cats = useMemo(() => {
    const set = new Set<CatKey>();
    for (const e of m.stock) set.add(catKey(e.item.category));
    return [...set];
  }, [m.stock]);

  const shown = useMemo(
    () =>
      m.stock.filter(
        (e) => (cat === 'all' || catKey(e.item.category) === cat) && (!q || e.item.name.toLowerCase().includes(q)),
      ),
    [m.stock, cat, q],
  );

  const catalogById = useMemo(() => new Map(m.catalog.map((c) => [c.id, c])), [m.catalog]);
  const sellable = useMemo(
    () =>
      (inventory as unknown as InventoryItemRecord[])
        .filter((i) => !i.equip_slot)
        .map((i) => {
          const c = i.catalog_id ? catalogById.get(String(i.catalog_id)) : undefined;
          const base = Number(c?.price_bronze ?? i.price_bronze) || 0;
          return { row: i, each: sellOffer(base, i.category, m.profile, m.config.price_mult || 1) };
        })
        .filter((x) => x.each > 0 && (!q || x.row.name.toLowerCase().includes(q))),
    [inventory, catalogById, m.profile, m.config.price_mult, q],
  );

  if (m.missing) {
    return (
      <div className="p-6 text-center italic text-[var(--muted)]">O mercado ainda está sendo montado pelo Mestre.</div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 pb-6 font-[family-name:var(--body)] text-[var(--text)]" data-testid="player-market">
      {/* Cabeçalho */}
      <header className="p-3 border border-[var(--iron)] bg-[var(--stone)] flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 shrink-0 flex items-center justify-center border border-[var(--gold)] text-[var(--gold-hi)] bg-[var(--stone-2)]">
            <Store className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="font-['Cinzel',serif] text-base tracking-[0.1em] text-[var(--gold-hi)] leading-tight" data-testid="market-title">
              {m.loading ? 'Procurando mercadores…' : m.title}
            </h1>
            <p className="text-xs text-[var(--muted)] flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {m.profile.name} · {m.tierLabel}
            </p>
          </div>

        </div>
        <p className="text-[13px] italic text-[var(--text)]/80 leading-snug">{m.profile.flavor}</p>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {m.profile.specialties.map((k) => (
            <span key={k} className="px-1.5 py-px border border-[var(--moss)]/60 text-[var(--moss)]">
              barato: {CAT_LABEL[k].toLowerCase()}
            </span>
          ))}
          {m.profile.scarce.map((k) => (
            <span key={k} className="px-1.5 py-px border border-[var(--ember)]/60 text-[var(--ember)]">
              caro: {CAT_LABEL[k].toLowerCase()}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-[var(--muted)] flex items-center gap-1">
          <Clock className="w-3 h-3" /> Mercadorias novas em {restockText(m.minutesToRestock)}
        </p>
      </header>

      {!open && (
        <div className="px-3 py-2 border border-[var(--blood)] bg-[var(--blood)]/10 text-sm flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#e0645a] shrink-0" /> O Mestre fechou o mercado. Dá para olhar, mas não negociar.
        </div>
      )}

      {/* Abas */}
      <div className="grid grid-cols-2 border border-[var(--iron)]">
        {(
          [
            ['buy', 'Comprar'],
            ['sell', 'Vender'],
          ] as const
        ).map(([k, t]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            data-testid={`tab-${k}`}
            className={`h-10 font-['Cinzel',serif] text-xs uppercase tracking-[0.14em] cursor-pointer transition-colors duration-[var(--t-fast)] ${
              tab === k ? 'bg-[var(--gold)]/15 text-[var(--gold-hi)] shadow-[inset_0_-2px_0_var(--gold)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <label className="relative">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-[var(--muted)] pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === 'buy' ? 'Procurar mercadoria…' : 'Procurar na mochila…'}
          className="w-full h-9 pl-8 pr-2 text-sm bg-[var(--abyss)] border border-[var(--iron)] text-[var(--text)] outline-none focus:border-[var(--gold-lo)]"
        />
      </label>

      {tab === 'buy' ? (
        <>
          {cats.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {(['all', ...cats] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setCat(k)}
                  aria-pressed={cat === k}
                  className={`shrink-0 h-7 px-2.5 border text-xs cursor-pointer ${
                    cat === k ? 'border-[var(--gold)] text-[var(--gold-hi)] bg-[var(--gold)]/10' : 'border-[var(--iron)] text-[var(--muted)]'
                  }`}
                >
                  {k === 'all' ? 'Tudo' : CAT_LABEL[k]}
                </button>
              ))}
            </div>
          )}
          {m.loading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: esqueleto
                <div key={i} className="aspect-[3/4] bg-[var(--stone-2)] border border-[var(--iron)] animate-pulse" />
              ))}
            </div>
          ) : shown.length ? (
            <div className="grid grid-cols-3 gap-2" data-testid="market-grid">
              {shown.map((e) => (
                <ItemCard key={e.item.id} e={e} onOpen={setOpenEntry} />
              ))}
            </div>
          ) : (
            <p className="py-6 text-center italic text-[var(--muted)]">Nada assim por aqui.</p>
          )}

          {legacy.length > 0 && (
            <section className="mt-2 flex flex-col gap-2">
              <h2 className="font-['Cinzel',serif] text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">Encomendas do Mestre</h2>
              <LegacyList items={legacy} heroId={heroId} coins={coins} open={open} />
            </section>
          )}
        </>
      ) : sellable.length ? (
        <ul className="flex flex-col gap-1.5" data-testid="sell-list">
          {sellable.map(({ row, each }) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setOpenSell(row)}
                className="w-full flex items-center gap-3 p-1.5 pr-3 text-left border border-[var(--iron)] bg-[var(--stone-2)] hover:border-[var(--gold-lo)] cursor-pointer"
                data-testid={`sell-${row.id}`}
              >
                <span className="w-11 shrink-0">
                  <ItemThumb item={row} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm truncate">{row.name}</span>
                  <span className="block text-[11px] text-[var(--muted)]">
                    {Number(row.quantity) > 1 ? `${row.quantity} na mochila · ` : ''}
                    {row.rarity}
                  </span>
                </span>
                <span className="font-['Cinzel',serif] text-xs text-[var(--gold-hi)] tabular-nums">{formatCoins(each)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center italic text-[var(--muted)]">Nada na mochila que este mercador compre.</p>
      )}

      {openEntry && (
        <BuySheet entry={m.stock.find((e) => e.item.id === openEntry.item.id) ?? openEntry} m={m} heroId={heroId} coins={coins} open={open} onClose={() => setOpenEntry(null)} />
      )}
      {openSell && (
        <SellSheet
          row={openSell}
          each={sellable.find((s) => s.row.id === openSell.id)?.each ?? 0}
          m={m}
          heroId={heroId}
          open={open}
          onClose={() => setOpenSell(null)}
        />
      )}
    </div>
  );
}

function Sheet({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-label={label}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/70 cursor-default animate-[fadeIn_var(--t-fast)_ease-out]" onClick={onClose} />
      <div className="relative w-full max-w-[480px] max-h-[88dvh] overflow-y-auto bg-[var(--parch)] text-[var(--ink)] shadow-[0_-10px_40px_rgba(0,0,0,0.7)] animate-[fadeIn_var(--t-base)_var(--ease-out)] font-[family-name:var(--body)]">
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute top-2 right-2 z-10 w-9 h-9 flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer">
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

function Qty({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center border border-[var(--ink-soft)]/50">
      <button type="button" aria-label="Menos" disabled={value <= 1} onClick={() => onChange(value - 1)} className="w-9 h-9 flex items-center justify-center cursor-pointer disabled:opacity-30">
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-8 text-center font-['Cinzel',serif] tabular-nums" data-testid="qty">
        {value}
      </span>
      <button type="button" aria-label="Mais" disabled={value >= max} onClick={() => onChange(value + 1)} className="w-9 h-9 flex items-center justify-center cursor-pointer disabled:opacity-30">
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

function Stats({ item }: { item: { damage_dice?: string | null; armor_bonus?: number | null; equippable_as?: string | null } }) {
  const bits = [
    item.damage_dice && `Dano ${item.damage_dice}`,
    Number(item.armor_bonus) > 0 && `Defesa +${item.armor_bonus}`,
  ].filter(Boolean);
  if (!bits.length) return null;
  return <p className="text-sm font-semibold">{bits.join(' · ')}</p>;
}

function BuySheet({ entry, m, heroId, coins, open, onClose }: { entry: Entry; m: MarketData; heroId: string; coins: number; open: boolean; onClose: () => void }) {
  const actions = useMarketActions();
  const [qty, setQty] = useState(1);
  const max = Math.max(1, Math.min(entry.left, 20));
  const total = entry.price * qty;
  const it = entry.item;
  return (
    <Sheet onClose={onClose} label={it.name}>
      <div className="grid grid-cols-[120px_1fr] gap-3 p-4 pr-10">
        <ItemThumb item={it} size="lg" />
        <div className="min-w-0">
          <h2 className="font-['Cinzel',serif] text-lg leading-tight" style={{ color: 'var(--ink)' }}>
            {it.name}
          </h2>
          <p className="text-xs italic text-[var(--ink-soft)]">
            <span style={{ color: rarityColor(it.rarity) === '#3D3833' ? 'var(--ink-soft)' : rarityColor(it.rarity) }}>{it.rarity}</span> ·{' '}
            {it.category}
          </p>
          {entry.tag && (
            <p className={`mt-1 text-xs ${entry.tag === 'especialidade' ? 'text-[#3f6b2e]' : 'text-[#9a4a12]'}`}>
              {entry.tag === 'especialidade' ? 'Produzido na região: preço bom.' : 'Escasso na região: preço alto.'}
            </p>
          )}
          <p className="mt-1 text-xs text-[var(--ink-soft)]">{entry.left > 0 ? `${entry.left} em estoque` : 'Esgotado'}</p>
        </div>
      </div>
      <div className="px-4 pb-3 flex flex-col gap-2">
        <Stats item={it} />
        {(it.description || it.special) && <p className="text-[15px] leading-relaxed">{it.description || it.special}</p>}
      </div>
      <div className="sticky bottom-0 p-4 pt-3 bg-[var(--parch-2)] border-t border-[var(--ink-soft)]/30 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          {entry.left > 1 ? <Qty value={qty} max={max} onChange={setQty} /> : <span />}
          <span className="text-sm flex items-center gap-1">
            <Coins className="w-4 h-4" /> você tem <b className="tabular-nums">{formatCoins(coins)}</b>
          </span>
        </div>
        <button
          type="button"
          disabled={!open || entry.left <= 0 || coins < total || actions.buy.isPending}
          onClick={() =>
            actions.buy.mutate({ entry, qty, heroId, marketKey: m.marketKey, title: m.title }, { onSuccess: onClose })
          }
          data-testid="btn-buy"
          className="h-12 border border-[var(--gold-lo)] bg-[var(--gold)] text-[var(--abyss)] font-['Cinzel',serif] text-sm tracking-[0.1em] cursor-pointer active:translate-y-px disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {!open
            ? 'Mercado fechado'
            : entry.left <= 0
              ? 'Esgotado'
              : coins < total
                ? `Faltam ${formatCoins(total - coins)}`
                : actions.buy.isPending
                  ? 'Comprando…'
                  : `Comprar por ${formatCoins(total)}`}
        </button>
      </div>
    </Sheet>
  );
}

function SellSheet({ row, each, m, heroId, open, onClose }: { row: InventoryItemRecord; each: number; m: MarketData; heroId: string; open: boolean; onClose: () => void }) {
  const actions = useMarketActions();
  const have = Number(row.quantity) || 1;
  const [qty, setQty] = useState(1);
  const k = catKey(row.category);
  const why = m.profile.scarce.includes(k)
    ? 'Falta disso na região: o mercador paga bem.'
    : m.profile.specialties.includes(k)
      ? 'A região produz isso: o mercador paga pouco.'
      : null;
  return (
    <Sheet onClose={onClose} label={row.name}>
      <div className="grid grid-cols-[96px_1fr] gap-3 p-4 pr-10">
        <ItemThumb item={row} size="lg" />
        <div>
          <h2 className="font-['Cinzel',serif] text-lg leading-tight" style={{ color: 'var(--ink)' }}>
            {row.name}
          </h2>
          <p className="text-xs italic text-[var(--ink-soft)]">
            {row.rarity} · {row.category}
          </p>
          <p className="mt-1 text-sm">
            O mercador oferece <b className="tabular-nums">{formatCoins(each)}</b> {have > 1 ? 'cada' : ''}.
          </p>
          {why && <p className="text-xs text-[var(--ink-soft)]">{why}</p>}
        </div>
      </div>
      <div className="sticky bottom-0 p-4 pt-3 bg-[var(--parch-2)] border-t border-[var(--ink-soft)]/30 flex flex-col gap-2">
        {have > 1 && <Qty value={qty} max={have} onChange={setQty} />}
        <button
          type="button"
          disabled={!open || actions.sell.isPending}
          onClick={() =>
            actions.sell.mutate(
              { row: { id: row.id, name: row.name, quantity: row.quantity ?? 1, catalog_id: row.catalog_id }, qty, each, heroId, marketKey: m.marketKey, title: m.title },
              { onSuccess: onClose },
            )
          }
          data-testid="btn-sell"
          className="h-12 border border-[var(--gold-lo)] bg-[var(--gold)] text-[var(--abyss)] font-['Cinzel',serif] text-sm tracking-[0.1em] cursor-pointer active:translate-y-px disabled:opacity-45"
        >
          {open ? `Vender por ${formatCoins(each * qty)}` : 'Mercado fechado'}
        </button>
      </div>
    </Sheet>
  );
}

/** Itens avulsos que o Mestre cadastrou na loja antiga. */
function LegacyList({ items, heroId, coins, open }: { items: ShopItem[]; heroId: string; coins: number; open: boolean }) {
  const actions = useMarketActions();
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((it) => (
        <li key={it.id} className="flex items-center gap-3 p-1.5 pr-2 border border-[var(--iron)] bg-[var(--stone-2)]">
          <span className="w-11 shrink-0">
            <ItemThumb item={it} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm truncate">{it.name}</span>
            <span className="block text-[11px] text-[var(--muted)]">
              {it.rarity}
              {it.stock != null ? ` · ${it.stock} em estoque` : ''}
            </span>
          </span>
          <button
            type="button"
            disabled={!open || coins < it.price_bronze || actions.buyLegacy.isPending}
            onClick={() => actions.buyLegacy.mutate({ item: it, heroId })}
            className="h-8 px-2.5 border border-[var(--gold)] text-[var(--gold-hi)] text-xs font-['Cinzel',serif] cursor-pointer hover:bg-[var(--gold)]/10 disabled:opacity-40"
          >
            {formatCoins(it.price_bronze)}
          </button>
        </li>
      ))}
    </ul>
  );
}
