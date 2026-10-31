import { Maximize2, Minimize2, Minus, Plus, RotateCcw } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useActiveBattleMap, useBattleTokens } from '../api/useBattle.ts';
import { BattleEngine } from '../engine/BattleEngine.ts';

export const TVBattleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BattleEngine | null>(null);

  const { data: map, isLoading: mapLoading } = useActiveBattleMap();
  const { tokens } = useBattleTokens(map?.id);
  const [fps, setFps] = useState(60);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isLive = map?.status === 'ao_vivo';

  // Inicialização do Battle Engine em modo 'tv'
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new BattleEngine(canvasRef.current, {
      mode: 'tv',
      onFpsUpdate: (currentFps) => {
        setFps(currentFps);
      },
    });

    if (map) {
      engine.setMap(map);
      engine.zoomFit();
    }
    if (tokens) {
      engine.setTokens(tokens);
    }

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Atualiza mapa no motor
  useEffect(() => {
    if (engineRef.current && map) {
      engineRef.current.setMap(map);
      engineRef.current.zoomFit();
    }
  }, [map]);

  // Atualiza tokens no motor (reflete exatamente o que o mestre alterou)
  useEffect(() => {
    if (engineRef.current && tokens) {
      engineRef.current.setTokens(tokens);
    }
  }, [tokens]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      className="relative w-screen h-screen bg-[#08080a] text-[#f5f5f7] overflow-hidden select-none"
      data-testid="tv-battle-container"
    >
      {/* Canvas da TV em Tela Cheia (literalmente idêntico ao do mestre) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-default"
        data-testid="tv-battle-canvas"
      />

      {/* Título e Status no Topo */}
      <div
        className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        data-testid="tv-map-title"
      >
        {isLive ? (
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#c8423a]/25 border border-[#c8423a]/50 backdrop-blur-md shadow-xl text-xs font-serif text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c8423a] animate-pulse" />
            <span className="font-cinzel font-bold tracking-wider uppercase text-[#ff8a7a]">
              {map?.name || 'Mesa de Batalha'}
            </span>
            <span className="text-white/40 text-[11px]">· Rodada {map?.round || 1}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-xs font-serif text-white/70">
            <span className="w-2 h-2 rounded-full bg-[#f5b65b]" />
            <span>{map?.name || 'Mesa de Batalha'}</span>
            <span className="text-white/40 text-[11px]">· Preparação</span>
          </div>
        )}
      </div>

      {/* Controles de Câmera da TV (Canto Superior Direito) */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md shadow-lg">
        <button
          type="button"
          onClick={() => engineRef.current?.zoomIn()}
          title="Aproximar (+)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => engineRef.current?.zoomOut()}
          title="Afastar (−)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => engineRef.current?.zoomFit()}
          title="Enquadrar Mapa Inteiro"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#f5b65b] hover:bg-[#f5b65b]/20 active:scale-95 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          title="Alternar Tela Cheia"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Indicador Discreto de TV / Conexão no Rodapé */}
      <div className="absolute bottom-4 right-6 z-20 pointer-events-none flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/30 font-mono">
        <span
          className={`w-1.5 h-1.5 rounded-full inline-block ${
            isLive ? 'bg-[#30d158] animate-pulse' : 'bg-[#f5b65b]'
          }`}
        />
        <span>{isLive ? 'TV AO VIVO' : 'TV CONECTADA'}</span>
        <span className="text-white/20">({fps} fps)</span>
      </div>
    </div>
  );
};
