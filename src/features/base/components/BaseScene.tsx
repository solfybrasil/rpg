import { EyeOff, Lock } from 'lucide-react';
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BaseState, BaseStorage } from '../api/baseApi';
import { formatCoins, kindInfo } from '../data/kinds';

/** Tamanho usado enquanto o Mestre não escolhe uma imagem. */
const DEFAULT_W = 1600;
const DEFAULT_H = 900;

interface Props {
  state: BaseState | null;
  storages: BaseStorage[];
  /** Espaços ocupados por armazenamento. */
  used: Map<string, number>;
  mode: 'player' | 'dm';
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Mestre: clique no cenário para pôr um armazenamento novo. */
  placing?: boolean;
  onPlace?: (x: number, y: number) => void;
  /** Mestre: arrastou um armazenamento. */
  onMove?: (id: string, x: number, y: number) => void;
}

/**
 * Cenário da base. No celular em pé, uma imagem larga ocupa a altura toda e
 * rola para os lados (os baús não ficam minúsculos); no resto, cabe inteira.
 */
export function BaseScene({ state, storages, used, mode, selectedId, onSelect, placing, onPlace, onMove }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ cw: 0, ch: 0 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const url = state?.background_url || null;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ cw: e.contentRect.width, ch: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => setNatural(null), [url]);

  const iw = natural?.w || state?.img_w || DEFAULT_W;
  const ih = natural?.h || state?.img_h || DEFAULT_H;
  const contain = Math.min(box.cw / iw, box.ch / ih) || 0;
  const fillH = box.ch / ih || 0;
  // Imagem larga numa tela estreita: usa a altura toda e rola na horizontal.
  const scrollX = box.cw > 0 && box.cw < 700 && iw * fillH > box.cw * 1.15;
  const s = scrollX ? fillH : contain;
  const sw = Math.round(iw * s);
  const sh = Math.round(ih * s);

  // Ao abrir no celular, começa no meio da imagem.
  const centered = useRef(false);
  useEffect(() => {
    if (scrollX && !centered.current && wrapRef.current && sw > box.cw) {
      wrapRef.current.scrollLeft = (sw - box.cw) / 2;
      centered.current = true;
    }
  }, [scrollX, sw, box.cw]);

  const toFrac = (clientX: number, clientY: number) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r || !r.width) return null;
    return {
      x: Math.min(0.98, Math.max(0.02, (clientX - r.left) / r.width)),
      y: Math.min(0.97, Math.max(0.03, (clientY - r.top) / r.height)),
    };
  };

  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 bg-[var(--abyss)] ${scrollX ? 'overflow-x-auto overflow-y-hidden' : 'overflow-hidden'}`}
      data-testid="base-scene"
    >
      <div
        ref={stageRef}
        className={`relative ${placing ? 'cursor-crosshair' : ''}`}
        style={{
          width: sw,
          height: sh,
          maxWidth: 'none', // o CSS global limita a 100%; aqui a cena pode rolar para os lados
          marginLeft: scrollX ? 0 : Math.max(0, (box.cw - sw) / 2),
          marginTop: Math.max(0, (box.ch - sh) / 2),
        }}
        onClick={(e) => {
          if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.bg) return;
          if (placing && onPlace) {
            const f = toFrac(e.clientX, e.clientY);
            if (f) onPlace(f.x, f.y);
          } else onSelect(null);
        }}
      >
        {url ? (
          <img
            src={url}
            alt=""
            data-bg="1"
            draggable={false}
            decoding="async"
            onLoad={(e) => {
              const im = e.currentTarget;
              if (im.naturalWidth) setNatural({ w: im.naturalWidth, h: im.naturalHeight });
            }}
            className="absolute inset-0 w-full h-full object-fill select-none animate-[fadeIn_var(--t-slow)_var(--ease-out)]"
          />
        ) : (
          <div
            data-bg="1"
            className="absolute inset-0 flex items-center justify-center border border-dashed border-[var(--iron)] bg-[var(--stone)]"
            style={{ backgroundImage: 'var(--mottle)' }}
          >
            <p data-bg="1" className="max-w-[80%] text-center italic text-[var(--muted)] text-sm pointer-events-none">
              {mode === 'dm'
                ? 'Escolha a imagem da base (taverna, covil, casa, embarcação…) no painel ao lado.'
                : 'O Mestre ainda não revelou como é a base do grupo.'}
            </p>
          </div>
        )}
        {/* Vinheta: concentra o olhar no centro sem esconder os cantos. */}
        <div
          data-bg="1"
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(7,6,5,0.55) 100%)' }}
        />

        {storages.map((st) =>
          mode === 'player' && st.hidden ? null : (
            <Hotspot
              key={st.id}
              st={st}
              used={used.get(st.id) ?? 0}
              selected={st.id === selectedId}
              dm={mode === 'dm'}
              toFrac={toFrac}
              onSelect={onSelect}
              onMove={onMove}
            />
          ),
        )}
      </div>
    </div>
  );
}

const Hotspot = memo(function Hotspot({
  st,
  used,
  selected,
  dm,
  toFrac,
  onSelect,
  onMove,
}: {
  st: BaseStorage;
  used: number;
  selected: boolean;
  dm: boolean;
  toFrac: (x: number, y: number) => { x: number; y: number } | null;
  onSelect: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
}) {
  const info = kindInfo(st.kind);
  const Icon = info.icon;
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ px: number; py: number; moved: boolean } | null>(null);
  const x = drag?.x ?? st.x;
  const y = drag?.y ?? st.y;
  const full = st.owned && used >= st.slots;

  return (
    <button
      type="button"
      data-testid={`storage-${st.id}`}
      aria-label={`${st.name}${st.owned ? `, ${used} de ${st.slots} espaços` : `, à venda por ${formatCoins(st.price_bronze)}`}`}
      className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 outline-none group animate-[fadeIn_var(--t-base)_var(--ease-out)] ${
        dm ? 'cursor-grab active:cursor-grabbing touch-none' : 'cursor-pointer'
      } ${st.hidden ? 'opacity-50' : ''}`}
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, zIndex: selected || drag ? 3 : 2 }}
      onPointerDown={(e) => {
        if (!dm) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { px: e.clientX, py: e.clientY, moved: false };
      }}
      onPointerMove={(e) => {
        const s0 = start.current;
        if (!dm || !s0) return;
        if (!s0.moved && Math.hypot(e.clientX - s0.px, e.clientY - s0.py) < 5) return;
        s0.moved = true;
        const f = toFrac(e.clientX, e.clientY);
        if (f) setDrag(f);
      }}
      onPointerUp={() => {
        const s0 = start.current;
        start.current = null;
        if (dm && s0?.moved && drag) {
          onMove?.(st.id, drag.x, drag.y);
          // mantém a posição até o cache atualizar
          setTimeout(() => setDrag(null), 50);
          return;
        }
        setDrag(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!dm || !drag) onSelect(st.id);
      }}
    >
      <span
        className={`relative w-11 h-11 flex items-center justify-center border transition-[transform,border-color,background-color] duration-[var(--t-fast)] group-hover:-translate-y-0.5 group-active:translate-y-px group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-[var(--gold-hi)] ${
          selected
            ? 'border-[var(--gold-hi)] bg-[var(--gold)]/25 text-[var(--gold-hi)] shadow-[0_0_18px_rgba(201,164,92,0.55)]'
            : st.owned
              ? 'border-[var(--gold)] bg-[var(--stone)]/90 text-[var(--gold-hi)] shadow-[0_4px_14px_rgba(0,0,0,0.6)]'
              : 'border-dashed border-[var(--iron)] bg-[var(--abyss)]/80 text-[var(--muted)]'
        }`}
      >
        <Icon className="w-5 h-5" />
        {!st.owned && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center bg-[var(--stone)] border border-[var(--iron)]">
            <Lock className="w-2.5 h-2.5" />
          </span>
        )}
        {st.hidden && (
          <span className="absolute -top-1.5 -left-1.5 w-4 h-4 flex items-center justify-center bg-[var(--stone)] border border-[var(--iron)] text-[var(--muted)]">
            <EyeOff className="w-2.5 h-2.5" />
          </span>
        )}
      </span>
      <span
        className={`px-1.5 py-px max-w-[140px] truncate font-['Cinzel',serif] text-[10px] tracking-[0.08em] border bg-[var(--abyss)]/85 ${
          selected ? 'border-[var(--gold)] text-[var(--gold-hi)]' : 'border-[var(--iron)] text-[var(--text)]'
        }`}
      >
        {st.name}
        <span className={`ml-1 tabular-nums ${full ? 'text-[#e0645a]' : 'text-[var(--muted)]'}`}>
          {st.owned ? `${used}/${st.slots}` : formatCoins(st.price_bronze)}
        </span>
      </span>
    </button>
  );
});
