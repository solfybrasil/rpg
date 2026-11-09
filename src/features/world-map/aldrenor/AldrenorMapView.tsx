import {
  Castle,
  Crosshair,
  Eye,
  EyeOff,
  Flag,
  Hand,
  Loader2,
  Maximize2,
  MapPin,
  MapPinPlus,
  Minus,
  Move,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Route,
  Search,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CITY_TYPES, type PlaceType, type Region, TYPE_ORDER, TYPE_PLURAL } from './data';
import { AldrenorEngine, type EngineMode, type EnginePin, iconSVG } from './mapEngine.js';
import { type WorldPlace, useWorldMap, useWorldMapActions } from './useWorldMap';

interface Props {
  role: 'player' | 'dm';
  /** id do jogador (para os alfinetes pessoais). O Mestre usa "mestre". */
  playerId?: string;
  onEnterCity?: (place: WorldPlace) => void;
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const PANEL_W = 360;
/** Altura da gaveta de lugares no celular (fração da altura do mapa). */
const MOBILE_SHEET = 0.6;

export function AldrenorMapView({ role, playerId = 'mestre', onEnterCity }: Props) {
  const isDm = role === 'dm';
  const me = isDm ? 'mestre' : playerId;
  const { geo, places, usingBase, missingBase, legacyPlaces, rawPlaces, dbCount, loading, error, hiddenRegions, state, pins } = useWorldMap(role);
  const actions = useWorldMapActions();
  const data = geo.data;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AldrenorEngine | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 1024);
  const [mode, setMode] = useState<EngineMode>('view');
  const [selId, setSelId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const dq = useDeferredValue(query);
  const [region, setRegion] = useState('');
  const [hiddenTypes, setHiddenTypes] = useState<Set<PlaceType>>(new Set());
  const [layers, setLayers] = useState({ route: true, roads: true, borders: true });
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [openPin, setOpenPin] = useState<EnginePin | null>(null);
  const [listLimit, setListLimit] = useState(150);

  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  // ── O que cada papel vê ──
  const visiblePlaces = useMemo(
    () =>
      isDm
        ? places
        : places.filter((p) => p.discovered && !hiddenRegions.has(p.region)),
    [places, isDm, hiddenRegions],
  );
  const placeById = useMemo(() => new Map(visiblePlaces.map((p) => [p.id, p])), [visiblePlaces]);
  const selected = selId ? (placeById.get(selId) ?? null) : null;

  const regionById = useMemo(() => new Map((data?.regions ?? []).map((r) => [r.id, r])), [data]);

  // Filtros
  const shown = useMemo(() => {
    const q = norm(dq.trim());
    return visiblePlaces.filter(
      (p) =>
        !hiddenTypes.has(p.type) &&
        (!region || p.region === region) &&
        (!q || norm(p.name).includes(q) || norm(p.descPublic).includes(q)),
    );
  }, [visiblePlaces, dq, region, hiddenTypes]);
  const filterActive = Boolean(dq.trim() || region || hiddenTypes.size);

  // ── Motor ──
  const cb = useRef({
    onSelect: (_id: string | null) => {},
    onTap: (_m: EngineMode, _x: number, _y: number) => {},
    onMove: (_id: string, _x: number, _y: number) => {},
    onPin: (_p: EnginePin) => {},
  });

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const engine = new AldrenorEngine(canvasRef.current, {
      geo: data.geo,
      onSelect: (id) => cb.current.onSelect(id),
      onTap: (m, x, y) => cb.current.onTap(m, x, y),
      onPlaceMove: (id, x, y) => cb.current.onMove(id, x, y),
      onPin: (p) => cb.current.onPin(p),
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [data]);

  // Mestre com lugares para importar: abre o painel uma vez para o aviso aparecer.
  const needsImport = isDm && !loading && (usingBase || missingBase.length > 0 || legacyPlaces.length > 0);
  const openedForImport = useRef(false);
  useEffect(() => {
    if (needsImport && !openedForImport.current) {
      openedForImport.current = true;
      setPanelOpen(true);
    }
  }, [needsImport]);

  const panelInset = panelOpen && !isMobile ? PANEL_W : 0;
  const sheetOpen = panelOpen && isMobile;
  useEffect(() => {
    const h = canvasRef.current?.clientHeight ?? 0;
    engineRef.current?.setInsets({ left: panelInset, bottom: sheetOpen ? Math.round(h * MOBILE_SHEET) : 0 });
  }, [panelInset, sheetOpen, data]);

  useEffect(() => {
    engineRef.current?.setPlaces(
      visiblePlaces.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        region: p.region,
        x: p.x,
        y: p.y,
        visited: p.visited,
        major: p.major,
        hidden: isDm && (!p.discovered || hiddenRegions.has(p.region)),
      })),
    );
  }, [visiblePlaces, isDm, hiddenRegions, data]);
  useEffect(() => engineRef.current?.setFilter(filterActive ? new Set(shown.map((p) => p.id)) : null), [shown, filterActive, data]);
  useEffect(() => engineRef.current?.setSelected(selId), [selId, data]);
  useEffect(() => engineRef.current?.setMode(mode), [mode, data]);
  useEffect(() => engineRef.current?.setLayers(layers), [layers, data]);
  useEffect(() => engineRef.current?.setRoute(state?.route ?? null), [state?.route, data]);
  useEffect(
    () => engineRef.current?.setParty(state?.party_x != null && state?.party_y != null ? { x: state.party_x, y: state.party_y } : null),
    [state?.party_x, state?.party_y, data],
  );
  const visiblePins = useMemo<EnginePin[]>(
    () =>
      pins
        .filter((p) => isDm || p.player_id === me || p.player_id === 'mestre')
        .map((p) => ({ id: p.id, x: p.x, y: p.y, note: p.note, mine: p.player_id === me })),
    [pins, isDm, me],
  );
  useEffect(() => engineRef.current?.setPins(visiblePins), [visiblePins, data]);

  // ── Ações ──
  const requireImport = useCallback(() => {
    if (!usingBase) return false;
    if (data && window.confirm('Para editar, os lugares do mapa base precisam ser copiados para o banco (uma vez só). Importar agora?')) {
      actions.importBase.mutate(data.places);
    }
    return true;
  }, [usingBase, data, actions.importBase]);

  const nearestRegion = useCallback(
    (x: number, y: number) => {
      let best: Region | null = null;
      let bd = Number.POSITIVE_INFINITY;
      for (const r of data?.regions ?? []) {
        const d = Math.hypot(r.x - x, r.y - y);
        if (d < bd) {
          bd = d;
          best = r;
        }
      }
      return best?.id ?? '';
    },
    [data],
  );

  cb.current = {
    onSelect: (id) => {
      setSelId(id);
      setOpenPin(null);
      if (id && isMobile) setPanelOpen(true);
    },
    onMove: (id, x, y) => {
      if (requireImport()) return;
      actions.updatePlace.mutate({ id, patch: { x, y } });
    },
    onPin: (p) => setOpenPin(p),
    onTap: (m, x, y) => {
      if (m === 'pin') {
        setPendingPin({ x, y });
        return;
      }
      if (!isDm) return;
      if (m === 'party') {
        actions.updateState.mutate({ party_x: x, party_y: y });
        toast.success('Grupo posicionado.');
        return;
      }
      if (m === 'route') {
        actions.appendRoute([x, y]);
        return;
      }
      if (m === 'add') {
        if (requireImport()) return;
        actions.createPlace.mutate(
          {
            name: 'Novo lugar',
            type: 'mar',
            region: nearestRegion(x, y),
            x,
            y,
            descPublic: '',
            descSecret: null,
            discovered: true,
            visited: false,
          },
          {
            onSuccess: (row: any) => {
              setSelId(row.id);
              setPanelOpen(true);
              setMode('view');
            },
          },
        );
      }
    },
  };

  const select = (p: WorldPlace, fly = true) => {
    setSelId(p.id);
    if (fly) engineRef.current?.flyTo(p.x, p.y, Math.max(engineRef.current.zoomLevel(), 6));
  };

  // Atalhos (Mestre)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || e.ctrlKey || e.metaKey) return;
      const map: Record<string, EngineMode> = isDm
        ? { v: 'view', m: 'move', n: 'add', r: 'route', g: 'party', p: 'pin' }
        : { v: 'view', p: 'pin' };
      const k = e.key.toLowerCase();
      if (map[k]) setMode(map[k]);
      if (k === 'escape') {
        setMode('view');
        setSelId(null);
        setPendingPin(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDm]);

  const tools: Array<{ id: EngineMode; label: string; icon: typeof Hand; key: string }> = isDm
    ? [
        { id: 'view', label: 'Navegar', icon: Hand, key: 'V' },
        { id: 'move', label: 'Mover lugares', icon: Move, key: 'M' },
        { id: 'add', label: 'Novo lugar', icon: MapPinPlus, key: 'N' },
        { id: 'route', label: 'Desenhar rota', icon: Route, key: 'R' },
        { id: 'party', label: 'Posicionar o grupo', icon: Flag, key: 'G' },
        { id: 'pin', label: 'Alfinete', icon: MapPin, key: 'P' },
      ]
    : [
        { id: 'view', label: 'Navegar', icon: Hand, key: 'V' },
        { id: 'pin', label: 'Marcar com alfinete', icon: MapPin, key: 'P' },
      ];

  const hint: Partial<Record<EngineMode, string>> = {
    move: 'Arraste um lugar para movê-lo.',
    add: 'Toque no mapa onde fica o novo lugar.',
    route: 'Toque no mapa para acrescentar pontos à rota.',
    party: 'Toque no mapa onde o grupo está.',
    pin: 'Toque no mapa para deixar um alfinete com anotação.',
  };

  // Lista agrupada por região
  const grouped = useMemo(() => {
    const out: Array<{ region: Region; items: WorldPlace[] }> = [];
    let n = 0;
    for (const r of data?.regions ?? []) {
      if (n >= listLimit) break;
      const items = shown
        .filter((p) => p.region === r.id)
        .sort((a, b) => Number(b.major) - Number(a.major) || TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.name.localeCompare(b.name))
        .slice(0, listLimit - n);
      n += items.length;
      if (items.length) out.push({ region: r, items });
    }
    return { out, n };
  }, [data, shown, listLimit]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center bg-[var(--abyss)]">
        <div>
          <p className="font-['Cinzel',serif] text-[var(--gold-hi)]">Não foi possível abrir o mapa</p>
          <p className="text-sm italic text-[var(--muted)]">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-[420px] h-full w-full overflow-hidden bg-[#7d9693]" data-testid="world-map">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block outline-none" aria-label="Mapa do continente de Aldrenor" />

      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center gap-2 bg-[var(--abyss)] text-[var(--muted)]">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--gold)]" />
          <span className="font-['Cinzel',serif] text-sm tracking-[0.14em]">Desenrolando o mapa…</span>
        </div>
      )}

      {/* Ferramentas */}
      <div
        className="absolute top-3 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5"
        style={{ left: `calc(50% + ${panelInset / 2}px)` }}
      >
        <div className="flex gap-1 p-1 border border-[var(--iron)] bg-[var(--stone)]/95 shadow-[0_6px_18px_rgba(0,0,0,0.5)]">
          {tools.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              aria-pressed={mode === t.id}
              title={`${t.label} (${t.key})`}
              aria-label={t.label}
              className={`w-9 h-9 flex items-center justify-center border cursor-pointer ${
                mode === t.id
                  ? 'border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-hi)]'
                  : 'border-[var(--iron)] bg-[var(--stone)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <t.icon className="w-4 h-4" />
            </button>
          ))}
          {state?.party_x != null && (
            <button
              type="button"
              onClick={() => engineRef.current?.flyTo(state.party_x as number, state.party_y as number, 6)}
              title="Onde o grupo está"
              aria-label="Onde o grupo está"
              className="w-9 h-9 flex items-center justify-center border border-[var(--iron)] bg-[var(--stone)] text-[var(--blood)] hover:text-[#e0645a] cursor-pointer"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          )}
        </div>
        {hint[mode] && (
          <div className="flex items-center gap-2 px-3 py-1.5 border border-[var(--iron)] bg-[var(--stone)]/95 text-xs text-[var(--text)]">
            {hint[mode]}
            {mode === 'route' && isDm && (
              <>
                <button
                  type="button"
                  className="flex items-center gap-1 text-[var(--gold)] hover:text-[var(--gold-hi)] cursor-pointer"
                  onClick={() => actions.updateState.mutate({ route: (state?.route ?? []).slice(0, -1) })}
                  disabled={!state?.route?.length}
                >
                  <Undo2 className="w-3.5 h-3.5" /> Desfazer
                </button>
                <button
                  type="button"
                  className="text-[var(--gold)] hover:text-[var(--gold-hi)] cursor-pointer"
                  onClick={() => window.confirm('Voltar para a rota original do mapa?') && actions.updateState.mutate({ route: null })}
                >
                  Rota original
                </button>
              </>
            )}
            <button type="button" onClick={() => setMode('view')} className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer" aria-label="Sair da ferramenta">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Zoom */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1">
        {[
          { icon: Plus, label: 'Aproximar', fn: () => engineRef.current?.zoomBy(1.5) },
          { icon: Minus, label: 'Afastar', fn: () => engineRef.current?.zoomBy(1 / 1.5) },
          { icon: Maximize2, label: 'Continente inteiro', fn: () => engineRef.current?.zoomFit() },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={b.fn}
            aria-label={b.label}
            title={b.label}
            className="w-10 h-10 flex items-center justify-center border border-[var(--iron)] bg-[var(--stone)]/95 text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
          >
            <b.icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Abrir/fechar painel */}
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        aria-label={panelOpen ? 'Fechar painel' : 'Abrir painel de lugares'}
        className="absolute top-3 left-3 z-30 h-9 px-2.5 flex items-center gap-1.5 border border-[var(--iron)] bg-[var(--stone)]/95 text-xs text-[var(--text)] cursor-pointer"
        style={{ left: panelOpen && !isMobile ? PANEL_W + 12 : 12 }}
      >
        {panelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        {!panelOpen && 'Lugares'}
      </button>

      {/* Painel */}
      {panelOpen && data && (
        <aside
          className="absolute z-20 flex flex-col bg-[var(--stone)] border-[var(--iron)] shadow-[0_0_30px_rgba(0,0,0,0.5)] left-0 right-0 bottom-0 border-t md:right-auto md:top-0 md:border-t-0 md:border-r animate-[fadeIn_var(--t-base)_var(--ease-out)]"
          style={isMobile ? { height: `${MOBILE_SHEET * 100}%` } : { width: PANEL_W }}
        >
          <div className="p-3 flex flex-col gap-2 border-b border-[var(--iron)]">
            <div className="flex items-baseline justify-between">
              <h2 className="font-['Cinzel',serif] text-base tracking-[0.18em] text-[var(--gold-hi)]">Aldrenor</h2>
              <span className="text-[11px] text-[var(--muted)] tabular-nums">
                {shown.length} lugares · {shown.filter((p) => CITY_TYPES.has(p.type)).length} cidades
              </span>
            </div>

            {isDm && legacyPlaces.length > 0 && (
              <div className="p-2.5 border border-[var(--blood)] bg-[var(--blood)]/10 text-xs text-[var(--text)] flex flex-col gap-2">
                <p>
                  <b>{legacyPlaces.length}</b> {legacyPlaces.length === 1 ? 'lugar foi gravado' : 'lugares foram gravados'} pelo
                  mapa antigo, numa escala 4× menor — por isso aparecem fora do lugar. A correção leva cada um à posição certa
                  (pelo nome, quando existe no mapa base), apaga duplicados e ajusta grupo, rota e alfinetes antigos.
                </p>
                <button
                  type="button"
                  disabled={actions.fixLegacy.isPending}
                  onClick={() =>
                    actions.fixLegacy.mutate({ legacy: legacyPlaces, all: rawPlaces, base: data.places })
                  }
                  data-testid="btn-fix-legacy"
                  className="h-8 border border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] text-xs cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {actions.fixLegacy.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Corrigir posições do mapa antigo
                </button>
              </div>
            )}

            {isDm && legacyPlaces.length === 0 && (usingBase || missingBase.length > 0) && (
              <div className="p-2.5 border border-[var(--gold-lo)] bg-[var(--gold)]/10 text-xs text-[var(--text)] flex flex-col gap-2">
                <p>
                  {usingBase ? (
                    <>
                      Você está vendo o <b>mapa base</b>. Para editar lugares, importe-os para o banco (uma vez só).
                    </>
                  ) : (
                    <>
                      O banco tem <b>{dbCount}</b> lugares; faltam <b>{missingBase.length}</b> do mapa base de Aldrenor.
                    </>
                  )}
                </p>
                <button
                  type="button"
                  disabled={actions.importBase.isPending}
                  onClick={() => actions.importBase.mutate(usingBase ? data.places : missingBase)}
                  data-testid="btn-import-places"
                  className="h-8 border border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] text-xs cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {actions.importBase.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {usingBase ? `Importar ${data.places.length} lugares` : `Adicionar ${missingBase.length} lugares que faltam`}
                </button>
              </div>
            )}

            <label className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-[var(--muted)] pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar um lugar…"
                className="w-full h-9 pl-8 pr-2 text-sm rounded-none"
                onKeyDown={(e) => e.key === 'Enter' && shown[0] && select(shown[0])}
              />
            </label>
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                const r = regionById.get(e.target.value);
                if (r) engineRef.current?.flyTo(r.x, r.y, 2.6);
              }}
              className="h-9 text-sm rounded-none"
              aria-label="Região"
            >
              <option value="">Todas as regiões</option>
              {data.regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {hiddenRegions.has(r.id) ? ' (oculta)' : ''}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1">
              {TYPE_ORDER.map((t) => {
                const on = !hiddenTypes.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setHiddenTypes((prev) => {
                        const n = new Set(prev);
                        if (on) n.add(t);
                        else n.delete(t);
                        return n;
                      })
                    }
                    className={`h-6 pl-0.5 pr-1.5 flex items-center gap-1 border text-[11px] cursor-pointer ${
                      on ? 'border-[var(--gold-lo)] text-[var(--text)]' : 'border-[var(--iron)] text-[var(--muted)] opacity-50'
                    }`}
                  >
                    {/* biome-ignore lint/security/noDangerouslySetInnerHtml: SVG estático gerado no código */}
                    <span className="w-4 h-4 flex" dangerouslySetInnerHTML={{ __html: iconSVG(t) }} />
                    {TYPE_PLURAL[t]}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
              {(
                [
                  ['route', 'Rota'],
                  ['roads', 'Estradas'],
                  ['borders', 'Fronteiras'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layers[k]}
                    onChange={(e) => setLayers((l) => ({ ...l, [k]: e.target.checked }))}
                    className="accent-[var(--gold)]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {selected && (
              <PlaceCard
                key={selected.id}
                place={selected}
                region={regionById.get(selected.region)}
                regions={data.regions}
                types={data.types}
                isDm={isDm}
                regionHidden={hiddenRegions.has(selected.region)}
                onClose={() => setSelId(null)}
                onSave={(patch) => {
                  if (requireImport()) return;
                  actions.updatePlace.mutate({ id: selected.id, patch });
                }}
                onDelete={() => {
                  if (requireImport()) return;
                  if (window.confirm(`Apagar "${selected.name}" do mapa?`)) {
                    actions.deletePlace.mutate(selected.id);
                    setSelId(null);
                  }
                }}
                onFly={() => engineRef.current?.flyTo(selected.x, selected.y, Math.max(engineRef.current.zoomLevel(), 6))}
                onEnterCity={onEnterCity && CITY_TYPES.has(selected.type) ? () => onEnterCity(selected) : undefined}
              />
            )}

            {isDm && <RegionVisibility regions={data.regions} hidden={hiddenRegions} onToggle={(r, v) => actions.setRegionVisible.mutate({ region: r, visible: v })} />}

            <div className="pb-3">
              {grouped.out.map(({ region: r, items }) => (
                <div key={r.id}>
                  <p className="sticky top-0 z-10 px-3 py-1.5 bg-[var(--stone-2)] font-['Cinzel',serif] text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    {r.name}
                  </p>
                  {items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => select(p)}
                      className={`w-full flex items-center gap-2 px-3 h-9 text-left text-sm cursor-pointer border-l-2 ${
                        selId === p.id ? 'border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold-hi)]' : 'border-transparent hover:bg-black/25'
                      } ${isDm && (!p.discovered || hiddenRegions.has(p.region)) ? 'opacity-55 italic' : ''}`}
                    >
                      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: SVG estático gerado no código */}
                      <span className="w-[18px] h-[18px] shrink-0 flex" dangerouslySetInnerHTML={{ __html: iconSVG(p.type) }} />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="text-[11px] text-[var(--muted)] shrink-0">{data.types[p.type]}</span>
                    </button>
                  ))}
                </div>
              ))}
              {shown.length > grouped.n && (
                <button type="button" onClick={() => setListLimit((n) => n + 200)} className="w-full h-9 text-xs text-[var(--gold)] hover:text-[var(--gold-hi)] cursor-pointer">
                  Mostrar mais {Math.min(200, shown.length - grouped.n)} de {shown.length - grouped.n}…
                </button>
              )}
              {shown.length === 0 && <p className="p-4 text-sm italic text-[var(--muted)]">Nenhum lugar encontrado.</p>}
            </div>
          </div>
        </aside>
      )}

      {/* Novo alfinete */}
      {pendingPin && (
        <PinForm
          onCancel={() => setPendingPin(null)}
          onSave={(note) => {
            actions.createPin.mutate({ player_id: me, x: pendingPin.x, y: pendingPin.y, note });
            setPendingPin(null);
            setMode('view');
          }}
        />
      )}
      {openPin && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,360px)] p-3 bg-[var(--parch)] text-[var(--ink)] shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex gap-2 items-start">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="flex-1 text-sm">{openPin.note || <i>Sem anotação</i>}</p>
          {(openPin.mine || isDm) && (
            <button
              type="button"
              aria-label="Remover alfinete"
              onClick={() => {
                actions.deletePin.mutate(openPin.id);
                setOpenPin(null);
              }}
              className="text-[var(--ink-soft)] hover:text-[var(--blood)] cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button type="button" aria-label="Fechar" onClick={() => setOpenPin(null)} className="text-[var(--ink-soft)] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Cartão do lugar ─────────────────────────

function PlaceCard({
  place,
  region,
  regions,
  types,
  isDm,
  regionHidden,
  onClose,
  onSave,
  onDelete,
  onFly,
  onEnterCity,
}: {
  place: WorldPlace;
  region?: Region;
  regions: Region[];
  types: Record<string, string>;
  isDm: boolean;
  regionHidden: boolean;
  onClose: () => void;
  onSave: (patch: Partial<WorldPlace>) => void;
  onDelete: () => void;
  onFly: () => void;
  onEnterCity?: () => void;
}) {
  const [d, setD] = useState({
    name: place.name,
    type: place.type,
    region: place.region,
    descPublic: place.descPublic,
    descSecret: place.descSecret ?? '',
  });
  useEffect(() => {
    setD({ name: place.name, type: place.type, region: place.region, descPublic: place.descPublic, descSecret: place.descSecret ?? '' });
  }, [place.name, place.type, place.region, place.descPublic, place.descSecret]);

  const dirty =
    d.name !== place.name ||
    d.type !== place.type ||
    d.region !== place.region ||
    d.descPublic !== place.descPublic ||
    d.descSecret !== (place.descSecret ?? '');

  const field = 'w-full h-8 px-2 text-sm rounded-none';
  const label = "font-['Cinzel',serif] text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]";

  return (
    <section className="m-3 flex flex-col gap-2" aria-live="polite">
      <div className="p-3 bg-[var(--parch)] text-[var(--ink)] shadow-[inset_0_0_30px_rgba(90,70,50,0.35)]">
        <div className="flex items-start gap-2">
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: SVG estático gerado no código */}
          <span className="w-6 h-6 shrink-0 flex" dangerouslySetInnerHTML={{ __html: iconSVG(place.type) }} />
          <div className="flex-1 min-w-0">
            <h3 className="font-['Cinzel',serif] text-base leading-tight" style={{ color: 'var(--ink)' }}>{place.name}</h3>
            <p className="text-xs italic text-[var(--ink-soft)]">
              {types[place.type]} em {region?.name ?? '—'}
              {region?.people ? ` · ${region.people}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        {place.descPublic && <p className="mt-2 text-[15px] leading-relaxed">{place.descPublic}</p>}
        {isDm && place.descSecret && (
          <p className="mt-2 text-sm italic text-[var(--blood)]">
            <b className="not-italic">Segredo:</b> {place.descSecret}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2 items-center">
          {place.visited && (
            <span className="px-1.5 py-px border border-[var(--gold-lo)] text-[10px] uppercase tracking-[0.1em] font-['Cinzel',serif] text-[var(--gold-lo)]">
              A mesa já passou por aqui
            </span>
          )}
          <button type="button" onClick={onFly} className="text-xs underline cursor-pointer">
            Ver no mapa
          </button>
          {onEnterCity && (
            <button type="button" onClick={onEnterCity} className="ml-auto h-7 px-2.5 flex items-center gap-1 border border-[var(--ink)] text-xs cursor-pointer hover:bg-black/5">
              <Castle className="w-3.5 h-3.5" /> Entrar na cidade
            </button>
          )}
        </div>
      </div>

      {isDm && (
        <div className="p-3 border border-[var(--gold-lo)] bg-[var(--stone-2)] flex flex-col gap-2" data-testid="dm-place-editor">
          <div className="flex gap-1.5">
            <ToggleChip
              on={place.discovered}
              onClick={() => onSave({ discovered: !place.discovered })}
              iconOn={Eye}
              iconOff={EyeOff}
              labelOn="Visível aos jogadores"
              labelOff="Oculto dos jogadores"
            />
            <ToggleChip on={place.visited} onClick={() => onSave({ visited: !place.visited })} labelOn="Visitado" labelOff="Não visitado" />
          </div>
          {regionHidden && <p className="text-[11px] text-[var(--ember)]">A região inteira está oculta dos jogadores.</p>}
          <label className="flex flex-col gap-1">
            <span className={label}>Nome</span>
            <input className={field} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className={label}>Tipo</span>
              <select className={field} value={d.type} onChange={(e) => setD({ ...d, type: e.target.value as PlaceType })}>
                {TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {types[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={label}>Região</span>
              <select className={field} value={d.region} onChange={(e) => setD({ ...d, region: e.target.value })}>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className={label}>Descrição (jogadores veem)</span>
            <textarea rows={3} className="w-full px-2 py-1.5 text-sm rounded-none resize-y" value={d.descPublic} onChange={(e) => setD({ ...d, descPublic: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Segredo (só o Mestre vê)</span>
            <textarea rows={2} className="w-full px-2 py-1.5 text-sm rounded-none resize-y" value={d.descSecret} onChange={(e) => setD({ ...d, descSecret: e.target.value })} />
          </label>
          <p className="text-[11px] text-[var(--muted)]">
            Posição {place.x}, {place.y} · use a ferramenta <b>Mover</b> (M) para arrastar.
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={!dirty || !d.name.trim()}
              onClick={() => onSave({ ...d, name: d.name.trim(), descSecret: d.descSecret.trim() || null })}
              data-testid="dm-place-save"
              className="h-8 px-3 border border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="h-8 px-3 ml-auto flex items-center gap-1.5 border border-[var(--iron)] text-xs text-[var(--muted)] hover:border-[var(--blood)] hover:text-[#e0645a] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Apagar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ToggleChip({
  on,
  onClick,
  labelOn,
  labelOff,
  iconOn: IconOn,
  iconOff: IconOff,
}: {
  on: boolean;
  onClick: () => void;
  labelOn: string;
  labelOff: string;
  iconOn?: typeof Eye;
  iconOff?: typeof Eye;
}) {
  const Icon = on ? IconOn : IconOff;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex-1 h-8 px-2 flex items-center justify-center gap-1.5 border text-xs cursor-pointer ${
        on ? 'border-[var(--moss)] text-[var(--moss)]' : 'border-[var(--iron)] text-[var(--muted)]'
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {on ? labelOn : labelOff}
    </button>
  );
}

function RegionVisibility({
  regions,
  hidden,
  onToggle,
}: {
  regions: Region[];
  hidden: Set<string>;
  onToggle: (region: string, visible: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-3 mb-3 border border-[var(--iron)]">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full h-9 px-3 flex items-center justify-between text-xs text-[var(--text)] cursor-pointer">
        <span className="font-['Cinzel',serif] uppercase tracking-[0.14em] text-[10px] text-[var(--muted)]">Regiões visíveis aos jogadores</span>
        <span className="text-[var(--muted)]">
          {regions.length - hidden.size}/{regions.length}
        </span>
      </button>
      {open && (
        <ul className="border-t border-[var(--iron)]">
          {regions.map((r) => {
            const visible = !hidden.has(r.id);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onToggle(r.id, !visible)}
                  className="w-full h-8 px-3 flex items-center gap-2 text-sm cursor-pointer hover:bg-black/25"
                >
                  {visible ? <Eye className="w-3.5 h-3.5 text-[var(--moss)]" /> : <EyeOff className="w-3.5 h-3.5 text-[var(--muted)]" />}
                  <span className={visible ? '' : 'text-[var(--muted)] line-through'}>{r.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PinForm({ onSave, onCancel }: { onSave: (note: string) => void; onCancel: () => void }) {
  const [note, setNote] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(note.trim());
      }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,360px)] p-3 flex flex-col gap-2 bg-[var(--parch)] text-[var(--ink)] shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
    >
      <span className="font-['Cinzel',serif] text-xs uppercase tracking-[0.14em]">Novo alfinete</span>
      <input
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anotação (opcional)…"
        className="h-8 px-2 text-sm rounded-none !bg-white/60 !text-[var(--ink)] !border-[var(--ink-soft)]"
      />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="h-8 px-3 text-xs cursor-pointer">
          Cancelar
        </button>
        <button type="submit" className="h-8 px-3 border border-[var(--ink)] text-xs cursor-pointer hover:bg-black/5">
          Fixar
        </button>
      </div>
    </form>
  );
}


