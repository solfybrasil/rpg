import { Maximize2, Minimize2, Minus, Plus, ScanSearch } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { type BattleTurn, useBattleSync, useHeroVitals } from '../api/battleSync.ts';
import { useActiveBattleMap, useBattleTokens } from '../api/useBattle.ts';
import { BattleEngine } from '../engine/BattleEngine.ts';
import { useWorldClock } from '../../world-clock/api/clock';
import { ClockDial, climaInfo, hhmm } from '../../world-clock/components/ClockDial';

const tvBtn =
  'w-11 h-11 flex items-center justify-center border border-[var(--iron)] bg-[var(--stone)]/90 text-[var(--muted)] hover:text-[var(--text)] cursor-pointer';

/** Telão: só exibe. Títulos grandes, legíveis de longe; controles somem sozinhos. */
export function TVBattleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BattleEngine | null>(null);
  const lastMapId = useRef<string | null>(null);

  const { data: map, isLoading: mapLoading } = useActiveBattleMap();
  const { tokens } = useBattleTokens(map?.id);
  const { vitals } = useHeroVitals();
  const [turn, setTurn] = useState<BattleTurn | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const isLive = map?.status === 'ao_vivo';

  useBattleSync(map?.id, {
    onPing: (p) => engineRef.current?.showPing(p),
    onTurn: setTurn,
    onFx: (f) => engineRef.current?.playFx(f.id, f.c, f.r, f.scale, f.view),
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new BattleEngine(canvasRef.current, { mode: 'tv' });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map || !engineRef.current) return;
    engineRef.current.setMap(map);
    if (lastMapId.current !== map.id) {
      lastMapId.current = map.id;
      engineRef.current.zoomFit();
    }
  }, [map]);
  useEffect(() => {
    engineRef.current?.setTokens(tokens);
  }, [tokens]);
  useEffect(() => {
    engineRef.current?.setOptions({ activeTokenId: turn?.tokenId ?? null, heroVitals: vitals });
  }, [turn?.tokenId, vitals]);

  // Controles aparecem ao mexer o mouse e somem após 3 s.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const show = () => {
      setControlsVisible(true);
      clearTimeout(t);
      t = setTimeout(() => setControlsVisible(false), 3000);
    };
    show();
    window.addEventListener('pointermove', show);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointermove', show);
    };
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  };

  return (
    <div
      className="relative w-screen h-screen bg-[var(--abyss)] text-[var(--text)] [font-family:var(--body)] overflow-hidden select-none"
      data-testid="tv-battle-container"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none" data-testid="tv-battle-canvas" />

      {/* Título */}
      <div
        hidden={!map}
        className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center"
        data-testid="tv-map-title"
      >
        <p className="font-['Cinzel',serif] text-2xl lg:text-3xl tracking-[0.18em] uppercase text-[var(--gold-hi)] [text-shadow:0_2px_12px_#000]">
          {map?.name || 'Mesa de Batalha'}
        </p>
        <p className="mt-1 text-sm italic text-[var(--muted)] [text-shadow:0_1px_6px_#000]">
          {isLive ? `Rodada ${turn?.round ?? map?.round ?? 1}` : 'Em preparação'}
        </p>
      </div>

      {/* Turno */}
      {turn?.tokenId && (
        <div
          key={turn.tokenId}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 px-8 py-3 border border-[var(--gold)] bg-[var(--stone)]/95 animate-[bannerRise_var(--t-slow)_var(--ease-out)]"
        >
          <p className="text-center font-['Cinzel',serif] text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            Turno de
          </p>
          <p className="text-center font-['Cinzel',serif] text-2xl tracking-[0.1em] text-[var(--gold-hi)]">
            {turn.name}
          </p>
        </div>
      )}

      {/* Controles */}
      <div
        className={`absolute right-4 top-4 z-20 flex gap-1 transition-opacity duration-[var(--t-base)] ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button type="button" onClick={() => engineRef.current?.zoomIn()} className={tvBtn} aria-label="Aproximar">
          <Plus className="w-5 h-5" />
        </button>
        <button type="button" onClick={() => engineRef.current?.zoomOut()} className={tvBtn} aria-label="Afastar">
          <Minus className="w-5 h-5" />
        </button>
        <button type="button" onClick={() => engineRef.current?.zoomFit()} className={tvBtn} aria-label="Mapa inteiro">
          <ScanSearch className="w-5 h-5" />
        </button>
        <button type="button" onClick={toggleFullscreen} className={tvBtn} aria-label="Tela cheia">
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      <TVClock />

      {!mapLoading && !map && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[var(--abyss)]">
          <p className="font-['Cinzel',serif] text-3xl tracking-[0.2em] uppercase text-[var(--gold-hi)]">Peste do Juramento</p>
          <p className="text-lg italic text-[var(--muted)]">Aguardando o Mestre pôr uma mesa ao vivo…</p>
        </div>
      )}

      {isLive && (
        <span className="absolute top-6 left-6 z-20 flex items-center gap-2 font-['Cinzel',serif] text-xs uppercase tracking-[0.2em] text-[#e0645a]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e0645a] animate-pulse" /> Ao vivo
        </span>
      )}
    </div>
  );
}

/** Relógio do mundo no canto do telão, legível de longe. */
function TVClock() {
  const { data } = useWorldClock();
  const { icon: ClimaIcon } = climaInfo(data.clima);
  return (
    <div className="absolute bottom-6 left-6 z-20 flex items-center gap-3 px-3 py-2 border border-[var(--iron)] bg-[var(--stone)]/85 pointer-events-none">
      <ClockDial data={data} size={72} />
      <div className="leading-tight">
        <p className="font-['Cinzel',serif] text-2xl tabular-nums text-[var(--gold-hi)]">{hhmm(data)}</p>
        <p className="text-sm text-[var(--muted)] flex items-center gap-1.5">
          {data.faseDia} · {data.dia} de {data.nomeMes} · <ClimaIcon className="w-4 h-4" /> {data.clima}
        </p>
      </div>
    </div>
  );
}
