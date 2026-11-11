import { Crosshair, Maximize2, Minus, Plus, Ruler } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSessionStore } from '../../../shared/stores/session.ts';
import { type BattleTurn, useBattleSync, useHeroVitals } from '../api/battleSync.ts';
import { updateBattleToken } from '../api/battleApi.ts';
import { useActiveBattleMap, useBattleTokens } from '../api/useBattle.ts';
import { fetchChest } from '../../treasure/api/treasureQuery';
import { chestUrl, parseSpecial } from '../engine/FxSprite.ts';
import { BattleEngine } from '../engine/BattleEngine.ts';
import type { BattleToken } from '../engine/types.ts';

// Janela do baú: só baixa quando alguém abre um baú.
const ChestModal = lazy(() => import('../../treasure/components/PlayerChests').then((m) => ({ default: m.ChestModal })));

interface PlayerBattleCanvasProps {
  heroId?: string;
}

/** Encontra a peça do herói da sessão (por hero_id ou, na falta, pelo nome). */
function findMyToken(tokens: BattleToken[], heroId: string | null): BattleToken | null {
  if (!heroId) return null;
  const byId = tokens.find((t) => t.hero_id === heroId);
  if (byId) return byId;
  const first = heroId.split('_')[0].toLowerCase();
  return tokens.find((t) => t.kind === 'heroi' && t.name.toLowerCase().includes(first)) ?? null;
}

function myTokenName(tokens: BattleToken[], heroId: string | null) {
  return findMyToken(tokens, heroId)?.name || 'Jurado';
}

const hudBtn =
  'w-10 h-10 flex items-center justify-center border border-[var(--iron)] bg-[var(--stone)]/95 text-[var(--muted)] hover:text-[var(--text)] active:translate-y-px cursor-pointer';

const formatMeters = (n: number) => {
  const m = n * 1.5;
  return Number.isInteger(m) ? `${m} m` : `${m.toFixed(1).replace('.', ',')} m`;
};

export function PlayerBattleCanvas({ heroId: propHeroId }: PlayerBattleCanvasProps) {
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const heroId = propHeroId || sessionHeroId || null;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BattleEngine | null>(null);

  const { data: map, isLoading } = useActiveBattleMap();
  const { tokens, moveToken, refetch: refetchTokens } = useBattleTokens(map?.id);
  const refetchRef = useRef(refetchTokens);
  refetchRef.current = refetchTokens;
  const { vitals } = useHeroVitals();
  const moveRef = useRef(moveToken);
  moveRef.current = moveToken;

  const [measuring, setMeasuring] = useState(false);
  const [measure, setMeasure] = useState<number | null>(null);
  const [turn, setTurn] = useState<BattleTurn | null>(null);
  const [openChest, setOpenChest] = useState<{ chestId: string; tokenId: string; opened: boolean } | null>(null);
  const heroName = myTokenName(tokens, heroId);

  const myToken = useMemo(() => findMyToken(tokens, heroId), [tokens, heroId]);
  const moveLimit = map?.move_limit ?? 6;
  const movesLeft = myToken?.moves_left ?? moveLimit;
  const isLive = map?.status === 'ao_vivo';
  const isMyTurn = Boolean(turn?.tokenId && myToken && turn.tokenId === myToken.id);

  const { sendPing } = useBattleSync(map?.id, {
    onPing: (p) => engineRef.current?.showPing(p),
    onTurn: setTurn,
    onFx: (f) => engineRef.current?.playFx(f.id, f.c, f.r, f.scale, f.view),
    onMeasure: (m) => engineRef.current?.setRemoteMeasure(m.from, m.to),
  });
  const sendPingRef = useRef(sendPing);
  sendPingRef.current = sendPing;

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new BattleEngine(canvasRef.current, {
      mode: 'player',
      onMoveToken: async (id, c, r, path) => {
        try {
          await moveRef.current(id, c, r, path);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Não foi possível mover.');
          void refetchRef.current(); // devolve a peça à posição real
        }
      },
      onPing: (p) => sendPingRef.current(p),
      onMeasure: setMeasure,
      onTapChest: (token, near) => {
        const sp = parseSpecial(token.media_url);
        if (sp?.kind !== 'bau') return;
        if (!near) {
          toast('Chegue numa casa ao lado do baú para abrir.');
          return;
        }
        setOpenChest({ chestId: sp.chestId, tokenId: token.id, opened: sp.opened });
      },
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
      myHeroId: heroId ?? undefined,
      myHeroTokenId: myToken?.id ?? null,
      tool: measuring ? 'measure' : 'select',
      activeTokenId: turn?.tokenId ?? null,
      heroVitals: vitals,
    });
  }, [heroId, myToken?.id, measuring, turn?.tokenId, vitals]);

  // Ao virar meu turno, a câmera vai até o herói.
  useEffect(() => {
    if (isMyTurn && myToken) engineRef.current?.centerOnToken(myToken.id);
  }, [isMyTurn, myToken?.id]);

  return (
    <div
      className="relative w-full h-full min-h-0 bg-[var(--abyss)] text-[var(--text)] overflow-hidden select-none"
      data-testid="player-battle-canvas-container"
    >
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full block touch-none ${measuring ? 'cursor-crosshair' : 'cursor-pointer'}`}
        data-testid="battle-canvas"
      />

      {/* Faixa do turno */}
      {turn?.tokenId && (
        <div
          key={turn.tokenId}
          className={`absolute top-0 left-1/2 -translate-x-1/2 z-20 px-5 py-1.5 border border-t-0 font-['Cinzel',serif] text-xs uppercase tracking-[0.18em] animate-[bannerDrop_var(--t-slow)_var(--ease-out)] ${
            isMyTurn
              ? 'border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)]'
              : 'border-[var(--iron)] bg-[var(--stone)]/95 text-[var(--gold-hi)]'
          }`}
        >
          {isMyTurn ? 'Seu turno' : `Turno de ${turn.name ?? '…'}`}
          <span className="ml-2 opacity-60">R{turn.round}</span>
        </div>
      )}

      {/* Passos */}
      <div
        className="absolute top-3 left-3 z-20 px-3 py-2 border border-[var(--iron)] bg-[var(--stone)]/95"
        data-testid="movement-pill"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-['Cinzel',serif] text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Passos
          </span>
          <span className="font-['Cinzel',serif] text-sm tabular-nums text-[var(--gold-hi)]">
            {myToken ? `${movesLeft}/${moveLimit}` : '—'}
          </span>
        </div>
        {myToken && (
          <div className="flex gap-1 mt-1">
            {Array.from({ length: moveLimit }, (_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rotate-45 transition-colors duration-[var(--t-fast)] ${
                  i < movesLeft ? 'bg-[var(--gold)]' : 'bg-[var(--iron)]'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Câmera e régua */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        <button type="button" onClick={() => engineRef.current?.zoomIn()} className={hudBtn} aria-label="Aproximar" data-testid="btn-zoom-in">
          <Plus className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => engineRef.current?.zoomOut()} className={hudBtn} aria-label="Afastar" data-testid="btn-zoom-out">
          <Minus className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => engineRef.current?.zoomFit()} className={hudBtn} aria-label="Ver o mapa inteiro" data-testid="btn-zoom-fit">
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => myToken && engineRef.current?.centerOnToken(myToken.id)}
          disabled={!myToken}
          className={`${hudBtn} !text-[var(--gold)] disabled:opacity-40`}
          aria-label="Centralizar no meu herói"
          data-testid="btn-center-hero"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setMeasuring((v) => !v);
            engineRef.current?.clearMeasure();
          }}
          aria-pressed={measuring}
          aria-label="Régua"
          className={`${hudBtn} ${measuring ? '!border-[var(--gold)] !text-[var(--gold-hi)] !bg-[var(--gold)]/15' : ''}`}
        >
          <Ruler className="w-4 h-4" />
        </button>
      </div>

      {/* Avisos e dica */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-end justify-between gap-2 pointer-events-none">
        <p className="px-3 py-1.5 border border-[var(--iron)] bg-[var(--stone)]/90 text-xs italic text-[var(--muted)]">
          {measuring
            ? measure != null
              ? `Distância: ${measure} ${measure === 1 ? 'quadrado' : 'quadrados'} (${formatMeters(measure)})`
              : 'Arraste para medir a distância'
            : !myToken
              ? 'Seu herói ainda não está nesta mesa'
              : 'Toque num quadrado dourado para andar · segure para marcar'}
        </p>
        {!isLoading && map && !isLive && (
          <p className="px-3 py-1.5 border border-[var(--blood)] bg-[var(--stone)]/90 text-xs text-[#e0645a]">
            Mesa em pausa
          </p>
        )}
      </div>

      {openChest && heroId && (
        <Suspense fallback={null}>
          <ChestModal
            chestId={openChest.chestId}
            heroId={heroId}
            heroName={heroName}
            onClose={() => {
              const oc = openChest;
              setOpenChest(null);
              // Esvaziado: some para os jogadores (o Mestre ainda vê, translúcido).
              void fetchChest(oc.chestId)
                .then((c) => {
                  if (c.status === 'vazio') void updateBattleToken(oc.tokenId, { visible: false });
                })
                .catch(() => {});
            }}
            onOpened={() => {
              // A tampa abre para todos (mesa, TV e jogadores).
              if (!openChest.opened) void updateBattleToken(openChest.tokenId, { media_url: chestUrl(openChest.chestId, true) }).catch(() => {});
            }}
          />
        </Suspense>
      )}

      {!isLoading && !map && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--abyss)]/90">
          <p className="font-['Cinzel',serif] text-sm tracking-[0.12em] text-[var(--muted)]">
            Aguardando o Mestre pôr uma mesa ao vivo…
          </p>
        </div>
      )}
    </div>
  );
}
