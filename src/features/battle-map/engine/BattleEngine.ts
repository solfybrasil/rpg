import {
  type GridMode,
  buildGridG,
  cellHeight,
  cellKey,
  cellShape,
  centerG,
  gridDistance,
  pickG,
} from './IsometricGrid.ts';
import { readMapSettings } from './mapSettings.ts';
import { bfs, computeReach, reconstructCoordPath, reconstructPath } from './Pathfinding.ts';
import { CHEST_FX, CHEST_OPEN_AT, FIRE_FX, FxSprite, type FxView, type SpecialToken, parseSpecial } from './FxSprite.ts';
import { VideoChromaPool } from './VideoChromaPool.ts';
import type {
  BattleEngineOptions,
  BattleMap,
  BattlePing,
  BattleToken,
  CameraView,
  CellCoord,
  ChromaMode,
  Point,
} from './types.ts';

/**
 * Paleta do canvas. Espelha os tokens de `src/shared/styles/tokens.css`
 * (o canvas não lê variáveis CSS).
 */
const C = {
  abyss: '#070605',
  gold: '#C9A45C',
  goldHi: '#ECD395',
  blood: '#A3291F',
  bloodHi: '#D2493C',
  moss: '#7FA36B',
  mana: '#2C5FB8',
  mist: '#7FA6CF',
  text: '#E7DCC6',
  goldA: (a: number) => `rgba(201, 164, 92, ${a})`,
  bloodA: (a: number) => `rgba(163, 41, 31, ${a})`,
  textA: (a: number) => `rgba(231, 220, 198, ${a})`,
};

const PING_MS = 1600;
const LONG_PRESS_MS = 450;
const DRAG_THRESHOLD = 8;
/** Limite de pixels da camada estática em cache (fundo + grade). */
const LAYER_MAX_PIXELS = 8_000_000;

interface LocalTokenState {
  token: BattleToken;
  x: number;
  y: number;
  c: number;
  r: number;
  facing: number;
  path: Array<[number, number]>;
  moving: boolean;
  movesLeft: number;
  mediaUrl: string;
  chromaMode: ChromaMode;
  anchorX: number;
  anchorY: number;
  size: number;
  kind: string;
  /** Efeito (`fx:`) ou baú (`bau:`) guardado na peça; null para peças comuns. */
  special: SpecialToken | null;
}

/** Uma casa em chamas (incêndio de terreno). */
interface FireCell {
  c: number;
  r: number;
  x: number;
  y: number;
  /** Variante do efeito (quais vizinhas queimam), já contando o espelhamento. */
  mask: number;
  flip: boolean;
  phase: number;
}

/** Efeito disparado uma vez (sem peça), por exemplo um raio que o Mestre solta. */
interface OneShotFx {
  sprite: FxSprite;
  x: number;
  y: number;
  scale: number;
}

interface ActivePing extends BattlePing {
  start: number;
}

/**
 * Motor da mesa de batalha isométrica (Mestre, Jogador e TV).
 *
 * Desempenho:
 * - fundo + grade ficam numa camada em cache (1 drawImage por quadro);
 * - o loop só roda quando algo muda (peça andando, vídeo, ping) e para com a aba oculta;
 * - se o aparelho não sustenta ~40 fps, a resolução do canvas cai sozinha (lowFx).
 */
export class BattleEngine {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: BattleEngineOptions;

  // Mapa e grade
  private imgW = 1376;
  private imgH = 768;
  private TW = 86;
  private TH = 43;
  private OX = 690;
  private OY = 418;
  private moveLimit = 6;
  private showGrid = true;
  private readonly speed = 4.2;
  private valid = new Set<string>();
  private blocked = new Set<string>();

  // Câmera
  private view: CameraView = { z: 1, x: 0, y: 0 };
  private base = 1;
  private scale = 1;
  private readonly ZMIN = 1;
  private readonly ZMAX = 5;
  private needsInitialView = true;
  private mapId: string | null = null;

  // Mídia
  private bgImg: HTMLImageElement;
  private currentBgUrl = '';
  private bgLoaded = false;
  /** Fundo em vídeo (loop, mudo). Quando existe, a camada em cache guarda só a grade. */
  private bgVideo: HTMLVideoElement | null = null;
  private lastBgVideoT = -1;
  private lastBgVideoDraw = 0;
  /** Tipo de grade: isométrica (losangos) ou vista de cima (quadrados). */
  private mode: GridMode = 'iso';
  private layerAlpha = false;
  private pool: VideoChromaPool;

  // Camada estática (fundo + grade)
  private layer: HTMLCanvasElement | null = null;
  private layerScale = 0;
  private layerDirty = true;
  private layerTimer: ReturnType<typeof setTimeout> | null = null;

  // Peças
  private tokenStates = new Map<string, LocalTokenState>();
  /** Efeitos das peças especiais (por id da peça). */
  private fxSprites = new Map<string, FxSprite>();
  private oneShots: OneShotFx[] = [];
  /** Incêndio de terreno: casas em chamas e um efeito gravado por variante de vizinhança. */
  private fire = new Map<string, FireCell>();
  private fireSprites = new Map<number, FxSprite>();
  /** Enquanto o Mestre pinta, o que chega do banco não desfaz o que ele acabou de pintar. */
  private fireLocalUntil = 0;
  private isPaintingFire = false;
  private isErasingFire = false;

  // Movimento do herói do jogador
  private hover: CellCoord | null = null;
  private prevPath: string[] | null = null;
  private reach = new Map<string, number>();
  private graph: { dist: Map<string, number>; prev: Map<string, string> } | null = null;
  private blockedPath: Path2D | null = null;
  private reachPath: Path2D | null = null;

  // Régua e pings
  private measureFrom: CellCoord | null = null;
  private measureTo: CellCoord | null = null;
  private pings: ActivePing[] = [];

  // Loop
  private rafId: number | null = null;
  private lastTime = 0;
  private dirty = true;
  private destroyed = false;
  private resizeObserver: ResizeObserver | null = null;
  private lastVideoLimitsCheck = 0;

  // Métricas / qualidade adaptativa
  private frameCount = 0;
  private fpsTimer = 0;
  private slowWindows = 0;
  private lowFx = false;

  // Gestos
  private pts = new Map<number, Point>();
  private pressStart: { pt: Point; client: Point; time: number } | null = null;
  private isDragging = false;
  private pinchDist0 = 0;
  private pinchZ0 = 1;
  private panView0: CameraView | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressFired = false;

  // Editor do Mestre
  private isPaintingBlock = false;
  private isErasingBlock = false;
  private draggedTokenId: string | null = null;
  private isDraggingToken = false;

  constructor(canvas: HTMLCanvasElement, options: BattleEngineOptions) {
    this.cv = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D context from canvas');
    this.ctx = context;
    this.options = options;
    // Só em desenvolvimento: deixa os testes de navegador acharem as casas.
    // @ts-ignore: tipos do Vite fora do tsconfig deste projeto
    if (import.meta.env?.DEV && typeof window !== 'undefined') {
      (window as unknown as { __battle?: Record<string, BattleEngine> }).__battle = {
        ...(window as unknown as { __battle?: Record<string, BattleEngine> }).__battle,
        [options.mode]: this,
      };
    }

    this.pool = new VideoChromaPool();
    this.pool.onDirty = () => this.invalidate();
    this.bgImg = new Image();
    this.bgImg.crossOrigin = 'anonymous';
    this.bgImg.decoding = 'async';

    this.step = this.step.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleDblClick = this.handleDblClick.bind(this);
    this.handleVisibility = this.handleVisibility.bind(this);
    this.preventContextMenu = this.preventContextMenu.bind(this);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.cv);
    }
    this.handleResize();

    this.cv.addEventListener('contextmenu', this.preventContextMenu);
    this.cv.addEventListener('pointerdown', this.handlePointerDown);
    this.cv.addEventListener('pointermove', this.handlePointerMove);
    this.cv.addEventListener('pointerup', this.handlePointerUp);
    this.cv.addEventListener('pointercancel', this.handlePointerUp);
    this.cv.addEventListener('pointerleave', this.handlePointerLeave);
    this.cv.addEventListener('wheel', this.handleWheel, { passive: false });
    this.cv.addEventListener('dblclick', this.handleDblClick);
    document.addEventListener('visibilitychange', this.handleVisibility);

    this.invalidate();
  }

  // ───────────────────────── Loop ─────────────────────────

  /** Pede um novo quadro. O loop dorme sozinho quando nada mais muda. */
  public invalidate(): void {
    this.dirty = true;
    this.wake();
  }

  private wake(): void {
    if (this.destroyed || this.rafId !== null) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.step);
  }

  private handleVisibility(): void {
    if (document.hidden) {
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.bgVideo?.pause();
    } else {
      if (this.bgVideo) void this.bgVideo.play().catch(() => {});
      this.invalidate();
    }
  }

  private hasVisibleVideo(): boolean {
    for (const s of this.tokenStates.values()) {
      if (!this.isTokenShown(s) || !s.mediaUrl) continue;
      if (this.pool.get(s.mediaUrl, s.chromaMode)?.type === 'video') return true;
    }
    return false;
  }

  private step(now: number): void {
    this.rafId = null;
    if (this.destroyed) return;
    const frameStart = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // 1. Peças andando
    let anyMoving = false;
    for (const s of this.tokenStates.values()) {
      if (s.path.length === 0) continue;
      anyMoving = true;
      s.moving = true;
      const [tc, tr] = s.path[0];
      const p = this.cc(tc, tr);
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      const dist = Math.hypot(dx, dy);
      const sp = this.speed * Math.hypot(this.TW / 2, this.TH / 2) * dt;
      if (Math.abs(dx) > 1) s.facing = dx < 0 ? -1 : 1;
      if (dist <= sp) {
        s.x = p.x;
        s.y = p.y;
        s.c = tc;
        s.r = tr;
        s.path.shift();
      } else {
        s.x += (dx / dist) * sp;
        s.y += (dy / dist) * sp;
      }
      if (s.path.length === 0) {
        s.moving = false;
        this.recomputeReach();
        this.updateHover(this.hover);
      }
    }
    if (anyMoving) this.dirty = true;

    // 2. Quadros de vídeo (1 atualização por URL)
    const visibleUrls = new Set<string>();
    for (const s of this.tokenStates.values()) {
      if (!this.isTokenShown(s) || !s.mediaUrl || visibleUrls.has(s.mediaUrl)) continue;
      visibleUrls.add(s.mediaUrl);
      const entry = this.pool.get(s.mediaUrl, s.chromaMode);
      if (entry && this.pool.updateFrame(entry, now)) this.dirty = true;
    }
    if (now - this.lastVideoLimitsCheck > 1000) {
      this.lastVideoLimitsCheck = now;
      this.pool.applyVideoLimits(visibleUrls);
    }

    // 3. Pings expirando
    if (this.pings.length > 0) {
      this.pings = this.pings.filter((p) => now - p.start < PING_MS);
      this.dirty = true;
    }

    if (this.activePulse()) this.dirty = true;

    // Efeitos (pixelfx): só pedem quadro quando o desenho muda (~30 fps)
    const fxAnimating = this.tickFx(dt);

    // Fundo em vídeo: redesenha quando há quadro novo (no máximo ~30 fps).
    const bgv = this.bgVideo;
    if (bgv && !bgv.paused && bgv.readyState >= 2 && now - this.lastBgVideoDraw >= 33 && bgv.currentTime !== this.lastBgVideoT) {
      this.lastBgVideoT = bgv.currentTime;
      this.lastBgVideoDraw = now;
      this.dirty = true;
    }

    if (this.dirty) {
      this.draw(now);
      this.dirty = false;
    }

    // 4. Métricas e qualidade adaptativa (só conta quadros de loop contínuo)
    this.trackFps(now, performance.now() - frameStart);

    const keepRunning =
      anyMoving ||
      this.pings.length > 0 ||
      this.activePulse() ||
      this.hasVisibleVideo() ||
      Boolean(this.bgVideo) ||
      fxAnimating;
    if (keepRunning || this.dirty) {
      this.rafId = requestAnimationFrame(this.step);
    }
  }

  /** O anel do turno ativo pulsa, então precisa de quadros contínuos. */
  private activePulse(): boolean {
    const id = this.options.activeTokenId;
    if (!id) return false;
    const s = this.tokenStates.get(id);
    return Boolean(s && this.isTokenShown(s));
  }

  private trackFps(now: number, jsMs: number): void {
    if (!this.fpsTimer) this.fpsTimer = now;
    this.frameCount++;
    const elapsed = now - this.fpsTimer;
    if (elapsed < 500) return;
    const fps = Math.round((this.frameCount * 1000) / elapsed);
    this.frameCount = 0;
    this.fpsTimer = now;
    this.options.onFpsUpdate?.(fps, jsMs);

    // Considera só janelas em que o loop estava ocupado (≥ 10 quadros).
    if (fps >= 10 && fps < 40) this.slowWindows++;
    else this.slowWindows = 0;
    if (!this.lowFx && this.slowWindows >= 4) {
      this.lowFx = true;
      this.handleResize();
    }
  }

  // ───────────────────────── Configuração ─────────────────────────

  private handleResize(): void {
    const rc = this.cv.getBoundingClientRect();
    if (!rc.width || !rc.height) return;
    const cap = this.lowFx ? 1 : window.innerWidth < 900 ? 1.5 : 2;
    const dpr = Math.min(cap, window.devicePixelRatio || 1);
    this.cv.width = Math.round(rc.width * dpr);
    this.cv.height = Math.round(rc.height * dpr);
    this.base = this.containScale(this.cv.width, this.cv.height);
    if (this.needsInitialView && this.valid.size > 0) this.applyInitialView();
    else this.clampView();
    this.scheduleLayerRebuild(0);
  }

  /** Centro da célula na grade atual. */
  private cc(c: number, r: number) {
    return centerG(this.mode, c, r, this.OX, this.OY, this.TW);
  }

  /** Forma da célula (losango ou quadrado) no contexto. */
  private shape(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    cellShape(ctx, this.mode, x, y, w, h);
  }

  private stopBgVideo() {
    if (!this.bgVideo) return;
    this.bgVideo.pause();
    this.bgVideo.removeAttribute('src');
    this.bgVideo.load();
    this.bgVideo = null;
  }

  private loadBackground(url: string, isVideo: boolean) {
    this.bgLoaded = false;
    if (isVideo) {
      this.stopBgVideo();
      const v = document.createElement('video');
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.autoplay = true;
      v.preload = 'auto';
      v.crossOrigin = 'anonymous';
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.onloadeddata = () => {
        this.bgLoaded = true;
        this.layerDirty = true;
        void v.play().catch(() => {});
        this.invalidate();
      };
      v.onerror = () => {
        // Sem CORS: tenta sem crossOrigin (o vídeo ainda pode ser desenhado)
        if (v.crossOrigin) {
          v.removeAttribute('crossorigin');
          v.src = url;
        }
      };
      v.src = url;
      this.bgVideo = v;
      return;
    }
    this.stopBgVideo();
    this.bgImg.crossOrigin = 'anonymous';
    this.bgImg.onload = () => {
      this.bgLoaded = true;
      this.layerDirty = true;
      this.invalidate();
    };
    this.bgImg.onerror = () => {
      // Alguns servidores não mandam CORS: tenta de novo sem crossOrigin.
      if (this.bgImg.crossOrigin) {
        this.bgImg.crossOrigin = null;
        this.bgImg.src = url;
      }
    };
    this.bgImg.src = url;
  }

  public setMap(mapData: BattleMap | null): void {
    if (!mapData) return;
    // Mesa nova: refaz o enquadramento inicial (ajustes de grade não mexem na câmera).
    if (mapData.id !== this.mapId) {
      this.mapId = mapData.id;
      this.needsInitialView = true;
    }
    const prevGeom = `${this.mode}|${this.imgW}|${this.imgH}|${this.TW}|${this.OX}|${this.OY}`;
    const settings = readMapSettings(mapData.background_url);
    this.mode = settings.grid;
    this.imgW = Number(mapData.img_w) || 1376;
    this.imgH = Number(mapData.img_h) || 768;
    this.TW = Number(mapData.tile_size) || 86;
    this.TH = cellHeight(this.mode, this.TW);
    this.OX = Number(mapData.origin_x ?? 690);
    this.OY = Number(mapData.origin_y ?? 418);
    this.moveLimit = Number(mapData.move_limit ?? 6);
    const grid = mapData.show_grid !== false;
    const geom = `${this.mode}|${this.imgW}|${this.imgH}|${this.TW}|${this.OX}|${this.OY}`;

    if (geom !== prevGeom || this.valid.size === 0) {
      this.valid = buildGridSafe(this.mode, this.imgW, this.imgH, this.OX, this.OY, this.TW);
      this.blockedPath = null; // força refazer os bloqueios na nova grade
      this.base = this.containScale(this.cv.width, this.cv.height);
      this.layerDirty = true;
      // Reposiciona peças paradas na nova geometria
      for (const s of this.tokenStates.values()) {
        if (s.moving) continue;
        const p = this.cc(s.c, s.r);
        s.x = p.x;
        s.y = p.y;
        this.syncSprite(s); // a perspectiva dos efeitos acompanha a grade
      }
      // Incêndio: refaz posições e variantes na nova grade/perspectiva
      const burning = [...this.fire.keys()];
      this.fire = new Map();
      this.fireSprites.clear();
      this.setFire(burning);
    }
    if (grid !== this.showGrid) {
      this.showGrid = grid;
      this.layerDirty = true;
    }

    this.setBlocked(Array.isArray(mapData.blocked) ? mapData.blocked : []);

    if (this.currentBgUrl !== settings.url) {
      this.currentBgUrl = settings.url;
      this.loadBackground(settings.url, settings.isVideo);
    }

    if (this.needsInitialView) this.applyInitialView();
    this.recomputeReach();
    this.invalidate();
  }

  private setBlocked(list: string[]): void {
    const same = list.length === this.blocked.size && list.every((k) => this.blocked.has(k));
    if (same && this.blockedPath) return;
    this.blocked = new Set(list);
    this.blockedPath = this.cellsPath(this.blocked);
  }

  public setOptions(opts: Partial<BattleEngineOptions>): void {
    const toolChanged = opts.tool !== undefined && opts.tool !== this.options.tool;
    this.options = { ...this.options, ...opts };
    if (toolChanged && opts.tool !== 'measure') this.clearMeasure();
    this.recomputeReach();
    this.invalidate();
  }

  private resolveTokenMedia(token: BattleToken): { url: string; chroma: ChromaMode } {
    let url = token.media_url || token.idle_webm_url || token.idle_mp4_url || token.poster_url || '';
    let chroma: ChromaMode = (token.chroma as ChromaMode) || 'verde';
    const ident = (token.hero_id || token.name || '').toLowerCase();
    if (!url) {
      if (ident.includes('tor')) url = '/batalha/tor_idle.webm';
      else if (ident.includes('kaelis')) url = '/batalha/kaelis_idle.webm';
      else if (ident.includes('malenia')) url = '/batalha/malenia_idle.webm';
      else url = '/batalha/fera_idle.webm';
    }
    if (ident.includes('kaelis') && url.includes('kaelis')) chroma = 'magenta';
    return { url, chroma };
  }

  public setTokens(tokens: BattleToken[]): void {
    const currentIds = new Set<string>();
    const burning: string[] = [];

    for (const token of tokens) {
      // Incêndio: a peça só guarda a lista de casas; não é desenhada nem selecionável.
      if (token.media_url?.startsWith('fogo:')) {
        for (const [c, r] of normalizePath(token.path)) burning.push(cellKey(c, r));
        continue;
      }
      currentIds.add(token.id);
      const targetC = token.c ?? 0;
      const targetR = token.r ?? 0;
      const targetPos = this.cc(targetC, targetR);
      let s = this.tokenStates.get(token.id);

      const special = parseSpecial(token.media_url);
      if (!s) {
        const { url, chroma } = special ? { url: '', chroma: 'nenhum' as ChromaMode } : this.resolveTokenMedia(token);
        if (url) this.pool.get(url, chroma);
        s = {
          token,
          x: targetPos.x,
          y: targetPos.y,
          c: targetC,
          r: targetR,
          facing: token.facing ?? 1,
          path: [],
          moving: false,
          movesLeft: token.moves_left ?? this.moveLimit,
          mediaUrl: url,
          chromaMode: chroma,
          anchorX: token.anchor_x ?? 0.5,
          anchorY: token.anchor_y ?? 0.985,
          size: token.size ?? 160,
          kind: token.kind,
          special,
        };
        this.tokenStates.set(token.id, s);
        this.syncSprite(s);
        continue;
      }

      s.token = token;
      s.kind = token.kind;
      s.movesLeft = token.moves_left ?? this.moveLimit;
      s.size = token.size ?? s.size;
      s.anchorX = token.anchor_x ?? s.anchorX;
      s.anchorY = token.anchor_y ?? s.anchorY;
      if (!s.moving) s.facing = token.facing ?? s.facing;

      s.special = special;
      const { url, chroma } = special ? { url: '', chroma: 'nenhum' as ChromaMode } : this.resolveTokenMedia(token);
      if (url !== s.mediaUrl || chroma !== s.chromaMode) {
        if (s.mediaUrl) this.pool.release(s.mediaUrl);
        if (url) this.pool.get(url, chroma);
        s.mediaUrl = url;
        s.chromaMode = chroma;
      }
      this.syncSprite(s);

      const beingDragged = this.isDraggingToken && this.draggedTokenId === token.id;
      if (!s.moving && !beingDragged && (s.c !== targetC || s.r !== targetR)) {
        const path = normalizePath(token.path);
        const last = path[path.length - 1];
        if (path.length > 0 && last && last[0] === targetC && last[1] === targetR) {
          s.path = path;
        } else {
          s.c = targetC;
          s.r = targetR;
          s.x = targetPos.x;
          s.y = targetPos.y;
        }
      }
    }

    for (const [id, s] of this.tokenStates) {
      if (!currentIds.has(id)) {
        if (s.mediaUrl) this.pool.release(s.mediaUrl);
        this.tokenStates.delete(id);
        this.fxSprites.delete(id);
      }
    }

    if (performance.now() > this.fireLocalUntil && !this.isPaintingFire && !this.isErasingFire) this.setFire(burning);

    this.recomputeReach();
    this.invalidate();
  }

  /** Perspectiva dos efeitos nesta mesa: acompanha a grade. */
  private get fxView(): FxView {
    return this.mode === 'square' ? 'reta' : 'iso';
  }

  // ───────────────────────── Incêndio de terreno ─────────────────────────

  /** Define as casas em chamas e recalcula como cada uma se emenda às vizinhas. */
  private setFire(keys: Iterable<string>): void {
    const set = new Set(keys);
    if (set.size === this.fire.size && [...set].every((k) => this.fire.has(k))) return;
    const iso = this.mode !== 'square';
    const next = new Map<string, FireCell>();
    for (const k of set) {
      const [c, r] = k.split(',').map(Number);
      // bits: 1 = c+1, 2 = c-1, 4 = r+1, 8 = r-1
      let mask =
        (set.has(cellKey(c + 1, r)) ? 1 : 0) |
        (set.has(cellKey(c - 1, r)) ? 2 : 0) |
        (set.has(cellKey(c, r + 1)) ? 4 : 0) |
        (set.has(cellKey(c, r - 1)) ? 8 : 0);
      // Metade das casas é desenhada espelhada (variedade sem gravar mais efeitos). Espelhar troca
      // as bordas de lugar: no losango c↔r; no quadrado direita↔esquerda.
      const h = Math.abs((c * 73856093) ^ (r * 19349663));
      const flip = h % 2 === 1;
      if (flip) {
        mask = iso
          ? ((mask & 1) << 2) | ((mask & 4) >> 2) | ((mask & 2) << 2) | ((mask & 8) >> 2)
          : ((mask & 1) << 1) | ((mask & 2) >> 1) | (mask & 12);
      }
      const p = this.cc(c, r);
      next.set(k, { c, r, x: p.x, y: p.y, mask, flip, phase: h % 37 });
      if (!this.fireSprites.has(mask)) {
        this.fireSprites.set(mask, new FxSprite(FIRE_FX, 'loop', { view: this.fxView, fx: { mask } }));
      }
    }
    this.fire = next;
    this.invalidate();
  }

  /** Apaga todo o fogo agora (o Mestre clicou em "Apagar tudo"). */
  public clearFire(): void {
    this.fireLocalUntil = 0;
    this.setFire([]);
  }

  /** Mestre pintando/apagando fogo com o pincel. */
  private paintFire(cell: CellCoord | null, add: boolean): void {
    if (!cell) return;
    const k = cellKey(cell.c, cell.r);
    if (add === this.fire.has(k) || (add && !this.valid.has(k))) return;
    const keys = new Set(this.fire.keys());
    if (add) keys.add(k);
    else keys.delete(k);
    this.fireLocalUntil = performance.now() + 3000;
    this.setFire(keys);
    this.options.onUpdateFire?.([...keys].map((x) => x.split(',').map(Number) as [number, number]));
  }

  private drawFireCell(f: FireCell): void {
    const sp = this.fireSprites.get(f.mask);
    const src = sp?.ready ? sp.frameAt(f.phase) : null;
    if (!sp || !src) return;
    const { w, h, ox, oy } = sp.box;
    const k = this.TW / 40;
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    if (f.flip) {
      ctx.translate(f.x, f.y);
      ctx.scale(-1, 1);
      ctx.drawImage(src, -ox * k, -oy * k, w * k, h * k);
      ctx.setTransform(this.scale, 0, 0, this.scale, -this.view.x * this.scale, -this.view.y * this.scale);
    } else {
      ctx.drawImage(src, f.x - ox * k, f.y - oy * k, w * k, h * k);
    }
    ctx.imageSmoothingEnabled = true;
  }

  /** Cria/ajusta o efeito de uma peça especial (efeito em loop ou baú). */
  private syncSprite(s: LocalTokenState): void {
    const sp = s.special;
    const id = s.token.id;
    if (!sp) {
      this.fxSprites.delete(id);
      return;
    }
    const cur = this.fxSprites.get(id);
    if (sp.kind === 'fogo') return;
    if (sp.kind === 'fx') {
      const view = sp.view === 'auto' ? this.fxView : sp.view;
      if (!cur || cur.id !== sp.id || cur.view !== view) {
        this.fxSprites.set(id, new FxSprite(sp.id, sp.repeat ? 'loop' : 'once', { every: sp.every, view }));
      }
      return;
    }
    // Baú: fechado parado; ao ser aberto toca a tampa abrindo e para aberto.
    if (!cur) {
      this.fxSprites.set(id, new FxSprite(CHEST_FX, 'still', { at: sp.opened ? CHEST_OPEN_AT : 0, seed: 3 }));
    } else if (sp.opened) {
      cur.setMode(cur.idle && !cur.ready ? 'still' : 'toStill', CHEST_OPEN_AT);
    } else {
      cur.setMode('still', 0);
    }
  }

  /** Toca um efeito uma vez numa casa (para todos que recebem o aviso). */
  public playFx(id: string, c: number, r: number, scale = 1, view?: FxView): void {
    const p = this.cc(c, r);
    this.oneShots.push({ sprite: new FxSprite(id, 'once', { view: view ?? this.fxView }), x: p.x, y: p.y, scale });
    this.invalidate();
  }

  /** Avança os efeitos; devolve se algum ainda anima. */
  private tickFx(dt: number): boolean {
    let animating = false;
    for (const [id, sp] of this.fxSprites) {
      const st = this.tokenStates.get(id);
      if (!st || !this.isTokenShown(st)) continue;
      if (sp.tick(dt)) this.dirty = true;
      if (!sp.idle || !sp.ready) animating = true;
    }
    if (this.fire.size) {
      const used = new Set<number>();
      for (const f of this.fire.values()) used.add(f.mask);
      for (const [mask, sp] of this.fireSprites) {
        if (!used.has(mask)) continue;
        if (sp.tick(dt)) this.dirty = true;
      }
      animating = true;
    }
    if (this.oneShots.length) {
      for (const o of this.oneShots) if (o.sprite.tick(dt)) this.dirty = true;
      const before = this.oneShots.length;
      this.oneShots = this.oneShots.filter((o) => !o.sprite.finished);
      if (this.oneShots.length !== before) this.dirty = true;
      if (this.oneShots.length) animating = true;
    }
    return animating;
  }

  /** Desenha um efeito em pixel art, apoiado em (x, y) do mundo. */
  private drawSprite(sp: FxSprite, x: number, y: number, scale: number, alpha = 1): void {
    const src = sp.source;
    if (!src || !sp.ready) return;
    const { w, h, ox, oy } = sp.box;
    const k = (this.TW / 40) * scale;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, x - ox * k, y - oy * k, w * k, h * k);
    ctx.restore();
  }

  /** Peça especial: efeito ou baú (sem base, sombra nem barra de vida). */
  private drawSpecial(s: LocalTokenState): void {
    const sp = this.fxSprites.get(s.token.id);
    const hidden = s.token.visible === false;
    const isDm = this.options.mode === 'dm';
    const isSelected = this.options.selectedTokenId === s.token.id;
    const ctx = this.ctx;
    const yoff = this.mode === 'square' ? this.TW * 0.12 : this.TH * 0.14;
    if (isDm && (isSelected || hidden)) {
      this.shape(ctx, s.x, s.y, this.TW * 0.9, this.TH * 0.9);
      ctx.setLineDash([4 / this.scale, 3 / this.scale]);
      ctx.lineWidth = (isSelected ? 2.4 : 1.2) / this.scale;
      ctx.strokeStyle = isSelected ? C.gold : C.textA(0.5);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (sp) {
      const scale = s.special?.kind === 'fx' ? s.special.scale : 0.9;
      // Efeitos de chão (círculos, ondas…) ficam centrados na casa; os em pé, apoiados um pouco abaixo.
      this.drawSprite(sp, s.x, s.y + (sp.grounded ? 0 : yoff), scale, hidden ? 0.4 : 1);
    }
    // Nome só para o Mestre (efeitos) ou baú escondido
    if (isDm && (isSelected || s.special?.kind === 'bau')) {
      const fs = Math.max(9 / this.scale, this.TH * 0.24);
      ctx.font = `700 ${fs}px Cinzel, Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(7, 6, 5, 0.9)';
      ctx.lineWidth = 3 / this.scale;
      const label = hidden ? `${s.token.name} (oculto)` : s.token.name;
      const y = s.y - this.TH * 1.6;
      ctx.strokeText(label, s.x, y);
      ctx.fillStyle = C.goldHi;
      ctx.fillText(label, s.x, y);
    }
  }

  public getMyHeroToken(): LocalTokenState | null {
    if (this.options.mode !== 'player') return null;
    if (this.options.myHeroTokenId) {
      const s = this.tokenStates.get(this.options.myHeroTokenId);
      if (s) return s;
    }
    if (this.options.myHeroId) {
      for (const s of this.tokenStates.values()) {
        if (s.token.hero_id === this.options.myHeroId) return s;
      }
    }
    return null;
  }

  /** O Mestre vê peças ocultas (translúcidas); jogador e TV não. */
  private isTokenShown(s: LocalTokenState): boolean {
    return s.token.visible !== false || this.options.mode === 'dm';
  }

  private isCellBlocked(k: string, ignoreId?: string): boolean {
    if (this.blocked.has(k)) return true;
    for (const s of this.tokenStates.values()) {
      if (s.special?.kind === 'fx') continue; // efeito não ocupa a casa
      if (s.token.id !== ignoreId && s.token.visible !== false && cellKey(s.c, s.r) === k) {
        return true;
      }
    }
    return false;
  }

  private recomputeReach(): void {
    const hero = this.getMyHeroToken();
    const moves = hero && hero.movesLeft > 0 ? hero.movesLeft : 0;
    if (!hero || moves <= 0) {
      this.reach.clear();
      this.graph = null;
      this.reachPath = null;
      this.prevPath = null;
      return;
    }
    this.graph = bfs(hero.c, hero.r, moves, this.valid, (k) => this.isCellBlocked(k, hero.token.id));
    this.reach = computeReach(this.graph.dist, moves);
    this.reachPath = this.cellsPath(this.reach.keys());
  }

  private cellsPath(keys: Iterable<string>): Path2D | null {
    if (typeof Path2D === 'undefined') return null;
    const p = new Path2D();
    for (const k of keys) {
      const [c, r] = k.split(',').map(Number);
      const pt = this.cc(c, r);
      cellShape(p, this.mode, pt.x, pt.y, this.TW, this.TH, false);
    }
    return p;
  }

  private updateHover(coord: CellCoord | null): void {
    this.hover = coord;
    this.options.onHoverCell?.(coord);
    const hero = this.getMyHeroToken();
    if (!coord || !hero || hero.moving || !this.graph || this.options.tool === 'measure') {
      this.prevPath = null;
    } else {
      this.prevPath = reconstructPath(this.graph.prev, this.graph.dist, coord.c, coord.r, hero.c, hero.r);
    }
    this.invalidate();
  }

  // ───────────────────────── Pings e régua ─────────────────────────

  /** Mostra um ping animado numa célula (local ou recebido pela rede). */
  public showPing(ping: BattlePing): void {
    this.pings.push({ ...ping, start: performance.now() });
    if (this.pings.length > 8) this.pings.shift();
    this.invalidate();
  }

  public clearMeasure(): void {
    if (!this.measureFrom && !this.measureTo) return;
    this.measureFrom = null;
    this.measureTo = null;
    this.options.onMeasure?.(null);
    this.invalidate();
  }

  // ───────────────────────── Desenho ─────────────────────────

  private scheduleLayerRebuild(delay = 140): void {
    if (this.layerTimer) clearTimeout(this.layerTimer);
    this.layerTimer = setTimeout(() => {
      this.layerTimer = null;
      this.layerDirty = true;
      this.invalidate();
    }, delay);
  }

  /** Desenha fundo + grade numa camada em cache, na resolução do zoom atual. */
  private rebuildLayer(): void {
    const area = this.imgW * this.imgH;
    const maxK = Math.sqrt(LAYER_MAX_PIXELS / Math.max(1, area));
    const k = Math.max(0.5, Math.min(maxK, this.base * this.view.z));
    const w = Math.max(1, Math.round(this.imgW * k));
    const h = Math.max(1, Math.round(this.imgH * k));

    // Com fundo em vídeo a camada guarda só a grade (transparente).
    const alpha = Boolean(this.bgVideo);
    if (!this.layer || this.layerAlpha !== alpha) {
      this.layer = document.createElement('canvas');
      this.layerAlpha = alpha;
    }
    if (this.layer.width !== w || this.layer.height !== h) {
      this.layer.width = w;
      this.layer.height = h;
    }
    const lctx = this.layer.getContext('2d', { alpha });
    if (!lctx) return;

    lctx.setTransform(1, 0, 0, 1, 0, 0);
    if (alpha) {
      lctx.clearRect(0, 0, w, h);
    } else {
      lctx.fillStyle = C.abyss;
      lctx.fillRect(0, 0, w, h);
    }
    lctx.setTransform(k, 0, 0, k, 0, 0);
    lctx.imageSmoothingQuality = 'high';
    if (!alpha && this.bgLoaded && this.bgImg.naturalWidth) {
      lctx.drawImage(this.bgImg, 0, 0, this.imgW, this.imgH);
    }
    if (this.showGrid) {
      const gp = this.cellsPath(this.valid);
      if (gp) {
        lctx.lineWidth = 1 / k;
        lctx.strokeStyle = C.textA(0.16);
        lctx.stroke(gp);
      }
    }
    this.layerScale = k;
    this.layerDirty = false;
  }

  private draw(now: number): void {
    this.scale = this.base * this.view.z;
    const ctx = this.ctx;
    const isDm = this.options.mode === 'dm';
    const isPlayer = this.options.mode === 'player';

    if (this.layerDirty || !this.layer) this.rebuildLayer();
    else if (Math.abs(this.scale / this.layerScale - 1) > 0.25) this.scheduleLayerRebuild();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.abyss;
    ctx.fillRect(0, 0, this.cv.width, this.cv.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, -this.view.x * this.scale, -this.view.y * this.scale);
    ctx.imageSmoothingEnabled = true;
    if (this.bgVideo && this.bgVideo.readyState >= 2) {
      ctx.drawImage(this.bgVideo, 0, 0, this.imgW, this.imgH);
    }
    if (this.layer) ctx.drawImage(this.layer, 0, 0, this.imgW, this.imgH);

    const lw = 1.2 / this.scale;
    const hero = this.getMyHeroToken();

    // Alcance do herói
    if (isPlayer && hero && !hero.moving && this.reachPath && this.options.tool !== 'measure') {
      // Preenchimento + contorno: sobre pisos claros só o preenchimento some.
      ctx.fillStyle = 'rgba(7, 6, 5, 0.25)';
      ctx.fill(this.reachPath);
      ctx.fillStyle = C.goldA(0.22);
      ctx.fill(this.reachPath);
      ctx.lineWidth = lw * 1.2;
      ctx.strokeStyle = C.goldA(0.75);
      ctx.stroke(this.reachPath);
    }

    // Bloqueios
    if (this.blockedPath && this.blocked.size > 0 && (this.showGrid || isDm)) {
      ctx.fillStyle = C.bloodA(isDm ? 0.45 : 0.32);
      ctx.fill(this.blockedPath);
      if (isDm) {
        ctx.lineWidth = lw * 1.4;
        ctx.strokeStyle = C.bloodA(0.9);
        ctx.stroke(this.blockedPath);
      }
    }

    // Caminho previsto
    if (isPlayer && hero && !hero.moving && this.prevPath) {
      const limit = hero.movesLeft ?? this.moveLimit;
      this.prevPath.forEach((k, n) => {
        const [c, r] = k.split(',').map(Number);
        const p = this.cc(c, r);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, this.TW * 0.08, this.TH * 0.08, 0, 0, Math.PI * 2);
        ctx.fillStyle = n < limit ? C.goldHi : C.bloodHi;
        ctx.fill();
      });
    }

    this.drawHover(ctx, lw, hero);

    // Origem da grade (só Mestre)
    if (isDm) {
      const op = this.cc(0, 0);
      ctx.beginPath();
      ctx.arc(op.x, op.y, 4 / this.scale, 0, Math.PI * 2);
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 1.5 / this.scale;
      ctx.stroke();
    }

    // Peças por profundidade (y)
    const states = [...this.tokenStates.values()].filter((s) => this.isTokenShown(s));
    states.sort((a, b) => a.y - b.y);
    if (this.fire.size === 0) {
      for (const s of states) this.drawToken(s, now, s === hero);
    } else {
      // Fogo e peças na mesma ordem de profundidade: quem está à frente cobre as chamas de trás.
      const flames = [...this.fire.values()].sort((a, b) => a.y - b.y);
      let i = 0;
      for (const s of states) {
        while (i < flames.length && flames[i].y <= s.y) this.drawFireCell(flames[i++]);
        this.drawToken(s, now, s === hero);
      }
      while (i < flames.length) this.drawFireCell(flames[i++]);
    }
    for (const o of this.oneShots) this.drawSprite(o.sprite, o.x, o.y + (o.sprite.grounded ? 0 : this.TH * 0.14), o.scale);

    this.drawMeasure(ctx, lw);
    this.drawPings(ctx, now);
  }

  private drawHover(ctx: CanvasRenderingContext2D, lw: number, hero: LocalTokenState | null): void {
    if (!this.hover || this.options.mode === 'tv') return;
    const tool = this.options.tool || 'select';
    if (tool === 'pan' || tool === 'measure') return;
    const p = this.cc(this.hover.c, this.hover.r);
    let stroke = C.gold;
    let fill = C.goldA(0.22);

    if (this.options.mode === 'dm') {
      if (tool === 'paint_block') {
        stroke = C.bloodHi;
        fill = C.bloodA(0.4);
      } else if (tool === 'erase_block') {
        stroke = C.text;
        fill = C.textA(0.25);
      }
    } else {
      const k = cellKey(this.hover.c, this.hover.r);
      const bad =
        this.blocked.has(k) || !this.prevPath || this.prevPath.length > (hero?.movesLeft ?? this.moveLimit);
      if (bad) {
        stroke = C.bloodHi;
        fill = C.bloodA(0.28);
      }
    }

    this.shape(ctx, p.x, p.y, this.TW, this.TH);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = lw * 2;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }

  private drawMeasure(ctx: CanvasRenderingContext2D, lw: number): void {
    if (!this.measureFrom || !this.measureTo) return;
    const a = this.cc(this.measureFrom.c, this.measureFrom.r);
    const b = this.cc(this.measureTo.c, this.measureTo.r);
    const n = gridDistance(this.measureFrom.c, this.measureFrom.r, this.measureTo.c, this.measureTo.r);

    for (const pt of [a, b]) {
      this.shape(ctx, pt.x, pt.y, this.TW, this.TH);
      ctx.fillStyle = C.goldA(0.25);
      ctx.fill();
    }
    ctx.save();
    ctx.setLineDash([8 / this.scale, 6 / this.scale]);
    ctx.lineWidth = lw * 2.4;
    ctx.strokeStyle = C.goldHi;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();

    const label = `${n} ${n === 1 ? 'quadrado' : 'quadrados'}`;
    const fs = Math.max(11, this.TH * 0.36);
    ctx.font = `700 ${fs}px Cinzel, Georgia, serif`;
    const tw = ctx.measureText(label).width;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2 - fs;
    ctx.fillStyle = 'rgba(7, 6, 5, 0.85)';
    ctx.fillRect(mx - tw / 2 - fs * 0.5, my - fs * 0.8, tw + fs, fs * 1.6);
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = lw;
    ctx.strokeRect(mx - tw / 2 - fs * 0.5, my - fs * 0.8, tw + fs, fs * 1.6);
    ctx.fillStyle = C.goldHi;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my);
  }

  private drawPings(ctx: CanvasRenderingContext2D, now: number): void {
    for (const ping of this.pings) {
      const t = Math.min(1, (now - ping.start) / PING_MS);
      const p = this.cc(ping.c, ping.r);
      const color = ping.color || C.goldHi;
      ctx.save();
      ctx.strokeStyle = color;
      for (let i = 0; i < 2; i++) {
        const tt = Math.min(1, t * 1.4 - i * 0.25);
        if (tt <= 0) continue;
        ctx.globalAlpha = 1 - tt;
        ctx.lineWidth = (3 - i) / this.scale;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, this.TW * (0.3 + tt * 0.9), this.TH * (0.3 + tt * 0.9), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - this.TW * 0.12, p.y - this.TH * 1.4);
      ctx.lineTo(p.x + this.TW * 0.12, p.y - this.TH * 1.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private drawToken(s: LocalTokenState, now: number, isMyHero: boolean): void {
    if (s.special) {
      this.drawSpecial(s);
      return;
    }
    // Culling: ignora peças fora da câmera
    const margin = Math.max(s.size, this.TW) * 1.5;
    const vw = this.cv.width / this.scale;
    const vh = this.cv.height / this.scale;
    if (
      s.x < this.view.x - margin ||
      s.x > this.view.x + vw + margin ||
      s.y < this.view.y - margin ||
      s.y > this.view.y + vh + margin
    ) {
      return;
    }

    const ctx = this.ctx;
    const hidden = s.token.visible === false;
    const isSelected = this.options.selectedTokenId === s.token.id;
    const isActive = this.options.activeTokenId === s.token.id;
    ctx.save();
    if (hidden) ctx.globalAlpha = 0.4;

    // Sombra
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 2, this.TW * 0.34, this.TH * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();

    // Turno ativo: anel dourado pulsante
    if (isActive) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 260);
      this.shape(ctx, s.x, s.y, this.TW * (1.05 + pulse * 0.1), this.TH * (1.05 + pulse * 0.1));
      ctx.fillStyle = C.goldA(0.12 + pulse * 0.12);
      ctx.fill();
      ctx.lineWidth = (2.2 / this.scale) * (1 + pulse * 0.4);
      ctx.strokeStyle = C.goldHi;
      ctx.stroke();
    }

    // Base da peça
    this.shape(ctx, s.x, s.y, this.TW * 0.9, this.TH * 0.9);
    ctx.lineWidth = (1.5 / this.scale) * (isSelected ? 2.4 : isMyHero ? 1.6 : 1);
    ctx.strokeStyle = isSelected || isMyHero ? C.gold : s.kind === 'heroi' ? C.moss : C.bloodHi;
    ctx.stroke();

    // Sprite / vídeo
    const entry = this.pool.get(s.mediaUrl, s.chromaMode);
    const source = entry?.src || (entry?.ready ? entry.el : null);
    let drawn = false;
    if (source) {
      const sw =
        (source as HTMLVideoElement).videoWidth || (source as HTMLImageElement).naturalWidth || source.width;
      const sh =
        (source as HTMLVideoElement).videoHeight || (source as HTMLImageElement).naturalHeight || source.height;
      if (sw && sh) {
        const H = s.size;
        const W = (H * sw) / sh;
        const bob = s.moving ? Math.abs(Math.sin(now / 95)) * -H * 0.025 : 0;
        ctx.translate(s.x, s.y + (this.mode === 'square' ? this.TW * 0.12 : this.TH * 0.14) + bob);
        ctx.scale(s.facing, 1);
        ctx.drawImage(source, -W * s.anchorX, -H * s.anchorY, W, H);
        ctx.setTransform(this.scale, 0, 0, this.scale, -this.view.x * this.scale, -this.view.y * this.scale);
        drawn = true;
      }
    }
    if (!drawn) {
      const rr = s.size * 0.22;
      ctx.beginPath();
      ctx.arc(s.x, s.y - s.size * 0.3, rr, 0, Math.PI * 2);
      ctx.fillStyle = isMyHero ? C.gold : s.kind === 'heroi' ? C.moss : C.blood;
      ctx.fill();
      ctx.lineWidth = 1.5 / this.scale;
      ctx.strokeStyle = C.text;
      ctx.stroke();
      ctx.font = `700 ${Math.round(s.size * 0.16)}px Cinzel, Georgia, serif`;
      ctx.fillStyle = C.abyss;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((s.token.name || '?').substring(0, 2).toUpperCase(), s.x, s.y - s.size * 0.3 + 1);
    }

    // Barra de vida (heróis via heroVitals, demais via hp da peça)
    const vital = s.token.hero_id ? this.options.heroVitals?.[s.token.hero_id] : undefined;
    const hp = vital?.hp ?? s.token.hp ?? undefined;
    const maxHp = vital?.maxHp ?? s.token.max_hp ?? hp;
    const top = s.y - s.size * 1.02;
    if (hp != null && maxHp && maxHp > 0) {
      const bw = this.TW * 0.9;
      const bh = Math.max(3 / this.scale, this.TH * 0.12);
      const bx = s.x - bw / 2;
      ctx.fillStyle = 'rgba(7, 6, 5, 0.8)';
      ctx.fillRect(bx, top, bw, bh);
      const pct = Math.max(0, Math.min(1, hp / maxHp));
      ctx.fillStyle = pct <= 0.3 ? C.bloodHi : s.kind === 'heroi' ? C.moss : C.blood;
      ctx.fillRect(bx, top, bw * pct, bh);
      ctx.strokeStyle = C.goldA(0.5);
      ctx.lineWidth = 1 / this.scale;
      ctx.strokeRect(bx, top, bw, bh);
    }

    // Nome
    const fs = Math.max(10 / this.scale, this.TH * 0.3);
    const labelY = top - fs * 0.5;
    ctx.font = `700 ${fs}px Cinzel, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(7, 6, 5, 0.9)';
    ctx.lineWidth = 3 / this.scale;
    const name = hidden ? `${s.token.name} (oculto)` : s.token.name;
    ctx.strokeText(name, s.x, labelY);
    ctx.fillStyle = isActive ? C.goldHi : C.text;
    ctx.fillText(name, s.x, labelY);
    ctx.restore();
  }

  // ───────────────────────── Câmera ─────────────────────────

  /** Escala que faz o mapa inteiro caber na área (w × h). */
  private containScale(w: number, h: number): number {
    if (!w || !h) return 1;
    return Math.min(w / (this.imgW || 1376), h / (this.imgH || 768));
  }

  private getCssScale(): number {
    const rc = this.cv.getBoundingClientRect();
    if (!rc.width) return 1;
    return this.containScale(rc.width, rc.height) * this.view.z;
  }

  private toImg(clientX: number, clientY: number): Point {
    const rc = this.cv.getBoundingClientRect();
    const s = this.getCssScale();
    return { x: this.view.x + (clientX - rc.left) / s, y: this.view.y + (clientY - rc.top) / s };
  }

  /** Posição na tela (client) do centro de uma casa. */
  public cellToClient(c: number, r: number): Point {
    const rc = this.cv.getBoundingClientRect();
    const s = this.getCssScale();
    const p = this.cc(c, r);
    return { x: rc.left + (p.x - this.view.x) * s, y: rc.top + (p.y - this.view.y) * s };
  }

  private cellAt(clientX: number, clientY: number): CellCoord | null {
    const pt = this.toImg(clientX, clientY);
    return pickG(this.mode, pt.x, pt.y, this.valid, this.OX, this.OY, this.TW, this.imgW, this.imgH);
  }

  public clampView(): void {
    const rc = this.cv.getBoundingClientRect();
    const s = this.getCssScale();
    const visibleW = rc.width > 0 ? rc.width / s : this.imgW / this.view.z;
    const visibleH = rc.height > 0 ? rc.height / s : this.imgH / this.view.z;
    this.view.z = Math.min(this.ZMAX, Math.max(this.ZMIN, this.view.z));
    // Se a imagem é menor que a tela, centraliza; senão limita às bordas.
    this.view.x =
      visibleW >= this.imgW
        ? (this.imgW - visibleW) / 2
        : Math.min(this.imgW - visibleW, Math.max(0, this.view.x));
    this.view.y =
      visibleH >= this.imgH
        ? (this.imgH - visibleH) / 2
        : Math.min(this.imgH - visibleH, Math.max(0, this.view.y));
    this.invalidate();
  }

  public zoomIn(): void {
    this.zoomAtCenter(1.3);
  }

  public zoomOut(): void {
    this.zoomAtCenter(1 / 1.3);
  }

  private zoomAtCenter(factor: number): void {
    const rc = this.cv.getBoundingClientRect();
    this.zoomAt(rc.left + rc.width / 2, rc.top + rc.height / 2, this.view.z * factor);
  }

  private zoomAt(clientX: number, clientY: number, nz: number): void {
    const pt = this.toImg(clientX, clientY);
    const rc = this.cv.getBoundingClientRect();
    const z = Math.min(this.ZMAX, Math.max(this.ZMIN, nz));
    const s = this.containScale(rc.width, rc.height) * z;
    this.view.z = z;
    this.view.x = pt.x - (clientX - rc.left) / s;
    this.view.y = pt.y - (clientY - rc.top) / s;
    this.clampView();
  }

  /**
   * Primeiro enquadramento: se a tela tem proporção muito diferente do mapa
   * (celular em pé), começa preenchendo a tela em vez de deixar faixas vazias.
   */
  private applyInitialView(): void {
    const rc = this.cv.getBoundingClientRect();
    if (!rc.width || !rc.height) return;
    this.needsInitialView = false;
    const contain = this.containScale(rc.width, rc.height);
    const cover = Math.max(rc.width / this.imgW, rc.height / this.imgH);
    const ratio = cover / contain;
    this.view.z = this.options.mode !== 'tv' && ratio > 1.4 ? Math.min(this.ZMAX, ratio) : 1;
    this.view.x = (this.imgW - rc.width / (contain * this.view.z)) / 2;
    this.view.y = (this.imgH - rc.height / (contain * this.view.z)) / 2;
    this.clampView();
  }

  public zoomFit(): void {
    this.view = { z: 1, x: 0, y: 0 };
    this.clampView();
  }

  public centerOnHero(heroTokenId?: string): void {
    const s = heroTokenId ? this.tokenStates.get(heroTokenId) : this.getMyHeroToken();
    if (s) this.centerOnPoint(s.x, s.y);
  }

  public centerOnToken(tokenId: string): void {
    const s = this.tokenStates.get(tokenId);
    if (s) this.centerOnPoint(s.x, s.y);
  }

  private centerOnPoint(x: number, y: number): void {
    this.view.z = Math.max(1.5, this.view.z);
    const rc = this.cv.getBoundingClientRect();
    const s = this.getCssScale();
    this.view.x = x - (rc.width > 0 ? rc.width / s : this.imgW / this.view.z) / 2;
    this.view.y = y - (rc.height > 0 ? rc.height / s : this.imgH / this.view.z) / 2;
    this.clampView();
  }

  // ───────────────────────── Entrada ─────────────────────────

  private preventContextMenu(e: Event): void {
    e.preventDefault();
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    this.zoomAt(e.clientX, e.clientY, this.view.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
  }

  private handleDblClick(e: MouseEvent): void {
    if (this.options.mode === 'tv') return;
    const cell = this.cellAt(e.clientX, e.clientY);
    if (cell) this.emitPing(cell);
  }

  private emitPing(cell: CellCoord): void {
    const ping: BattlePing = { c: cell.c, r: cell.r, color: this.options.mode === 'dm' ? C.bloodHi : C.goldHi };
    this.showPing(ping);
    this.options.onPing?.(ping);
  }

  private cancelLongPress(): void {
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
  }

  private hitToken(pt: Point, cell: CellCoord | null): LocalTokenState | null {
    const front = [...this.tokenStates.values()].filter((s) => this.isTokenShown(s)).sort((a, b) => b.y - a.y);
    for (const s of front) {
      if (cell && s.c === cell.c && s.r === cell.r) return s;
      if (Math.hypot(pt.x - s.x, pt.y - s.y) < this.TW * 0.55) return s;
      const halfW = (s.size * 0.45) / 2;
      if (pt.x >= s.x - halfW && pt.x <= s.x + halfW && pt.y >= s.y - s.size && pt.y <= s.y) return s;
    }
    return null;
  }

  private paintAt(cell: CellCoord | null, add: boolean): void {
    if (!cell) return;
    const k = cellKey(cell.c, cell.r);
    if (add === this.blocked.has(k)) return;
    if (add) this.blocked.add(k);
    else this.blocked.delete(k);
    this.blockedPath = this.cellsPath(this.blocked);
    this.options.onUpdateBlocked?.(Array.from(this.blocked));
    this.invalidate();
  }

  private handlePointerDown(e: PointerEvent): void {
    if (e.button === 2) return;
    this.cv.setPointerCapture(e.pointerId);
    this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pts.size === 2) {
      this.cancelLongPress();
      const [p1, p2] = [...this.pts.values()];
      this.pinchDist0 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      this.pinchZ0 = this.view.z;
      this.isDragging = true;
      this.isPaintingBlock = this.isErasingBlock = this.isPaintingFire = this.isErasingFire = false;
      this.draggedTokenId = null;
      return;
    }
    if (this.pts.size !== 1) return;

    const pt = this.toImg(e.clientX, e.clientY);
    const cell = pickG(this.mode, pt.x, pt.y, this.valid, this.OX, this.OY, this.TW, this.imgW, this.imgH);
    this.pressStart = { pt, client: { x: e.clientX, y: e.clientY }, time: performance.now() };
    this.panView0 = { ...this.view };
    this.isDragging = false;
    this.longPressFired = false;

    // Toque longo = ping (exceto na TV)
    if (this.options.mode !== 'tv' && cell && e.pointerType !== 'mouse') {
      this.cancelLongPress();
      this.longPressTimer = setTimeout(() => {
        this.longPressFired = true;
        this.emitPing(cell);
      }, LONG_PRESS_MS);
    }

    const tool = this.options.tool || 'select';
    if (tool === 'measure') {
      if (cell) {
        this.measureFrom = cell;
        this.measureTo = cell;
        this.options.onMeasure?.(0);
        this.invalidate();
      }
      return;
    }

    if (this.options.mode !== 'dm') return;
    if (tool === 'paint_block') {
      this.isPaintingBlock = true;
      this.paintAt(cell, true);
    } else if (tool === 'erase_block') {
      this.isErasingBlock = true;
      this.paintAt(cell, false);
    } else if (tool === 'paint_fire') {
      this.isPaintingFire = true;
      this.paintFire(cell, true);
    } else if (tool === 'erase_fire') {
      this.isErasingFire = true;
      this.paintFire(cell, false);
    } else if (tool === 'select') {
      const hit = this.hitToken(pt, cell);
      const id = hit?.token.id ?? null;
      this.options.selectedTokenId = id;
      this.options.onSelectTokenId?.(id);
      this.options.onSelectToken?.(hit?.token ?? null);
      this.draggedTokenId = id;
      this.invalidate();
    }
  }

  private handlePointerLeave(): void {
    if (this.pts.size === 0 && this.hover) this.updateHover(null);
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.pts.has(e.pointerId)) {
      if (this.options.mode === 'tv' || e.pointerType !== 'mouse') return;
      const cell = this.cellAt(e.clientX, e.clientY);
      const h = this.hover;
      if ((h === null) !== (cell === null) || (h && cell && (h.c !== cell.c || h.r !== cell.r))) {
        this.updateHover(cell);
      }
      return;
    }

    this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pts.size === 2) {
      const [p1, p2] = [...this.pts.values()];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (this.pinchDist0 > 0) {
        this.zoomAt((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, this.pinchZ0 * (dist / this.pinchDist0));
      }
      return;
    }
    if (!this.pressStart) return;

    const dx = e.clientX - this.pressStart.client.x;
    const dy = e.clientY - this.pressStart.client.y;
    const moved = Math.hypot(dx, dy) > DRAG_THRESHOLD;
    if (moved) this.cancelLongPress();
    const tool = this.options.tool || 'select';

    if (tool === 'measure' && this.measureFrom) {
      const cell = this.cellAt(e.clientX, e.clientY);
      if (cell && (cell.c !== this.measureTo?.c || cell.r !== this.measureTo?.r)) {
        this.measureTo = cell;
        this.options.onMeasure?.(gridDistance(this.measureFrom.c, this.measureFrom.r, cell.c, cell.r));
        this.invalidate();
      }
      return;
    }

    if (this.options.mode === 'dm') {
      if (this.isPaintingBlock) return this.paintAt(this.cellAt(e.clientX, e.clientY), true);
      if (this.isErasingBlock) return this.paintAt(this.cellAt(e.clientX, e.clientY), false);
      if (this.isPaintingFire) return this.paintFire(this.cellAt(e.clientX, e.clientY), true);
      if (this.isErasingFire) return this.paintFire(this.cellAt(e.clientX, e.clientY), false);
      if (this.draggedTokenId && tool === 'select') {
        if (moved) this.isDraggingToken = true;
        if (this.isDraggingToken) {
          const cell = this.cellAt(e.clientX, e.clientY);
          const s = this.tokenStates.get(this.draggedTokenId);
          if (cell && s && (s.c !== cell.c || s.r !== cell.r)) {
            s.c = cell.c;
            s.r = cell.r;
            s.path = [];
            const pos = this.cc(cell.c, cell.r);
            s.x = pos.x;
            s.y = pos.y;
            this.invalidate();
          }
        }
        return;
      }
    }

    if (moved) this.isDragging = true;
    if (this.isDragging && this.panView0) {
      const s = this.getCssScale();
      this.view.x = this.panView0.x - dx / s;
      this.view.y = this.panView0.y - dy / s;
      this.clampView();
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    this.pts.delete(e.pointerId);
    this.cancelLongPress();

    if (this.isDraggingToken && this.draggedTokenId) {
      const s = this.tokenStates.get(this.draggedTokenId);
      if (s) this.options.onDropToken?.(this.draggedTokenId, s.c, s.r);
    }

    const tool = this.options.tool || 'select';
    const isTap = !this.isDragging && !this.longPressFired && this.pressStart && e.type === 'pointerup';
    if (isTap && this.options.mode === 'player' && tool !== 'measure') {
      const cell = this.cellAt(e.clientX, e.clientY);
      if (cell) this.handleCellAction(cell);
    }
    if (isTap && this.options.mode === 'dm' && this.options.onCellClick) {
      const cell = this.cellAt(e.clientX, e.clientY);
      if (cell) this.options.onCellClick(cell);
    }

    this.isPaintingBlock = false;
    this.isErasingBlock = false;
    this.isPaintingFire = false;
    this.isErasingFire = false;
    this.isDraggingToken = false;
    this.draggedTokenId = null;
    if (this.pts.size === 0) {
      this.pressStart = null;
      this.panView0 = null;
      this.isDragging = false;
    }
  }

  private handleCellAction(cell: CellCoord): void {
    const hero = this.getMyHeroToken();
    // Baú na casa tocada: abre (se o herói estiver do lado) em vez de andar.
    for (const st of this.tokenStates.values()) {
      if (st.special?.kind !== 'bau' || st.token.visible === false || st.c !== cell.c || st.r !== cell.r) continue;
      const near = Boolean(hero && Math.max(Math.abs(hero.c - st.c), Math.abs(hero.r - st.r)) <= 1);
      this.options.onTapChest?.(st.token, near);
      return;
    }
    if (!hero || hero.moving || !this.graph) return;
    if (!this.reach.has(cellKey(cell.c, cell.r))) return;
    const path = reconstructCoordPath(this.graph.prev, this.graph.dist, cell.c, cell.r, hero.c, hero.r);
    if (!path || path.length === 0) return;

    this.options.onMoveToken?.(hero.token.id, cell.c, cell.r, path);
    hero.path = [...path];
    hero.moving = true;
    hero.movesLeft = Math.max(0, hero.movesLeft - path.length);
    this.prevPath = null;
    this.invalidate();
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.layerTimer) clearTimeout(this.layerTimer);
    this.cancelLongPress();
    this.resizeObserver?.disconnect();
    this.cv.removeEventListener('contextmenu', this.preventContextMenu);
    this.cv.removeEventListener('pointerdown', this.handlePointerDown);
    this.cv.removeEventListener('pointermove', this.handlePointerMove);
    this.cv.removeEventListener('pointerup', this.handlePointerUp);
    this.cv.removeEventListener('pointercancel', this.handlePointerUp);
    this.cv.removeEventListener('pointerleave', this.handlePointerLeave);
    this.cv.removeEventListener('wheel', this.handleWheel);
    this.cv.removeEventListener('dblclick', this.handleDblClick);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.pool.destroy();
    this.stopBgVideo();
    this.layer = null;
  }
}

function normalizePath(raw: unknown): Array<[number, number]> {
  if (!Array.isArray(raw)) return [];
  const out: Array<[number, number]> = [];
  for (const p of raw) {
    if (Array.isArray(p)) out.push([Number(p[0]), Number(p[1])]);
    else if (typeof p === 'string' && p.includes(',')) {
      const [c, r] = p.split(',').map(Number);
      out.push([c, r]);
    }
  }
  return out.filter(([c, r]) => Number.isFinite(c) && Number.isFinite(r));
}

/** buildGrid protegido contra parâmetros absurdos (tile minúsculo trava a aba). */
function buildGridSafe(mode: GridMode, w: number, h: number, ox: number, oy: number, tw: number): Set<string> {
  return buildGridG(mode, w, h, ox, oy, Math.max(16, tw));
}
