import {
  ArrowDown,
  ArrowUp,
  Copy,
  Crosshair,
  Eye,
  EyeOff,
  FlipHorizontal,
  ImageIcon,
  Loader2,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shield,
  SkipBack,
  SkipForward,
  Skull,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchCreatureCatalog } from '../../api/battleApi.ts';
import type { GridMode } from '../../engine/IsometricGrid.ts';
import { readMapSettings, writeMapSettings } from '../../engine/mapSettings.ts';
import type { BattleMap, BattleToken, HeroVital } from '../../engine/types.ts';
import { IconButton, RangeField, Section, TextButton, Toggle, inputClass, kindColor } from './BattleUI.tsx';

// ───────────────────────── Peças ─────────────────────────

interface HeroOption {
  id: string;
  name: string | null;
}

export interface PiecesPanelProps {
  tokens: BattleToken[];
  selectedToken: BattleToken | null;
  activeTokenId: string | null;
  heroes: HeroOption[];
  vitals: Record<string, HeroVital>;
  moveLimit: number;
  onSelect: (id: string) => void;
  onPatch: (id: string, patch: Partial<BattleToken>) => void;
  onRemove: (id: string) => void;
  onCenter: (id: string) => void;
  onAddHero: (hero: HeroOption) => void;
  onAddBeast: (beast: { id: string; name: string; image_url?: string | null }, qty: number) => void;
  onEditMedia: (token: BattleToken) => void;
}

export function PiecesPanel(props: PiecesPanelProps) {
  const { tokens, selectedToken, activeTokenId, vitals, onSelect, onCenter } = props;
  const [adding, setAdding] = useState<null | 'heroi' | 'fera'>(null);
  const [filter, setFilter] = useState('');

  const term = filter.trim().toLowerCase();
  const list = term ? tokens.filter((t) => t.name.toLowerCase().includes(term)) : tokens;

  return (
    <div className="flex flex-col gap-5">
      <Section title="Adicionar">
        <div className="grid grid-cols-2 gap-2">
          <TextButton icon={Shield} onClick={() => setAdding(adding === 'heroi' ? null : 'heroi')}>
            Herói
          </TextButton>
          <TextButton icon={Skull} onClick={() => setAdding(adding === 'fera' ? null : 'fera')}>
            Fera
          </TextButton>
        </div>
        {adding === 'heroi' && (
          <HeroPicker
            heroes={props.heroes}
            tokens={tokens}
            onPick={(h) => {
              props.onAddHero(h);
              setAdding(null);
            }}
          />
        )}
        {adding === 'fera' && (
          <BeastPicker
            onPick={(b, qty) => {
              props.onAddBeast(b, qty);
              setAdding(null);
            }}
          />
        )}
      </Section>

      {selectedToken && (
        <SelectedTokenEditor
          key={selectedToken.id}
          token={selectedToken}
          moveLimit={props.moveLimit}
          onPatch={(patch) => props.onPatch(selectedToken.id, patch)}
          onRemove={() => props.onRemove(selectedToken.id)}
          onCenter={() => onCenter(selectedToken.id)}
          onEditMedia={() => props.onEditMedia(selectedToken)}
        />
      )}

      <Section
        title={`Na mesa (${tokens.length})`}
        action={
          tokens.length > 6 ? (
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar…"
              className="h-6 w-28 px-2 text-xs rounded-none border border-[var(--iron)] bg-[var(--abyss)]"
            />
          ) : null
        }
      >
        {list.length === 0 ? (
          <p className="text-xs italic text-[var(--muted)] py-3 text-center border border-dashed border-[var(--iron)]">
            Nenhuma peça. Adicione um herói ou uma fera.
          </p>
        ) : (
          <ul className="flex flex-col">
            {list.map((t) => {
              const vital = t.hero_id ? vitals[t.hero_id] : undefined;
              const selected = selectedToken?.id === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(t.id)}
                    onDoubleClick={() => onCenter(t.id)}
                    className={`w-full flex items-center gap-2 h-9 px-2 text-left text-sm border-l-2 cursor-pointer ${
                      selected
                        ? 'border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold-hi)]'
                        : 'border-transparent text-[var(--text)] hover:bg-black/30'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rotate-45 shrink-0"
                      style={{ background: kindColor(t.kind, t.id === activeTokenId) }}
                    />
                    <span className={`flex-1 truncate ${t.visible === false ? 'opacity-50 italic' : ''}`}>
                      {t.name}
                    </span>
                    {vital && (
                      <span className="text-[11px] tabular-nums text-[var(--muted)]">
                        {vital.hp}/{vital.maxHp}
                      </span>
                    )}
                    {t.visible === false && <EyeOff className="w-3.5 h-3.5 text-[var(--muted)]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function HeroPicker({
  heroes,
  tokens,
  onPick,
}: {
  heroes: HeroOption[];
  tokens: BattleToken[];
  onPick: (h: HeroOption) => void;
}) {
  const onTable = new Set(tokens.map((t) => t.hero_id).filter(Boolean));
  if (heroes.length === 0) {
    return <p className="text-xs italic text-[var(--muted)]">Nenhum herói cadastrado.</p>;
  }
  return (
    <ul className="flex flex-col border border-[var(--iron)] bg-[var(--abyss)]">
      {heroes.map((h) => {
        const already = onTable.has(h.id);
        return (
          <li key={h.id}>
            <button
              type="button"
              disabled={already}
              onClick={() => onPick(h)}
              className="w-full flex items-center justify-between h-9 px-3 text-sm text-left cursor-pointer hover:bg-[var(--gold)]/10 disabled:cursor-default disabled:opacity-50"
            >
              <span className="truncate">{h.name || h.id}</span>
              <span className="text-[11px] text-[var(--muted)]">{already ? 'na mesa' : 'posicionar'}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function BeastPicker({
  onPick,
}: {
  onPick: (b: { id: string; name: string; image_url?: string | null }, qty: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [qty, setQty] = useState(1);
  const [results, setResults] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      setLoading(true);
      fetchCreatureCatalog(search, 20)
        .then((r) => alive && setResults(r))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [search]);

  return (
    <div className="flex flex-col gap-2 border border-[var(--iron)] bg-[var(--abyss)] p-2">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <Search className="absolute left-2 top-2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar no bestiário…"
            className={`${inputClass} pl-8`}
          />
        </label>
        <div className="flex items-center border border-[var(--iron)]">
          <button type="button" className="w-6 h-8 cursor-pointer" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos">
            <Minus className="w-3 h-3 mx-auto" />
          </button>
          <span className="w-6 text-center text-sm tabular-nums">{qty}</span>
          <button type="button" className="w-6 h-8 cursor-pointer" onClick={() => setQty((q) => Math.min(12, q + 1))} aria-label="Mais">
            <Plus className="w-3 h-3 mx-auto" />
          </button>
        </div>
      </div>
      <ul className="max-h-56 overflow-y-auto flex flex-col">
        {loading ? (
          <li className="flex items-center justify-center gap-2 py-4 text-xs text-[var(--muted)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Buscando…
          </li>
        ) : results.length === 0 ? (
          <li className="py-4 text-center text-xs italic text-[var(--muted)]">Nada encontrado.</li>
        ) : (
          results.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onPick({ id: b.id, name: b.name, image_url: b.image_url }, qty)}
                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left cursor-pointer hover:bg-[var(--blood)]/15"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm">{b.name}</span>
                  <span className="block text-[11px] text-[var(--muted)]">
                    {b.category || b.species || 'Criatura'} · Ameaça {b.threat ?? 1}
                  </span>
                </span>
                <span className="text-[11px] text-[#e0645a] shrink-0">+{qty}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function SelectedTokenEditor({
  token,
  moveLimit,
  onPatch,
  onRemove,
  onCenter,
  onEditMedia,
}: {
  token: BattleToken;
  moveLimit: number;
  onPatch: (p: Partial<BattleToken>) => void;
  onRemove: () => void;
  onCenter: () => void;
  onEditMedia: () => void;
}) {
  const [name, setName] = useState(token.name);
  const moves = token.moves_left ?? moveLimit;
  const hidden = token.visible === false;

  return (
    <Section title="Peça selecionada">
      <div className="flex flex-col gap-3 border border-[var(--gold-lo)] bg-[var(--stone)] p-3">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== token.name && onPatch({ name: name.trim() })}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className={inputClass}
            aria-label="Nome da peça"
          />
          <IconButton icon={Crosshair} label="Centralizar" shortcut="F" onClick={onCenter} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--muted)]">Passos</span>
          <div className="flex items-center gap-1">
            <IconButton size="sm" icon={Minus} label="Menos passos" onClick={() => onPatch({ moves_left: Math.max(0, moves - 1) })} />
            <span className="w-12 text-center text-sm tabular-nums text-[var(--gold-hi)]">
              {moves}/{moveLimit}
            </span>
            <IconButton size="sm" icon={Plus} label="Mais passos" onClick={() => onPatch({ moves_left: Math.min(moveLimit, moves + 1) })} />
            <IconButton size="sm" icon={RotateCcw} label="Restaurar passos" onClick={() => onPatch({ moves_left: moveLimit })} />
          </div>
        </div>

        <RangeField
          label="Tamanho"
          value={token.size ?? 160}
          min={60}
          max={320}
          step={2}
          unit="px"
          onChange={(v) => onPatch({ size: v })}
        />

        <div className="grid grid-cols-4 gap-1.5">
          <IconButton
            icon={hidden ? EyeOff : Eye}
            label={hidden ? 'Mostrar aos jogadores' : 'Ocultar dos jogadores'}
            shortcut="O"
            active={hidden}
            onClick={() => onPatch({ visible: hidden })}
          />
          <IconButton icon={FlipHorizontal} label="Virar" onClick={() => onPatch({ facing: (token.facing ?? 1) * -1 })} />
          <IconButton icon={ImageIcon} label="Mídia e croma" onClick={onEditMedia} testId="btn-open-media-modal" />
          <IconButton icon={Trash2} label="Remover peça" shortcut="Del" danger onClick={onRemove} />
        </div>
      </div>
    </Section>
  );
}

// ───────────────────────── Turno ─────────────────────────

export interface TurnPanelProps {
  order: BattleToken[];
  activeIdx: number;
  round: number;
  moveLimit: number;
  onSetActive: (idx: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onNewRound: () => void;
  onReorder: (from: number, to: number) => void;
  onPatch: (id: string, patch: Partial<BattleToken>) => void;
}

export function TurnPanel({
  order,
  activeIdx,
  round,
  moveLimit,
  onSetActive,
  onNext,
  onPrev,
  onNewRound,
  onReorder,
  onPatch,
}: TurnPanelProps) {
  const active = order[activeIdx] ?? null;
  return (
    <div className="flex flex-col gap-5">
      <Section title={`Rodada ${round}`}>
        <div className="border border-[var(--gold-lo)] bg-[var(--stone)] p-3 flex flex-col gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] font-['Cinzel',serif]">
              Turno de
            </p>
            <p className="font-['Cinzel',serif] text-base text-[var(--gold-hi)] truncate">
              {active?.name ?? '—'}
            </p>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <IconButton icon={SkipBack} label="Turno anterior" onClick={onPrev} disabled={order.length === 0} />
            <TextButton variant="gold" icon={SkipForward} onClick={onNext} disabled={order.length === 0}>
              Próximo turno <kbd className="opacity-60 text-[10px]">Espaço</kbd>
            </TextButton>
          </div>
          <TextButton icon={RotateCcw} onClick={onNewRound}>
            Nova rodada (restaura passos)
          </TextButton>
        </div>
      </Section>

      <Section title="Ordem">
        {order.length === 0 ? (
          <p className="text-xs italic text-[var(--muted)] py-3 text-center border border-dashed border-[var(--iron)]">
            Sem combatentes na mesa.
          </p>
        ) : (
          <ol className="flex flex-col">
            {order.map((t, i) => {
              const isActive = i === activeIdx;
              const moves = t.moves_left ?? moveLimit;
              return (
                <li
                  key={t.id}
                  className={`flex items-center gap-1 h-10 pl-2 border-l-2 ${
                    isActive ? 'border-[var(--gold)] bg-[var(--gold)]/10' : 'border-transparent'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSetActive(i)}
                    className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer"
                  >
                    <span className="w-5 text-right text-[11px] tabular-nums text-[var(--muted)]">{i + 1}</span>
                    <span
                      className="w-2 h-2 rotate-45 shrink-0"
                      style={{ background: kindColor(t.kind, isActive) }}
                    />
                    <span className={`truncate text-sm ${isActive ? 'text-[var(--gold-hi)]' : ''}`}>{t.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onPatch(t.id, { moves_left: moves > 0 ? moves - 1 : moveLimit })}
                    className="px-1.5 text-[11px] tabular-nums text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                    title="Passos restantes (clique para gastar 1)"
                  >
                    {moves}p
                  </button>
                  <IconButton size="sm" icon={ArrowUp} label="Subir" disabled={i === 0} onClick={() => onReorder(i, i - 1)} />
                  <IconButton
                    size="sm"
                    icon={ArrowDown}
                    label="Descer"
                    disabled={i === order.length - 1}
                    onClick={() => onReorder(i, i + 1)}
                  />
                </li>
              );
            })}
          </ol>
        )}
      </Section>
    </div>
  );
}

// ───────────────────────── Mesa ─────────────────────────

export interface TablePanelProps {
  map: BattleMap;
  maps: BattleMap[];
  isUploading: boolean;
  /** Texto do progresso do envio (ex.: "Otimizando o vídeo… 40%"). */
  uploadStatus?: string | null;
  onGridMode: (mode: GridMode) => void;
  onSelectMap: (id: string) => void;
  onCreate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onPatch: (patch: Partial<BattleMap>) => void;
  onUpload: (file: File) => void;
}

const BG_PRESETS = [
  { name: 'Santuário', url: '/batalha/santuario.jpg' },
  { name: 'Pergaminho', url: '/parchment-bg.jpg' },
];

export function TablePanel({
  map,
  maps,
  isUploading,
  uploadStatus,
  onGridMode,
  onSelectMap,
  onCreate,
  onDuplicate,
  onDelete,
  onRename,
  onPatch,
  onUpload,
}: TablePanelProps) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(map.name);
  useEffect(() => setName(map.name), [map.name]);
  const blockedCount = Array.isArray(map.blocked) ? map.blocked.length : 0;
  const settings = readMapSettings(map.background_url);

  return (
    <div className="flex flex-col gap-5">
      <Section title="Mesa">
        {renaming ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  onRename(name.trim());
                  setRenaming(false);
                }
                if (e.key === 'Escape') setRenaming(false);
              }}
              className={inputClass}
              aria-label="Nome da mesa"
            />
            <IconButton icon={X} label="Cancelar" onClick={() => setRenaming(false)} />
          </div>
        ) : (
          <select
            value={map.id}
            onChange={(e) => onSelectMap(e.target.value)}
            className={inputClass}
            aria-label="Mesa atual"
          >
            {maps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.status === 'ao_vivo' ? '● ' : ''}
                {m.name}
              </option>
            ))}
          </select>
        )}
        <div className="grid grid-cols-4 gap-1.5">
          <IconButton icon={Plus} label="Nova mesa" onClick={onCreate} />
          <IconButton icon={Copy} label="Duplicar mesa" onClick={onDuplicate} />
          <IconButton icon={Pencil} label="Renomear" onClick={() => setRenaming(true)} />
          <IconButton icon={Trash2} label="Excluir mesa" danger onClick={onDelete} disabled={maps.length <= 1} />
        </div>
      </Section>

      <Section title={settings.isVideo ? 'Fundo · vídeo em loop' : 'Fundo'}>
        <label
          className={`min-h-9 py-1.5 px-2 flex items-center justify-center gap-2 border border-dashed border-[var(--gold-lo)] text-xs text-center text-[var(--gold-hi)] cursor-pointer hover:bg-[var(--gold)]/10 ${
            isUploading ? 'opacity-80 pointer-events-none' : ''
          }`}
        >
          {isUploading ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <Upload className="w-4 h-4 shrink-0" />}
          {isUploading ? uploadStatus || 'Otimizando…' : 'Enviar imagem ou vídeo'}
          <input
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            className="hidden"
            data-testid="bg-upload-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
        </label>
        <p className="text-[11px] italic text-[var(--muted)]">
          Imagem: WebP até 2048 px. Vídeo: toca em loop, mudo; é otimizado antes de enviar (H.264, até 1920 px e 30 fps, sem perda
          visível).
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {BG_PRESETS.map((p) => (
            <TextButton
              key={p.url}
              onClick={() => onPatch({ background_url: writeMapSettings(p.url, { grid: settings.grid }) })}
              className={settings.url === p.url ? '!border-[var(--gold)] !text-[var(--gold-hi)]' : ''}
            >
              {p.name}
            </TextButton>
          ))}
        </div>
      </Section>

      <Section title="Grade">
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Tipo de grade">
          {(
            [
              { id: 'iso', label: 'Isométrica' },
              { id: 'square', label: 'De cima' },
            ] as const
          ).map((g) => {
            const on = settings.grid === g.id;
            return (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={on}
                data-testid={`grid-mode-${g.id}`}
                onClick={() => !on && onGridMode(g.id)}
                className={`flex flex-col items-center gap-1 py-2 border cursor-pointer ${
                  on ? 'border-[var(--gold)] bg-[var(--gold)]/12 text-[var(--gold-hi)]' : 'border-[var(--iron)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <GridGlyph mode={g.id} />
                <span className="text-xs">{g.label}</span>
              </button>
            );
          })}
        </div>
        <Toggle label="Mostrar grade" checked={map.show_grid !== false} onChange={(v) => onPatch({ show_grid: v })} />
        <RangeField
          label="Tamanho do quadrado"
          value={map.tile_size ?? 86}
          min={40}
          max={160}
          step={2}
          unit="px"
          onChange={(v) => onPatch({ tile_size: v })}
        />
        <RangeField
          label="Origem X"
          value={map.origin_x ?? 690}
          min={0}
          max={map.img_w ?? 1376}
          onChange={(v) => onPatch({ origin_x: v })}
        />
        <RangeField
          label="Origem Y"
          value={map.origin_y ?? 418}
          min={0}
          max={map.img_h ?? 768}
          onChange={(v) => onPatch({ origin_y: v })}
        />
        <RangeField
          label="Passos por rodada"
          value={map.move_limit ?? 6}
          min={1}
          max={12}
          onChange={(v) => onPatch({ move_limit: v })}
        />
      </Section>

      <Section title={`Terreno bloqueado (${blockedCount})`}>
        <p className="text-xs italic text-[var(--muted)]">
          Use as ferramentas <b>Pintar</b> (B) e <b>Apagar</b> (E) sobre o mapa.
        </p>
        <TextButton
          variant="danger"
          icon={Sparkles}
          disabled={blockedCount === 0}
          onClick={() => {
            if (window.confirm('Limpar todo o terreno bloqueado desta mesa?')) onPatch({ blocked: [] });
          }}
        >
          Limpar bloqueios
        </TextButton>
      </Section>
    </div>
  );
}

/** Miniatura do tipo de grade (losangos ou quadrados). */
function GridGlyph({ mode }: { mode: GridMode }) {
  return (
    <svg viewBox="0 0 48 28" width="48" height="28" aria-hidden="true">
      {mode === 'iso'
        ? [0, 1, 2].flatMap((c) =>
            [0, 1].map((r) => {
              const x = 24 + (c - r) * 8 - 8;
              const y = 6 + (c + r) * 4;
              return (
                <path key={`${c}${r}`} d={`M${x} ${y - 4} L${x + 8} ${y} L${x} ${y + 4} L${x - 8} ${y} Z`} fill="none" stroke="currentColor" strokeWidth="1" />
              );
            }),
          )
        : [0, 1, 2, 3].flatMap((c) =>
            [0, 1].map((r) => (
              <rect key={`${c}${r}`} x={8 + c * 8} y={6 + r * 8} width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
            )),
          )}
    </svg>
  );
}
