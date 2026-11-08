import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Eraser,
  Hand,
  Maximize2,
  MousePointer2,
  PanelRight,
  PaintBucket,
  Radio,
  Ruler,
  SkipForward,
  Tv,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  createBattleMap,
  createBattleToken,
  deleteBattleMap,
  deleteBattleToken,
  duplicateBattleMap,
  fetchBattleMaps,
  novaRodadaRPC,
  setMapLiveStatus,
  updateBattleMap,
  updateBattleToken,
} from '../api/battleApi.ts';
import { useBattleSync, useHeroVitals } from '../api/battleSync.ts';
import { BATTLE_MAP_KEY, BATTLE_TOKENS_KEY, useBattleTokens } from '../api/useBattle.ts';
import { BattleEngine } from '../engine/BattleEngine.ts';
import type { BattleEditorTool, BattleMap, BattleToken } from '../engine/types.ts';
import { processBattleMapBackground, uploadBattleMedia } from '../media/mediaProcessor.ts';
import { MediaBattleModal, type MediaBattleTarget } from './MediaBattleModal.tsx';
import { PiecesPanel, TablePanel, TurnPanel } from './dm/BattlePanels.tsx';
import { IconButton } from './dm/BattleUI.tsx';
import {
  findFreeCells,
  heroMediaFor,
  isTypingTarget,
  loadTurnOrder,
  saveTurnOrder,
  useDebouncedSaver,
} from './dm/editorUtils.ts';

const MAPS_KEY = ['battle_maps', 'list'];
type PanelTab = 'pecas' | 'turno' | 'mesa';

const TOOLS: Array<{ id: BattleEditorTool; label: string; key: string; icon: typeof Hand }> = [
  { id: 'select', label: 'Selecionar e arrastar peças', key: 'V', icon: MousePointer2 },
  { id: 'pan', label: 'Mover câmera', key: 'H', icon: Hand },
  { id: 'measure', label: 'Régua', key: 'M', icon: Ruler },
  { id: 'paint_block', label: 'Pintar terreno bloqueado', key: 'B', icon: PaintBucket },
  { id: 'erase_block', label: 'Apagar bloqueio', key: 'E', icon: Eraser },
];

export function DMBattleMapEditor() {
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BattleEngine | null>(null);

  // ── Dados ──
  const { data: maps = [], isLoading: mapsLoading } = useQuery({
    queryKey: MAPS_KEY,
    queryFn: fetchBattleMaps,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const [mapId, setMapId] = useState<string | null>(null);
  useEffect(() => {
    if (maps.length === 0) return;
    if (!mapId || !maps.some((m) => m.id === mapId)) {
      setMapId((maps.find((m) => m.status === 'ao_vivo') ?? maps[0]).id);
    }
  }, [maps, mapId]);
  const map = useMemo(() => maps.find((m) => m.id === mapId) ?? null, [maps, mapId]);
  const { tokens } = useBattleTokens(map?.id);
  const { heroes, vitals } = useHeroVitals();
  const moveLimit = map?.move_limit ?? 6;
  const round = map?.round ?? 1;
  const isLive = map?.status === 'ao_vivo';

  // ── UI ──
  const [tool, setTool] = useState<BattleEditorTool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<PanelTab>('pecas');
  const [panelOpen, setPanelOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 768);
  const [mediaTarget, setMediaTarget] = useState<MediaBattleTarget | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const selectedToken = useMemo(() => tokens.find((t) => t.id === selectedId) ?? null, [tokens, selectedId]);

  // ── Gravação (debounce por item) ──
  const queueMapSave = useDebouncedSaver<BattleMap>((id, patch) => updateBattleMap(id, patch));
  const queueTokenSave = useDebouncedSaver<BattleToken>((id, patch) => updateBattleToken(id, patch));

  const setMapsCache = useCallback(
    (fn: (prev: BattleMap[]) => BattleMap[]) => qc.setQueryData<BattleMap[]>(MAPS_KEY, (prev) => fn(prev ?? [])),
    [qc],
  );

  const patchMap = useCallback(
    (patch: Partial<BattleMap>, immediate = false) => {
      if (!map) return;
      setMapsCache((prev) => prev.map((m) => (m.id === map.id ? { ...m, ...patch } : m)));
      if (isLive) qc.setQueryData(BATTLE_MAP_KEY, (prev: BattleMap | undefined) => (prev ? { ...prev, ...patch } : prev));
      if (immediate) void updateBattleMap(map.id, patch);
      else queueMapSave(map.id, patch);
    },
    [map, isLive, qc, queueMapSave, setMapsCache],
  );

  const setTokensCache = useCallback(
    (fn: (prev: BattleToken[]) => BattleToken[]) => {
      if (!map) return;
      qc.setQueryData<BattleToken[]>(BATTLE_TOKENS_KEY(map.id), (prev) => fn(prev ?? []));
    },
    [map, qc],
  );

  const patchToken = useCallback(
    (id: string, patch: Partial<BattleToken>) => {
      setTokensCache((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      queueTokenSave(id, patch);
    },
    [queueTokenSave, setTokensCache],
  );

  // ── Ordem de turno (persistida por mesa neste navegador) ──
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    if (map?.id) {
      setOrderIds(loadTurnOrder(map.id));
      setActiveIdx(0);
    }
  }, [map?.id]);

  const order = useMemo(() => {
    const byId = new Map(tokens.map((t) => [t.id, t]));
    const known = orderIds.map((id) => byId.get(id)).filter((t): t is BattleToken => Boolean(t));
    const knownSet = new Set(known.map((t) => t.id));
    const fresh = tokens
      .filter((t) => !knownSet.has(t.id))
      .sort((a, b) => (a.kind === 'heroi' ? 0 : 1) - (b.kind === 'heroi' ? 0 : 1) || a.name.localeCompare(b.name));
    return [...known, ...fresh];
  }, [tokens, orderIds]);

  const safeIdx = order.length ? Math.min(activeIdx, order.length - 1) : 0;
  const activeToken = order[safeIdx] ?? null;

  const reorder = useCallback(
    (from: number, to: number) => {
      if (!map) return;
      const ids = order.map((t) => t.id);
      const [moved] = ids.splice(from, 1);
      ids.splice(to, 0, moved);
      setOrderIds(ids);
      saveTurnOrder(map.id, ids);
      if (from === safeIdx) setActiveIdx(to);
      else if (to === safeIdx) setActiveIdx(from);
    },
    [map, order, safeIdx],
  );

  // ── Sincronização (ping + turno) ──
  const turnRef = useRef({ tokenId: activeToken?.id ?? null, name: activeToken?.name ?? null, round });
  turnRef.current = { tokenId: activeToken?.id ?? null, name: activeToken?.name ?? null, round };
  const { sendPing, sendTurn } = useBattleSync(map?.id, {
    onPing: (p) => engineRef.current?.showPing(p),
    getTurn: () => turnRef.current,
  });
  useEffect(() => {
    sendTurn({ tokenId: activeToken?.id ?? null, name: activeToken?.name ?? null, round });
  }, [activeToken?.id, activeToken?.name, round, sendTurn]);

  // ── Motor ──
  const callbacks = useRef({ patchToken, patchMap, sendPing });
  callbacks.current = { patchToken, patchMap, sendPing };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new BattleEngine(canvas, {
      mode: 'dm',
      tool: 'select',
      onSelectTokenId: (id) => setSelectedId(id),
      onUpdateBlocked: (blocked) => callbacks.current.patchMap({ blocked }),
      onDropToken: (id, c, r) => callbacks.current.patchToken(id, { c, r, path: [] }),
      onPing: (p) => callbacks.current.sendPing(p),
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (map) engineRef.current?.setMap(map);
  }, [map]);
  useEffect(() => {
    engineRef.current?.setTokens(tokens);
  }, [tokens]);
  useEffect(() => {
    engineRef.current?.setOptions({
      tool,
      selectedTokenId: selectedId,
      activeTokenId: activeToken?.id ?? null,
      heroVitals: vitals,
    });
  }, [tool, selectedId, activeToken?.id, vitals]);

  // ── Ações de turno ──
  const newRound = useCallback(async () => {
    if (!map) return;
    const res = await novaRodadaRPC(map.id).catch(() => ({ success: false, round }));
    const next = res.success ? res.round : round + 1;
    setMapsCache((prev) => prev.map((m) => (m.id === map.id ? { ...m, round: next } : m)));
    if (!res.success) queueMapSave(map.id, { round: next });
    setTokensCache((prev) => prev.map((t) => ({ ...t, moves_left: moveLimit })));
    setActiveIdx(0);
    toast.success(`Rodada ${next}: passos restaurados.`);
  }, [map, round, moveLimit, queueMapSave, setMapsCache, setTokensCache]);

  const nextTurn = useCallback(() => {
    if (order.length === 0) return;
    const next = (safeIdx + 1) % order.length;
    if (next === 0) void newRound();
    else setActiveIdx(next);
    setSelectedId(order[next].id);
  }, [order, safeIdx, newRound]);

  const prevTurn = useCallback(() => {
    if (order.length === 0) return;
    const prev = safeIdx <= 0 ? order.length - 1 : safeIdx - 1;
    setActiveIdx(prev);
    setSelectedId(order[prev].id);
  }, [order, safeIdx]);

  // ── Ações de mesa ──
  const createMap = useCallback(async () => {
    const created = await createBattleMap({ name: `Mesa ${maps.length + 1}`, status: 'rascunho' });
    setMapsCache((prev) => [created, ...prev]);
    setMapId(created.id);
    toast.success('Mesa criada.');
  }, [maps.length, setMapsCache]);

  const duplicateMap = useCallback(async () => {
    if (!map) return;
    const copy = await duplicateBattleMap(map.id);
    setMapsCache((prev) => [copy, ...prev]);
    setMapId(copy.id);
    toast.success('Mesa duplicada.');
  }, [map, setMapsCache]);

  const deleteMap = useCallback(async () => {
    if (!map || maps.length <= 1) return;
    if (!window.confirm(`Excluir a mesa "${map.name}" e todas as suas peças?`)) return;
    await deleteBattleMap(map.id);
    setMapsCache((prev) => prev.filter((m) => m.id !== map.id));
    setMapId(null);
    toast.success('Mesa excluída.');
  }, [map, maps.length, setMapsCache]);

  const toggleLive = useCallback(async () => {
    if (!map) return;
    const updated = await setMapLiveStatus(map.id, !isLive);
    setMapsCache((prev) =>
      prev.map((m) => (m.id === map.id ? { ...m, ...updated } : !isLive ? { ...m, status: 'rascunho' } : m)),
    );
    qc.setQueryData(BATTLE_MAP_KEY, { ...map, ...updated });
    toast.success(!isLive ? 'Mesa ao vivo: jogadores e telão sincronizados.' : 'Mesa em rascunho.');
  }, [map, isLive, qc, setMapsCache]);

  const uploadBackground = useCallback(
    async (file: File) => {
      if (!map) return;
      setIsUploading(true);
      try {
        const { fullBlob, width, height } = await processBattleMapBackground(file);
        const url = await uploadBattleMedia(fullBlob, `mapas/${map.id}/bg_${Date.now()}.webp`, 'midias');
        patchMap(
          { background_url: url, img_w: width, img_h: height, origin_x: Math.round(width / 2), origin_y: Math.round(height / 2) },
          true,
        );
        engineRef.current?.zoomFit();
        toast.success('Fundo aplicado.');
      } catch (err) {
        toast.error(`Falha no envio: ${err instanceof Error ? err.message : 'erro'}`);
      } finally {
        setIsUploading(false);
      }
    },
    [map, patchMap],
  );

  // ── Ações de peça ──
  const addTokens = useCallback(
    async (drafts: Array<Partial<BattleToken>>) => {
      if (!map) return;
      const cells = findFreeCells(map, tokens, drafts.length);
      const created = await Promise.all(
        drafts.map((d, i) =>
          createBattleToken({ map_id: map.id, facing: 1, visible: true, moves_left: moveLimit, ...d, ...cells[i] }),
        ),
      );
      setTokensCache((prev) => {
        const ids = new Set(prev.map((t) => t.id));
        return [...prev, ...created.filter((t) => !ids.has(t.id))];
      });
      if (created[0]) {
        setSelectedId(created[0].id);
        engineRef.current?.centerOnToken(created[0].id);
      }
      return created;
    },
    [map, tokens, moveLimit, setTokensCache],
  );

  const addHero = useCallback(
    async (hero: { id: string; name: string | null }) => {
      const name = hero.name || hero.id;
      const media = heroMediaFor(hero.id, name);
      await addTokens([{ kind: 'heroi', hero_id: hero.id, name, media_type: 'video', ...media }]);
      toast.success(`${name} entrou na mesa.`);
    },
    [addTokens],
  );

  const addBeast = useCallback(
    async (beast: { id: string; name: string; image_url?: string | null }, qty: number) => {
      const drafts = Array.from({ length: qty }, (_, i) => ({
        kind: 'fera' as const,
        beast_id: beast.id,
        name: qty > 1 ? `${beast.name} ${i + 1}` : beast.name,
        media_url: beast.image_url || '/batalha/fera_idle.webm',
        media_type: 'video' as const,
        chroma: 'verde',
        anchor_x: 0.284,
        anchor_y: 0.96,
        size: 160,
      }));
      await addTokens(drafts);
      toast.success(`${qty > 1 ? `${qty}× ` : ''}${beast.name} na mesa.`);
    },
    [addTokens],
  );

  const removeToken = useCallback(
    async (id: string) => {
      const t = tokens.find((x) => x.id === id);
      if (!t || !window.confirm(`Remover "${t.name}" da mesa?`)) return;
      setTokensCache((prev) => prev.filter((x) => x.id !== id));
      if (selectedId === id) setSelectedId(null);
      await deleteBattleToken(id);
    },
    [tokens, selectedId, setTokensCache],
  );

  const centerOn = useCallback((id: string) => {
    setSelectedId(id);
    engineRef.current?.centerOnToken(id);
  }, []);

  // Mídia atualizada em outra tela (ex.: bestiário)
  useEffect(() => {
    const handler = (e: Event) => {
      const { id, media } = (e as CustomEvent).detail || {};
      if (!id || !media) return;
      for (const t of tokens) if (t.hero_id === id || t.beast_id === id) patchToken(t.id, media);
    };
    window.addEventListener('peste-media-updated', handler);
    return () => window.removeEventListener('peste-media-updated', handler);
  }, [tokens, patchToken]);

  // ── Atalhos de teclado ──
  const keyRef = useRef({ nextTurn, removeToken, selectedToken, patchToken, centerOn });
  keyRef.current = { nextTurn, removeToken, selectedToken, patchToken, centerOn };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const k = keyRef.current;
      const key = e.key.toLowerCase();
      const toolKey = TOOLS.find((t) => t.key.toLowerCase() === key);
      if (toolKey) return setTool(toolKey.id);
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) k.nextTurn();
        return;
      }
      if (key === '+' || key === '=') return engineRef.current?.zoomIn();
      if (key === '-') return engineRef.current?.zoomOut();
      if (key === '0') return engineRef.current?.zoomFit();
      if (key === 'escape') {
        setSelectedId(null);
        engineRef.current?.clearMeasure();
        return;
      }
      const sel = k.selectedToken;
      if (!sel) return;
      if (key === 'delete' || key === 'backspace') return void k.removeToken(sel.id);
      if (key === 'f') return k.centerOn(sel.id);
      if (key === 'o') return k.patchToken(sel.id, { visible: sel.visible === false });
      const delta: Record<string, [number, number]> = {
        arrowright: [1, 0],
        arrowleft: [-1, 0],
        arrowdown: [0, 1],
        arrowup: [0, -1],
      };
      if (delta[key]) {
        e.preventDefault();
        const [dc, dr] = delta[key];
        k.patchToken(sel.id, { c: (sel.c ?? 0) + dc, r: (sel.r ?? 0) + dr, path: [] });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tabs: Array<{ id: PanelTab; label: string }> = [
    { id: 'pecas', label: 'Peças' },
    { id: 'turno', label: 'Turno' },
    { id: 'mesa', label: 'Mesa' },
  ];

  return (
    <div
      data-testid="dm-battle-editor"
      className="flex-1 min-h-[480px] h-full flex flex-col overflow-hidden bg-[var(--abyss)] text-[var(--text)]"
    >
      {/* Barra superior */}
      <header className="h-12 shrink-0 flex items-center gap-2 px-3 border-b border-[var(--iron)] bg-[var(--stone)]">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${isLive ? 'bg-[#e0645a] animate-pulse' : 'bg-[var(--iron)]'}`}
          title={isLive ? 'Ao vivo' : 'Rascunho'}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-['Cinzel',serif] text-sm text-[var(--gold-hi)]">
            {map?.name ?? (mapsLoading ? 'Carregando…' : 'Sem mesa')}
          </p>
          <p className="text-[11px] text-[var(--muted)] truncate">
            Rodada {round} · {tokens.length} {tokens.length === 1 ? 'peça' : 'peças'}
            {activeToken && <> · turno de {activeToken.name}</>}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleLive}
          disabled={!map}
          data-testid="btn-toggle-live"
          className={`h-8 px-3 flex items-center gap-1.5 border text-xs font-['Cinzel',serif] uppercase tracking-[0.1em] cursor-pointer active:translate-y-px ${
            isLive
              ? 'border-[var(--blood)] text-[#e0645a] hover:bg-[var(--blood)]/15'
              : 'border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] hover:brightness-110'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isLive ? 'Encerrar' : 'Ao vivo'}</span>
        </button>
        <IconButton icon={Tv} label="Abrir telão" onClick={() => window.open('/batalha', '_blank', 'noopener')} />
        <IconButton icon={PanelRight} label="Painel" active={panelOpen} onClick={() => setPanelOpen((v) => !v)} />
      </header>

      <div className="relative flex-1 min-h-0 flex">
        {/* Mapa */}
        <div className={`relative flex-1 min-w-0 ${isLive ? 'shadow-[inset_0_0_0_2px_var(--gold-lo)]' : ''}`}>
          <canvas
            ref={canvasRef}
            data-testid="battle-canvas"
            className={`absolute inset-0 w-full h-full block touch-none ${
              tool === 'pan' ? 'cursor-grab' : 'cursor-crosshair'
            }`}
          />

          {/* Ferramentas */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex gap-1 p-1 border border-[var(--iron)] bg-[var(--stone)]/95 shadow-[0_6px_18px_rgba(0,0,0,0.5)]">
            {TOOLS.map((t) => (
              <IconButton
                key={t.id}
                icon={t.icon}
                label={t.label}
                shortcut={t.key}
                active={tool === t.id}
                onClick={() => setTool(t.id)}
                testId={`tool-${t.id}`}
              />
            ))}
          </div>

          {/* Câmera */}
          <div className="absolute bottom-3 left-3 z-10 flex gap-1 p-1 border border-[var(--iron)] bg-[var(--stone)]/95">
            <IconButton icon={ZoomOut} label="Afastar" shortcut="-" onClick={() => engineRef.current?.zoomOut()} />
            <IconButton icon={ZoomIn} label="Aproximar" shortcut="+" onClick={() => engineRef.current?.zoomIn()} />
            <IconButton icon={Maximize2} label="Mapa inteiro" shortcut="0" onClick={() => engineRef.current?.zoomFit()} />
          </div>

          {/* Turno rápido */}
          {activeToken && (
            <button
              type="button"
              onClick={nextTurn}
              className="absolute bottom-3 right-3 z-10 h-11 pl-3 pr-2 flex items-center gap-2 border border-[var(--gold-lo)] bg-[var(--stone)]/95 cursor-pointer hover:border-[var(--gold)] active:translate-y-px"
              title="Próximo turno (Espaço)"
            >
              <span className="text-left leading-tight">
                <span className="block text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] font-['Cinzel',serif]">
                  Turno · R{round}
                </span>
                <span className="block max-w-[9rem] truncate text-sm text-[var(--gold-hi)]">{activeToken.name}</span>
              </span>
              <SkipForward className="w-4 h-4 text-[var(--gold)]" />
            </button>
          )}

          <p className="hidden lg:block absolute top-3 left-3 z-10 text-[11px] italic text-[var(--muted)] pointer-events-none">
            Duplo clique: ping · Setas movem a peça
          </p>
        </div>

        {/* Painel: lateral no PC, gaveta no celular */}
        {panelOpen && map && (
          <aside className="absolute inset-x-0 bottom-0 z-20 max-h-[62%] md:static md:max-h-none md:w-80 shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-[var(--iron)] bg-[var(--stone)] shadow-[0_-10px_30px_rgba(0,0,0,0.6)] md:shadow-none">
            <div role="tablist" className="flex shrink-0 border-b border-[var(--iron)]">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 h-10 -mb-px border-b-2 font-['Cinzel',serif] text-[11px] uppercase tracking-[0.12em] cursor-pointer ${
                    tab === t.id
                      ? 'border-[var(--gold)] text-[var(--gold-hi)]'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3">
              {tab === 'pecas' && (
                <PiecesPanel
                  tokens={tokens}
                  selectedToken={selectedToken}
                  activeTokenId={activeToken?.id ?? null}
                  heroes={heroes}
                  vitals={vitals}
                  moveLimit={moveLimit}
                  onSelect={setSelectedId}
                  onPatch={patchToken}
                  onRemove={removeToken}
                  onCenter={centerOn}
                  onAddHero={addHero}
                  onAddBeast={addBeast}
                  onEditMedia={(t) =>
                    setMediaTarget({
                      id: t.hero_id || t.beast_id || t.id,
                      name: t.name,
                      kind: t.kind,
                      media_url: t.media_url,
                      chroma: t.chroma,
                      anchor_x: t.anchor_x,
                      anchor_y: t.anchor_y,
                      size: t.size,
                      facing: t.facing,
                    })
                  }
                />
              )}
              {tab === 'turno' && (
                <TurnPanel
                  order={order}
                  activeIdx={safeIdx}
                  round={round}
                  moveLimit={moveLimit}
                  onSetActive={(i) => {
                    setActiveIdx(i);
                    setSelectedId(order[i]?.id ?? null);
                  }}
                  onNext={nextTurn}
                  onPrev={prevTurn}
                  onNewRound={newRound}
                  onReorder={reorder}
                  onPatch={patchToken}
                />
              )}
              {tab === 'mesa' && (
                <TablePanel
                  map={map}
                  maps={maps}
                  isUploading={isUploading}
                  onSelectMap={setMapId}
                  onCreate={createMap}
                  onDuplicate={duplicateMap}
                  onDelete={deleteMap}
                  onRename={(name) => patchMap({ name }, true)}
                  onPatch={(p) => patchMap(p)}
                  onUpload={uploadBackground}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {mediaTarget && (
        <MediaBattleModal
          isOpen
          targetType={(mediaTarget.kind as 'heroi' | 'fera') || 'heroi'}
          targetData={mediaTarget}
          onClose={() => setMediaTarget(null)}
          onMediaSaved={(u) => {
            const patch = {
              media_url: u.media_url,
              chroma: u.chroma,
              anchor_x: u.anchor_x,
              anchor_y: u.anchor_y,
              size: u.size,
              facing: u.facing,
            };
            for (const t of tokens) {
              if (t.hero_id === u.id || t.beast_id === u.id || t.id === u.id) patchToken(t.id, patch);
            }
          }}
        />
      )}
    </div>
  );
}
