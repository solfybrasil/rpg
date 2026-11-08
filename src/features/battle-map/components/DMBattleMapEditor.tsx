import { useQueryClient } from '@tanstack/react-query';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MousePointer,
  Pencil,
  Eraser,
  Hand,
  Plus,
  Copy,
  Trash2,
  Edit2,
  Tv,
  Eye,
  EyeOff,
  Radio,
  RotateCcw,
  Sparkles,
  Shield,
  Skull,
  Search,
  Upload,
  Layers,
  ArrowRightLeft,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  X,
  Loader2,
  Film,
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  Footprints,
  Sword,
} from 'lucide-react';
import { toast } from 'sonner';
import { BATTLE_MAP_KEY, BATTLE_TOKENS_KEY } from '../api/useBattle.ts';
import { BattleEngine } from '../engine/BattleEngine.ts';
import type { BattleEditorTool, BattleMap, BattleToken } from '../engine/types.ts';
import {
  createBattleMap,
  createBattleToken,
  deleteBattleMap,
  deleteBattleToken,
  duplicateBattleMap,
  fetchActiveBattleMap,
  fetchBattleMaps,
  fetchBattleTokens,
  fetchCreatureCatalog,
  novaRodadaRPC,
  setMapLiveStatus,
  updateBattleMap,
  updateBattleToken,
} from '../api/battleApi.ts';
import {
  processBattleMapBackground,
  uploadBattleMedia,
} from '../media/mediaProcessor.ts';
import { MediaBattleModal, type MediaBattleTarget } from './MediaBattleModal.tsx';
import {
  TurnPanel,
  ToolBar,
  CameraControls,
  TopBar,
  RightPanel,
} from './DMMapSubComponents.tsx';

export function DMBattleMapEditor() {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BattleEngine | null>(null);

  // Estados principais
  const [maps, setMaps] = useState<BattleMap[]>([]);
  const [currentMap, setCurrentMap] = useState<BattleMap | null>(null);
  const [tokens, setTokens] = useState<BattleToken[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

  // Ferramenta e abas
  const [activeTool, setActiveTool] = useState<BattleEditorTool>('select');
  const [activeTab, setActiveTab] = useState<'mesa' | 'pecas' | 'terreno' | 'midia'>('mesa');

  // Modais
  const [showAddHeroModal, setShowAddHeroModal] = useState(false);
  const [showAddBeastModal, setShowAddBeastModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [mediaModalTarget, setMediaModalTarget] = useState<MediaBattleTarget | null>(null);

  // Busca no bestiário
  const [beastSearch, setBeastSearch] = useState('');
  const [beastResults, setBeastResults] = useState<any[]>([]);
  const [beastSearchLoading, setBeastSearchLoading] = useState(false);
  const [beastQuantity, setBeastQuantity] = useState(1);

  // Fundo
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const fileInputBgRef = useRef<HTMLInputElement | null>(null);

  // Métricas
  const fpsRef = useRef<HTMLSpanElement | null>(null);

  // Debounce autosave ref
  const autosaveTimerRef = useRef<any>(null);
  const currentMapRef = useRef(currentMap);
  currentMapRef.current = currentMap;

  // Handler estável e reativo para atualizar bloqueios do mapa
  const handleUpdateBlocked = useCallback((blocked: string[]) => {
    const map = currentMapRef.current;
    if (!map) return;
    const updated = { ...map, blocked };
    setCurrentMap(updated);
    queryClient.setQueryData(BATTLE_MAP_KEY, updated);

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        await updateBattleMap(map.id, { blocked });
        toast.success(`Bloqueios atualizados (${blocked.length} células)`, { duration: 1200 });
      } catch (err) {
        console.warn('[AUTOSAVE BLOCKED]', err);
      }
    }, 350);
  }, [queryClient]);

  const onUpdateBlockedRef = useRef(handleUpdateBlocked);
  onUpdateBlockedRef.current = handleUpdateBlocked;

  // ── Sistema de Turno & Movimentação ──
  const [activeTurnIdx, setActiveTurnIdx] = useState(0);
  const [showTurnDrawer, setShowTurnDrawer] = useState(true);
  const [showBgModal, setShowBgModal] = useState(false);

  // Fila de iniciativa dos combatentes
  const turnOrderTokens = useMemo(() => {
    return [...tokens].sort((a, b) => {
      if (a.kind === 'heroi' && b.kind !== 'heroi') return -1;
      if (a.kind !== 'heroi' && b.kind === 'heroi') return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [tokens]);

  const activeTurnToken = turnOrderTokens[activeTurnIdx] || turnOrderTokens[0] || null;

  // ── Derived values (memoized) ──
  const selectedToken = useMemo(
    () => tokens.find((t) => t.id === selectedTokenId) || null,
    [tokens, selectedTokenId],
  );
  const isLive = useMemo(() => currentMap?.status === 'ao_vivo', [currentMap?.status]);

  // ── useCallback: turn helpers ──
  const advanceTurn = useCallback(() => {
    if (turnOrderTokens.length === 0) return;
    const nextIdx = (activeTurnIdx + 1) % turnOrderTokens.length;
    setActiveTurnIdx(nextIdx);
    const nextToken = turnOrderTokens[nextIdx];
    if (nextToken) {
      setSelectedTokenId(nextToken.id);
      if (nextIdx === 0 && currentMap) {
        handleNovaRodada();
      } else {
        toast.info(`Turno de ${nextToken.name}!`, { icon: '⚔' });
      }
    }
  }, [turnOrderTokens, activeTurnIdx, currentMap]);

  const previousTurn = useCallback(() => {
    if (turnOrderTokens.length === 0) return;
    const prevIdx = activeTurnIdx <= 0 ? turnOrderTokens.length - 1 : activeTurnIdx - 1;
    setActiveTurnIdx(prevIdx);
    const prevToken = turnOrderTokens[prevIdx];
    if (prevToken) {
      setSelectedTokenId(prevToken.id);
      toast.info(`Turno de ${prevToken.name}!`, { icon: '⚔' });
    }
  }, [turnOrderTokens, activeTurnIdx]);

  const selectActiveMover = useCallback((token: BattleToken, idx: number) => {
    setActiveTurnIdx(idx);
    setSelectedTokenId(token.id);
  }, []);

  const adjustTokenMoves = useCallback((tokenId: string, delta: number) => {
    setTokens((prev) =>
      prev.map((t) => {
        if (t.id !== tokenId) return t;
        const maxMoves = currentMap?.move_limit || 6;
        const cur = t.moves_left ?? maxMoves;
        const next = Math.max(0, Math.min(maxMoves, cur + delta));
        updateBattleToken(tokenId, { moves_left: next }).catch(() => {});
        return { ...t, moves_left: next };
      }),
    );
  }, [currentMap?.move_limit]);

  const resetTokenMoves = useCallback((tokenId: string) => {
    const maxMoves = currentMap?.move_limit || 6;
    setTokens((prev) =>
      prev.map((t) => {
        if (t.id !== tokenId) return t;
        updateBattleToken(tokenId, { moves_left: maxMoves }).catch(() => {});
        return { ...t, moves_left: maxMoves };
      }),
    );
    toast.success('Passos restaurados!');
  }, [currentMap?.move_limit]);

  // Atalho de teclado para alternar turno (Espaço)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        advanceTurn();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advanceTurn]);

  // ── 1. Carrega Mesas Iniciais ──
  const loadMaps = useCallback(async (selectMapId?: string) => {
    try {
      const data = await fetchBattleMaps();
      setMaps(data);
      let target: BattleMap | undefined;
      if (selectMapId) {
        target = data.find((m) => m.id === selectMapId);
      }
      if (!target) {
        target = data.find((m) => m.status === 'ao_vivo') || data[0];
      }
      if (target) {
        setCurrentMap(target);
        queryClient.setQueryData(BATTLE_MAP_KEY, target);
      }
    } catch (_) {}
  }, [queryClient]);

  useEffect(() => {
    loadMaps();
  }, [loadMaps]);

  // ── 2. Carrega Tokens ao Mudar de Mesa ──
  useEffect(() => {
    if (!currentMap?.id) return;

    fetchBattleTokens(currentMap.id).then((toks) => {
      setTokens(toks);
      queryClient.setQueryData(BATTLE_TOKENS_KEY(currentMap.id), toks);
      if (toks.length > 0 && !selectedTokenId) {
        setSelectedTokenId(toks[0].id);
      }
    });
  }, [currentMap?.id, queryClient]);

  // ── 3. Inicializa Motor BattleEngine no Canvas ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new BattleEngine(canvas, {
      mode: 'dm',
      tool: activeTool,
      selectedTokenId,
      onSelectTokenId: (id) => setSelectedTokenId(id),
      onSelectToken: (tok) => setSelectedTokenId(tok?.id || null),
      onUpdateBlocked: (blocked) => {
        onUpdateBlockedRef.current(blocked);
      },
      onMoveTokenDirect: (tokenId, c, r) => {
        setTokens((prev) => {
          const next = prev.map((t) => (t.id === tokenId ? { ...t, c, r } : t));
          if (currentMap?.id) {
            queryClient.setQueryData(BATTLE_TOKENS_KEY(currentMap.id), next);
          }
          return next;
        });
        updateBattleToken(tokenId, { c, r }).catch(() => {});
      },
      onFpsUpdate: (curFps) => {
        if (fpsRef.current) {
          fpsRef.current.textContent = `${curFps} FPS`;
        }
      },
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // ── 4. Atualiza Propriedades do Motor ao Alterar Estados ──
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setOptions({
      tool: activeTool,
      selectedTokenId,
      onUpdateBlocked: (blocked) => onUpdateBlockedRef.current(blocked),
    });
  }, [activeTool, selectedTokenId]);

  useEffect(() => {
    if (!engineRef.current || !currentMap) return;
    engineRef.current.setMap(currentMap);
  }, [currentMap]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setTokens(tokens);
  }, [tokens]);

  // ── 5. Escuta evento global peste-media-updated para atualizar tokens ──
  useEffect(() => {
    const handleMediaUpdated = (e: any) => {
      const { id, media } = e.detail || {};
      setTokens((prev) =>
        prev.map((t) =>
          t.hero_id === id || t.beast_id === id ? { ...t, ...media } : t,
        ),
      );
    };

    window.addEventListener('peste-media-updated', handleMediaUpdated);
    return () => window.removeEventListener('peste-media-updated', handleMediaUpdated);
  }, []);

  // ── 6. Busca no Bestiário (Servidor) — com debounce ──
  useEffect(() => {
    if (!showAddBeastModal) return;
    const t = setTimeout(() => {
      setBeastSearchLoading(true);
      fetchCreatureCatalog(beastSearch, 30)
        .then(setBeastResults)
        .finally(() => setBeastSearchLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [beastSearch, showAddBeastModal]);

  // ── 7. Autosave com Debounce ──
  const queueMapAutosave = useCallback((updates: Partial<BattleMap>) => {
    if (!currentMap) return;
    const updated = { ...currentMap, ...updates };
    setCurrentMap(updated);
    queryClient.setQueryData(BATTLE_MAP_KEY, updated);

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        await updateBattleMap(currentMap.id, updates);
      } catch (err) {
        console.warn('[AUTOSAVE MAP]', err);
      }
    }, 350);
  }, [currentMap, queryClient]);

  const updateSelectedTokenLocally = useCallback((updates: Partial<BattleToken>) => {
    if (!selectedTokenId) return;
    setTokens((prev) => {
      const next = prev.map((t) => (t.id === selectedTokenId ? { ...t, ...updates } : t));
      if (currentMap?.id) {
        queryClient.setQueryData(BATTLE_TOKENS_KEY(currentMap.id), next);
      }
      return next;
    });

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        await updateBattleToken(selectedTokenId, updates);
      } catch (err) {
        console.warn('[AUTOSAVE TOKEN]', err);
      }
    }, 350);
  }, [selectedTokenId, currentMap?.id, queryClient]);

  // ── AÇÕES DE MAPA ──

  const handleCreateMap = useCallback(async () => {
    try {
      const newMap = await createBattleMap({
        name: `Mesa ${maps.length + 1}`,
        background_url: '/batalha/santuario.jpg',
        tile_size: 86,
        origin_x: 690,
        origin_y: 418,
        move_limit: 6,
        status: 'rascunho',
      });
      setMaps((prev) => [newMap, ...prev]);
      setCurrentMap(newMap);
      toast.success('Nova mesa criada com sucesso!');
    } catch (_) {
      toast.error('Erro ao criar mesa.');
    }
  }, [maps.length]);

  const handleDuplicateMap = useCallback(async () => {
    if (!currentMap) return;
    try {
      const copy = await duplicateBattleMap(currentMap.id);
      setMaps((prev) => [copy, ...prev]);
      setCurrentMap(copy);
      toast.success('Mesa duplicada!');
    } catch (_) {
      toast.error('Erro ao duplicar mesa.');
    }
  }, [currentMap]);

  const handleDeleteMap = useCallback(async () => {
    if (!currentMap) return;
    if (maps.length <= 1) {
      toast.error('É necessário manter pelo menos uma mesa.');
      return;
    }
    if (!window.confirm(`Deseja excluir permanentemente a mesa "${currentMap.name}"?`)) {
      return;
    }
    try {
      await deleteBattleMap(currentMap.id);
      const remaining = maps.filter((m) => m.id !== currentMap.id);
      setMaps(remaining);
      setCurrentMap(remaining[0] || null);
      toast.success('Mesa excluída.');
    } catch (_) {
      toast.error('Erro ao excluir mesa.');
    }
  }, [currentMap, maps]);

  const handleToggleLive = useCallback(async () => {
    if (!currentMap) return;
    const live = currentMap.status === 'ao_vivo';
    try {
      const updated = await setMapLiveStatus(currentMap.id, !live);
      setCurrentMap(updated);
      queryClient.setQueryData(BATTLE_MAP_KEY, updated);
      setMaps((prev) =>
        prev.map((m) =>
          m.id === updated.id
            ? updated
            : !live
              ? { ...m, status: 'rascunho' }
              : m,
        ),
      );
      if (!live) {
        toast.success('MESA AO VIVO! Telão e jogadores sincronizados.', {
          icon: '🔥',
        });
      } else {
        toast.info('Mesa em modo rascunho.');
      }
    } catch (_) {
      toast.error('Erro ao alternar status da mesa.');
    }
  }, [currentMap, queryClient]);

  const handleBgUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentMap) return;

    setIsUploadingBg(true);
    try {
      const { fullBlob, width, height } = await processBattleMapBackground(file);
      const timestamp = Date.now();
      const publicUrl = await uploadBattleMedia(
        fullBlob,
        `mapas/${currentMap.id}/bg_${timestamp}.webp`,
        'midias',
      );

      const updates = {
        background_url: publicUrl,
        img_w: width,
        img_h: height,
        origin_x: Math.round(width / 2),
        origin_y: Math.round(height / 2),
      };

      await updateBattleMap(currentMap.id, updates);
      setCurrentMap((prev) => (prev ? { ...prev, ...updates } : null));
      toast.success('Imagem de fundo otimizada (WebP 2048px) aplicada!');
    } catch (err: any) {
      toast.error(`Falha no upload do fundo: ${err.message || 'Erro'}`);
    } finally {
      setIsUploadingBg(false);
    }
  }, [currentMap]);

  const handleNovaRodada = useCallback(async () => {
    if (!currentMap) return;
    try {
      const res = await novaRodadaRPC(currentMap.id);
      if (res.success) {
        setCurrentMap((prev) => (prev ? { ...prev, round: res.round } : null));
        setTokens((prev) =>
          prev.map((t) =>
            t.kind === 'heroi' ? { ...t, moves_left: currentMap.move_limit || 6 } : t,
          ),
        );
        toast.success(`Rodada ${res.round} iniciada! Movimentos restaurados.`);
      }
    } catch (_) {
      toast.error('Erro ao iniciar nova rodada.');
    }
  }, [currentMap]);

  // ── AÇÕES DE TOKEN ──

  const handleAddHero = useCallback(async (heroPreset: {
    id: string;
    name: string;
    media_url: string;
    chroma: string;
    anchor_x: number;
    anchor_y: number;
    size: number;
  }) => {
    if (!currentMap) return;

    try {
      const offset = tokens.length;
      const newToken = await createBattleToken({
        map_id: currentMap.id,
        kind: 'heroi',
        hero_id: heroPreset.id,
        name: heroPreset.name,
        media_url: heroPreset.media_url,
        media_type: 'video',
        chroma: heroPreset.chroma,
        anchor_x: heroPreset.anchor_x,
        anchor_y: heroPreset.anchor_y,
        size: heroPreset.size,
        facing: 1,
        c: -1 - (offset % 3),
        r: 2 + Math.floor(offset / 3),
        moves_left: currentMap.move_limit || 6,
        visible: true,
      });

      setTokens((prev) => [...prev, newToken]);
      setSelectedTokenId(newToken.id);
      setShowAddHeroModal(false);
      toast.success(`${heroPreset.name} adicionado(a) à mesa!`);
    } catch (_) {
      toast.error('Erro ao adicionar herói.');
    }
  }, [currentMap, tokens.length]);

  const handleAddBeastFromCatalog = useCallback(async (beast: any, qty = 1) => {
    if (!currentMap) return;
    const count = Math.max(1, Math.min(20, qty));

    try {
      const created: BattleToken[] = [];
      const offset = tokens.length;

      for (let i = 0; i < count; i++) {
        const tokenName = count > 1 ? `${beast.name} ${i + 1}` : beast.name;
        const col = 2 + (i % 3);
        const row = Math.floor(i / 3);

        const newToken = await createBattleToken({
          map_id: currentMap.id,
          kind: 'fera',
          beast_id: beast.id,
          name: tokenName,
          media_url: beast.image_url || '/batalha/fera_idle.webm',
          media_type: 'video',
          chroma: 'verde',
          anchor_x: 0.284,
          anchor_y: 0.96,
          size: 160,
          facing: 1,
          c: col,
          r: row,
          moves_left: 6,
          visible: true,
        });
        created.push(newToken);
      }

      setTokens((prev) => [...prev, ...created]);
      if (created.length > 0) setSelectedTokenId(created[0].id);
      setShowAddBeastModal(false);
      toast.success(`${count > 1 ? `${count}x ` : ''}${beast.name} posicionado(s)!`);
    } catch (_) {
      toast.error('Erro ao adicionar fera.');
    }
  }, [currentMap, tokens.length]);

  const handleRemoveToken = useCallback(async () => {
    if (!selectedTokenId) return;
    try {
      await deleteBattleToken(selectedTokenId);
      setTokens((prev) => prev.filter((t) => t.id !== selectedTokenId));
      setSelectedTokenId(null);
      toast.success('Peça removida da mesa.');
    } catch (_) {
      toast.error('Erro ao remover peça.');
    }
  }, [selectedTokenId]);

  // ── Callbacks for CameraControls ──
  const handleZoomIn = useCallback(() => engineRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => engineRef.current?.zoomOut(), []);
  const handleZoomFit = useCallback(() => engineRef.current?.zoomFit(), []);

  return (
    <div
      data-testid="dm-battle-editor"
      className="relative flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-[#08080a] text-[#ebe6d6]"
    >
      {/* ── Top Bar: Glass-morphism fina estilo LOTR ── */}
      <TopBar
        currentMap={currentMap}
        isLive={isLive}
        tokens={tokens}
        setShowBgModal={setShowBgModal}
        selectedToken={selectedToken}
        activeTurnToken={activeTurnToken}
        setMediaModalTarget={setMediaModalTarget}
        showTurnDrawer={showTurnDrawer}
        setShowTurnDrawer={setShowTurnDrawer}
        handleNovaRodada={handleNovaRodada}
        advanceTurn={advanceTurn}
      />

      {/* ── Área Central do Editor ── */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Mapa / Canvas ao Centro */}
        <div
          className={`relative flex-1 h-full overflow-hidden transition-all duration-300 ${
            isLive ? 'ring-2 ring-[#f5b65b]/50 shadow-[inset_0_0_40px_rgba(245,182,91,0.15)]' : ''
          }`}
          style={{ willChange: 'transform' }}
        >
          <canvas
            ref={canvasRef}
            style={{ willChange: 'transform' }}
            className="w-full h-full block cursor-crosshair touch-none"
          />

          {/* ── Painel de Turno: Compacto, Flutuante, Estilo LOTR ── */}
          <TurnPanel
            activeTurnToken={activeTurnToken}
            activeTurnIdx={activeTurnIdx}
            turnOrderTokens={turnOrderTokens}
            currentMap={currentMap}
            showTurnDrawer={showTurnDrawer}
            setShowTurnDrawer={setShowTurnDrawer}
            advanceTurn={advanceTurn}
            previousTurn={previousTurn}
            selectActiveMover={selectActiveMover}
            adjustTokenMoves={adjustTokenMoves}
            resetTokenMoves={resetTokenMoves}
            setMediaModalTarget={setMediaModalTarget}
          />

          {/* Barra de Ferramentas Flutuante em Cima do Mapa */}
          <ToolBar activeTool={activeTool} setActiveTool={setActiveTool} />

          {/* Controles de Câmera (Zoom) Flutuantes */}
          <CameraControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomFit={handleZoomFit}
            fpsRef={fpsRef}
          />
        </div>

        {/* ── Painel Direito Fino (320px) ── */}
        <RightPanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          currentMap={currentMap}
          maps={maps}
          tokens={tokens}
          selectedToken={selectedToken}
          selectedTokenId={selectedTokenId}
          setSelectedTokenId={setSelectedTokenId}
          isLive={isLive}
          handleToggleLive={handleToggleLive}
          handleCreateMap={handleCreateMap}
          handleDuplicateMap={handleDuplicateMap}
          handleDeleteMap={handleDeleteMap}
          handleNovaRodada={handleNovaRodada}
          setShowRenameModal={setShowRenameModal}
          setRenameInput={setRenameInput}
          queueMapAutosave={queueMapAutosave}
          updateSelectedTokenLocally={updateSelectedTokenLocally}
          handleRemoveToken={handleRemoveToken}
          setShowAddHeroModal={setShowAddHeroModal}
          setShowAddBeastModal={setShowAddBeastModal}
          setMediaModalTarget={setMediaModalTarget}
          fileInputBgRef={fileInputBgRef}
          handleBgUpload={handleBgUpload}
          isUploadingBg={isUploadingBg}
          beastSearch={beastSearch}
          beastResults={beastResults}
          beastSearchLoading={beastSearchLoading}
          beastQuantity={beastQuantity}
          setBeastSearch={setBeastSearch}
          setBeastQuantity={setBeastQuantity}
          handleAddHero={handleAddHero}
          handleAddBeastFromCatalog={handleAddBeastFromCatalog}
          setCurrentMap={setCurrentMap}
          queryClient={queryClient}
          BATTLE_MAP_KEY={BATTLE_MAP_KEY}
        />
      </div>

      {/* ── Modal de Mídia de Batalha (FFmpeg + Croma) ── */}
      {mediaModalTarget && (
        <MediaBattleModal
          isOpen={Boolean(mediaModalTarget)}
          targetType={(mediaModalTarget.kind as any) || 'heroi'}
          targetData={mediaModalTarget}
          onClose={() => setMediaModalTarget(null)}
          onMediaSaved={(updated) => {
            // Atualiza peças vinculadas na hora
            setTokens((prev) =>
              prev.map((t) =>
                t.hero_id === updated.id || t.beast_id === updated.id
                  ? {
                      ...t,
                      media_url: updated.media_url,
                      chroma: updated.chroma,
                      anchor_x: updated.anchor_x,
                      anchor_y: updated.anchor_y,
                      size: updated.size,
                      facing: updated.facing,
                    }
                  : t,
              ),
            );
          }}
        />
      )}

      {/* ── Modal Adicionar Herói ── */}
      {showAddHeroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111114] border border-[#26262a] rounded-2xl p-6 shadow-2xl text-[#ebe6d6]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-cinzel font-semibold text-sm text-[#f5b65b]">
                Adicionar Herói da Campanha
              </h3>
              <button
                type="button"
                onClick={() => setShowAddHeroModal(false)}
                className="text-[#8a8a93] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                {
                  id: 'malenia',
                  name: 'Malenia',
                  media_url: '/batalha/malenia_idle.webm',
                  chroma: 'verde',
                  anchor_x: 0.487,
                  anchor_y: 0.985,
                  size: 172,
                },
                {
                  id: 'kaelis_moonfire',
                  name: 'A Tecelã da Névoa (Kaelis)',
                  media_url: '/batalha/kaelis_idle.webm',
                  chroma: 'magenta',
                  anchor_x: 0.486,
                  anchor_y: 0.985,
                  size: 166,
                },
                {
                  id: 'tor_bjorn',
                  name: 'Tor Bjorn',
                  media_url: '/batalha/tor_idle.webm',
                  chroma: 'verde',
                  anchor_x: 0.412,
                  anchor_y: 0.954,
                  size: 130,
                },
              ].map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => handleAddHero(h)}
                  className="w-full p-3 rounded-xl border border-[#26262a] bg-[#16161a] hover:bg-[#26262a] hover:border-[#f5b65b]/40 flex items-center justify-between text-xs transition-colors"
                >
                  <span className="font-semibold text-[#ebe6d6]">{h.name}</span>
                  <span className="text-[11px] text-[#f5b65b]">Posicionar ↗</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Adicionar Fera do Catálogo (Servidor) ── */}
      {showAddBeastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#111114] border border-[#26262a] rounded-2xl p-6 shadow-2xl text-[#ebe6d6] flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-cinzel font-semibold text-sm text-[#c8423a]">
                Adicionar Fera do Bestiário
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBeastModal(false)}
                className="text-[#8a8a93] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Busca e Quantidade */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8a8a93]" />
                <input
                  type="text"
                  placeholder="Buscar fera no catálogo..."
                  value={beastSearch}
                  onChange={(e) => setBeastSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#16161a] border border-[#26262a] rounded-xl text-xs text-[#ebe6d6] focus:border-[#c8423a] focus:outline-none"
                />
              </div>
              <div className="w-24">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={beastQuantity}
                  onChange={(e) => setBeastQuantity(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-2 py-2 bg-[#16161a] border border-[#26262a] rounded-xl text-xs text-center text-[#ebe6d6] focus:border-[#c8423a] focus:outline-none"
                  title="Quantidade a invocar"
                />
              </div>
            </div>

            {/* Lista do Servidor */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {beastSearchLoading ? (
                <div className="py-8 text-center text-xs text-[#8a8a93] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#c8423a]" />
                  Consultando catálogo do servidor…
                </div>
              ) : beastResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8a8a93]">
                  Nenhuma criatura encontrada.
                </div>
              ) : (
                beastResults.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleAddBeastFromCatalog(b, beastQuantity)}
                    className="w-full p-3 rounded-xl border border-[#26262a] bg-[#16161a] hover:bg-[#26262a] hover:border-[#c8423a]/40 text-left text-xs transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-[#ebe6d6]">{b.name}</div>
                      <div className="text-[11px] text-[#8a8a93]">
                        {b.category || b.species || 'Criatura'} · Ameaça {b.threat || 1}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#c8423a]">
                      +{beastQuantity} {beastQuantity > 1 ? 'peças' : 'peça'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Renomear Mesa ── */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#111114] border border-[#26262a] rounded-2xl p-6 shadow-2xl text-[#ebe6d6]">
            <h3 className="font-cinzel font-semibold text-sm text-[#f5b65b] mb-3">
              Renomear Mesa
            </h3>
            <input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              className="w-full px-3 py-2 bg-[#16161a] border border-[#26262a] rounded-xl text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#26262a] text-xs text-[#8a8a93]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (currentMap && renameInput.trim()) {
                    await updateBattleMap(currentMap.id, { name: renameInput.trim() });
                    setCurrentMap((prev) => (prev ? { ...prev, name: renameInput.trim() } : null));
                    setMaps((prev) =>
                      prev.map((m) =>
                        m.id === currentMap.id ? { ...m, name: renameInput.trim() } : m,
                      ),
                    );
                    setShowRenameModal(false);
                    toast.success('Mesa renomeada!');
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-[#f5b65b] text-[#111114] text-xs font-semibold"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal Trocar Imagem de Fundo & Grade ── */}
      {showBgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#14100c] border border-[#6f5536] rounded-2xl p-6 shadow-2xl text-[#e2d5bd]">
            <div className="flex items-center justify-between mb-4 border-b border-[#423326] pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#c5a36a]" />
                <h3 className="font-cinzel font-bold text-base text-[#e4c894]">
                  Trocar Fundo do Mapa de Batalha
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBgModal(false)}
                className="text-[#a99a82] hover:text-[#e2d5bd] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Opção 1: Upload de Nova Imagem */}
              <div>
                <label className="text-xs font-cinzel font-bold text-[#c5a36a] uppercase mb-1.5 block">
                  1. Carregar Arquivo de Imagem
                </label>
                <button
                  type="button"
                  disabled={isUploadingBg}
                  onClick={() => fileInputBgRef.current?.click()}
                  className="w-full py-3 px-4 rounded-xl border border-dashed border-[#6f5536] bg-[#1a1410] hover:bg-[#261f18] text-xs font-serif text-[#e4c894] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isUploadingBg ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#c5a36a]" />
                      <span>Otimizando e enviando imagem (2048px WebP)...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-[#c5a36a]" />
                      <span>Clique para escolher imagem do computador (JPG, PNG, WebP)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Opção 2: Cenários Prontos / Presets */}
              <div>
                <label className="text-xs font-cinzel font-bold text-[#c5a36a] uppercase mb-1.5 block">
                  2. Cenários Disponíveis
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      name: 'Santuário dos Jurados',
                      desc: 'Pedra ancestral e relíquias',
                      url: '/batalha/santuario.jpg',
                    },
                    {
                      name: 'Papiro de Cartografia',
                      desc: 'Pergaminho de mapa antigo',
                      url: '/parchment-bg.jpg',
                    },
                  ].map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={async () => {
                        if (!currentMap) return;
                        const updates = { background_url: preset.url };
                        await updateBattleMap(currentMap.id, updates);
                        setCurrentMap((prev) => (prev ? { ...prev, ...updates } : null));
                        toast.success(`Fundo alterado para: ${preset.name}!`);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        currentMap?.background_url === preset.url
                          ? 'border-[#c5a36a] bg-[#261f18] shadow-md'
                          : 'border-[#423326] bg-[#181310] hover:bg-[#201914] text-[#a99a82] hover:text-[#e2d5bd]'
                      }`}
                    >
                      <div className="font-cinzel font-bold text-xs text-[#e4c894] truncate">
                        {preset.name}
                      </div>
                      <div className="text-[11px] font-serif text-[#a99a82] mt-0.5">
                        {preset.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Opção 3: Ajustes Rápidos da Grade */}
              <div className="pt-3 border-t border-[#423326] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-cinzel text-[#c5a36a]">Ajustes da Grade Tática</span>
                  <button
                    type="button"
                    onClick={() =>
                      queueMapAutosave({ show_grid: currentMap?.show_grid === false })
                    }
                    className="text-[11px] font-cinzel text-[#e4c894] hover:underline"
                  >
                    {currentMap?.show_grid === false ? 'Mostrar Grade' : 'Ocultar Grade'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] text-[#a99a82] mb-1">
                      <span>Tamanho do Quadrado</span>
                      <span className="font-mono text-[#e4c894]">{currentMap?.tile_size || 86}px</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="140"
                      step="2"
                      value={currentMap?.tile_size || 86}
                      onChange={(e) => queueMapAutosave({ tile_size: Number(e.target.value) })}
                      className="w-full accent-[#c5a36a] bg-[#261f18] h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-[#a99a82] mb-1">
                      <span>Limite de Passos</span>
                      <span className="font-mono text-[#e4c894]">{currentMap?.move_limit || 6}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      step="1"
                      value={currentMap?.move_limit || 6}
                      onChange={(e) => queueMapAutosave({ move_limit: Number(e.target.value) })}
                      className="w-full accent-[#c5a36a] bg-[#261f18] h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-2 border-t border-[#423326]">
              <button
                type="button"
                onClick={() => setShowBgModal(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8c6c3d] to-[#c5a36a] text-[#100e0c] text-xs font-cinzel font-bold hover:brightness-110 shadow-md"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
