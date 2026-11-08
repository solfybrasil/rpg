/**
 * DMMapSubComponents.tsx
 *
 * Extracted, memoized sub-components for DMBattleMapEditor.
 * Each component is wrapped in React.memo to avoid unnecessary re-renders.
 */
import React from 'react';
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
import type { BattleEditorTool, BattleMap, BattleToken } from '../engine/types.ts';
import type { MediaBattleTarget } from './MediaBattleModal.tsx';

// ─────────────────────────────────────────────
// TurnPanel
// ─────────────────────────────────────────────

export interface TurnPanelProps {
  activeTurnToken: BattleToken | null;
  activeTurnIdx: number;
  turnOrderTokens: BattleToken[];
  currentMap: BattleMap | null;
  showTurnDrawer: boolean;
  setShowTurnDrawer: (v: boolean) => void;
  advanceTurn: () => void;
  previousTurn: () => void;
  selectActiveMover: (token: BattleToken, idx: number) => void;
  adjustTokenMoves: (tokenId: string, delta: number) => void;
  resetTokenMoves: (tokenId: string) => void;
  setMediaModalTarget: (target: MediaBattleTarget | null) => void;
}

export const TurnPanel = React.memo(function TurnPanel({
  activeTurnToken,
  activeTurnIdx,
  turnOrderTokens,
  currentMap,
  showTurnDrawer,
  setShowTurnDrawer,
  advanceTurn,
  previousTurn,
  selectActiveMover,
  adjustTokenMoves,
  resetTokenMoves,
  setMediaModalTarget,
}: TurnPanelProps) {
  if (!showTurnDrawer) return null;

  return (
    <div
      data-testid="turn-movement-panel"
      className="absolute top-4 left-4 z-20 flex flex-col gap-1.5"
      style={{ width: 260 }}
    >
      {/* Card Principal: Quem está jogando */}
      <div className="rounded-xl border border-[#c5a36a]/30 bg-[#0e0b08]/90 backdrop-blur-md shadow-2xl overflow-hidden">
        {/* Topo do card */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-[#c5a36a]/10 to-transparent border-b border-[#c5a36a]/15">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c5a36a] animate-pulse" />
            <span className="font-cinzel text-[10px] font-bold tracking-widest text-[#c5a36a] uppercase">
              Turno {activeTurnIdx + 1}/{turnOrderTokens.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-white/30">
              R{currentMap?.round || 1}
            </span>
            <button
              type="button"
              onClick={() => setShowTurnDrawer(false)}
              className="p-0.5 rounded text-white/25 hover:text-white/70 transition-colors ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Combatente Ativo */}
        {activeTurnToken ? (
          <div className="p-3 space-y-2.5">
            {/* Nome + tipo */}
            <div className="flex items-center gap-2.5">
              <div className="relative w-10 h-10 rounded-lg border border-[#c5a36a]/40 bg-[#0c0a08] overflow-hidden flex items-center justify-center shrink-0 cursor-pointer group"
                onClick={() => setMediaModalTarget({
                  id: activeTurnToken.hero_id || activeTurnToken.beast_id || activeTurnToken.id,
                  name: activeTurnToken.name,
                  kind: activeTurnToken.kind,
                  media_url: activeTurnToken.media_url,
                  chroma: activeTurnToken.chroma,
                  anchor_x: activeTurnToken.anchor_x,
                  anchor_y: activeTurnToken.anchor_y,
                  size: activeTurnToken.size,
                  facing: activeTurnToken.facing,
                })}
              >
                {activeTurnToken.media_url ? (
                  <img src={activeTurnToken.media_url} alt={activeTurnToken.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                  />
                ) : activeTurnToken.kind === 'heroi' ? (
                  <Shield className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Skull className="w-5 h-5 text-red-500" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Film className="w-3 h-3 text-[#e4c894]" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-cinzel font-bold text-sm text-[#e4c894] truncate leading-tight">
                  {activeTurnToken.name}
                </div>
                <div className={`text-[10px] font-semibold ${activeTurnToken.kind === 'heroi' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {activeTurnToken.kind === 'heroi' ? 'Herói' : 'Fera'}
                </div>
              </div>
            </div>

            {/* Barra de passos */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/40 flex items-center gap-1">
                  <Footprints className="w-3 h-3 text-[#c5a36a]" />
                  Passos
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => adjustTokenMoves(activeTurnToken.id, -1)}
                    className="w-4 h-4 rounded flex items-center justify-center bg-white/5 hover:bg-red-900/30 text-white/40 hover:text-red-400 transition-colors text-xs font-bold">
                    −
                  </button>
                  <span className="font-mono font-bold text-[#e4c894] min-w-[28px] text-center text-xs">
                    {activeTurnToken.moves_left ?? (currentMap?.move_limit || 6)}/{currentMap?.move_limit || 6}
                  </span>
                  <button type="button" onClick={() => adjustTokenMoves(activeTurnToken.id, 1)}
                    className="w-4 h-4 rounded flex items-center justify-center bg-white/5 hover:bg-emerald-900/30 text-white/40 hover:text-emerald-400 transition-colors text-xs font-bold">
                    +
                  </button>
                  <button type="button" onClick={() => resetTokenMoves(activeTurnToken.id)}
                    title="Restaurar todos os passos"
                    className="w-4 h-4 rounded flex items-center justify-center bg-white/5 hover:bg-[#c5a36a]/20 text-white/25 hover:text-[#c5a36a] transition-colors">
                    <RotateCcw className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: currentMap?.move_limit || 6 }).map((_, i) => {
                  const moves = activeTurnToken.moves_left ?? (currentMap?.move_limit || 6);
                  return (
                    <span key={i} className={`h-1.5 flex-1 rounded-sm transition-all ${
                      i < moves
                        ? 'bg-gradient-to-r from-[#c5a36a] to-[#e4c894] shadow-[0_0_4px_rgba(197,163,106,0.5)]'
                        : 'bg-white/8 border border-white/5'
                    }`} />
                  );
                })}
              </div>
            </div>

            {/* Prev / Next */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={previousTurn}
                className="py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[11px] font-cinzel text-white/50 hover:text-white/80 flex items-center justify-center gap-1 transition-all active:scale-95"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </button>
              <button
                type="button"
                data-testid="btn-advance-turn"
                onClick={advanceTurn}
                className="py-1.5 rounded-lg border border-[#c5a36a]/50 bg-gradient-to-r from-[#7a5c30] to-[#c5a36a] text-[#0e0b08] text-[11px] font-cinzel font-bold flex items-center justify-center gap-1 hover:brightness-110 shadow-md transition-all active:scale-95"
              >
                Próximo
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-3 py-4 text-center text-[11px] text-white/30 font-serif italic">
            Nenhum combatente na mesa
          </div>
        )}
      </div>

      {/* Lista de Iniciativa compacta */}
      {turnOrderTokens.length > 1 && (
        <div className="rounded-xl border border-white/8 bg-[#0e0b08]/85 backdrop-blur-md overflow-hidden">
          <div className="max-h-36 overflow-y-auto divide-y divide-white/5">
            {turnOrderTokens.map((tok, idx) => {
              const isActive = idx === activeTurnIdx;
              return (
                <div
                  key={tok.id}
                  onClick={() => selectActiveMover(tok, idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#c5a36a]/12 text-[#e4c894]'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/4'
                  }`}
                >
                  <span className="font-mono text-[10px] text-white/20 w-3 shrink-0">{idx + 1}</span>
                  {tok.kind === 'heroi' ? (
                    <Shield className={`w-3 h-3 shrink-0 ${isActive ? 'text-emerald-400' : 'text-emerald-700'}`} />
                  ) : (
                    <Skull className={`w-3 h-3 shrink-0 ${isActive ? 'text-red-400' : 'text-red-800'}`} />
                  )}
                  <span className="text-[11px] font-cinzel truncate flex-1">{tok.name}</span>
                  <span className="text-[10px] font-mono text-white/20 shrink-0">
                    {tok.moves_left ?? (currentMap?.move_limit || 6)}p
                  </span>
                  {isActive && <span className="w-1 h-1 rounded-full bg-[#c5a36a] animate-pulse shrink-0" />}
                </div>
              );
            })}
          </div>
          <div className="px-3 py-1 text-center text-[9px] text-white/20 font-mono border-t border-white/5">
            <kbd className="px-1 rounded bg-white/5 text-white/30">Espaço</kbd> → passar turno
          </div>
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────
// ToolBar
// ─────────────────────────────────────────────

export interface ToolBarProps {
  activeTool: BattleEditorTool;
  setActiveTool: (tool: BattleEditorTool) => void;
}

export const ToolBar = React.memo(function ToolBar({ activeTool, setActiveTool }: ToolBarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1.5 rounded-2xl bg-[#0e0c0a]/92 backdrop-blur-md border border-[#c5a36a]/35 shadow-[0_10px_35px_rgba(0,0,0,0.65)] z-10 select-none">
      <button
        type="button"
        data-testid="tool-select"
        title="Selecionar e mover peças (V)"
        onClick={() => setActiveTool('select')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-cinzel font-semibold transition-all duration-150 active:scale-95 ${
          activeTool === 'select'
            ? 'bg-gradient-to-r from-[#8c6c3d] to-[#c5a36a] text-[#100e0c] shadow-[0_0_12px_rgba(197,163,106,0.4)]'
            : 'text-[#a99a82] hover:text-[#f5eedc] hover:bg-white/5'
        }`}
      >
        <MousePointer className="w-3.5 h-3.5" />
        <span>Mover</span>
      </button>

      <button
        type="button"
        data-testid="tool-paint"
        title="Pintar paredes ou obstáculos na grade (B)"
        onClick={() => setActiveTool('paint_block')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-cinzel font-semibold transition-all duration-150 active:scale-95 ${
          activeTool === 'paint_block'
            ? 'bg-gradient-to-r from-[#9e2a22] to-[#c8423a] text-white shadow-[0_0_14px_rgba(200,66,58,0.5)] border border-[#ff7a6e]/40 animate-pulse'
            : 'text-[#a99a82] hover:text-[#f5eedc] hover:bg-white/5'
        }`}
      >
        <Pencil className="w-3.5 h-3.5 text-[#ff8a7a]" />
        <span>Pintar Parede</span>
      </button>

      <button
        type="button"
        data-testid="tool-erase"
        title="Apagar bloqueio de terreno (E)"
        onClick={() => setActiveTool('erase_block')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-cinzel font-semibold transition-all duration-150 active:scale-95 ${
          activeTool === 'erase_block'
            ? 'bg-gradient-to-r from-[#e2d5bd] to-[#f5eedc] text-[#14100c] shadow-[0_0_12px_rgba(245,238,220,0.4)] font-bold'
            : 'text-[#a99a82] hover:text-[#f5eedc] hover:bg-white/5'
        }`}
      >
        <Eraser className="w-3.5 h-3.5" />
        <span>Borracha</span>
      </button>

      <div className="w-px h-4 bg-[#c5a36a]/20 mx-0.5" />

      <button
        type="button"
        data-testid="tool-pan"
        title="Arrastar câmera livremente (H)"
        onClick={() => setActiveTool('pan')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-cinzel font-semibold transition-all duration-150 active:scale-95 ${
          activeTool === 'pan'
            ? 'bg-gradient-to-r from-[#2e573a] to-[#4a7c59] text-white shadow-[0_0_12px_rgba(74,124,89,0.4)]'
            : 'text-[#a99a82] hover:text-[#f5eedc] hover:bg-white/5'
        }`}
      >
        <Hand className="w-3.5 h-3.5" />
        <span>Câmera</span>
      </button>
    </div>
  );
});

// ─────────────────────────────────────────────
// CameraControls
// ─────────────────────────────────────────────

export interface CameraControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  fpsRef: React.RefObject<HTMLSpanElement | null>;
}

export const CameraControls = React.memo(function CameraControls({
  onZoomIn,
  onZoomOut,
  onZoomFit,
  fpsRef,
}: CameraControlsProps) {
  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0e0c0a]/90 backdrop-blur-md border border-[#c5a36a]/30 shadow-[0_8px_25px_rgba(0,0,0,0.6)] z-10 select-none">
      <button
        type="button"
        title="Aproximar (+)"
        onClick={onZoomIn}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#a99a82] hover:text-[#f5eedc] hover:bg-white/10 active:scale-90 transition-all"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        title="Afastar (-)"
        onClick={onZoomOut}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#a99a82] hover:text-[#f5eedc] hover:bg-white/10 active:scale-90 transition-all"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        title="Enquadrar Mapa Inteiro"
        onClick={onZoomFit}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#a99a82] hover:text-[#c5a36a] hover:bg-white/10 active:scale-90 transition-all"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-3.5 bg-white/10 mx-0.5" />
      <span ref={fpsRef} className="text-[10px] text-[#c5a36a]/80 px-1 font-mono font-bold tabular-nums">
        60 FPS
      </span>
    </div>
  );
});

// ─────────────────────────────────────────────
// TopBar
// ─────────────────────────────────────────────

export interface TopBarProps {
  currentMap: BattleMap | null;
  isLive: boolean;
  tokens: BattleToken[];
  setShowBgModal: (v: boolean) => void;
  selectedToken: BattleToken | null;
  activeTurnToken: BattleToken | null;
  setMediaModalTarget: (target: MediaBattleTarget | null) => void;
  showTurnDrawer: boolean;
  setShowTurnDrawer: (v: boolean) => void;
  handleNovaRodada: () => void;
  advanceTurn: () => void;
}

export const TopBar = React.memo(function TopBar({
  currentMap,
  isLive,
  tokens,
  setShowBgModal,
  selectedToken,
  activeTurnToken,
  setMediaModalTarget,
  showTurnDrawer,
  setShowTurnDrawer,
  handleNovaRodada,
  advanceTurn,
}: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-[#0c0a08]/80 backdrop-blur-md z-20">
      {/* Esquerda: nome do mapa + status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLive
                ? 'bg-[#c8423a] shadow-[0_0_6px_#c8423a] animate-pulse'
                : 'bg-white/20'
            }`}
          />
          <span className="font-cinzel text-xs font-semibold tracking-wide text-[#d4c5a0]">
            {currentMap?.name || 'Mesa de Batalha'}
          </span>
        </div>
        {isLive && (
          <span
            data-testid="live-indicator-badge"
            className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest bg-[#c8423a]/20 text-[#ff7a6e] border border-[#c8423a]/30 uppercase"
          >
            Ao Vivo
          </span>
        )}
        <span className="hidden sm:block text-[10px] text-white/25 font-mono">
          R{currentMap?.round || 1} · {tokens.length}pç
        </span>
      </div>

      {/* Direita: ações */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-testid="btn-open-bg-modal"
          onClick={() => setShowBgModal(true)}
          title="Trocar fundo do mapa"
          className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-[#c5a36a]/15 hover:border-[#c5a36a]/40 text-white/50 hover:text-[#e4c894] transition-all"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          data-testid="btn-open-token-media"
          onClick={() => {
            const target = selectedToken || activeTurnToken;
            if (target) {
              setMediaModalTarget({
                id: target.hero_id || target.beast_id || target.id,
                name: target.name,
                kind: target.kind,
                media_url: target.media_url,
                chroma: target.chroma,
                anchor_x: target.anchor_x,
                anchor_y: target.anchor_y,
                size: target.size,
                facing: target.facing,
              });
            } else {
              toast.info('Selecione uma peça para trocar imagem.');
            }
          }}
          title="Trocar imagem do token selecionado"
          className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-[#c5a36a]/15 hover:border-[#c5a36a]/40 text-white/50 hover:text-[#e4c894] transition-all"
        >
          <Film className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-white/10 mx-0.5" />

        <button
          type="button"
          data-testid="btn-toggle-turn-drawer"
          onClick={() => setShowTurnDrawer(!showTurnDrawer)}
          title="Painel de turno"
          className={`p-1.5 rounded-lg border transition-all ${
            showTurnDrawer
              ? 'border-[#c5a36a]/50 bg-[#c5a36a]/15 text-[#e4c894]'
              : 'border-white/10 bg-white/5 text-white/40 hover:text-[#e4c894] hover:border-[#c5a36a]/30'
          }`}
        >
          <Sword className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleNovaRodada}
          title="Nova Rodada — restaura passos"
          className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-emerald-900/30 hover:border-emerald-600/40 text-white/40 hover:text-emerald-400 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <a
          href="/batalha"
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir Telão da TV"
          className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-amber-900/20 hover:border-amber-500/30 text-white/40 hover:text-[#f5b65b] transition-all"
        >
          <Tv className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────
// RightPanel
// ─────────────────────────────────────────────

export interface RightPanelProps {
  activeTab: 'mesa' | 'pecas' | 'terreno' | 'midia';
  setActiveTab: (tab: 'mesa' | 'pecas' | 'terreno' | 'midia') => void;
  activeTool?: BattleEditorTool;
  setActiveTool?: (tool: BattleEditorTool) => void;
  currentMap: BattleMap | null;
  maps: BattleMap[];
  tokens: BattleToken[];
  selectedToken: BattleToken | null;
  selectedTokenId: string | null;
  setSelectedTokenId: (id: string | null) => void;
  isLive: boolean;
  handleToggleLive: () => void;
  handleCreateMap: () => void;
  handleDuplicateMap: () => void;
  handleDeleteMap: () => void;
  handleNovaRodada: () => void;
  setShowRenameModal: (v: boolean) => void;
  setRenameInput: (v: string) => void;
  queueMapAutosave: (updates: Partial<BattleMap>) => void;
  updateSelectedTokenLocally: (updates: Partial<BattleToken>) => void;
  handleRemoveToken: () => void;
  setShowAddHeroModal: (v: boolean) => void;
  setShowAddBeastModal: (v: boolean) => void;
  setMediaModalTarget: (target: MediaBattleTarget | null) => void;
  fileInputBgRef: React.RefObject<HTMLInputElement | null>;
  handleBgUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingBg: boolean;
  beastSearch: string;
  beastResults: any[];
  beastSearchLoading: boolean;
  beastQuantity: number;
  setBeastSearch: (v: string) => void;
  setBeastQuantity: (v: number) => void;
  handleAddHero: (hero: {
    id: string;
    name: string;
    media_url: string;
    chroma: string;
    anchor_x: number;
    anchor_y: number;
    size: number;
  }) => void;
  handleAddBeastFromCatalog: (beast: any, qty?: number) => void;
  setCurrentMap: (map: BattleMap | null) => void;
  queryClient: any;
  BATTLE_MAP_KEY: any;
}

export const RightPanel = React.memo(function RightPanel({
  activeTab,
  setActiveTab,
  activeTool,
  setActiveTool,
  currentMap,
  maps,
  tokens,
  selectedToken,
  selectedTokenId,
  setSelectedTokenId,
  isLive,
  handleToggleLive,
  handleCreateMap,
  handleDuplicateMap,
  handleDeleteMap,
  handleNovaRodada,
  setShowRenameModal,
  setRenameInput,
  queueMapAutosave,
  updateSelectedTokenLocally,
  handleRemoveToken,
  setShowAddHeroModal,
  setShowAddBeastModal,
  setMediaModalTarget,
  fileInputBgRef,
  handleBgUpload,
  isUploadingBg,
  beastSearch,
  beastResults,
  beastSearchLoading,
  beastQuantity,
  setBeastSearch,
  setBeastQuantity,
  handleAddHero,
  handleAddBeastFromCatalog,
  setCurrentMap,
  queryClient,
  BATTLE_MAP_KEY,
}: RightPanelProps) {
  return (
    <div
      data-testid="dm-right-panel"
      className="w-full sm:w-[320px] flex-shrink-0 h-full border-l border-[#423326] bg-[#120e0b] flex flex-col z-20 text-[#e2d5bd]"
      style={{ contain: 'layout style' }}
    >
      {/* LIGAR A MESA: Ação Principal Dourada Grande no Topo */}
      <div className="p-3.5 border-b border-[#423326] bg-[#18130f]">
        <button
          type="button"
          data-testid="btn-toggle-live"
          onClick={handleToggleLive}
          className={`w-full py-2.5 px-4 rounded-xl font-cinzel font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 ${
            isLive
              ? 'bg-gradient-to-r from-[#9e2a22] to-[#c8423a] text-white shadow-[#c8423a]/30 hover:brightness-110'
              : 'bg-gradient-to-r from-[#8c6c3d] to-[#c5a36a] text-[#100e0c] shadow-[0_0_12px_rgba(197,163,106,0.3)] hover:brightness-110'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${isLive ? 'animate-pulse' : ''}`} />
          {isLive ? 'Desligar Mesa' : 'Transmitir ao Vivo'}
        </button>
      </div>

      {/* Abas: Mesa, Peças, Terreno, Mídia */}
      <div className="grid grid-cols-4 border-b border-[#423326] bg-[#16120e] text-xs font-cinzel">
        <button
          type="button"
          data-testid="tab-mesa"
          onClick={() => setActiveTab('mesa')}
          className={`py-2 text-center transition-all border-b-2 font-semibold text-[11px] ${
            activeTab === 'mesa'
              ? 'border-[#c5a36a] text-[#e4c894] bg-[#211b16]'
              : 'border-transparent text-[#a99a82] hover:text-[#e2d5bd]'
          }`}
        >
          Mesa
        </button>
        <button
          type="button"
          data-testid="tab-pecas"
          onClick={() => setActiveTab('pecas')}
          className={`py-2 text-center transition-all border-b-2 font-semibold text-[11px] ${
            activeTab === 'pecas'
              ? 'border-[#c5a36a] text-[#e4c894] bg-[#211b16]'
              : 'border-transparent text-[#a99a82] hover:text-[#e2d5bd]'
          }`}
        >
          Peças
        </button>
        <button
          type="button"
          data-testid="tab-terreno"
          onClick={() => setActiveTab('terreno')}
          className={`py-2 text-center transition-all border-b-2 font-semibold text-[11px] ${
            activeTab === 'terreno'
              ? 'border-[#c5a36a] text-[#e4c894] bg-[#211b16]'
              : 'border-transparent text-[#a99a82] hover:text-[#e2d5bd]'
          }`}
        >
          Terreno
        </button>
        <button
          type="button"
          data-testid="tab-midia"
          onClick={() => setActiveTab('midia')}
          className={`py-2 text-center transition-all border-b-2 font-semibold text-[11px] ${
            activeTab === 'midia'
              ? 'border-[#c5a36a] text-[#e4c894] bg-[#211b16]'
              : 'border-transparent text-[#a99a82] hover:text-[#e2d5bd]'
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
                className="w-full bg-[#18130f] border border-[#423326] rounded-xl px-3 py-2 text-xs text-[#e4c894] font-cinzel focus:border-[#c5a36a] focus:outline-none"
              >
                {maps.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#18130f] text-[#e4c894]">
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
                className="py-2 px-2.5 rounded-xl border border-[#423326] bg-[#1c1712] hover:bg-[#261f18] hover:border-[#c5a36a] text-xs font-cinzel text-[#e4c894] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-[#c5a36a]" />
                Nova
              </button>
              <button
                type="button"
                data-testid="btn-duplicate-map"
                onClick={handleDuplicateMap}
                className="py-2 px-2.5 rounded-xl border border-[#423326] bg-[#1c1712] hover:bg-[#261f18] text-xs font-cinzel text-[#a99a82] hover:text-[#e2d5bd] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicar
              </button>
              <button
                type="button"
                data-testid="btn-delete-map"
                onClick={handleDeleteMap}
                className="py-2 px-2.5 rounded-xl border border-[#c8423a]/30 bg-[#c8423a]/10 hover:bg-[#c8423a]/20 text-xs font-cinzel text-[#ff8a7a] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
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
                className="w-full py-1.5 px-3 rounded-xl border border-[#423326] bg-[#18130f] hover:bg-[#261f18] text-xs font-cinzel text-[#a99a82] hover:text-[#e4c894] flex items-center justify-center gap-1.5 transition-all"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#c5a36a]" />
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
                className="py-2.5 px-3 rounded-xl border border-[#c5a36a]/40 bg-[#1c1712] hover:bg-[#261f18] hover:border-[#c5a36a] text-xs font-cinzel font-bold text-[#e4c894] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-[#c5a36a]" />
                + Herói
              </button>
              <button
                type="button"
                data-testid="btn-add-beast"
                onClick={() => {
                  setBeastSearch('');
                  setShowAddBeastModal(true);
                }}
                className="py-2.5 px-3 rounded-xl border border-[#c8423a]/40 bg-[#211412] hover:bg-[#2b1815] hover:border-[#ff7a6e] text-xs font-cinzel font-bold text-[#ff8a7a] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <Skull className="w-3.5 h-3.5 text-[#ff8a7a]" />
                + Fera
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
              <div className="max-h-48 overflow-y-auto space-y-1" style={{ willChange: 'auto' }}>
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
            {/* Card com status e ferramentas rápidas */}
            <div className="p-3.5 rounded-2xl border border-[#c5a36a]/30 bg-[#16120e] space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#c5a36a] flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5" />
                  Pintura de Bloqueios
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#c8423a]/20 border border-[#c8423a]/40 text-[#ff8a7a]">
                  {currentMap?.blocked?.length || 0} bloqueados
                </span>
              </div>

              <p className="text-[11px] font-serif italic text-[#a99a82] leading-relaxed">
                Clique ou arraste o mouse sobre as células da grade para erguer paredes e obstáculos intransponíveis.
              </p>

              {/* Botões de Ação Direta da Ferramenta */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTool?.('paint_block')}
                  className={`py-2 px-3 rounded-xl border text-xs font-cinzel font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                    activeTool === 'paint_block'
                      ? 'border-[#ff7a6e] bg-gradient-to-r from-[#9e2a22] to-[#c8423a] text-white shadow-[0_0_12px_rgba(200,66,58,0.5)] ring-1 ring-[#ff7a6e]'
                      : 'border-[#423326] bg-[#211b16] text-[#e2d5bd] hover:border-[#c5a36a] hover:bg-[#2b231d]'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{activeTool === 'paint_block' ? 'Pincel Ativo' : 'Pintar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTool?.('erase_block')}
                  className={`py-2 px-3 rounded-xl border text-xs font-cinzel font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                    activeTool === 'erase_block'
                      ? 'border-white/50 bg-[#e2d5bd] text-[#14100c] shadow-[0_0_12px_rgba(226,213,189,0.4)] font-bold'
                      : 'border-[#423326] bg-[#211b16] text-[#e2d5bd] hover:border-[#c5a36a] hover:bg-[#2b231d]'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>{activeTool === 'erase_block' ? 'Borracha Ativa' : 'Apagar'}</span>
                </button>
              </div>

              {activeTool !== 'select' && (
                <button
                  type="button"
                  onClick={() => setActiveTool?.('select')}
                  className="w-full py-1.5 rounded-lg border border-[#c5a36a]/30 bg-[#211b16]/70 text-[11px] font-cinzel text-[#c5a36a] hover:bg-[#c5a36a]/15 transition-colors flex items-center justify-center gap-1.5"
                >
                  <MousePointer className="w-3 h-3" />
                  <span>Voltar para Seleção e Movimento</span>
                </button>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Limpar todos os bloqueios de terreno desta mesa?')) {
                    queueMapAutosave({ blocked: [] });
                    toast.success('Bloqueios limpos.');
                  }
                }}
                className="w-full py-2 px-3 rounded-xl border border-[#c8423a]/30 bg-[#c8423a]/10 hover:bg-[#c8423a]/20 text-xs font-cinzel text-[#ff8a7a] flex items-center justify-center gap-1.5 transition-colors active:scale-95"
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
  );
});
