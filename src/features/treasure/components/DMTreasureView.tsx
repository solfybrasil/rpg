import { useQueryClient } from '@tanstack/react-query';
import { Copy, Dices, Gift, Lock, MapPin, Plus, RefreshCw, Search, Trash2, Undo2, X } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
// @ts-ignore: importação de texto do Vite
import chestSql from '../../../../supabase/migrations/20261113_treasure_chests.sql?raw';
import { useHeroes } from '../../../shared/hooks/baseHooks';
import { formatCoins } from '../../base/data/kinds';
import { FxCanvas } from '../../battle-map/components/FxCanvas';
import { CHEST_FX, CHEST_OPEN_AT } from '../../battle-map/engine/FxSprite';
import { useCatalogLite } from '../../market/api/marketApi';
import { ItemThumb, rarityColor } from '../../market/components/ItemThumb';
import { REGION_IDS, REGION_PROFILES } from '../../market/data/regions';
import { type TreasureChest, useChestActions, useChests } from '../api/treasureApi';
import { type ChestItem, type ChestTier, TIERS, TIER_ORDER, rerollItem, rollChest, toChestItem } from '../data/loot';

const label = "font-['Cinzel',serif] text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]";
const field =
  'h-8 px-2 text-sm bg-[var(--abyss)] border border-[var(--iron)] text-[var(--text)] rounded-none outline-none focus:border-[var(--gold-lo)]';
const stoneBtn =
  'h-8 px-2.5 inline-flex items-center justify-center gap-1.5 border border-[var(--iron)] text-xs text-[var(--text)] cursor-pointer hover:border-[var(--gold-lo)] active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed';

const STATUS: Record<TreasureChest['status'], { t: string; c: string }> = {
  rascunho: { t: 'Só você vê', c: 'text-[var(--muted)] border-[var(--iron)]' },
  liberado: { t: 'Liberado', c: 'text-[var(--gold-hi)] border-[var(--gold-lo)]' },
  vazio: { t: 'Vazio', c: 'text-[var(--muted)] border-[var(--iron)] opacity-70' },
};

/** Aba "Tesouros" do Mestre: sortear, conferir e liberar baús. */
export function DMTreasureView() {
  const { chests, loading, missing } = useChests('dm');
  const actions = useChestActions();
  const catalogQ = useCatalogLite();
  const catalog = catalogQ.data ?? [];
  const [tier, setTier] = useState<ChestTier>('ferro');
  const [region, setRegion] = useState<string>('');
  const [selId, setSelId] = useState<string | null>(null);
  const selected = chests.find((c) => c.id === selId) ?? null;

  if (missing) return <SetupNotice />;

  const roll = () => {
    if (!catalog.length) return toast.error('O catálogo de itens ainda está carregando.');
    const r = rollChest({ catalog, tier, profile: region ? REGION_PROFILES[region] : null });
    actions.create.mutate(
      { name: TIERS[tier].nome, tier, items: r.items, coins: r.coins, status: 'rascunho' },
      { onSuccess: (row) => setSelId(row.id) },
    );
  };

  const groups: Array<[TreasureChest['status'], string]> = [
    ['rascunho', 'Preparando'],
    ['liberado', 'Liberados'],
    ['vazio', 'Esvaziados'],
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row font-[family-name:var(--body)] text-[var(--text)]" data-testid="dm-treasure">
      {/* Coluna: sorteio + lista */}
      <aside className="lg:w-[360px] shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--iron)] bg-[var(--stone)] overflow-y-auto">
        <section className="p-3 flex flex-col gap-2">
          <h2 className="font-['Cinzel',serif] text-base tracking-[0.18em] text-[var(--gold-hi)]">Tesouros</h2>
          <span className={label}>Tipo de baú</span>
          <div className="grid grid-cols-5 gap-1">
            {TIER_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                aria-pressed={tier === t}
                title={TIERS[t].frase}
                data-testid={`tier-${t}`}
                className={`h-16 flex flex-col items-center justify-center gap-0.5 border text-[10px] leading-tight text-center px-0.5 cursor-pointer ${
                  tier === t ? 'border-[var(--gold)] bg-[var(--gold)]/12 text-[var(--gold-hi)]' : 'border-[var(--iron)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <TierMark tier={t} />
                {TIERS[t].nome.replace('Baú ', '').replace('Relicário ', '')}
              </button>
            ))}
          </div>
          <p className="text-[11px] italic text-[var(--muted)]">
            {TIERS[tier].items[0]}–{TIERS[tier].items[1]} itens · {formatCoins(TIERS[tier].coins[0])} a {formatCoins(TIERS[tier].coins[1])}. {TIERS[tier].frase}
          </p>
          <label className="flex flex-col gap-1">
            <span className={label}>Região (puxa o que ela produz)</span>
            <select className={`${field} w-full`} value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">Qualquer lugar</option>
              {REGION_IDS.map((r) => (
                <option key={r} value={r}>
                  {REGION_PROFILES[r].name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={roll}
            disabled={actions.create.isPending || catalogQ.isLoading}
            data-testid="btn-roll-chest"
            className="h-10 flex items-center justify-center gap-2 border border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] font-['Cinzel',serif] text-sm tracking-[0.1em] cursor-pointer active:translate-y-px disabled:opacity-50"
          >
            <Dices className="w-4 h-4" /> {catalogQ.isLoading ? 'Carregando catálogo…' : 'Sortear baú'}
          </button>
        </section>

        {groups.map(([st, title]) => {
          const list = chests.filter((c) => c.status === st);
          if (!list.length) return null;
          return (
            <section key={st} className="border-t border-[var(--iron)]">
              <h3 className={`${label} px-3 pt-2 pb-1`}>
                {title} · {list.length}
              </h3>
              <ul>
                {list.map((c) => {
                  const left = c.items.filter((i) => !i.taken_by).length;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelId(c.id)}
                        data-testid={`chest-${c.id}`}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer hover:bg-[var(--stone-2)] ${
                          selId === c.id ? 'bg-[var(--stone-2)] shadow-[inset_2px_0_0_var(--gold)]' : ''
                        }`}
                      >
                        <TierMark tier={c.tier} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm truncate">{c.name}</span>
                          <span className="block text-[11px] text-[var(--muted)]">
                            {left}/{c.items.length} itens{c.coins && !c.coins_taken_by ? ` · ${formatCoins(c.coins)}` : ''}
                            {c.map_token_id ? ' · no mapa' : ''}
                          </span>
                        </span>
                        {c.map_token_id && <MapPin className="w-3.5 h-3.5 text-[var(--muted)]" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {!loading && !chests.length && <p className="p-3 text-xs italic text-[var(--muted)]">Nenhum baú ainda. Escolha o tipo e sorteie.</p>}
      </aside>

      {/* Editor */}
      <main className="flex-1 min-w-0 overflow-y-auto p-3 lg:p-5">
        {selected ? (
          <ChestEditor key={selected.id} chest={selected} onClose={() => setSelId(null)} />
        ) : (
          <div className="h-full min-h-[240px] flex flex-col items-center justify-center gap-3 text-center">
            <FxCanvas id={CHEST_FX} mode="loop" every={1.5} className="w-[264px] h-[168px]" />
            <p className="max-w-sm text-sm italic text-[var(--muted)]">
              Sorteie um baú, confira o que veio e libere para quem quiser. Os jogadores recebem um aviso e abrem na hora.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

const TIER_COLOR: Record<ChestTier, string> = {
  madeira: '#8a5a34',
  ferro: '#8a8f96',
  ouro: 'var(--gold)',
  amaldicoado: 'var(--violet)',
  lendario: 'var(--gold-hi)',
};

function TierMark({ tier }: { tier: ChestTier }) {
  return (
    <span
      className="w-5 h-4 shrink-0 border-2 border-b-[3px] relative"
      style={{ borderColor: TIER_COLOR[tier], background: `color-mix(in srgb, ${TIER_COLOR[tier]} 25%, transparent)` }}
      aria-hidden
    >
      <span className="absolute left-1/2 top-[3px] -translate-x-1/2 w-1 h-1" style={{ background: TIER_COLOR[tier] }} />
    </span>
  );
}

function CoinsField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const o = Math.floor(value / 2500);
  const p = Math.floor((value % 2500) / 50);
  const b = value % 50;
  const set = (no: number, np: number, nb: number) => onChange(Math.max(0, no) * 2500 + Math.max(0, np) * 50 + Math.max(0, nb));
  const part = (v: number, suf: string, fn: (n: number) => void, testid?: string) => (
    <label className="flex items-center border border-[var(--iron)] bg-[var(--abyss)] w-20">
      <input
        type="number"
        min={0}
        value={v}
        onChange={(e) => fn(Number(e.target.value) || 0)}
        data-testid={testid}
        className="w-full h-8 px-2 text-sm bg-transparent text-[var(--text)] outline-none tabular-nums"
      />
      <span className="pr-2 text-xs text-[var(--muted)]">{suf}</span>
    </label>
  );
  return (
    <div className="flex gap-1">
      {part(o, 'o', (n) => set(n, p, b), 'coins-o')}
      {part(p, 'p', (n) => set(o, n, b))}
      {part(b, 'b', (n) => set(o, p, n))}
    </div>
  );
}

function ChestEditor({ chest, onClose }: { chest: TreasureChest; onClose: () => void }) {
  const actions = useChestActions();
  const { heroes } = useHeroes();
  const catalog = useCatalogLite().data ?? [];
  const names = useMemo(() => new Map(heroes.map((h) => [String(h.id), String(h.name ?? h.id)])), [heroes]);
  const [name, setName] = useState(chest.name);
  const [adding, setAdding] = useState('');
  const aq = useDeferredValue(adding.trim().toLowerCase());
  const [forAll, setForAll] = useState(!chest.for_heroes?.length);
  const [pick, setPick] = useState<string[]>(chest.for_heroes ?? []);
  useEffect(() => setName(chest.name), [chest.name]);

  const locked = chest.status !== 'rascunho';
  const anyTaken = chest.items.some((i) => i.taken_by) || Boolean(chest.coins_taken_by);
  const save = (patch: Partial<TreasureChest>) => actions.update.mutate({ chest, patch });
  const setItems = (items: ChestItem[]) => save({ items });

  const matches = useMemo(
    () => (aq.length >= 2 ? catalog.filter((c) => !c.archived && c.name.toLowerCase().includes(aq)).slice(0, 8) : []),
    [catalog, aq],
  );

  const release = () => {
    const for_heroes = forAll ? null : pick;
    if (!forAll && !pick.length) return toast.error('Escolha pelo menos um jurado (ou "Todos").');
    save({ status: 'liberado', for_heroes, released_at: new Date().toISOString() });
    toast.success(
      forAll ? `${chest.name} liberado para todos.` : `${chest.name} liberado para ${pick.map((id) => names.get(id) ?? id).join(', ')}.`,
    );
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4" data-testid="chest-editor">
      <header className="flex items-start gap-4">
        <FxCanvas
          key={`${chest.id}-${chest.status}`}
          id={CHEST_FX}
          mode={chest.status === 'rascunho' ? 'still' : 'toStill'}
          at={chest.status === 'rascunho' ? 0 : CHEST_OPEN_AT}
          className="w-[264px] h-[168px] -my-6 -ml-10 shrink-0 hidden sm:block"
        />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              className={`${field} flex-1 !h-9 font-['Cinzel',serif] !text-base text-[var(--gold-hi)]`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name !== chest.name && save({ name: name.trim() })}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              aria-label="Nome do baú"
            />
            <span className={`px-2 py-0.5 border text-[11px] ${STATUS[chest.status].c}`}>{STATUS[chest.status].t}</span>
            <button type="button" onClick={onClose} aria-label="Fechar" className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs italic text-[var(--muted)]">{TIERS[chest.tier]?.frase}</p>
          {chest.map_token_id && (
            <p className="text-xs text-[var(--muted)] flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Está no mapa de batalha: quem chegar ao lado pode abrir.
            </p>
          )}
          {chest.status !== 'rascunho' && chest.for_heroes?.length ? (
            <p className="text-xs text-[var(--muted)]">Para: {chest.for_heroes.map((id) => names.get(id) ?? id).join(', ')}</p>
          ) : null}
        </div>
      </header>

      {/* Itens */}
      <section className="border border-[var(--iron)] bg-[var(--stone)]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--iron)]">
          <h3 className="font-['Cinzel',serif] text-sm tracking-[0.12em] text-[var(--gold-hi)]">O que vem no baú</h3>
          {!locked && (
            <button
              type="button"
              className={stoneBtn}
              onClick={() => {
                const r = rollChest({ catalog, tier: chest.tier });
                save({ items: r.items, coins: r.coins });
              }}
              data-testid="btn-reroll-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sortear tudo de novo
            </button>
          )}
        </div>
        <ul className="divide-y divide-[var(--iron)]" data-testid="chest-items">
          {chest.items.map((it) => (
            <li key={it.key} className={`flex items-center gap-3 px-3 py-2 ${it.taken_by ? 'opacity-55' : ''}`}>
              <span className="w-11 shrink-0">
                <ItemThumb item={it} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm truncate">{it.name}</span>
                <span className="block text-[11px]">
                  <span style={{ color: rarityColor(it.rarity) === '#3D3833' ? 'var(--muted)' : rarityColor(it.rarity) }}>{it.rarity}</span>
                  <span className="text-[var(--muted)]"> · {it.category}</span>
                  {it.taken_by && <span className="text-[var(--moss)]"> · pego por {names.get(it.taken_by) ?? it.taken_by}</span>}
                </span>
              </span>
              <input
                type="number"
                min={1}
                value={it.qty}
                disabled={Boolean(it.taken_by)}
                onChange={(e) => setItems(chest.items.map((x) => (x.key === it.key ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x)))}
                className={`${field} w-14 text-right tabular-nums`}
                aria-label="Quantidade"
              />
              <select
                className={`${field} w-32`}
                value={it.for ?? ''}
                disabled={Boolean(it.taken_by)}
                onChange={(e) => setItems(chest.items.map((x) => (x.key === it.key ? { ...x, for: e.target.value || null } : x)))}
                aria-label="Reservar para"
                title="Reservar este item para um jurado"
              >
                <option value="">Qualquer um</option>
                {heroes.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
              {!it.taken_by && (
                <>
                  <button
                    type="button"
                    className={`${stoneBtn} !px-2`}
                    title="Trocar por outro sorteado"
                    onClick={() => {
                      const n = rerollItem({ catalog, tier: chest.tier, current: chest.items });
                      if (n) setItems(chest.items.map((x) => (x.key === it.key ? { ...n, for: it.for } : x)));
                    }}
                  >
                    <Dices className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    className={`${stoneBtn} !px-2`}
                    title="Tirar do baú"
                    onClick={() => setItems(chest.items.filter((x) => x.key !== it.key))}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
          {!chest.items.length && <li className="px-3 py-4 text-sm italic text-[var(--muted)]">Baú vazio.</li>}
        </ul>
        <div className="p-3 border-t border-[var(--iron)] flex flex-col gap-2">
          <label className="relative">
            <Search className="absolute left-2 top-2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
            <input
              className={`${field} w-full pl-7`}
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              placeholder="Pôr um item do catálogo no baú…"
              data-testid="chest-add-search"
            />
          </label>
          {matches.length > 0 && (
            <ul className="border border-[var(--iron)] divide-y divide-[var(--iron)]">
              {matches.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-[var(--stone-2)] cursor-pointer"
                    onClick={() => {
                      setItems([...chest.items, toChestItem(c)]);
                      setAdding('');
                    }}
                  >
                    <span className="w-7 shrink-0">
                      <ItemThumb item={c} />
                    </span>
                    <span className="flex-1 text-sm truncate">{c.name}</span>
                    <span className="text-[11px] text-[var(--muted)]">{c.rarity}</span>
                    <Plus className="w-3.5 h-3.5 text-[var(--gold)]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={label}>Moedas</span>
            <CoinsField value={chest.coins} onChange={(v) => save({ coins: v })} />
            {chest.coins_taken_by && <span className="text-[11px] text-[var(--moss)]">pegas por {names.get(chest.coins_taken_by) ?? chest.coins_taken_by}</span>}
          </div>
        </div>
      </section>

      {/* Liberar */}
      {chest.status === 'rascunho' ? (
        <section className="p-3 border border-[var(--gold-lo)] bg-[var(--stone)] flex flex-col gap-2">
          <h3 className="font-['Cinzel',serif] text-sm tracking-[0.12em] text-[var(--gold-hi)] flex items-center gap-2">
            <Gift className="w-4 h-4" /> Liberar para
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={forAll}
              onClick={() => setForAll(true)}
              className={`h-8 px-3 border text-xs cursor-pointer ${forAll ? 'border-[var(--gold)] text-[var(--gold-hi)] bg-[var(--gold)]/10' : 'border-[var(--iron)] text-[var(--muted)]'}`}
              data-testid="for-all"
            >
              Todos
            </button>
            {heroes.map((h) => {
              const on = !forAll && pick.includes(String(h.id));
              return (
                <button
                  key={h.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setForAll(false);
                    setPick((p) => (p.includes(String(h.id)) ? p.filter((x) => x !== String(h.id)) : [...p, String(h.id)]));
                  }}
                  data-testid={`for-${h.id}`}
                  className={`h-8 px-3 border text-xs cursor-pointer ${on ? 'border-[var(--gold)] text-[var(--gold-hi)] bg-[var(--gold)]/10' : 'border-[var(--iron)] text-[var(--muted)]'}`}
                >
                  {h.name}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-[var(--muted)]">
            Itens reservados acima só podem ser pegos pelo jurado escolhido; o resto, por quem chegar primeiro.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={release}
              disabled={!chest.items.length && !chest.coins}
              data-testid="btn-release"
              className="flex-1 h-10 flex items-center justify-center gap-2 border border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] font-['Cinzel',serif] text-sm tracking-[0.1em] cursor-pointer active:translate-y-px disabled:opacity-40"
            >
              <Gift className="w-4 h-4" /> Liberar baú
            </button>
            <button
              type="button"
              className={`${stoneBtn} !h-10 !border-[var(--blood)] !text-[#e0645a]`}
              onClick={() => {
                if (window.confirm(`Apagar "${chest.name}"?`)) {
                  actions.remove.mutate(chest.id);
                  onClose();
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </section>
      ) : (
        <section className="p-3 border border-[var(--iron)] bg-[var(--stone)] flex items-center gap-2 flex-wrap">
          <Lock className="w-4 h-4 text-[var(--muted)]" />
          <span className="flex-1 text-sm text-[var(--muted)]">
            {chest.status === 'vazio' ? 'Os jurados levaram tudo.' : 'Os jurados já podem abrir este baú.'}
          </span>
          {chest.status === 'liberado' && !anyTaken && (
            <button type="button" className={stoneBtn} onClick={() => save({ status: 'rascunho', released_at: null })}>
              <Undo2 className="w-3.5 h-3.5" /> Recolher
            </button>
          )}
          <button
            type="button"
            className={`${stoneBtn} !border-[var(--blood)] !text-[#e0645a]`}
            onClick={() => {
              if (window.confirm(`Apagar "${chest.name}"? ${chest.map_token_id ? 'A peça no mapa fica sem conteúdo.' : ''}`)) {
                actions.remove.mutate(chest.id);
                onClose();
              }
            }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Apagar
          </button>
        </section>
      )}
    </div>
  );
}

function SetupNotice() {
  const qc = useQueryClient();
  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col gap-3 font-[family-name:var(--body)]" data-testid="treasure-setup">
      <h2 className="font-['Cinzel',serif] text-lg tracking-[0.14em] text-[var(--gold-hi)]">Preparar os baús (uma vez só)</h2>
      <p className="text-[15px] leading-relaxed text-[var(--text)]">
        Os baús usam uma tabela nova. Abra o <b>Supabase</b>, vá em <b>SQL Editor</b>, cole o texto abaixo e clique em <b>Run</b>. Depois
        clique em <b>Já rodei</b>.
      </p>
      <pre className="max-h-[45vh] overflow-auto p-3 text-[11px] leading-snug bg-[var(--abyss)] border border-[var(--iron)] text-[var(--muted)] whitespace-pre-wrap">
        {chestSql as string}
      </pre>
      <div className="flex gap-2">
        <button
          type="button"
          className={`${stoneBtn} !h-10 flex-1`}
          onClick={() =>
            navigator.clipboard
              .writeText(chestSql as string)
              .then(() => toast.success('SQL copiado.'))
              .catch(() => toast.error('Selecione o texto e copie.'))
          }
        >
          <Copy className="w-4 h-4" /> Copiar SQL
        </button>
        <button
          type="button"
          className="h-10 flex-1 border border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] text-sm cursor-pointer"
          onClick={() => void qc.invalidateQueries({ queryKey: ['treasure'] })}
        >
          Já rodei
        </button>
      </div>
    </div>
  );
}
