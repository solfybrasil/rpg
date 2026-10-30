import { useNavigate } from '@tanstack/react-router';
import {
  Compass,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Smartphone,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '../../../shared/stores/session.ts';
import { useActiveBattleMap, useBattleTokens } from '../api/useBattle.ts';
import { BattleEngine } from '../engine/BattleEngine.ts';
import type { BattleToken } from '../engine/types.ts';

interface PlayerBattleCanvasProps {
  heroId?: string;
}

export const PlayerBattleCanvas: React.FC<PlayerBattleCanvasProps> = ({
  heroId: propHeroId,
}) => {
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const heroId = propHeroId || sessionHeroId || 'tor_bjorn';
  const navigate = useNavigate();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BattleEngine | null>(null);

  const { data: map, isLoading: mapLoading } = useActiveBattleMap();
  const { tokens, moveToken } = useBattleTokens(map?.id);

  const [isPortrait, setIsPortrait] = useState(false);
  const [fps, setFps] = useState(60);
  const [movesLeft, setMovesLeft] = useState(6);
  const [moveLimit, setMoveLimit] = useState(6);

  // Detecção de orientação do celular (Landscape Enforcement)
  useEffect(() => {
    const checkOrientation = () => {
      const portrait =
        window.innerHeight > window.innerWidth && window.innerWidth < 850;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Inicialização do Battle Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    // Encontra o token do jogador
    const myToken =
      tokens.find(
        (t) =>
          (t.hero_id && t.hero_id === heroId) ||
          (t.name && t.name.toLowerCase().includes(heroId.split('_')[0])),
      ) || tokens.find((t) => t.kind === 'heroi');

    const engine = new BattleEngine(canvasRef.current, {
      mode: 'player',
      myHeroTokenId: myToken?.id || null,
      myHeroId: heroId,
      onMoveToken: async (tokenId, c, r, path) => {
        await moveToken(tokenId, c, r, path);
      },
      onFpsUpdate: (currentFps) => {
        setFps(currentFps);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [heroId, moveToken]);

  // Atualiza mapa no motor
  useEffect(() => {
    if (engineRef.current && map) {
      engineRef.current.setMap(map);
      setMoveLimit(map.move_limit ?? 6);
    }
  }, [map]);

  // Atualiza tokens no motor e captura moves_left do herói
  useEffect(() => {
    if (engineRef.current && tokens.length > 0) {
      engineRef.current.setTokens(tokens);

      const myToken =
        tokens.find(
          (t) =>
            (t.hero_id && t.hero_id === heroId) ||
            (t.name && t.name.toLowerCase().includes(heroId.split('_')[0])),
        ) || tokens.find((t) => t.kind === 'heroi');

      if (myToken) {
        setMovesLeft(myToken.moves_left ?? (map?.move_limit ?? 6));
      }
    }
  }, [tokens, heroId, map]);

  const handleCenter = () => {
    engineRef.current?.centerOnHero();
  };

  const handleZoomIn = () => {
    engineRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    engineRef.current?.zoomOut();
  };

  const handleZoomFit = () => {
    engineRef.current?.zoomFit();
  };

  const isLive = map?.status === 'ao_vivo';

  return (
    <div
      className="relative w-full h-full bg-[#08080a] text-[#f5f5f7] overflow-hidden select-none"
      data-testid="player-battle-canvas-container"
    >
      {/* Aviso de Modo Retrato em Celular */}
      {isPortrait && (
        <div className="absolute inset-0 z-50 bg-[#08080a]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <Smartphone className="w-16 h-16 text-[#f5b65b] animate-bounce mb-4 rotate-90" />
          <h2 className="font-title text-xl font-bold tracking-wider text-[#f5eedc] mb-2">
            Gire o celular
          </h2>
          <p className="font-serif italic text-sm text-[#f5eedc]/70 max-w-xs">
            A Mesa de Batalha tática requer a tela na horizontal para visualização
            ótima do terreno e controle tático do seu herói.
          </p>
        </div>
      )}

      {/* Canvas Principal do Motor Tático */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-crosshair touch-none"
        data-testid="battle-canvas"
      />

      {/* Floating HUD — Topo: Contador de Movimento */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        {/* Pílula de Movimento */}
        <div
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md shadow-lg"
          data-testid="movement-pill"
        >
          <Compass className="w-4 h-4 text-[#f5b65b]" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-white/50 font-sans">
                Movimento
              </span>
              <span className="text-xs font-semibold tabular-nums text-[#f5b65b]">
                {movesLeft} de {moveLimit}
              </span>
            </div>
            {/* Pips Dourados */}
            <div className="flex items-center gap-1 mt-0.5">
              {Array.from({ length: moveLimit }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-[2px] rotate-45 transition-all duration-200 ${
                    i < movesLeft
                      ? 'bg-[#f5b65b] shadow-[0_0_6px_rgba(245,182,91,0.6)]'
                      : 'bg-white/15'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Status da Mesa */}
        {!isLive && (
          <div className="px-3 py-1.5 rounded-lg bg-[#c8423a]/20 border border-[#c8423a]/40 text-[#ff8a7a] text-xs font-serif italic">
            Mesa em pausa
          </div>
        )}
      </div>

      {/* Floating HUD — Controles de Câmera */}
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md shadow-lg">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Aproximar (+)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-colors"
          data-testid="btn-zoom-in"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Afastar (−)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-colors"
          data-testid="btn-zoom-out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomFit}
          title="Ver o mapa inteiro (⤢)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-colors"
          data-testid="btn-zoom-fit"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCenter}
          title="Centralizar no meu herói (◎)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#f5b65b] hover:bg-[#f5b65b]/20 active:scale-95 transition-colors"
          data-testid="btn-center-hero"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dica Inferior Flutuante */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none px-3 py-1.5 rounded-lg bg-black/50 border border-white/5 backdrop-blur-sm text-[11px] font-sans text-white/50">
        Toque num quadrado <span className="text-[#f5b65b]">dourado</span> para mover
      </div>

      {/* Indicador Discreto de FPS */}
      <div
        className="absolute bottom-4 right-4 z-20 pointer-events-none text-[10px] tabular-nums font-mono text-white/20"
        data-testid="fps-counter"
      >
        {fps} fps
      </div>
    </div>
  );
};
