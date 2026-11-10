import { useQueryClient } from '@tanstack/react-query';
import { Copy, MapPin, Pin, RefreshCw, Search, Store, Undo2, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { toast } from 'sonner';
// @ts-ignore: importação de texto do Vite
import marketSql from '../../../../supabase/migrations/20261112_market.sql?raw';
import { useGameState, useHeroes } from '../../../shared/hooks/baseHooks';
import { formatCoins } from '../../base/data/kinds';
import { useToggleShopMutation } from '../../shop/api/useDMShop';
import { DMShopControlTab } from '../../shop/components/DMShopControlTab';
import { type MarketData, useMarket, useMarketActions } from '../api/marketApi';
import { marketTitle } from '../data/engine';
import { CAT_LABEL, REGION_PROFILES, catKey } from '../data/regions';
import { AiImagesPanel } from './AiImagesPanel';
import { ItemThumb } from './ItemThumb';

const label = "font-['Cinzel',serif] text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]";
const field =
  'h-8 px-2 text-sm bg-[var(--abyss)] border border-[var(--iron)] text-[var(--text)] rounded-none outline-none focus:border-[var(--gold-lo)]';
const stoneBtn =
  'h-8 px-2.5 inline-flex items-center justify-center gap-1.5 border border-[var(--iron)] text-xs text-[var(--text)] cursor-pointer hover:border-[var(--gold-lo)] active:translate-y-px disabled:opacity-50';

/** Mercado do Mestre: automático por região, com ajustes finos. */
export function DMMarketView() {
  const [tab, setTab] = useState<'mercado' | 'avulsos'>('mercado');
  return (
    <div className="flex flex-col gap-3 font-[family-name:var(--body)] text-[var(--text)]" data-testid="dm-market">
      <div className="flex gap-1">
        {(
          [
            ['mercado', 'Mercado por região'],
            ['avulsos', 'Itens avulsos (loja antiga)'],
          ] as const
        ).map(([k, t]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={`h-8 px-3 border text-xs cursor-pointer ${
              tab === k ? 'border-[var(--gold)] text-[var(--gold-hi)] bg-[var(--gold)]/10' : 'border-[var(--iron)] text-[var(--muted)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'mercado' ? <RegionalMarket /> : <DMShopControlTab />}
    </div>
  );
}

function RegionalMarket() {
  const m = useMarket();
  if (m.missing) return <SetupNotice />;
  return (
    <div className="grid gap-3 lg:grid-cols-[340px_1fr] items-start">
      <div className="flex flex-col gap-3">
        <MarketControls m={m} />
        <AiImagesPanel />
      </div>
      <div className="flex flex-col gap-3 min-w-0">
        <StockTable m={m} />
        <SalesLog m={m} />
      </div>
    </div>
  );
}

function Panel({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="p-3 border border-[var(--iron)] bg-[var(--stone)] flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-['Cinzel',serif] text-sm tracking-[0.12em] text-[var(--gold-hi)]">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function MarketControls({ m }: { m: MarketData }) {
  const actions = useMarketActions();
  const toggle = useToggleShopMutation();
  const { gameState } = useGameState();
  const open = Boolean(gameState?.shop_open ?? true);
  const [placeQuery, setPlaceQuery] = useState('');
  const pq = useDeferredValue(placeQuery.trim().toLowerCase());
  const placeMatches = useMemo(
    () =>
      pq
        ? m.places
            .filter((p) => p.name.toLowerCase().includes(pq) || REGION_PROFILES[p.region]?.name.toLowerCase().includes(pq))
            .slice(0, 8)
        : [],
    [m.places, pq],
  );
  const fixed = m.config.mode === 'fixed';
  const pct = Math.round((m.config.price_mult || 1) * 100);

  return (
    <Panel
      title="Mercado agora"
      right={
        <button
          type="button"
          onClick={() => toggle.mutate({ shopOpen: !open })}
          data-testid="btn-toggle-open"
          className={`h-7 px-2.5 border text-xs cursor-pointer ${open ? 'border-[var(--moss)] text-[var(--moss)]' : 'border-[var(--blood)] text-[#e0645a]'}`}
        >
          {open ? 'Aberto' : 'Fechado'}
        </button>
      }
    >
      <div className="p-2 border border-[var(--iron)] bg-[var(--stone-2)]">
        <p className="font-['Cinzel',serif] text-[var(--text)] flex items-center gap-1.5" data-testid="dm-market-title">
          <Store className="w-4 h-4 text-[var(--gold)]" /> {m.title}
        </p>
        <p className="text-xs text-[var(--muted)]">
          {m.profile.name} · {m.tierLabel} · {m.stock.length} mercadorias
        </p>
        {!fixed && !m.party && (
          <p className="mt-1 text-xs text-[var(--ember)]">O grupo não tem posição no mapa. Use o mapa (ferramenta Grupo) ou escolha uma cidade.</p>
        )}
      </div>

      <span className={label}>Onde fica</span>
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          aria-pressed={!fixed}
          onClick={() => actions.saveConfig.mutate({ mode: 'auto' })}
          data-testid="mode-auto"
          className={`h-8 text-xs border cursor-pointer ${!fixed ? 'border-[var(--gold)] text-[var(--gold-hi)] bg-[var(--gold)]/10' : 'border-[var(--iron)] text-[var(--muted)]'}`}
        >
          Onde o grupo está
        </button>
        <button
          type="button"
          aria-pressed={fixed}
          onClick={() => m.place && actions.saveConfig.mutate({ mode: 'fixed', place_id: m.place.id })}
          className={`h-8 text-xs border cursor-pointer ${fixed ? 'border-[var(--gold)] text-[var(--gold-hi)] bg-[var(--gold)]/10' : 'border-[var(--iron)] text-[var(--muted)]'}`}
        >
          Cidade fixa
        </button>
      </div>
      <label className="relative">
        <Search className="absolute left-2 top-2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
        <input
          className={`${field} w-full pl-7`}
          value={placeQuery}
          onChange={(e) => setPlaceQuery(e.target.value)}
          placeholder="Levar o mercado para… (cidade ou região)"
          data-testid="place-search"
        />
      </label>
      {placeMatches.length > 0 && (
        <ul className="border border-[var(--iron)] divide-y divide-[var(--iron)]">
          {placeMatches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  actions.saveConfig.mutate({ mode: 'fixed', place_id: p.id });
                  setPlaceQuery('');
                  toast.success(`Mercado em ${p.name}.`);
                }}
                className="w-full px-2 py-1.5 text-left text-sm hover:bg-[var(--stone-2)] cursor-pointer flex items-center gap-2"
              >
                <MapPin className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span className="flex-1 truncate">{marketTitle(p)}</span>
                <span className="text-[11px] text-[var(--muted)]">{REGION_PROFILES[p.region]?.name ?? p.region}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className={label}>Renova a cada</span>
          <span className="flex items-center gap-1">
            <input
              type="number"
              min={0.25}
              step={0.5}
              className={`${field} w-full`}
              defaultValue={m.config.restock_days}
              key={m.config.restock_days}
              onBlur={(e) => {
                const v = Math.max(0.25, Number(e.target.value) || 3);
                if (v !== m.config.restock_days) actions.saveConfig.mutate({ restock_days: v });
              }}
              data-testid="restock-days"
            />
            <span className="text-xs text-[var(--muted)]">dias</span>
          </span>
        </label>
        <div className="flex flex-col gap-1">
          <span className={label}>Estoque</span>
          <button
            type="button"
            className={stoneBtn}
            onClick={() => {
              actions.saveConfig.mutate({ period_offset: (m.config.period_offset || 0) + 1 });
              toast.success('Mercadorias novas chegaram.');
            }}
            data-testid="btn-restock"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Renovar agora
          </button>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="flex justify-between">
          <span className={label}>Preços gerais</span>
          <span className="text-xs tabular-nums text-[var(--text)]">{pct}%</span>
        </span>
        <input
          type="range"
          min={50}
          max={200}
          step={5}
          defaultValue={pct}
          key={pct}
          onPointerUp={(e) => actions.saveConfig.mutate({ price_mult: Number((e.target as HTMLInputElement).value) / 100 })}
          onKeyUp={(e) => actions.saveConfig.mutate({ price_mult: Number((e.target as HTMLInputElement).value) / 100 })}
          className="w-full accent-[var(--gold)]"
          aria-label="Preços gerais"
        />
        <span className="text-[11px] text-[var(--muted)]">Guerra, festival, peste… vale para todos os mercados.</span>
      </label>
    </Panel>
  );
}

function StockTable({ m }: { m: MarketData }) {
  const actions = useMarketActions();
  const [adding, setAdding] = useState('');
  const aq = useDeferredValue(adding.trim().toLowerCase());
  const placeScope = m.place ? `place:${m.place.id}` : m.profile.id;
  const inStock = useMemo(() => new Set(m.stock.map((e) => e.item.id)), [m.stock]);
  const matches = useMemo(
    () => (aq.length >= 2 ? m.catalog.filter((c) => !c.archived && c.name.toLowerCase().includes(aq) && !inStock.has(c.id)).slice(0, 10) : []),
    [m.catalog, aq, inStock],
  );
  const overrideOf = (id: string) => m.overrides.find((o) => o.catalog_id === id && o.scope === placeScope);

  const setPrice = (id: string, price: number, stock: number) =>
    actions.setOverride.mutate({ scope: placeScope, catalog_id: id, mode: 'sempre', price_bronze: price, stock });

  return (
    <Panel title={`Vitrine · ${m.stock.length}`} right={<span className="text-[11px] text-[var(--muted)]">ajustes valem só para este lugar</span>}>
      <label className="relative">
        <Search className="absolute left-2 top-2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
        <input
          className={`${field} w-full pl-7`}
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder="Pôr um item do catálogo à venda aqui…"
          data-testid="add-item-search"
        />
      </label>
      {matches.length > 0 && (
        <ul className="border border-[var(--iron)] divide-y divide-[var(--iron)]">
          {matches.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-2 py-1">
              <span className="w-8 shrink-0">
                <ItemThumb item={c} />
              </span>
              <span className="flex-1 min-w-0 text-sm truncate">{c.name}</span>
              <span className="text-[11px] text-[var(--muted)]">{c.rarity}</span>
              <button
                type="button"
                className={stoneBtn}
                onClick={() => {
                  actions.setOverride.mutate({ scope: placeScope, catalog_id: c.id, mode: 'sempre' });
                  setAdding('');
                }}
                data-testid={`add-${c.id}`}
              >
                <Pin className="w-3.5 h-3.5" /> Aqui
              </button>
              <button
                type="button"
                className={stoneBtn}
                title={`Em todos os mercados de ${m.profile.name}`}
                onClick={() => {
                  actions.setOverride.mutate({ scope: m.profile.id, catalog_id: c.id, mode: 'sempre' });
                  setAdding('');
                }}
              >
                Região
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={label}>
              <th className="text-left font-normal py-1" colSpan={2}>
                Item
              </th>
              <th className="text-right font-normal">Preço (b)</th>
              <th className="text-right font-normal">Estoque</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--iron)]">
            {m.stock.map((e) => {
              const o = overrideOf(e.item.id);
              return (
                <tr key={e.item.id} data-testid={`row-${e.item.id}`}>
                  <td className="py-1 w-10">
                    <span className="block w-9">
                      <ItemThumb item={e.item} />
                    </span>
                  </td>
                  <td className="py-1 pl-1 min-w-[140px]">
                    <span className="block truncate max-w-[260px]">
                      {e.pinned && <Pin className="inline w-3 h-3 mr-1 text-[var(--gold)]" />}
                      {e.item.name}
                    </span>
                    <span className="text-[11px] text-[var(--muted)]">
                      {e.item.rarity} · {CAT_LABEL[catKey(e.item.category)]}
                      {e.tag === 'especialidade' && <span className="text-[var(--moss)]"> · especialidade</span>}
                      {e.tag === 'escasso' && <span className="text-[var(--ember)]"> · escasso</span>}
                    </span>
                  </td>
                  <td className="text-right">
                    <input
                      type="number"
                      min={0}
                      defaultValue={e.price}
                      key={`p${e.price}`}
                      title={formatCoins(e.price)}
                      onBlur={(ev) => {
                        const v = Math.max(0, Math.round(Number(ev.target.value) || 0));
                        if (v !== e.price) setPrice(e.item.id, v, o?.stock ?? e.stock);
                      }}
                      className={`${field} w-20 text-right tabular-nums`}
                      data-testid={`price-${e.item.id}`}
                    />
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <span className="text-[11px] text-[var(--muted)] mr-1">{e.sold ? `${e.sold} vend. ·` : ''}</span>
                    <input
                      type="number"
                      min={0}
                      defaultValue={e.stock}
                      key={`s${e.stock}`}
                      onBlur={(ev) => {
                        const v = Math.max(0, Math.round(Number(ev.target.value) || 0));
                        if (v !== e.stock) setPrice(e.item.id, o?.price_bronze ?? e.price, v);
                      }}
                      className={`${field} w-14 text-right tabular-nums`}
                      data-testid={`stock-${e.item.id}`}
                    />
                  </td>
                  <td className="text-right whitespace-nowrap pl-1">
                    {o ? (
                      <button type="button" className={`${stoneBtn} !px-2`} title="Desfazer ajuste" onClick={() => actions.removeOverride.mutate(o.id)}>
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`${stoneBtn} !px-2 ml-1`}
                      title="Tirar deste mercado"
                      onClick={() => actions.setOverride.mutate({ scope: placeScope, catalog_id: e.item.id, mode: 'nunca' })}
                      data-testid={`remove-${e.item.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {m.loading && <p className="py-4 text-center text-sm text-[var(--muted)]">Carregando o catálogo…</p>}
        {!m.loading && !m.stock.length && (
          <p className="py-4 text-center text-sm italic text-[var(--muted)]">
            Nenhuma mercadoria. O catálogo de itens tem itens com preço?
          </p>
        )}
      </div>
      <RemovedHere m={m} scope={placeScope} />
    </Panel>
  );
}

/** Itens tirados deste lugar (para poder devolver). */
function RemovedHere({ m, scope }: { m: MarketData; scope: string }) {
  const actions = useMarketActions();
  const removed = m.overrides.filter((o) => o.mode === 'nunca' && (o.scope === scope || o.scope === m.profile.id || o.scope === '*'));
  if (!removed.length) return null;
  const byId = new Map(m.catalog.map((c) => [c.id, c]));
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-[var(--muted)]">{removed.length} tirados daqui</summary>
      <ul className="mt-1 flex flex-wrap gap-1">
        {removed.map((o) => (
          <li key={o.id}>
            <button type="button" className={stoneBtn} onClick={() => actions.removeOverride.mutate(o.id)} title="Devolver ao sorteio">
              <Undo2 className="w-3 h-3" /> {byId.get(o.catalog_id)?.name ?? o.catalog_id}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

function SalesLog({ m }: { m: MarketData }) {
  const { heroes } = useHeroes();
  const names = new Map(heroes.map((h) => [h.id, h.name]));
  const byId = new Map(m.catalog.map((c) => [c.id, c.name]));
  if (!m.sales.length) return null;
  return (
    <Panel title="Movimento deste estoque">
      <ul className="flex flex-col gap-0.5 text-sm max-h-64 overflow-y-auto">
        {m.sales.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <span className={`w-14 text-[11px] uppercase ${s.kind === 'compra' ? 'text-[var(--gold)]' : 'text-[var(--moss)]'}`}>{s.kind}</span>
            <span className="flex-1 truncate">
              {names.get(s.character_id ?? '') ?? s.character_id}: {s.qty}× {byId.get(s.catalog_id) ?? s.catalog_id.replace(/^item:/, '')}
            </span>
            <span className="tabular-nums text-[var(--muted)]">{formatCoins(s.price_bronze)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function SetupNotice() {
  const qc = useQueryClient();
  return (
    <div className="max-w-2xl flex flex-col gap-3" data-testid="market-setup">
      <h2 className="font-['Cinzel',serif] text-lg tracking-[0.14em] text-[var(--gold-hi)]">Preparar o mercado (uma vez só)</h2>
      <p className="text-[15px] leading-relaxed">
        O mercado usa tabelas novas. Abra o <b>Supabase</b>, vá em <b>SQL Editor</b>, cole o texto abaixo e clique em <b>Run</b>. Depois clique em{' '}
        <b>Já rodei</b>.
      </p>
      <pre className="max-h-[45vh] overflow-auto p-3 text-[11px] leading-snug bg-[var(--abyss)] border border-[var(--iron)] text-[var(--muted)] whitespace-pre-wrap">
        {marketSql as string}
      </pre>
      <div className="flex gap-2">
        <button
          type="button"
          className={`${stoneBtn} !h-10 flex-1`}
          onClick={() =>
            navigator.clipboard
              .writeText(marketSql as string)
              .then(() => toast.success('SQL copiado.'))
              .catch(() => toast.error('Selecione o texto e copie.'))
          }
        >
          <Copy className="w-4 h-4" /> Copiar SQL
        </button>
        <button
          type="button"
          className="h-10 flex-1 border border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] text-sm cursor-pointer active:translate-y-px"
          onClick={() => void qc.invalidateQueries({ queryKey: ['market'] })}
        >
          Já rodei
        </button>
      </div>
      <p className="text-xs text-[var(--muted)]">Enquanto isso, os itens avulsos da loja antiga continuam na outra aba.</p>
    </div>
  );
}

