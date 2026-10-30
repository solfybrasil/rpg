import {
  type CellCoord,
  buildGrid,
  cellKey,
  center,
  diamond,
  pick,
  toCell,
} from './IsometricGrid.ts';
import {
  bfs,
  computeReach,
  reconstructCoordPath,
  reconstructPath,
} from './Pathfinding.ts';
import { VideoChromaPool } from './VideoChromaPool.ts';
import type {
  BattleEngineOptions,
  BattleMap,
  BattleToken,
  CameraView,
  ChromaMode,
  Point,
} from './types.ts';

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
}

export class BattleEngine {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: BattleEngineOptions;

  // Dimensões do mapa e grade
  private imgW = 1376;
  private imgH = 768;
  private TW = 86;
  private TH = 43;
  private OX = 690;
  private OY = 418;
  private moveLimit = 6;
  private speed = 4.2;

  private valid = new Set<string>();
  private blocked = new Set<string>();

  // Câmera
  private view: CameraView = { z: 1, x: 0, y: 0 };
  private base = 1;
  private scale = 1;
  private readonly ZMIN = 1;
  private readonly ZMAX = 4;

  // Imagem de fundo e mídias
  private bgImg: HTMLImageElement;
  private bgLoaded = false;
  private pool: VideoChromaPool;

  // Estado dos tokens
  private mapData: BattleMap | null = null;
  private tokens: BattleToken[] = [];
  private tokenStates = new Map<string, LocalTokenState>();

  // Pathfinding e seleção
  private hover: CellCoord | null = null;
  private prevPath: string[] | null = null;
  private reach = new Map<string, number>();
  private graph: { dist: Map<string, number>; prev: Map<string, string> } | null =
    null;

  // Render loop
  private rafId: number | null = null;
  private lastTime = performance.now();
  private dirty = true;
  private resizeObserver: ResizeObserver | null = null;

  // Métricas de FPS e JS frame time
  private frameCount = 0;
  private fpsTimer = performance.now();
  private currentFps = 60;
  private currentJsMs = 0;

  // Gestos e ponteiro
  private pts = new Map<number, Point>();
  private pressStart: { pt: Point; client: Point; time: number } | null = null;
  private isDragging = false;
  private pinchDist0 = 0;
  private pinchZ0 = 1;
  private panView0: CameraView | null = null;

  // Estados do Editor DM
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

    this.pool = new VideoChromaPool();
    this.bgImg = new Image();
    this.bgImg.crossOrigin = 'anonymous';

    this.bindEvents();
    this.init();
  }

  private bindEvents(): void {
    this.step = this.step.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
  }

  private init(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.cv);
    }
    this.handleResize();

    this.cv.addEventListener('contextmenu', (e) => e.preventDefault());
    this.cv.addEventListener('pointerdown', this.handlePointerDown);
    this.cv.addEventListener('pointermove', this.handlePointerMove);
    this.cv.addEventListener('pointerup', this.handlePointerUp);
    this.cv.addEventListener('pointercancel', this.handlePointerUp);
    this.cv.addEventListener('wheel', this.handleWheel, { passive: false });

    this.rafId = requestAnimationFrame(this.step);
  }

  private handleResize(): void {
    const rc = this.cv.getBoundingClientRect();
    if (!rc.width || !rc.height) return;
    const dpr = Math.min(
      window.innerWidth < 900 ? 1.5 : 2,
      window.devicePixelRatio || 1,
    );
    this.cv.width = Math.round(rc.width * dpr);
    this.cv.height = Math.round(rc.height * dpr);
    this.base = this.cv.width / (this.imgW || 1376);
    this.dirty = true;
  }

  public setMap(mapData: BattleMap | null): void {
    if (!mapData) return;
    this.mapData = mapData;
    this.imgW = Number(mapData.img_w) || 1376;
    this.imgH = Number(mapData.img_h) || 768;
    this.TW = Number(mapData.tile_size) || 86;
    this.TH = this.TW / 2;
    this.OX = Number(mapData.origin_x ?? 690);
    this.OY = Number(mapData.origin_y ?? 418);
    this.moveLimit = Number(mapData.move_limit ?? 6);

    const bList = Array.isArray(mapData.blocked) ? mapData.blocked : [];
    this.blocked = new Set(bList);

    this.valid = buildGrid(
      this.imgW,
      this.imgH,
      this.OX,
      this.OY,
      this.TW,
      this.TH,
    );

    const bgUrl = mapData.background_url || '/batalha/santuario.jpg';
    if (this.bgImg.src !== bgUrl) {
      this.bgLoaded = false;
      this.bgImg.onload = () => {
        this.bgLoaded = true;
        this.dirty = true;
      };
      this.bgImg.src = bgUrl;
      if (this.bgImg.complete && this.bgImg.naturalWidth) {
        this.bgLoaded = true;
      }
    }

    this.recomputeReach();
    this.dirty = true;
  }

  private resolveTokenMedia(token: BattleToken): {
    url: string;
    chroma: ChromaMode;
  } {
    let url =
      token.media_url ||
      token.idle_webm_url ||
      token.idle_mp4_url ||
      token.poster_url ||
      '';
    let chroma: ChromaMode = (token.chroma as ChromaMode) || 'verde';

    if (!url) {
      const name = (token.name || token.hero_id || '').toLowerCase();
      if (name.includes('tor')) {
        url = '/batalha/tor_idle.webm';
        chroma = 'verde';
      } else if (name.includes('kaelis')) {
        url = '/batalha/kaelis_idle.webm';
        chroma = 'magenta';
      } else if (name.includes('malenia')) {
        url = '/batalha/malenia_idle.webm';
        chroma = 'verde';
      } else {
        url = '/batalha/fera_idle.webm';
        chroma = 'verde';
      }
    }

    if (
      (token.hero_id || token.name || '')
        .toLowerCase()
        .includes('kaelis')
    ) {
      chroma = 'magenta';
    }

    return { url, chroma };
  }

  public setOptions(opts: Partial<BattleEngineOptions>): void {
    this.options = { ...this.options, ...opts };
    this.recomputeReach();
    this.dirty = true;
  }

  public setTokens(tokens: BattleToken[]): void {
    this.tokens = tokens;
    const currentIds = new Set<string>();

    for (const token of tokens) {
      currentIds.add(token.id);
      let state = this.tokenStates.get(token.id);

      const targetC = token.c ?? 0;
      const targetR = token.r ?? 0;
      const targetPos = center(
        targetC,
        targetR,
        this.OX,
        this.OY,
        this.TW,
        this.TH,
      );

      if (!state) {
        const { url, chroma } = this.resolveTokenMedia(token);
        this.pool.get(url, chroma);

        state = {
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
        };
        this.tokenStates.set(token.id, state);
      } else {
        state.token = token;
        state.movesLeft = token.moves_left ?? this.moveLimit;
        state.size = token.size ?? state.size;
        state.anchorX = token.anchor_x ?? state.anchorX;
        state.anchorY = token.anchor_y ?? state.anchorY;

        // Se posição remota mudou e o token não está animando movimento local
        if (
          !state.moving &&
          (state.c !== targetC || state.r !== targetR)
        ) {
          // Se recebeu caminho para percorrer
          if (Array.isArray(token.path) && token.path.length > 0) {
            state.path = (token.path as any).map((p: any) =>
              Array.isArray(p)
                ? [Number(p[0]), Number(p[1])]
                : [Number(p.split(',')[0]), Number(p.split(',')[1])],
            );
          } else {
            state.c = targetC;
            state.r = targetR;
            state.x = targetPos.x;
            state.y = targetPos.y;
          }
        }
      }
    }

    // Cleanup de tokens removidos
    for (const [id, state] of this.tokenStates.entries()) {
      if (!currentIds.has(id)) {
        this.pool.release(state.mediaUrl);
        this.tokenStates.delete(id);
      }
    }

    this.recomputeReach();
    this.dirty = true;
  }

  public getMyHeroToken(): LocalTokenState | null {
    if (this.options.myHeroTokenId) {
      const s = this.tokenStates.get(this.options.myHeroTokenId);
      if (s) return s;
    }
    if (this.options.myHeroId) {
      for (const s of this.tokenStates.values()) {
        if (s.token.hero_id === this.options.myHeroId) return s;
      }
    }
    // Fallback: primeiro herói da lista
    for (const s of this.tokenStates.values()) {
      if (s.kind === 'heroi') return s;
    }
    return null;
  }

  private isCellBlocked(k: string, currentTokenId?: string): boolean {
    if (this.blocked.has(k)) return true;
    for (const s of this.tokenStates.values()) {
      if (s.token.id !== currentTokenId && s.token.visible !== false) {
        if (cellKey(s.c, s.r) === k) return true;
      }
    }
    return false;
  }

  private recomputeReach(): void {
    const hero = this.getMyHeroToken();
    if (!hero || this.options.mode === 'tv') {
      this.reach.clear();
      this.graph = null;
      return;
    }

    this.graph = bfs(
      hero.c,
      hero.r,
      hero.movesLeft || this.moveLimit,
      this.valid,
      (k) => this.isCellBlocked(k, hero.token.id),
    );

    this.reach = computeReach(
      this.graph.dist,
      hero.movesLeft ?? this.moveLimit,
    );
  }

  private updateHover(coord: CellCoord | null): void {
    this.hover = coord;
    this.options.onHoverCell?.(coord);

    const hero = this.getMyHeroToken();
    if (
      !coord ||
      !hero ||
      hero.moving ||
      this.options.mode === 'tv' ||
      !this.graph
    ) {
      this.prevPath = null;
      this.dirty = true;
      return;
    }

    const path = reconstructPath(
      this.graph.prev,
      this.graph.dist,
      coord.c,
      coord.r,
      hero.c,
      hero.r,
    );
    this.prevPath = path;
    this.dirty = true;
  }

  // ── Render Frame Loop ──
  private step(now: number): void {
    const frameStart = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // Métricas de FPS (atualizado a cada 500ms)
    this.frameCount++;
    if (now - this.fpsTimer >= 500) {
      this.currentFps = Math.round(
        (this.frameCount * 1000) / (now - this.fpsTimer),
      );
      this.frameCount = 0;
      this.fpsTimer = now;
      this.options.onFpsUpdate?.(this.currentFps, this.currentJsMs);
    }

    // 1. Atualizar movimentação dos tokens
    let anyMoving = false;
    for (const state of this.tokenStates.values()) {
      if (state.path.length > 0) {
        anyMoving = true;
        state.moving = true;
        const [tc, tr] = state.path[0];
        const p = center(tc, tr, this.OX, this.OY, this.TW, this.TH);
        const dx = p.x - state.x;
        const dy = p.y - state.y;
        const dist = Math.hypot(dx, dy);
        const sp =
          this.speed * Math.hypot(this.TW / 2, this.TH / 2) * dt;

        if (Math.abs(dx) > 1) {
          state.facing = dx < 0 ? -1 : 1;
        }

        if (dist <= sp) {
          state.x = p.x;
          state.y = p.y;
          state.c = tc;
          state.r = tr;
          state.path.shift();
        } else {
          state.x += (dx / dist) * sp;
          state.y += (dy / dist) * sp;
        }

        if (state.path.length === 0) {
          state.moving = false;
          this.recomputeReach();
          this.updateHover(this.hover);
        }
        this.dirty = true;
      }
    }

    // 2. Atualizar quadros de vídeo e aplicar culling
    const visibleUrls = new Set<string>();
    for (const state of this.tokenStates.values()) {
      if (state.token.visible !== false) {
        visibleUrls.add(state.mediaUrl);
        const entry = this.pool.get(state.mediaUrl, state.chromaMode);
        if (entry && this.pool.updateFrame(entry, now)) {
          this.dirty = true;
        }
      }
    }
    this.pool.applyVideoLimits(visibleUrls);

    // 3. Renderizar Canvas se necessário
    if (this.dirty || anyMoving) {
      this.draw(now);
      this.dirty = false;
    }

    this.currentJsMs = performance.now() - frameStart;
    this.rafId = requestAnimationFrame(this.step);
  }

  private draw(now: number): void {
    this.scale = this.base * this.view.z;
    const ctx = this.ctx;
    const cv = this.cv;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#08080a';
    ctx.fillRect(0, 0, cv.width, cv.height);

    ctx.setTransform(
      this.scale,
      0,
      0,
      this.scale,
      -this.view.x * this.scale,
      -this.view.y * this.scale,
    );

    // 1. Imagem de fundo do mapa
    if (this.bgLoaded && this.bgImg.naturalWidth) {
      ctx.drawImage(this.bgImg, 0, 0, this.imgW, this.imgH);
    }

    const lw = 1.2 / this.scale;
    const isPlayer = this.options.mode === 'player';
    const hero = this.getMyHeroToken();

    // 2. Grade e alcance tático
    if (this.mapData?.show_grid !== false) {
      // Quadrados alcançáveis: preenchimento --gold com 18% opacidade
      if (isPlayer && hero && !hero.moving && this.reach.size > 0) {
        ctx.beginPath();
        for (const k of this.reach.keys()) {
          const { c, r } = toCell(0, 0, 0, 0, 1, 1); // dummy
          const [sc, sr] = k.split(',').map(Number);
          const p = center(sc, sr, this.OX, this.OY, this.TW, this.TH);
          ctx.moveTo(p.x, p.y - this.TH / 2);
          ctx.lineTo(p.x + this.TW / 2, p.y);
          ctx.lineTo(p.x, p.y + this.TH / 2);
          ctx.lineTo(p.x - this.TW / 2, p.y);
          ctx.closePath();
        }
        ctx.fillStyle = 'rgba(245, 182, 91, 0.18)'; // --gold com 18%
        ctx.fill();
      }

      // Linhas da grade isométrica
      ctx.beginPath();
      for (const k of this.valid) {
        const [sc, sr] = k.split(',').map(Number);
        const p = center(sc, sr, this.OX, this.OY, this.TW, this.TH);
        ctx.moveTo(p.x, p.y - this.TH / 2);
        ctx.lineTo(p.x + this.TW / 2, p.y);
        ctx.lineTo(p.x, p.y + this.TH / 2);
        ctx.lineTo(p.x - this.TW / 2, p.y);
        ctx.closePath();
      }
      ctx.lineWidth = lw;
      ctx.strokeStyle = 'rgba(235, 230, 210, 0.16)';
      ctx.stroke();

      // Bloqueios de terreno em --blood suave
      if (this.blocked.size > 0) {
        ctx.beginPath();
        for (const k of this.blocked) {
          const [sc, sr] = k.split(',').map(Number);
          const p = center(sc, sr, this.OX, this.OY, this.TW, this.TH);
          ctx.moveTo(p.x, p.y - this.TH / 2);
          ctx.lineTo(p.x + this.TW / 2, p.y);
          ctx.lineTo(p.x, p.y + this.TH / 2);
          ctx.lineTo(p.x - this.TW / 2, p.y);
          ctx.closePath();
        }
        ctx.fillStyle = 'rgba(200, 66, 58, 0.35)'; // --blood
        ctx.fill();
      }
    }

    // 3. Caminho em pontinhos dourados
    if (isPlayer && hero && !hero.moving && this.prevPath) {
      this.prevPath.forEach((k, n) => {
        const [c, r] = k.split(',').map(Number);
        const p = center(c, r, this.OX, this.OY, this.TW, this.TH);
        ctx.beginPath();
        ctx.ellipse(
          p.x,
          p.y,
          this.TW * 0.08,
          this.TH * 0.08,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle =
          n < (hero.movesLeft ?? this.moveLimit)
            ? 'rgba(245, 182, 91, 0.95)' // pontinho dourado
            : 'rgba(200, 66, 58, 0.9)'; // --blood
        ctx.fill();
      });
    }

    // 4. Cursor de hover
    if (this.hover && isPlayer) {
      const p = center(
        this.hover.c,
        this.hover.r,
        this.OX,
        this.OY,
        this.TW,
        this.TH,
      );
      const k = cellKey(this.hover.c, this.hover.r);
      const isBad =
        this.blocked.has(k) ||
        !this.prevPath ||
        this.prevPath.length > (hero?.movesLeft ?? this.moveLimit);

      diamond(ctx, p.x, p.y, this.TW, this.TH);
      ctx.fillStyle = isBad
        ? 'rgba(200, 66, 58, 0.28)' // --blood
        : 'rgba(245, 182, 91, 0.28)'; // --gold
      ctx.fill();

      ctx.lineWidth = lw * 2;
      ctx.strokeStyle = isBad ? '#c8423a' : '#f5b65b';
      ctx.stroke();
    }

    // 5. Renderização das Peças Ordenadas por `y` (Depth Sorting)
    const sortedStates = [...this.tokenStates.values()]
      .filter((s) => s.token.visible !== false)
      .sort((a, b) => a.y - b.y);

    for (const s of sortedStates) {
      this.drawToken(s, lw, now);
    }
  }

  private drawToken(s: LocalTokenState, lw: number, now: number): void {
    const ctx = this.ctx;
    const hero = this.getMyHeroToken();
    const isMyHero = s === hero;

    // Sombra suave sob a peça
    ctx.beginPath();
    ctx.ellipse(
      s.x,
      s.y + 2,
      this.TW * 0.34,
      this.TH * 0.28,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();

    // Anel do herói / base isométrica com 1.5px
    // Jogador: --gold; Outros heróis: --moss; Feras: --blood
    diamond(ctx, s.x, s.y, this.TW * 0.9, this.TH * 0.9);
    const isSelected = this.options.selectedTokenId === s.token.id;
    ctx.lineWidth = (1.5 / this.scale) * (isSelected ? 2.5 : isMyHero ? 1.6 : 1.0);

    if (isSelected) {
      ctx.strokeStyle = '#f5b65b'; // --gold reticle
    } else if (isMyHero) {
      ctx.strokeStyle = '#f5b65b'; // --gold
    } else if (s.kind === 'heroi') {
      ctx.strokeStyle = '#4a7c59'; // --moss
    } else {
      ctx.strokeStyle = '#c8423a'; // --blood
    }
    ctx.stroke();

    if (isSelected) {
      ctx.beginPath();
      ctx.ellipse(
        s.x,
        s.y + this.TH * 0.14,
        (this.TW / 2) * 0.9,
        (this.TH / 2) * 0.9,
        0,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = '#f5b65b';
      ctx.lineWidth = 1.2 / this.scale;
      ctx.stroke();
    }

    // Desenho do sprite / vídeo com chroma key
    const entry = this.pool.get(s.mediaUrl, s.chromaMode);
    const source = entry?.src || (entry?.ready ? entry.el : null);

    if (source) {
      const sw =
        (source as HTMLVideoElement).videoWidth ||
        (source as HTMLImageElement).naturalWidth ||
        source.width;
      const sh =
        (source as HTMLVideoElement).videoHeight ||
        (source as HTMLImageElement).naturalHeight ||
        source.height;

      if (sw && sh) {
        const H = s.size;
        const W = (H * sw) / sh;
        const bob = s.moving
          ? Math.abs(Math.sin(now / 95)) * -H * 0.025
          : 0;

        ctx.save();
        ctx.translate(s.x, s.y + this.TH * 0.14 + bob);
        ctx.scale(s.facing, 1);
        ctx.drawImage(source, -W * s.anchorX, -H * s.anchorY, W, H);
        ctx.restore();
      }
    }

    // Nome discreto sobre a peça se for fera ou outro herói
    if (this.options.mode !== 'tv') {
      ctx.font = `600 ${Math.max(10, this.TH * 0.3)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(245, 245, 247, 0.85)';
      ctx.fillText(s.token.name, s.x, s.y - s.size * 0.95);
    }
  }

  // ── Gestos de Câmera e Entrada do Jogador ──
  private toImg(clientX: number, clientY: number): Point {
    const rc = this.cv.getBoundingClientRect();
    return {
      x:
        this.view.x +
        ((clientX - rc.left) / rc.width) * (this.imgW / this.view.z),
      y:
        this.view.y +
        ((clientY - rc.top) / rc.height) * (this.imgH / this.view.z),
    };
  }

  public clampView(): void {
    this.view.z = Math.min(this.ZMAX, Math.max(this.ZMIN, this.view.z));
    this.view.x = Math.min(
      this.imgW - this.imgW / this.view.z,
      Math.max(0, this.view.x),
    );
    this.view.y = Math.min(
      this.imgH - this.imgH / this.view.z,
      Math.max(0, this.view.y),
    );
    this.dirty = true;
  }

  public zoomIn(): void {
    this.view.z = Math.min(this.ZMAX, this.view.z * 1.3);
    this.clampView();
  }

  public zoomOut(): void {
    this.view.z = Math.max(this.ZMIN, this.view.z / 1.3);
    this.clampView();
  }

  public zoomFit(): void {
    this.view.z = 1;
    this.view.x = 0;
    this.view.y = 0;
    this.clampView();
  }

  public centerOnHero(heroTokenId?: string): void {
    let hero = this.getMyHeroToken();
    if (heroTokenId && this.tokenStates.has(heroTokenId)) {
      hero = this.tokenStates.get(heroTokenId)!;
    }
    if (!hero) return;

    this.view.z = Math.max(1.5, this.view.z);
    this.view.x = hero.x - this.imgW / (2 * this.view.z);
    this.view.y = hero.y - this.imgH / (2 * this.view.z);
    this.clampView();
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const pt = this.toImg(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const nz = Math.min(this.ZMAX, Math.max(this.ZMIN, this.view.z * factor));

    this.view.x = pt.x - (e.clientX - this.cv.getBoundingClientRect().left) / this.cv.clientWidth * (this.imgW / nz);
    this.view.y = pt.y - (e.clientY - this.cv.getBoundingClientRect().top) / this.cv.clientHeight * (this.imgH / nz);
    this.view.z = nz;
    this.clampView();
  }

  private handlePointerDown(e: PointerEvent): void {
    this.cv.setPointerCapture(e.pointerId);
    this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pts.size === 1) {
      const pt = this.toImg(e.clientX, e.clientY);
      this.pressStart = {
        pt,
        client: { x: e.clientX, y: e.clientY },
        time: performance.now(),
      };
      this.panView0 = { ...this.view };
      this.isDragging = false;

      // ── MODO DM INTERAÇÃO ──
      if (this.options.mode === 'dm') {
        const tool = this.options.tool || 'select';
        const cell = pick(
          pt.x,
          pt.y,
          this.valid,
          this.OX,
          this.OY,
          this.TW,
          this.TH,
          this.imgW,
          this.imgH,
        );

        if (tool === 'paint_block') {
          if (cell) {
            const k = cellKey(cell.c, cell.r);
            this.blocked.add(k);
            this.options.onUpdateBlocked?.(Array.from(this.blocked));
            this.dirty = true;
          }
          this.isPaintingBlock = true;
          return;
        }

        if (tool === 'erase_block') {
          if (cell) {
            const k = cellKey(cell.c, cell.r);
            this.blocked.delete(k);
            this.options.onUpdateBlocked?.(Array.from(this.blocked));
            this.dirty = true;
          }
          this.isErasingBlock = true;
          return;
        }

        if (tool === 'select') {
          let clickedToken: LocalTokenState | null = null;
          for (const s of this.tokenStates.values()) {
            if (cell && s.c === cell.c && s.r === cell.r) {
              clickedToken = s;
              break;
            }
            if (Math.hypot(pt.x - s.x, pt.y - s.y) < this.TW * 0.6) {
              clickedToken = s;
              break;
            }
          }

          if (clickedToken) {
            this.options.selectedTokenId = clickedToken.token.id;
            this.options.onSelectTokenId?.(clickedToken.token.id);
            this.options.onSelectToken?.(clickedToken.token);
            this.draggedTokenId = clickedToken.token.id;
            this.dirty = true;
          } else {
            this.options.selectedTokenId = null;
            this.options.onSelectTokenId?.(null);
            this.options.onSelectToken?.(null);
            this.draggedTokenId = null;
            this.dirty = true;
          }
        }
      }
    } else if (this.pts.size === 2) {
      // Início do pinch zoom
      const [p1, p2] = [...this.pts.values()];
      this.pinchDist0 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      this.pinchZ0 = this.view.z;
      this.panView0 = { ...this.view };
      this.isDragging = true;
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.pts.has(e.pointerId)) {
      // Hover do mouse (quando nenhum botão está pressionado)
      if (this.options.mode === 'player' || this.options.mode === 'dm') {
        const pt = this.toImg(e.clientX, e.clientY);
        const cell = pick(
          pt.x,
          pt.y,
          this.valid,
          this.OX,
          this.OY,
          this.TW,
          this.TH,
          this.imgW,
          this.imgH,
        );
        if (
          !this.hover ||
          !cell ||
          this.hover.c !== cell.c ||
          this.hover.r !== cell.r
        ) {
          this.updateHover(cell);
        }
      }
      return;
    }

    this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // ── MODO DM ARRASTO ──
    if (this.options.mode === 'dm') {
      const tool = this.options.tool || 'select';

      if (this.isPaintingBlock && tool === 'paint_block') {
        const pt = this.toImg(e.clientX, e.clientY);
        const cell = pick(
          pt.x,
          pt.y,
          this.valid,
          this.OX,
          this.OY,
          this.TW,
          this.TH,
          this.imgW,
          this.imgH,
        );
        if (cell) {
          const k = cellKey(cell.c, cell.r);
          if (!this.blocked.has(k)) {
            this.blocked.add(k);
            this.options.onUpdateBlocked?.(Array.from(this.blocked));
            this.dirty = true;
          }
        }
        return;
      }

      if (this.isErasingBlock && tool === 'erase_block') {
        const pt = this.toImg(e.clientX, e.clientY);
        const cell = pick(
          pt.x,
          pt.y,
          this.valid,
          this.OX,
          this.OY,
          this.TW,
          this.TH,
          this.imgW,
          this.imgH,
        );
        if (cell) {
          const k = cellKey(cell.c, cell.r);
          if (this.blocked.has(k)) {
            this.blocked.delete(k);
            this.options.onUpdateBlocked?.(Array.from(this.blocked));
            this.dirty = true;
          }
        }
        return;
      }

      if (this.draggedTokenId && tool === 'select' && this.pressStart) {
        const dx = e.clientX - this.pressStart.client.x;
        const dy = e.clientY - this.pressStart.client.y;
        if (Math.hypot(dx, dy) > 8) {
          this.isDraggingToken = true;
        }
        if (this.isDraggingToken) {
          const pt = this.toImg(e.clientX, e.clientY);
          const cell = pick(
            pt.x,
            pt.y,
            this.valid,
            this.OX,
            this.OY,
            this.TW,
            this.TH,
            this.imgW,
            this.imgH,
          );
          if (cell) {
            const state = this.tokenStates.get(this.draggedTokenId);
            if (state && (state.c !== cell.c || state.r !== cell.r)) {
              state.c = cell.c;
              state.r = cell.r;
              const pos = center(cell.c, cell.r, this.OX, this.OY, this.TW, this.TH);
              state.x = pos.x;
              state.y = pos.y;
              this.options.onMoveTokenDirect?.(this.draggedTokenId, cell.c, cell.r);
              this.dirty = true;
            }
          }
          return;
        }
      }
    }

    if (this.pts.size === 1 && this.panView0 && this.pressStart) {
      const dx = e.clientX - this.pressStart.client.x;
      const dy = e.clientY - this.pressStart.client.y;

      if (Math.hypot(dx, dy) > 8) {
        this.isDragging = true;
      }

      if (this.isDragging) {
        const rc = this.cv.getBoundingClientRect();
        this.view.x =
          this.panView0.x - (dx / rc.width) * (this.imgW / this.view.z);
        this.view.y =
          this.panView0.y - (dy / rc.height) * (this.imgH / this.view.z);
        this.clampView();
      }
    } else if (this.pts.size === 2) {
      // Pinça multi-touch
      const [p1, p2] = [...this.pts.values()];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (this.pinchDist0 > 0) {
        const factor = dist / this.pinchDist0;
        this.view.z = Math.min(
          this.ZMAX,
          Math.max(this.ZMIN, this.pinchZ0 * factor),
        );
        this.clampView();
      }
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    this.pts.delete(e.pointerId);

    // Toque ou clique rápido sem arrastar = AÇÃO DE MOVIMENTO (modo player)
    if (!this.isDragging && this.pressStart && this.options.mode === 'player') {
      const pt = this.pressStart.pt;
      const cell = pick(
        pt.x,
        pt.y,
        this.valid,
        this.OX,
        this.OY,
        this.TW,
        this.TH,
        this.imgW,
        this.imgH,
      );

      if (cell) {
        this.handleCellAction(cell);
      }
    }

    this.isPaintingBlock = false;
    this.isErasingBlock = false;
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
    if (!hero || hero.moving || !this.graph) return;

    const targetKey = cellKey(cell.c, cell.r);
    // Se não for alcançável ou destino bloqueado, ignora
    if (!this.reach.has(targetKey)) return;

    const path = reconstructCoordPath(
      this.graph.prev,
      this.graph.dist,
      cell.c,
      cell.r,
      hero.c,
      hero.r,
    );
    if (!path || path.length === 0) return;

    // Dispara callback assíncrono para a RPC mover_token
    this.options.onMoveToken?.(hero.token.id, cell.c, cell.r, path);

    // Otimista: anima imediatamente no motor local
    hero.path = [...path];
    hero.moving = true;
    hero.movesLeft = Math.max(0, hero.movesLeft - path.length);
    this.dirty = true;
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.cv.removeEventListener('pointerdown', this.handlePointerDown);
    this.cv.removeEventListener('pointermove', this.handlePointerMove);
    this.cv.removeEventListener('pointerup', this.handlePointerUp);
    this.cv.removeEventListener('pointercancel', this.handlePointerUp);
    this.cv.removeEventListener('wheel', this.handleWheel);

    this.pool.destroy();
  }
}
