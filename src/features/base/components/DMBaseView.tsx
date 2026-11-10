import { useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, EyeOff, ImagePlus, Link2, Loader2, MapPin, Package, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
// @ts-ignore: importação de texto do Vite
import baseSql from '../../../../supabase/migrations/20261110_base.sql?raw';
// @ts-ignore: importação de texto do Vite
import exteriorSql from '../../../../supabase/migrations/20261111_base_exterior.sql?raw';
import { useWorldMinutes } from '../../world-clock/api/clock';
import { processBattleMapBackground, uploadBattleMedia } from '../../battle-map/media/mediaProcessor';
import { type BasePart, type BaseStorage, useBase, useBaseActions } from '../api/baseApi';
import {
  PART_KINDS,
  PART_ORDER,
  type PartKind,
  type RepairNeed,
  conditionLabel,
  currentCondition,
  parseNeeds,
  partKind,
} from '../data/parts';
import { KIND_ORDER, STORAGE_KINDS, type StorageKind, formatCoins, kindInfo } from '../data/kinds';
import { BaseScene, healthColor } from './BaseScene';
import { type BaseSide, SideToggle, useUsedSlots } from './PlayerBaseView';
import { StoragePanel } from './StoragePanel';
import { partSpots, storageSpots } from './spots';

const PANEL_W = 360;
const label = "font-['Cinzel',serif] text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]";
const field = 'w-full h-8 px-2 text-sm bg-[var(--abyss)] border border-[var(--iron)] text-[var(--text)] rounded-none focus:border-[var(--gold-lo)] outline-none';
const stoneBtn =
  'h-8 px-2.5 flex items-center justify-center gap-1.5 border border-[var(--iron)] text-xs text-[var(--text)] cursor-pointer hover:border-[var(--gold-lo)] active:translate-y-px disabled:opacity-50';

/** Editor da base do Mestre: cenário, armazenamentos e o que há dentro deles. */
export function DMBaseView() {
  const { state, storages, items, parts, partsMissing, loading, missingTables, error } = useBase();
  const actions = useBaseActions();
  const used = useUsedSlots(items);
  // Estado das partes não muda a olho nu em menos de 10 min do mundo.
  const minutos = useWorldMinutes(10);
  const [side, setSide] = useState<BaseSide>('in');
  const [selId, setSelId] = useState<string | null>(null);
  const [placing, setPlacing] = useState<StorageKind | null>(null);
  const [placingPart, setPlacingPart] = useState<PartKind | null>(null);
  const [openContents, setOpenContents] = useState(false);
  const selected = side === 'in' ? (storages.find((s) => s.id === selId) ?? null) : null;
  const selPart = side === 'out' ? (parts.find((p) => p.id === selId) ?? null) : null;
  const hourMinutes = Math.floor(minutos / 60) * 60;
  const spots = useMemo(
    () => (side === 'in' ? storageSpots(storages, used, true) : partSpots(parts, hourMinutes, true)),
    [side, storages, parts, used, hourMinutes],
  );

  useEffect(() => {
    if (!placing && !placingPart) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setPlacing(null);
      setPlacingPart(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placing, placingPart]);

  const switchSide = (s: BaseSide) => {
    setSide(s);
    setSelId(null);
    setPlacing(null);
    setPlacingPart(null);
    setOpenContents(false);
  };

  if (missingTables) return <SetupNotice sql={`${baseSql}\n\n${exteriorSql}`} />;

  return (
    <div className="absolute inset-0 flex overflow-hidden" data-testid="dm-base">
      {/* Painel */}
      <aside
        className="relative z-20 shrink-0 flex flex-col border-r border-[var(--iron)] bg-[var(--stone)] overflow-y-auto font-[family-name:var(--body)]"
        style={{ width: PANEL_W }}
      >
        <BaseSettings side={side} />

        {side === 'out' ? (
          <OutsidePanel
            parts={parts}
            minutes={minutos}
            missing={partsMissing}
            placing={placingPart}
            setPlacing={setPlacingPart}
            selected={selPart}
            onSelect={setSelId}
          />
        ) : (
        <>
        <section className="p-3 border-t border-[var(--iron)] flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h3 className={label}>Novo armazenamento</h3>
            {placing && (
              <button type="button" onClick={() => setPlacing(null)} className="text-[11px] text-[var(--muted)] underline cursor-pointer">
                cancelar (Esc)
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1">
            {KIND_ORDER.map((k) => {
              const Icon = STORAGE_KINDS[k].icon;
              const on = placing === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPlacing(on ? null : k)}
                  data-testid={`kind-${k}`}
                  aria-pressed={on}
                  className={`h-14 flex flex-col items-center justify-center gap-1 border text-[10px] cursor-pointer active:translate-y-px ${
                    on
                      ? 'border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-hi)]'
                      : 'border-[var(--iron)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--gold-lo)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {STORAGE_KINDS[k].label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] italic text-[var(--muted)]">
            {placing
              ? `Clique no cenário onde fica o ${STORAGE_KINDS[placing].label.toLowerCase()}.`
              : 'Escolha um tipo e clique no cenário. Arraste para mudar de lugar.'}
          </p>
        </section>

        {selected ? (
          <StorageEditor
            key={selected.id}
            st={selected}
            used={used.get(selected.id) ?? 0}
            onClose={() => setSelId(null)}
            onOpen={() => setOpenContents(true)}
          />
        ) : (
          <section className="p-3 border-t border-[var(--iron)] flex flex-col gap-1">
            <h3 className={`${label} mb-1`}>Armazenamentos ({storages.length})</h3>
            {storages.length === 0 && <p className="text-xs italic text-[var(--muted)]">Nenhum ainda.</p>}
            {storages.map((s) => {
              const Icon = kindInfo(s.kind).icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelId(s.id)}
                  className="flex items-center gap-2 px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--stone-2)] cursor-pointer"
                >
                  <Icon className="w-4 h-4 text-[var(--gold)] shrink-0" />
                  <span className="flex-1 truncate">{s.name}</span>
                  {s.hidden && <EyeOff className="w-3.5 h-3.5 text-[var(--muted)]" />}
                  <span className="text-[11px] text-[var(--muted)] tabular-nums">
                    {s.owned ? `${used.get(s.id) ?? 0}/${s.slots}` : formatCoins(s.price_bronze)}
                  </span>
                </button>
              );
            })}
          </section>
        )}
        </>
        )}
        {error && <p className="m-3 text-xs text-[#e0645a]">{error.message}</p>}
      </aside>

      {/* Cenário */}
      <div className="relative flex-1 min-w-0">
        {side === 'out' && partsMissing ? (
          <SetupNotice sql={exteriorSql as string} title="Preparar o lado de fora (uma vez só)" />
        ) : (
          <BaseScene
            key={side}
            url={side === 'in' ? (state?.background_url ?? null) : (state?.exterior_url ?? null)}
            imgW={side === 'in' ? state?.img_w : state?.ext_w}
            imgH={side === 'in' ? state?.img_h : state?.ext_h}
            emptyText={
              side === 'in'
                ? 'Escolha a imagem de dentro da base (taverna, covil, casa, convés…) no painel ao lado.'
                : 'Escolha a imagem de fora da base (fachada, casco do navio, muralha…) no painel ao lado.'
            }
            spots={spots}
            dm
            selectedId={selId}
            onSelect={(id) => {
              setSelId(id);
              if (!id) setOpenContents(false);
            }}
            placing={Boolean(side === 'in' ? placing : placingPart)}
            onPlace={(x, y) => {
              if (side === 'out') {
                if (!placingPart) return;
                const k = PART_KINDS[placingPart];
                actions.createPart.mutate(
                  { name: k.label, kind: placingPart, x, y, condition: 100, max_condition: 100, cond_minutes: Math.floor(minutos) },
                  { onSuccess: (row) => setSelId(row.id) },
                );
                setPlacingPart(null);
                return;
              }
              if (!placing) return;
              const k = STORAGE_KINDS[placing];
              const n = storages.filter((st) => st.kind === placing).length + 1;
              actions.createStorage.mutate(
                { name: n > 1 ? `${k.label} ${n}` : k.label, kind: placing, x, y, slots: k.slots, owned: true },
                { onSuccess: (row) => setSelId(row.id) },
              );
              setPlacing(null);
            }}
            onMove={(id, x, y) =>
              side === 'in'
                ? actions.updateStorage.mutate({ id, patch: { x, y } })
                : actions.updatePart.mutate({ id, patch: { x, y } })
            }
          />
        )}
        <div className="absolute top-3 right-3 z-20">
          <SideToggle side={side} onChange={switchSide} />
        </div>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--abyss)]/70">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)]" />
          </div>
        )}
        {selected && openContents && (
          <StoragePanel storage={selected} stored={items} onClose={() => setOpenContents(false)} dm layout="side" />
        )}
      </div>
    </div>
  );
}

/** Nome e imagem de fundo da base. */
function BaseSettings({ side }: { side: BaseSide }) {
  const { state } = useBase();
  const keys =
    side === 'in'
      ? ({ url: 'background_url', w: 'img_w', h: 'img_h' } as const)
      : ({ url: 'exterior_url', w: 'ext_w', h: 'ext_h' } as const);
  const current = state?.[keys.url] ?? null;
  const actions = useBaseActions();
  const [name, setName] = useState(state?.name ?? 'A Base');
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setName(state?.name ?? 'A Base'), [state?.name]);

  const onFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('Escolha uma imagem (jpg, png ou webp).');
    try {
      setUploading('Otimizando a imagem…');
      const r = await processBattleMapBackground(file);
      setUploading('Enviando…');
      const publicUrl = await uploadBattleMedia(r.fullBlob, `base/${side === 'in' ? 'dentro' : 'fora'}_${Date.now()}.webp`, 'midias');
      actions.saveState.mutate({ [keys.url]: publicUrl, [keys.w]: r.width, [keys.h]: r.height });
      toast.success(side === 'in' ? 'Imagem de dentro trocada.' : 'Imagem de fora trocada.');
    } catch (err) {
      toast.error(`Não foi possível enviar: ${err instanceof Error ? err.message : 'erro'}`);
    } finally {
      setUploading(null);
    }
  };

  return (
    <section className="p-3 flex flex-col gap-2">
      <h2 className="font-['Cinzel',serif] text-base tracking-[0.18em] text-[var(--gold-hi)]">Base do grupo</h2>
      <label className="flex flex-col gap-1">
        <span className={label}>Nome</span>
        <input
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== state?.name && actions.saveState.mutate({ name: name.trim() })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          placeholder="A Taverna do Corvo, O Navio Vigília…"
          data-testid="base-name"
        />
      </label>
      <span className={label}>{side === 'in' ? 'Imagem de dentro' : 'Imagem de fora'}</span>
      <div className="flex gap-1.5">
        <button type="button" className={`${stoneBtn} flex-1`} disabled={Boolean(uploading)} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
          {uploading ?? (current ? 'Trocar imagem' : 'Enviar imagem')}
        </button>
        {current && (
          <button
            type="button"
            className={stoneBtn}
            title="Tirar imagem"
            onClick={() => window.confirm('Tirar esta imagem?') && actions.saveState.mutate({ [keys.url]: null })}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void onFile(f);
          }}
        />
      </div>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          const u = url.trim();
          if (!/^https?:\/\/|^\//.test(u)) return toast.error('Cole um link que comece com http.');
          actions.saveState.mutate({ [keys.url]: u, [keys.w]: null, [keys.h]: null });
          setUrl('');
        }}
      >
        <input className={field} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="ou cole o link de uma imagem" />
        <button type="submit" className={stoneBtn} title="Usar link" disabled={!url.trim()}>
          <Link2 className="w-3.5 h-3.5" />
        </button>
      </form>
    </section>
  );
}

/** Moedas em ouro, prata e bronze (gravadas em bronze). */
function CoinInput({ value, onChange, testid }: { value: number; onChange: (v: number) => void; testid?: string }) {
  const o = Math.floor(value / 2500);
  const p = Math.floor((value % 2500) / 50);
  const b = value % 50;
  const set = (no: number, np: number, nb: number) => onChange(Math.max(0, no) * 2500 + Math.max(0, np) * 50 + Math.max(0, nb));
  const part = (v: number, suf: string, fn: (n: number) => void, t?: string) => (
    <label className="flex-1 flex items-center border border-[var(--iron)] bg-[var(--abyss)]">
      <input
        type="number"
        min={0}
        value={v}
        data-testid={t}
        onChange={(e) => fn(Number(e.target.value) || 0)}
        className="w-full h-8 px-2 text-sm bg-transparent text-[var(--text)] outline-none tabular-nums"
      />
      <span className="pr-2 text-xs text-[var(--muted)]">{suf}</span>
    </label>
  );
  return (
    <div className="flex gap-1">
      {part(o, 'o', (n) => set(n, p, b), testid)}
      {part(p, 'p', (n) => set(o, n, b))}
      {part(b, 'b', (n) => set(o, p, n))}
    </div>
  );
}

function StorageEditor({ st, used, onClose, onOpen }: { st: BaseStorage; used: number; onClose: () => void; onOpen: () => void }) {
  const actions = useBaseActions();
  const [d, setD] = useState(st);
  useEffect(() => setD(st), [st]);
  const set = <K extends keyof BaseStorage>(k: K, v: BaseStorage[K]) => setD((x) => ({ ...x, [k]: v }));
  const dirty = useMemo(
    () =>
      (['name', 'kind', 'slots', 'owned', 'price_bronze', 'max_level', 'level', 'upgrade_price', 'upgrade_slots', 'description'] as const).some(
        (k) => (d[k] ?? null) !== (st[k] ?? null),
      ),
    [d, st],
  );

  const save = () => {
    const slots = Math.max(1, Math.round(Number(d.slots) || 1));
    if (slots < used && !window.confirm(`Há ${used} itens guardados e você reduziu para ${slots} espaços. Os itens continuam lá, mas o baú fica lotado. Salvar assim?`))
      return;
    actions.updateStorage.mutate({
      id: st.id,
      patch: {
        name: d.name.trim() || kindInfo(d.kind).label,
        kind: d.kind,
        slots,
        owned: d.owned,
        price_bronze: d.price_bronze,
        max_level: Math.max(1, Math.round(d.max_level || 1)),
        level: Math.min(Math.max(1, Math.round(d.level || 1)), Math.max(1, Math.round(d.max_level || 1))),
        upgrade_price: d.upgrade_price,
        upgrade_slots: Math.max(0, Math.round(d.upgrade_slots || 0)),
        description: d.description?.trim() || null,
      },
    });
    toast.success('Salvo.');
  };

  return (
    <section className="p-3 border-t border-[var(--gold-lo)] bg-[var(--stone-2)] flex flex-col gap-2" data-testid="storage-editor">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 font-['Cinzel',serif] text-sm text-[var(--gold-hi)] truncate">{st.name}</h3>
        <button type="button" onClick={onClose} aria-label="Fechar" className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" className={stoneBtn} onClick={onOpen} data-testid="btn-open-contents">
          <Package className="w-3.5 h-3.5" /> Ver conteúdo ({used})
        </button>
        <button
          type="button"
          className={`${stoneBtn} ${st.hidden ? '!text-[var(--muted)]' : ''}`}
          onClick={() => actions.updateStorage.mutate({ id: st.id, patch: { hidden: !st.hidden } })}
        >
          {st.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {st.hidden ? 'Escondido' : 'Visível'}
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className={label}>Nome</span>
        <input className={field} value={d.name} onChange={(e) => set('name', e.target.value)} data-testid="storage-name" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className={label}>Tipo</span>
          <select className={field} value={d.kind} onChange={(e) => set('kind', e.target.value)}>
            {KIND_ORDER.map((k) => (
              <option key={k} value={k}>
                {STORAGE_KINDS[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Espaços</span>
          <input
            type="number"
            min={1}
            max={120}
            className={field}
            value={d.slots}
            onChange={(e) => set('slots', Number(e.target.value))}
            data-testid="storage-slots"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className={label}>Descrição (jogadores leem)</span>
        <textarea
          className={`${field} h-14 py-1 resize-y`}
          value={d.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Baú de carvalho com ferragens de bronze…"
        />
      </label>

      <span className={label}>Quem tem</span>
      <div className="grid grid-cols-2 gap-1">
        {[
          [true, 'Do grupo'],
          [false, 'À venda'],
        ].map(([v, t]) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => set('owned', v as boolean)}
            aria-pressed={d.owned === v}
            data-testid={v ? 'owned-yes' : 'owned-no'}
            className={`h-8 text-xs border cursor-pointer ${
              d.owned === v ? 'border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-hi)]' : 'border-[var(--iron)] text-[var(--muted)]'
            }`}
          >
            {t as string}
          </button>
        ))}
      </div>
      {!d.owned && (
        <label className="flex flex-col gap-1">
          <span className={label}>Preço para comprar</span>
          <CoinInput value={d.price_bronze} onChange={(v) => set('price_bronze', v)} testid="storage-price-o" />
        </label>
      )}

      <span className={label}>Melhorias</span>
      <div className="grid grid-cols-3 gap-1.5">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[var(--muted)]">Nível atual</span>
          <input type="number" min={1} className={field} value={d.level} onChange={(e) => set('level', Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[var(--muted)]">Nível máx.</span>
          <input
            type="number"
            min={1}
            max={10}
            className={field}
            value={d.max_level}
            onChange={(e) => set('max_level', Number(e.target.value))}
            data-testid="storage-max-level"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[var(--muted)]">+ espaços</span>
          <input
            type="number"
            min={0}
            className={field}
            value={d.upgrade_slots}
            onChange={(e) => set('upgrade_slots', Number(e.target.value))}
          />
        </label>
      </div>
      {d.max_level > d.level && (
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-[var(--muted)]">Preço de cada melhoria</span>
          <CoinInput value={d.upgrade_price} onChange={(v) => set('upgrade_price', v)} />
        </label>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={!dirty}
          onClick={save}
          data-testid="storage-save"
          className="flex-1 h-9 border border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] text-sm font-['Cinzel',serif] tracking-[0.08em] cursor-pointer disabled:opacity-40 disabled:cursor-default active:translate-y-px"
        >
          Salvar
        </button>
        <button
          type="button"
          className={`${stoneBtn} !h-9 !border-[var(--blood)] !text-[#e0645a]`}
          onClick={() => {
            const msg = used
              ? `Apagar "${st.name}"? Os ${used} itens guardados nele somem junto.`
              : `Apagar "${st.name}"?`;
            if (window.confirm(msg)) {
              actions.deleteStorage.mutate(st.id);
              onClose();
            }
          }}
        >
          <Trash2 className="w-3.5 h-3.5" /> Apagar
        </button>
      </div>
      <p className="text-[11px] text-[var(--muted)] flex items-center gap-1">
        <MapPin className="w-3 h-3" /> Arraste no cenário para mudar de lugar.
      </p>
    </section>
  );
}

/** As tabelas da base ainda não existem: mostra o SQL para o Mestre rodar uma vez. */
function SetupNotice({ sql, title = 'Preparar a base (uma vez só)' }: { sql: string; title?: string }) {
  const qc = useQueryClient();
  return (
    <div className="absolute inset-0 overflow-y-auto p-6 flex justify-center font-[family-name:var(--body)]" data-testid="base-setup">
      <div className="max-w-2xl w-full flex flex-col gap-3">
        <h2 className="font-['Cinzel',serif] text-lg tracking-[0.14em] text-[var(--gold-hi)]">{title}</h2>
        <p className="text-[15px] text-[var(--text)] leading-relaxed">
          Isto precisa de tabelas novas no banco. Abra o <b>Supabase</b> do jogo, vá em <b>SQL Editor</b>, cole o texto abaixo e
          clique em <b>Run</b>. Depois volte aqui e clique em <b>Já rodei</b>.
        </p>
        <pre className="max-h-[50vh] overflow-auto p-3 text-[11px] leading-snug bg-[var(--abyss)] border border-[var(--iron)] text-[var(--muted)] whitespace-pre-wrap">
          {sql}
        </pre>
        <div className="flex gap-2">
          <button
            type="button"
            className={`${stoneBtn} !h-10 flex-1`}
            onClick={() =>
              navigator.clipboard
                .writeText(sql)
                .then(() => toast.success('SQL copiado.'))
                .catch(() => toast.error('Não deu para copiar; selecione o texto e copie.'))
            }
          >
            <Copy className="w-4 h-4" /> Copiar SQL
          </button>
          <button
            type="button"
            className="h-10 flex-1 flex items-center justify-center gap-1.5 border border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] text-sm cursor-pointer active:translate-y-px"
            onClick={() => void qc.invalidateQueries({ queryKey: ['base'] })}
          >
            Já rodei
          </button>
        </div>
      </div>
    </div>
  );
}

/** Materiais comuns de conserto (sugestões; o Mestre pode digitar qualquer nome). */
const COMMON_MATERIALS = ['Tábua', 'Prego', 'Corda', 'Lona', 'Piche', 'Barra de ferro', 'Pedra talhada', 'Argamassa', 'Couro', 'Tecido', 'Cola de osso', 'Ferramentas'];

function OutsidePanel({
  parts,
  minutes,
  missing,
  placing,
  setPlacing,
  selected,
  onSelect,
}: {
  parts: BasePart[];
  minutes: number;
  missing: boolean;
  placing: PartKind | null;
  setPlacing: (k: PartKind | null) => void;
  selected: BasePart | null;
  onSelect: (id: string | null) => void;
}) {
  if (missing) {
    return (
      <p className="m-3 p-3 border border-[var(--iron)] text-xs text-[var(--muted)]">
        Para usar o lado de fora, rode o SQL que aparece ao lado (uma vez só).
      </p>
    );
  }
  return (
    <>
      <section className="p-3 border-t border-[var(--iron)] flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 className={label}>Nova parte para manutenção</h3>
          {placing && (
            <button type="button" onClick={() => setPlacing(null)} className="text-[11px] text-[var(--muted)] underline cursor-pointer">
              cancelar (Esc)
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {PART_ORDER.map((k) => {
            const Icon = PART_KINDS[k].icon;
            const on = placing === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setPlacing(on ? null : k)}
                data-testid={`part-kind-${k}`}
                aria-pressed={on}
                className={`h-14 flex flex-col items-center justify-center gap-1 border text-[10px] cursor-pointer active:translate-y-px ${
                  on
                    ? 'border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-hi)]'
                    : 'border-[var(--iron)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--gold-lo)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {PART_KINDS[k].label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] italic text-[var(--muted)]">
          {placing
            ? `Clique na imagem de fora onde fica: ${PART_KINDS[placing].label.toLowerCase()}.`
            : 'Casco, velas, telhado, muro… Escolha e clique na imagem. Arraste para mudar de lugar.'}
        </p>
      </section>

      {selected ? (
        <PartEditor key={selected.id} part={selected} minutes={minutes} onClose={() => onSelect(null)} />
      ) : (
        <section className="p-3 border-t border-[var(--iron)] flex flex-col gap-1">
          <h3 className={`${label} mb-1`}>Partes ({parts.length})</h3>
          {parts.length === 0 && <p className="text-xs italic text-[var(--muted)]">Nenhuma ainda.</p>}
          {parts.map((p) => {
            const Icon = partKind(p.kind).icon;
            const h = currentCondition(p, minutes) / Math.max(1, p.max_condition);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                className="flex items-center gap-2 px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--stone-2)] cursor-pointer"
              >
                <Icon className="w-4 h-4 text-[var(--muted)] shrink-0" />
                <span className="flex-1 truncate">{p.name}</span>
                {p.hidden && <EyeOff className="w-3.5 h-3.5 text-[var(--muted)]" />}
                <span className="w-14 h-1.5 bg-[var(--abyss)] border border-[var(--iron)]">
                  <span className="block h-full origin-left" style={{ transform: `scaleX(${h})`, background: healthColor(h) }} />
                </span>
                <span className="w-9 text-right text-[11px] text-[var(--muted)] tabular-nums">{Math.round(h * 100)}%</span>
              </button>
            );
          })}
        </section>
      )}
    </>
  );
}

function PartEditor({ part, minutes, onClose }: { part: BasePart; minutes: number; onClose: () => void }) {
  const actions = useBaseActions();
  const { items } = useBase();
  const max0 = Math.max(1, part.max_condition || 100);
  const now = Math.round(currentCondition(part, minutes));
  const [d, setD] = useState(() => ({
    name: part.name,
    kind: part.kind,
    description: part.description ?? '',
    condition: now,
    max_condition: max0,
    wear_per_day: Number(part.wear_per_day) || 0,
    repair_amount: part.repair_amount || 0,
    needs: parseNeeds(part.repair_items),
  }));
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const h = d.condition / Math.max(1, d.max_condition);
  const suggestions = useMemo(() => {
    const names = new Set(COMMON_MATERIALS);
    for (const it of items) names.add(String(it.item.name ?? ''));
    return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [items]);

  /** Grava sempre a partir de agora: o desgaste recomeça a contar com os valores novos. */
  const save = (over?: Partial<typeof d>) => {
    const v = { ...d, ...over };
    const max = Math.max(1, Math.round(v.max_condition) || 100);
    actions.updatePart.mutate({
      id: part.id,
      patch: {
        name: v.name.trim() || partKind(v.kind).label,
        kind: v.kind,
        description: v.description.trim() || null,
        condition: Math.min(max, Math.max(0, v.condition)),
        max_condition: max,
        wear_per_day: Math.max(0, v.wear_per_day),
        cond_minutes: Math.floor(minutes),
        repair_amount: Math.max(0, Math.round(v.repair_amount)),
        repair_items: v.needs.filter((n) => n.name.trim()).map((n) => ({ name: n.name.trim(), qty: Math.max(1, Math.round(n.qty) || 1) })),
      },
    });
    if (over) setD(v);
    toast.success('Parte salva.');
  };

  const setNeed = (i: number, patch: Partial<RepairNeed>) =>
    set('needs', d.needs.map((n, j) => (j === i ? { ...n, ...patch } : n)));

  return (
    <section className="p-3 border-t border-[var(--gold-lo)] bg-[var(--stone-2)] flex flex-col gap-2" data-testid="part-editor">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 font-['Cinzel',serif] text-sm text-[var(--gold-hi)] truncate">{part.name}</h3>
        <button
          type="button"
          className={`${stoneBtn} !h-7 ${part.hidden ? '!text-[var(--muted)]' : ''}`}
          onClick={() => actions.updatePart.mutate({ id: part.id, patch: { hidden: !part.hidden } })}
        >
          {part.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {part.hidden ? 'Escondida' : 'Visível'}
        </button>
        <button type="button" onClick={onClose} aria-label="Fechar" className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className={label}>Nome</span>
          <input className={field} value={d.name} onChange={(e) => set('name', e.target.value)} data-testid="part-name" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Tipo</span>
          <select className={field} value={d.kind} onChange={(e) => set('kind', e.target.value)}>
            {PART_ORDER.map((k) => (
              <option key={k} value={k}>
                {PART_KINDS[k].label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className={label}>Descrição (jogadores leem)</span>
        <textarea
          className={`${field} h-12 py-1 resize-y`}
          value={d.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Tábuas do casco a bombordo, roídas pelo sal…"
        />
      </label>

      {/* Estado */}
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <span className={label}>Estado agora</span>
          <span className="text-xs tabular-nums" style={{ color: healthColor(h) }}>
            {conditionLabel(h)} · {Math.round(h * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={d.max_condition}
          value={d.condition}
          onChange={(e) => set('condition', Number(e.target.value))}
          className="w-full accent-[var(--gold)]"
          data-testid="part-condition"
          aria-label="Estado"
        />
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className={stoneBtn} onClick={() => save({ condition: d.max_condition })}>
            Restaurar tudo
          </button>
          <button type="button" className={stoneBtn} onClick={() => save({ condition: Math.max(0, d.condition - Math.round(d.max_condition / 4)) })}>
            Danificar −25%
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[var(--muted)]">Desgaste/dia</span>
          <input
            type="number"
            min={0}
            step={0.5}
            className={field}
            value={d.wear_per_day}
            onChange={(e) => set('wear_per_day', Number(e.target.value))}
            data-testid="part-wear"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[var(--muted)]">Estado máx.</span>
          <input type="number" min={1} className={field} value={d.max_condition} onChange={(e) => set('max_condition', Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[var(--muted)]">Conserto dá</span>
          <input
            type="number"
            min={0}
            className={field}
            value={d.repair_amount}
            onChange={(e) => set('repair_amount', Number(e.target.value))}
            title="Quanto cada conserto devolve. 0 = restaura tudo."
          />
        </label>
      </div>
      <p className="text-[10px] text-[var(--muted)] -mt-1">
        Desgaste 0 = não se desgasta. Conserto 0 = volta ao máximo. O tempo é o do relógio do mundo.
      </p>

      {/* Materiais */}
      <span className={label}>Itens para consertar</span>
      <datalist id="repair-materials">
        {suggestions.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <div className="flex flex-col gap-1" data-testid="part-needs">
        {d.needs.map((n, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: linhas editáveis sem id
          <div key={i} className="flex gap-1">
            <input
              className={field}
              list="repair-materials"
              value={n.name}
              placeholder="Tábua, Corda, Piche…"
              onChange={(e) => setNeed(i, { name: e.target.value })}
              data-testid={`need-name-${i}`}
            />
            <input
              type="number"
              min={1}
              className={`${field} !w-16`}
              value={n.qty}
              onChange={(e) => setNeed(i, { qty: Number(e.target.value) })}
              data-testid={`need-qty-${i}`}
              aria-label="Quantidade"
            />
            <button
              type="button"
              className={`${stoneBtn} !px-2`}
              aria-label="Tirar material"
              onClick={() => set('needs', d.needs.filter((_, j) => j !== i))}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button type="button" className={stoneBtn} onClick={() => set('needs', [...d.needs, { name: '', qty: 1 }])} data-testid="btn-add-need">
          + Material
        </button>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => save()}
          data-testid="part-save"
          className="flex-1 h-9 border border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] text-sm font-['Cinzel',serif] tracking-[0.08em] cursor-pointer active:translate-y-px"
        >
          Salvar
        </button>
        <button
          type="button"
          className={`${stoneBtn} !h-9 !border-[var(--blood)] !text-[#e0645a]`}
          onClick={() => {
            if (window.confirm(`Apagar "${part.name}"?`)) {
              actions.deletePart.mutate(part.id);
              onClose();
            }
          }}
        >
          <Trash2 className="w-3.5 h-3.5" /> Apagar
        </button>
      </div>
      {part.last_repaired_by && <p className="text-[11px] text-[var(--muted)]">Último conserto: {part.last_repaired_by}.</p>}
    </section>
  );
}
