import { Crosshair, Eraser, Eye, EyeOff, Flame, MapPin, Search, Sparkles, Trash2, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { FX_BY_ID, FX_CATS, FX_LIST, type FxCat } from '../../../../vendor/pixelfx';
import { type FxView, fxUrl, parseSpecial } from '../../engine/FxSprite';
import type { BattleEditorTool, BattleToken } from '../../engine/types';
import { FxCanvas } from '../FxCanvas';
import { IconButton, RangeField, Section, TextButton, inputClass } from './BattleUI';

export interface FxPlacement {
  id: string;
  /** 'fixo': fica na mesa tocando · 'uma': toca uma vez para todos e some. */
  mode: 'fixo' | 'uma';
  scale: number;
  /** Efeitos que não repetem sozinhos: pausa entre uma vez e outra (s). */
  every: number;
  /** Perspectiva: automática (segue a grade da mesa), isométrica ou reta. */
  view: FxView | 'auto';
}

const VIEWS: Array<[FxView | 'auto', string]> = [
  ['auto', 'Automática'],
  ['iso', 'Isométrica'],
  ['reta', 'Reta'],
];

function ViewPicker({ value, onChange, gridView }: { value: FxView | 'auto'; onChange: (v: FxView | 'auto') => void; gridView: FxView }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[var(--muted)]">Perspectiva</span>
      <div className="grid grid-cols-3 gap-1">
        {VIEWS.map(([k, t]) => (
          <button
            key={k}
            type="button"
            aria-pressed={value === k}
            onClick={() => onChange(k)}
            data-testid={`fx-view-${k}`}
            title={k === 'auto' ? `Segue a grade desta mesa (${gridView === 'iso' ? 'isométrica' : 'reta'})` : undefined}
            className={`h-7 text-[11px] border cursor-pointer ${
              value === k ? 'border-[var(--gold)] text-[var(--gold-hi)] bg-[var(--gold)]/10' : 'border-[var(--iron)] text-[var(--muted)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EffectsPanel({
  tokens,
  selectedId,
  placing,
  onPlace,
  onCancel,
  onSelect,
  onPatch,
  onRemove,
  onCenter,
  gridView,
  tool,
  onTool,
  fireCount,
  onClearFire,
}: {
  /** Perspectiva da grade desta mesa (o que "Automática" usa). */
  gridView: FxView;
  /** Pincel de incêndio: ferramenta atual do mapa e como trocá-la. */
  tool: BattleEditorTool;
  onTool: (t: BattleEditorTool) => void;
  fireCount: number;
  onClearFire: () => void;
  tokens: BattleToken[];
  selectedId: string | null;
  placing: FxPlacement | null;
  /** Começa a pôr: o próximo clique no mapa decide a casa. */
  onPlace: (p: FxPlacement) => void;
  onCancel: () => void;
  onSelect: (id: string) => void;
  onPatch: (id: string, patch: Partial<BattleToken>) => void;
  onRemove: (id: string) => void;
  onCenter: (id: string) => void;
}) {
  const [cat, setCat] = useState<FxCat>('fire');
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query.trim().toLowerCase());
  const [fxId, setFxId] = useState<string>('fire/campfire');
  const [mode, setMode] = useState<FxPlacement['mode']>('fixo');
  const [scale, setScale] = useState(1);
  const [every, setEvery] = useState(2);
  const [view, setView] = useState<FxView | 'auto'>('auto');
  const info = FX_BY_ID.get(fxId);
  const shownView = view === 'auto' ? gridView : view;

  const list = useMemo(
    () => (q ? FX_LIST.filter((f) => f.nome.toLowerCase().includes(q)) : FX_LIST.filter((f) => f.cat === cat)),
    [cat, q],
  );
  const placed = useMemo(() => tokens.filter((t) => parseSpecial(t.media_url)?.kind === 'fx'), [tokens]);
  const sel = placed.find((t) => t.id === selectedId) ?? null;
  const selSpec = sel ? parseSpecial(sel.media_url) : null;

  return (
    <div className="flex flex-col gap-4" data-testid="effects-panel">
      <Section title="Incêndio">
        <div className="flex justify-center bg-[var(--abyss)] border border-[var(--iron)] py-1">
          <FxCanvas id="fire/incendio" mode="loop" view={gridView} className="h-[84px] w-auto" />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <TextButton
            variant={tool === 'paint_fire' ? 'gold' : 'stone'}
            icon={Flame}
            onClick={() => onTool(tool === 'paint_fire' ? 'select' : 'paint_fire')}
            testId="btn-paint-fire"
          >
            {tool === 'paint_fire' ? 'Pintando…' : 'Pintar fogo'}
          </TextButton>
          <TextButton
            variant={tool === 'erase_fire' ? 'gold' : 'stone'}
            icon={Eraser}
            onClick={() => onTool(tool === 'erase_fire' ? 'select' : 'erase_fire')}
            testId="btn-erase-fire"
          >
            {tool === 'erase_fire' ? 'Apagando…' : 'Apagar fogo'}
          </TextButton>
        </div>
        <p className="text-[11px] text-[var(--muted)]">
          {tool === 'paint_fire' || tool === 'erase_fire'
            ? 'Clique ou arraste sobre as casas do mapa. Esc para sair do pincel.'
            : `Casas vizinhas se unem numa chama só. Segue a grade desta mesa (${gridView === 'iso' ? 'isométrica' : 'reta'}).`}
        </p>
        {fireCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text)] tabular-nums">
              {fireCount} {fireCount === 1 ? 'casa em chamas' : 'casas em chamas'}
            </span>
            <TextButton variant="danger" icon={Trash2} onClick={onClearFire} testId="btn-clear-fire">
              Apagar tudo
            </TextButton>
          </div>
        )}
      </Section>

      <Section title="Efeitos">
        <label className="relative block">
          <Search className="absolute left-2 top-2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
          <input className={`${inputClass} pl-7`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procurar efeito…" />
        </label>
        {!q && (
          <div className="flex flex-wrap gap-1">
            {FX_CATS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                aria-pressed={cat === c.id}
                className={`h-7 px-2 border text-[11px] cursor-pointer ${
                  cat === c.id ? 'border-[var(--gold)] text-[var(--gold-hi)] bg-[var(--gold)]/10' : 'border-[var(--iron)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        )}
        <ul className="max-h-48 overflow-y-auto border border-[var(--iron)] divide-y divide-[var(--iron)]" data-testid="fx-list">
          {list.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setFxId(f.id)}
                data-testid={`fx-${f.id}`}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm cursor-pointer ${
                  fxId === f.id ? 'bg-[var(--gold)]/12 text-[var(--gold-hi)]' : 'text-[var(--text)] hover:bg-[var(--stone-2)]'
                }`}
              >
                <span className="flex-1 truncate">{f.nome}</span>
                {f.persp && (
                  <span className="text-[9px] px-1 border border-[var(--iron)] text-[var(--muted)]" title="Tem versão isométrica e reta">
                    2 vistas
                  </span>
                )}
                <span className="text-[10px] text-[var(--muted)]">{f.loop ? 'contínuo' : `${f.dur}s`}</span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      {info && (
        <Section title={info.nome}>
          <div className="flex justify-center bg-[var(--abyss)] border border-[var(--iron)] py-2">
            <FxCanvas key={`${fxId}-${shownView}`} id={fxId} mode="loop" every={info.loop ? 0 : 0.6} view={shownView} className="max-w-full h-[120px] w-auto" />
          </div>
          <div className="grid grid-cols-2 gap-1">
            {(
              [
                ['fixo', 'Fixo no mapa'],
                ['uma', 'Uma vez agora'],
              ] as const
            ).map(([k, t]) => (
              <button
                key={k}
                type="button"
                aria-pressed={mode === k}
                onClick={() => setMode(k)}
                data-testid={`fx-mode-${k}`}
                className={`h-8 text-xs border cursor-pointer ${
                  mode === k ? 'border-[var(--gold)] text-[var(--gold-hi)] bg-[var(--gold)]/10' : 'border-[var(--iron)] text-[var(--muted)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[var(--muted)]">
            {mode === 'fixo'
              ? info.loop
                ? 'Fica tocando sem parar até você tirar.'
                : 'Fica no mapa e se repete sozinho.'
              : 'Toca uma vez para todos (mesa, TV e jogadores) e some.'}
          </p>
          <RangeField label="Tamanho" value={scale} min={0.5} max={4} step={0.25} unit="×" onChange={setScale} />
          <ViewPicker value={view} onChange={setView} gridView={gridView} />
          {!info.persp && (
            <p className="text-[11px] text-[var(--muted)]">Este efeito fica em pé: é igual nas duas perspectivas.</p>
          )}
          {mode === 'fixo' && !info.loop && (
            <RangeField label="Pausa entre repetições" value={every} min={0} max={20} step={1} unit="s" onChange={setEvery} />
          )}
          {placing ? (
            <div className="flex items-center gap-2 p-2 border border-[var(--gold)] bg-[var(--gold)]/10 text-xs text-[var(--gold-hi)]">
              <Crosshair className="w-4 h-4 shrink-0" />
              <span className="flex-1">Clique no mapa onde o efeito vai {placing.mode === 'fixo' ? 'ficar' : 'acontecer'}.</span>
              <IconButton size="sm" icon={X} label="Cancelar (Esc)" onClick={onCancel} />
            </div>
          ) : (
            <TextButton
              variant="gold"
              icon={Sparkles}
              onClick={() => onPlace({ id: fxId, mode, scale, every: info.loop ? 0 : every, view })}
              testId="btn-place-fx"
            >
              {mode === 'fixo' ? 'Pôr no mapa' : 'Escolher onde tocar'}
            </TextButton>
          )}
        </Section>
      )}

      {sel && selSpec?.kind === 'fx' && (
        <Section title="Efeito selecionado">
          <div className="flex flex-col gap-2 border border-[var(--gold-lo)] bg-[var(--stone)] p-3">
            <p className="text-sm text-[var(--gold-hi)]">{FX_BY_ID.get(selSpec.id)?.nome ?? selSpec.id}</p>
            <RangeField
              label="Tamanho"
              value={selSpec.scale}
              min={0.5}
              max={4}
              step={0.25}
              unit="×"
              onChange={(v) => onPatch(sel.id, { media_url: fxUrl(selSpec.id, { ...selSpec, scale: v }) })}
            />
            <ViewPicker
              value={selSpec.view}
              gridView={gridView}
              onChange={(v) => onPatch(sel.id, { media_url: fxUrl(selSpec.id, { ...selSpec, view: v }) })}
            />
            <div className="grid grid-cols-3 gap-1.5">
              <IconButton
                icon={sel.visible === false ? EyeOff : Eye}
                label={sel.visible === false ? 'Mostrar aos jogadores' : 'Esconder dos jogadores'}
                active={sel.visible === false}
                onClick={() => onPatch(sel.id, { visible: sel.visible === false })}
              />
              <IconButton icon={Crosshair} label="Centralizar" onClick={() => onCenter(sel.id)} />
              <IconButton icon={Trash2} label="Tirar efeito" danger onClick={() => onRemove(sel.id)} />
            </div>
            <p className="text-[11px] text-[var(--muted)]">Arraste no mapa para mudar de lugar.</p>
          </div>
        </Section>
      )}

      <Section title={`No mapa (${placed.length})`}>
        {placed.length === 0 && <p className="text-xs italic text-[var(--muted)]">Nenhum efeito fixo.</p>}
        <ul className="flex flex-col">
          {placed.map((t) => {
            const sp = parseSpecial(t.media_url);
            const nome = sp?.kind === 'fx' ? (FX_BY_ID.get(sp.id)?.nome ?? sp.id) : t.name;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm cursor-pointer hover:bg-[var(--stone-2)] ${
                    selectedId === t.id ? 'text-[var(--gold-hi)] bg-[var(--stone-2)]' : 'text-[var(--text)]'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span className="flex-1 truncate">{nome}</span>
                  {t.visible === false && <EyeOff className="w-3.5 h-3.5 text-[var(--muted)]" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
