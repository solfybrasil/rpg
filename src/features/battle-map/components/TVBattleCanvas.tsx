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
    }
  }, [map]);

  // Atualiza tokens no motor
  useEffect(() => {
    if (engineRef.current && tokens.length > 0) {
      engineRef.current.setTokens(tokens);
    }
  }, [tokens]);

  return (
    <div
      className="relative w-screen h-screen bg-[#08080a] text-[#f5f5f7] overflow-hidden select-none"
      data-testid="tv-battle-container"
    >
      {/* Quando a mesa está desligada: Aguardando o Mestre... */}
      {!isLive && !mapLoading && (
        <div
          className="absolute inset-0 z-40 bg-[#08080a] flex flex-col items-center justify-center p-8 text-center"
          data-testid="tv-waiting-state"
        >
          <h1 className="font-title text-2xl tracking-[0.25em] uppercase text-white/30 mb-6">
            Mesa de Batalha
          </h1>
          <div className="flex items-center gap-4 text-[#f5eedc]/50 mb-3">
            <span className="w-12 h-px bg-white/10" />
            <span className="text-[#f5b65b] text-base">◆</span>
            <span className="w-12 h-px bg-white/10" />
          </div>
          <p className="font-serif italic text-3xl md:text-4xl text-[#f5eedc]/85 tracking-wide">
            Aguardando o Mestre…
          </p>
          <p className="font-serif italic text-sm text-[#f5eedc]/40 mt-3 max-w-md">
            O combate tático será projetado aqui assim que o Mestre iniciar a mesa.
          </p>
        </div>
      )}

      {/* Canvas da TV em Tela Cheia */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        data-testid="tv-battle-canvas"
      />

      {/* Título Discreto no Topo (Cinzel, 40% de opacidade) */}
      {isLive && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
          data-testid="tv-map-title"
        >
          <h1 className="font-title text-sm tracking-[0.3em] uppercase text-white/40 drop-shadow-md text-center">
            {map?.name || 'Santuário do Tigre-Serpente'}
          </h1>
        </div>
      )}

      {/* Indicador Discreto de TV / Conexão */}
      <div className="absolute bottom-4 right-6 z-20 pointer-events-none flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/20 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] inline-block animate-pulse" />
        <span>TV AO VIVO</span>
      </div>
    </div>
  );
};
