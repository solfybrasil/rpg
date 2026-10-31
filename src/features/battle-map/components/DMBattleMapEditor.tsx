import { useQueryClient } from '@tanstack/react-query';
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
        queueMapAutosave({ blocked });
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

  // ── 6. Busca no Bestiário (Servidor) ──
  useEffect(() => {
    if (!showAddBeastModal) return;

    let isMounted = true;
    setBeastSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await fetchCreatureCatalog(beastSearch, 20);
        if (isMounted) setBeastResults(results);
      } catch (_) {
      } finally {
        if (isMounted) setBeastSearchLoading(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [showAddBeastModal, beastSearch]);

  // ── 7. Autosave com Debounce ──
  const queueMapAutosave = (updates: Partial<BattleMap>) => {
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
  };

  const updateSelectedTokenLocally = (updates: Partial<BattleToken>) => {
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
  };

  // ── AÇÕES DE MAPA ──

  const handleCreateMap = async () => {
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
  };

  const handleDuplicateMap = async () => {
    if (!currentMap) return;
    try {
      const copy = await duplicateBattleMap(currentMap.id);
      setMaps((prev) => [copy, ...prev]);
      setCurrentMap(copy);
      toast.success('Mesa duplicada!');
    } catch (_) {
      toast.error('Erro ao duplicar mesa.');
    }
  };

  const handleDeleteMap = async () => {
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
  };

  const handleToggleLive = async () => {
    if (!currentMap) return;
    const isLive = currentMap.status === 'ao_vivo';
    try {
      const updated = await setMapLiveStatus(currentMap.id, !isLive);
      setCurrentMap(updated);
      queryClient.setQueryData(BATTLE_MAP_KEY, updated);
      setMaps((prev) =>
        prev.map((m) =>
          m.id === updated.id
            ? updated
            : !isLive
              ? { ...m, status: 'rascunho' }
              : m,
        ),
      );
      if (!isLive) {
        toast.success('MESA AO VIVO! Telão e jogadores sincronizados.', {
          icon: '🔥',
        });
      } else {
        toast.info('Mesa em modo rascunho.');
      }
    } catch (_) {
      toast.error('Erro ao alternar status da mesa.');
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleNovaRodada = async () => {
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
  };

  // ── AÇÕES DE TOKEN ──

  const handleAddHero = async (heroPreset: {
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
  };

  const handleAddBeastFromCatalog = async (beast: any, qty = 1) => {
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
  };

  const handleRemoveToken = async () => {
    if (!selectedTokenId) return;
    try {
      await deleteBattleToken(selectedTokenId);
      setTokens((prev) => prev.filter((t) => t.id !== selectedTokenId));
      setSelectedTokenId(null);
      toast.success('Peça removida da mesa.');
    } catch (_) {
      toast.error('Erro ao remover peça.');
    }
  };

  const selectedToken = tokens.find((t) => t.id === selectedTokenId) || null;
  const isLive = currentMap?.status === 'ao_vivo';

  return (
    <div
      data-testid="dm-battle-editor"
      className="relative flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-[#08080a] text-[#ebe6d6]"
    >
      {/* ── Top Bar de Navegação / Ações do Mestre ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#26262a] bg-[#111114] z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isLive
                  ? 'bg-[#c8423a] shadow-[0_0_8px_#c8423a]'
                  : 'bg-[#8a8a93]'
              }`}
            />
            <span className="font-cinzel font-semibold text-sm text-[#ebe6d6]">
              {currentMap?.name || 'Mesa de Batalha'}
            </span>
          </div>

          {isLive && (
            <span
              data-testid="live-indicator-badge"
              className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider bg-[#c8423a]/20 text-[#c8423a] border border-[#c8423a]/40"
            >
              AO VIVO
            </span>
          )}

          <div className="hidden sm:flex items-center gap-2 text-xs text-[#8a8a93]">
            <span>· Rodada {currentMap?.round || 1}</span>
            <span>· {tokens.length} peças</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Link para TV */}
          <a
            href="/batalha"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#26262a] bg-[#16161a] hover:bg-[#26262a] text-xs font-medium text-[#ebe6d6] transition-colors"
          >
            <Tv className="w-3.5 h-3.5 text-[#f5b65b]" />
            <span className="hidden sm:inline">Telão TV</span>
          </a>

          {/* Botão de Nova Rodada */}
          <button
            type="button"
            onClick={handleNovaRodada}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#26262a] bg-[#16161a] hover:bg-[#26262a] text-xs font-medium text-[#ebe6d6] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#4a7c59]" />
            <span className="hidden sm:inline">Nova Rodada</span>
          </button>
        </div>
      </div>

      {/* ── Área Central do Editor ── */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Mapa / Canvas ao Centro */}
        <div
          className={`relative flex-1 h-full overflow-hidden transition-all duration-300 ${
            isLive ? 'ring-2 ring-[#f5b65b]/50 shadow-[inset_0_0_40px_rgba(245,182,91,0.15)]' : ''
          }`}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full block cursor-crosshair"
          />

          {/* Barra de Ferramentas Flutuante em Cima do Mapa */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-xl bg-[#111114]/90 backdrop-blur-md border border-[#26262a] shadow-xl z-10">
            <button
              type="button"
              data-testid="tool-select"
              title="Selecionar e mover peças"
              onClick={() => setActiveTool('select')}
              className={`p-2 rounded-lg transition-colors ${
                activeTool === 'select'
                  ? 'bg-[#f5b65b] text-[#111114]'
                  : 'text-[#8a8a93] hover:text-white hover:bg-[#1e1e24]'
              }`}
            >
              <MousePointer className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="tool-paint"
              title="Pintar bloqueio de terreno"
              onClick={() => setActiveTool('paint_block')}
              className={`p-2 rounded-lg transition-colors ${
                activeTool === 'paint_block'
                  ? 'bg-[#c8423a] text-white'
                  : 'text-[#8a8a93] hover:text-white hover:bg-[#1e1e24]'
              }`}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="tool-erase"
              title="Apagar bloqueio de terreno"
              onClick={() => setActiveTool('erase_block')}
              className={`p-2 rounded-lg transition-colors ${
                activeTool === 'erase_block'
                  ? 'bg-[#c8423a] text-white'
                  : 'text-[#8a8a93] hover:text-white hover:bg-[#1e1e24]'
              }`}
            >
              <Eraser className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="tool-pan"
              title="Arrastar câmera (Pan)"
              onClick={() => setActiveTool('pan')}
              className={`p-2 rounded-lg transition-colors ${
                activeTool === 'pan'
                  ? 'bg-[#4a7c59] text-white'
                  : 'text-[#8a8a93] hover:text-white hover:bg-[#1e1e24]'
              }`}
            >
              <Hand className="w-4 h-4" />
            </button>
          </div>

          {/* Controles de Câmera (Zoom) Flutuantes */}
          <div className="absolute bottom-4 left-4 flex items-center gap-1 p-1 rounded-xl bg-[#111114]/90 backdrop-blur-md border border-[#26262a] shadow-xl z-10">
            <button
              type="button"
              title="Aproximar"
              onClick={() => engineRef.current?.zoomIn()}
              className="p-1.5 rounded-lg text-[#8a8a93] hover:text-white hover:bg-[#1e1e24] transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Afastar"
              onClick={() => engineRef.current?.zoomOut()}
              className="p-1.5 rounded-lg text-[#8a8a93] hover:text-white hover:bg-[#1e1e24] transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Enquadrar Mesa Inteira"
              onClick={() => engineRef.current?.zoomFit()}
              className="p-1.5 rounded-lg text-[#8a8a93] hover:text-white hover:bg-[#1e1e24] transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <span ref={fpsRef} className="text-[10px] text-[#8a8a93] px-1 font-mono">
              60 FPS
            </span>
          </div>
        </div>

        {/* ── Painel Direito Fino (320px) ── */}
        <div
          data-testid="dm-right-panel"
          className="w-full sm:w-[320px] flex-shrink-0 h-full border-l border-[#26262a] bg-[#111114] flex flex-col z-20"
        >
          {/* LIGAR A MESA: Ação Principal Dourada Grande no Topo */}
          <div className="p-4 border-b border-[#26262a] bg-[#16161a]">
            <button
              type="button"
              data-testid="btn-toggle-live"
              onClick={handleToggleLive}
              className={`w-full py-3 px-4 rounded-xl font-cinzel font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                isLive
                  ? 'bg-gradient-to-r from-[#c8423a] to-[#9e2a22] text-white shadow-[#c8423a]/30 hover:brightness-110 active:scale-98'
                  : 'bg-gradient-to-r from-[#f5b65b] to-[#d99a3e] text-[#111114] shadow-[#f5b65b]/25 hover:brightness-110 active:scale-98'
              }`}
            >
              <Radio className={`w-4 h-4 ${isLive ? 'animate-pulse' : ''}`} />
              {isLive ? 'DESLIGAR MESA' : 'LIGAR MESA'}
            </button>
          </div>

          {/* Abas: Mesa, Peças, Terreno, Mídia */}
          <div className="grid grid-cols-4 border-b border-[#26262a] bg-[#16161a]/60 text-xs font-medium">
            <button
              type="button"
              data-testid="tab-mesa"
              onClick={() => setActiveTab('mesa')}
              className={`py-2.5 text-center transition-colors border-b-2 ${
                activeTab === 'mesa'
                  ? 'border-[#f5b65b] text-[#f5b65b] bg-[#111114]'
                  : 'border-transparent text-[#8a8a93] hover:text-[#ebe6d6]'
              }`}
            >
              Mesa
            </button>
            <button
              type="button"
              data-testid="tab-pecas"
              onClick={() => setActiveTab('pecas')}
              className={`py-2.5 text-center transition-colors border-b-2 ${
                activeTab === 'pecas'
                  ? 'border-[#f5b65b] text-[#f5b65b] bg-[#111114]'
                  : 'border-transparent text-[#8a8a93] hover:text-[#ebe6d6]'
              }`}
            >
              Peças
            </button>
            <button
              type="button"
              data-testid="tab-terreno"
              onClick={() => setActiveTab('terreno')}
              className={`py-2.5 text-center transition-colors border-b-2 ${
                activeTab === 'terreno'
                  ? 'border-[#f5b65b] text-[#f5b65b] bg-[#111114]'
                  : 'border-transparent text-[#8a8a93] hover:text-[#ebe6d6]'
              }`}
            >
              Terreno
            </button>
            <button
              type="button"
              data-testid="tab-midia"
              onClick={() => setActiveTab('midia')}
              className={`py-2.5 text-center transition-colors border-b-2 ${
                activeTab === 'midia'
                  ? 'border-[#f5b65b] text-[#f5b65b] bg-[#111114]'
                  : 'border-transparent text-[#8a8a93] hover:text-[#ebe6d6]'
              }`}
            >
              Mídia
            </button>
          </div>

          {/* Conteúdo das Abas (Scrollável) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* ── ABA 1: MESA ── */}
            {activeTab === 'mesa' && (
              <div className="space-y-4">
                {/* Seletor de Mesas */}
                <div>
                  <label className="text-xs font-medium text-[#8a8a93] mb-1.5 block">
                    Mesa Atual
                  </label>
                  <select
                    data-testid="select-map"
                    value={currentMap?.id || ''}
                    onChange={(e) => {
                      const sel = maps.find((m) => m.id === e.target.value);
                      if (sel) {
                        setCurrentMap(sel);
                        queryClient.setQueryData(BATTLE_MAP_KEY, sel);
                      }
                    }}
                    className="w-full bg-[#16161a] border border-[#26262a] rounded-xl px-3 py-2 text-xs text-[#ebe6d6] focus:border-[#f5b65b] focus:outline-none"
                  >
                    {maps.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.status === 'ao_vivo' ? '🔥 (AO VIVO)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ações de Mesas CRUD */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    data-testid="btn-create-map"
                    onClick={handleCreateMap}
                    className="py-2 px-2.5 rounded-lg border border-[#3b3b40] bg-[#16161a] hover:bg-[#26262a] text-xs font-medium text-[#ebe6d6] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#f5b65b]" />
                    Nova
                  </button>
                  <button
                    type="button"
                    data-testid="btn-duplicate-map"
                    onClick={handleDuplicateMap}
                    className="py-2 px-2.5 rounded-lg border border-[#3b3b40] bg-[#16161a] hover:bg-[#26262a] text-xs font-medium text-[#ebe6d6] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#8a8a93]" />
                    Duplicar
                  </button>
                  <button
                    type="button"
                    data-testid="btn-delete-map"
                    onClick={handleDeleteMap}
                    className="py-2 px-2.5 rounded-lg border border-[#c8423a]/30 bg-[#c8423a]/10 hover:bg-[#c8423a]/20 text-xs font-medium text-[#c8423a] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>

                {/* Renomear Mesa */}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setRenameInput(currentMap?.name || '');
                      setShowRenameModal(true);
                    }}
                    className="w-full py-1.5 px-3 rounded-lg border border-[#26262a] bg-[#16161a] hover:bg-[#26262a] text-xs font-medium text-[#8a8a93] hover:text-[#ebe6d6] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Renomear Mesa
                  </button>
                </div>

                {/* Upload Imagem de Fundo */}
                <div className="pt-2 border-t border-[#26262a]">
                  <label className="text-xs font-medium text-[#8a8a93] mb-1.5 block">
                    Imagem de Fundo (WebP 2048px)
                  </label>
                  <input
                    ref={fileInputBgRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBgUpload}
                  />
                  <button
                    type="button"
                    data-testid="btn-upload-bg"
                    disabled={isUploadingBg}
                    onClick={() => fileInputBgRef.current?.click()}
                    className="w-full py-2 px-3 rounded-lg border border-[#3b3b40] bg-[#16161a] hover:bg-[#26262a] text-xs font-medium text-[#ebe6d6] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isUploadingBg ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#f5b65b]" />
                        Otimizando para 2048px…
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-[#f5b65b]" />
                        Alterar Fundo do Mapa
                      </>
                    )}
                  </button>
                </div>

                {/* Sliders da Grade */}
                <div className="pt-2 border-t border-[#26262a] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#8a8a93]">Ajustes de Grade</span>
                    <button
                      type="button"
                      onClick={() =>
                        queueMapAutosave({ show_grid: currentMap?.show_grid === false })
                      }
                      className="text-[11px] text-[#f5b65b] hover:underline"
                    >
                      {currentMap?.show_grid === false ? 'Mostrar Grade' : 'Ocultar Grade'}
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-[#8a8a93] mb-1">
                      <span>Tamanho do Quadrado (tile_size)</span>
                      <span className="font-mono text-[#ebe6d6]">{currentMap?.tile_size || 86}px</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="140"
                      step="2"
                      value={currentMap?.tile_size || 86}
                      onChange={(e) => queueMapAutosave({ tile_size: Number(e.target.value) })}
                      className="w-full accent-[#f5b65b] bg-[#26262a] h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-[#8a8a93] mb-1">
                      <span>Origem X (origin_x)</span>
                      <span className="font-mono text-[#ebe6d6]">{currentMap?.origin_x || 690}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={currentMap?.img_w || 1376}
                      step="4"
                      value={currentMap?.origin_x || 690}
                      onChange={(e) => queueMapAutosave({ origin_x: Number(e.target.value) })}
                      className="w-full accent-[#f5b65b] bg-[#26262a] h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-[#8a8a93] mb-1">
                      <span>Origem Y (origin_y)</span>
                      <span className="font-mono text-[#ebe6d6]">{currentMap?.origin_y || 418}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={currentMap?.img_h || 768}
                      step="4"
                      value={currentMap?.origin_y || 418}
                      onChange={(e) => queueMapAutosave({ origin_y: Number(e.target.value) })}
                      className="w-full accent-[#f5b65b] bg-[#26262a] h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-[#8a8a93] mb-1">
                      <span>Limite de Movimento</span>
                      <span className="font-mono text-[#ebe6d6]">{currentMap?.move_limit || 6}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      step="1"
                      value={currentMap?.move_limit || 6}
                      onChange={(e) => queueMapAutosave({ move_limit: Number(e.target.value) })}
                      className="w-full accent-[#f5b65b] bg-[#26262a] h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA 2: PEÇAS ── */}
            {activeTab === 'pecas' && (
              <div className="space-y-4">
                {/* Botões de Adicionar Herói e Fera */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="btn-add-hero"
                    onClick={() => setShowAddHeroModal(true)}
                    className="py-2 px-3 rounded-lg border border-[#f5b65b]/30 bg-[#f5b65b]/10 hover:bg-[#f5b65b]/20 text-xs font-semibold text-[#f5b65b] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Herói
                  </button>
                  <button
                    type="button"
                    data-testid="btn-add-beast"
                    onClick={() => {
                      setBeastSearch('');
                      setShowAddBeastModal(true);
                    }}
                    className="py-2 px-3 rounded-lg border border-[#c8423a]/30 bg-[#c8423a]/10 hover:bg-[#c8423a]/20 text-xs font-semibold text-[#c8423a] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Skull className="w-3.5 h-3.5" />
                    + Fera (Catálogo)
                  </button>
                </div>

                {/* Peça Selecionada: Ajustes de Escala, Pés, Facing e Mídia */}
                {selectedToken ? (
                  <div className="p-3 rounded-xl border border-[#26262a] bg-[#16161a] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {selectedToken.kind === 'heroi' ? (
                          <Shield className="w-4 h-4 text-[#4a7c59]" />
                        ) : (
                          <Skull className="w-4 h-4 text-[#c8423a]" />
                        )}
                        <span className="font-semibold text-xs text-[#ebe6d6]">
                          {selectedToken.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Alternar Visibilidade"
                          onClick={() =>
                            updateSelectedTokenLocally({ visible: !selectedToken.visible })
                          }
                          className="p-1.5 rounded text-[#8a8a93] hover:text-[#ebe6d6]"
                        >
                          {selectedToken.visible !== false ? (
                            <Eye className="w-3.5 h-3.5 text-[#4a7c59]" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-[#c8423a]" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Inverter direção"
                          onClick={() =>
                            updateSelectedTokenLocally({
                              facing: (selectedToken.facing ?? 1) === 1 ? -1 : 1,
                            })
                          }
                          className="p-1.5 rounded text-[#8a8a93] hover:text-[#ebe6d6]"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Remover peça"
                          onClick={handleRemoveToken}
                          className="p-1.5 rounded text-[#c8423a] hover:bg-[#c8423a]/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-[#26262a]">
                      <div>
                        <div className="flex justify-between text-[11px] text-[#8a8a93]">
                          <span>Tamanho</span>
                          <span className="font-mono text-[#ebe6d6]">{selectedToken.size || 160}px</span>
                        </div>
                        <input
                          type="range"
                          min="80"
                          max="320"
                          step="2"
                          value={selectedToken.size || 160}
                          onChange={(e) => updateSelectedTokenLocally({ size: Number(e.target.value) })}
                          className="w-full accent-[#f5b65b] bg-[#26262a] h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-[#8a8a93]">
                          <span>Pés (X)</span>
                          <span className="font-mono text-[#ebe6d6]">
                            {((selectedToken.anchor_x ?? 0.5) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="0.9"
                          step="0.005"
                          value={selectedToken.anchor_x ?? 0.5}
                          onChange={(e) =>
                            updateSelectedTokenLocally({ anchor_x: Number(e.target.value) })
                          }
                          className="w-full accent-[#f5b65b] bg-[#26262a] h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-[#8a8a93]">
                          <span>Pés (Y)</span>
                          <span className="font-mono text-[#ebe6d6]">
                            {((selectedToken.anchor_y ?? 0.985) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="1.0"
                          step="0.005"
                          value={selectedToken.anchor_y ?? 0.985}
                          onChange={(e) =>
                            updateSelectedTokenLocally({ anchor_y: Number(e.target.value) })
                          }
                          className="w-full accent-[#f5b65b] bg-[#26262a] h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <button
                        type="button"
                        data-testid="btn-open-media-modal"
                        onClick={() => {
                          setMediaModalTarget({
                            id: selectedToken.hero_id || selectedToken.beast_id || selectedToken.id,
                            name: selectedToken.name,
                            kind: selectedToken.kind,
                            media_url: selectedToken.media_url,
                            chroma: selectedToken.chroma,
                            anchor_x: selectedToken.anchor_x,
                            anchor_y: selectedToken.anchor_y,
                            size: selectedToken.size,
                            facing: selectedToken.facing,
                          });
                        }}
                        className="w-full mt-2 py-1.5 px-3 rounded-lg border border-[#f5b65b]/30 bg-[#f5b65b]/10 hover:bg-[#f5b65b]/20 text-xs font-medium text-[#f5b65b] flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Configurar Mídia & Croma
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-[#26262a] text-center text-xs text-[#8a8a93]">
                    Selecione uma peça no mapa ou adicione uma nova.
                  </div>
                )}

                {/* Lista Rápida de Peças no Mapa */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-[#8a8a93] block">
                    Peças no Mapa ({tokens.length})
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {tokens.map((tok) => (
                      <button
                        key={tok.id}
                        type="button"
                        onClick={() => setSelectedTokenId(tok.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          selectedTokenId === tok.id
                            ? 'bg-[#26262a] text-[#f5b65b] font-medium'
                            : 'hover:bg-[#16161a] text-[#a1a1aa]'
                        }`}
                      >
                        <span className="truncate">{tok.name}</span>
                        <span className="text-[10px] font-mono text-[#8a8a93]">
                          ({tok.c ?? 0},{tok.r ?? 0})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA 3: TERRENO ── */}
            {activeTab === 'terreno' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl border border-[#26262a] bg-[#16161a] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8a8a93]">Bloqueios Ativos</span>
                    <span className="font-mono text-[#c8423a] font-semibold">
                      {currentMap?.blocked?.length || 0} quadrados
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8a8a93] leading-relaxed">
                    Use a ferramenta do lápis na barra superior para pintar paredes ou obstáculos intransponíveis arrastando pelo mapa.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Limpar todos os bloqueios de terreno desta mesa?')) {
                        queueMapAutosave({ blocked: [] });
                        toast.success('Bloqueios limpos.');
                      }
                    }}
                    className="w-full py-2 px-3 rounded-lg border border-[#c8423a]/30 bg-[#c8423a]/10 hover:bg-[#c8423a]/20 text-xs font-medium text-[#c8423a] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar Todos os Bloqueios
                  </button>
                </div>
              </div>
            )}

            {/* ── ABA 4: MÍDIA ── */}
            {activeTab === 'midia' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl border border-[#26262a] bg-[#16161a] space-y-2">
                  <span className="text-xs font-semibold text-[#f5b65b] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Processador de Mídia ffmpeg.wasm
                  </span>
                  <p className="text-[11px] text-[#8a8a93] leading-relaxed">
                    Envie vídeos (mp4/webm) com fundo verde ou magenta. O sistema detecta a silhueta, corta com margem de 4%, remove o fundo e envia para o bucket do Supabase.
                  </p>
                </div>

                {selectedToken && (
                  <button
                    type="button"
                    onClick={() => {
                      setMediaModalTarget({
                        id: selectedToken.hero_id || selectedToken.beast_id || selectedToken.id,
                        name: selectedToken.name,
                        kind: selectedToken.kind,
                        media_url: selectedToken.media_url,
                        chroma: selectedToken.chroma,
                        anchor_x: selectedToken.anchor_x,
                        anchor_y: selectedToken.anchor_y,
                        size: selectedToken.size,
                        facing: selectedToken.facing,
                      });
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#f5b65b] to-[#d99a3e] text-[#111114] text-xs font-semibold shadow-md hover:brightness-110 flex items-center justify-center gap-2 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Editar Mídia da Peça Selecionada
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
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
    </div>
  );
}
