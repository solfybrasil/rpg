import {
  type FxInfo,
  type FxInstance,
  type PixelFrame,
  clearFrame,
  composite,
  createFrame,
  createFx,
  fxInfo,
  loadFx,
} from '../../../vendor/pixelfx';

/** Efeito/baú guardado numa peça: `fx:fire/campfire?s=1.5&r=1&e=6` ou `bau:<id>?a=1`. */
export type SpecialToken =
  | { kind: 'fx'; id: string; scale: number; repeat: boolean; every: number }
  | { kind: 'bau'; chestId: string; opened: boolean };

export function parseSpecial(url: string | null | undefined): SpecialToken | null {
  if (!url) return null;
  const [head, query = ''] = url.split('?');
  const q = new URLSearchParams(query);
  if (head.startsWith('fx:')) {
    return {
      kind: 'fx',
      id: head.slice(3),
      scale: Math.max(0.25, Math.min(8, Number(q.get('s')) || 1)),
      repeat: q.get('r') !== '0',
      every: Math.max(0, Number(q.get('e')) || 0),
    };
  }
  if (head.startsWith('bau:')) return { kind: 'bau', chestId: head.slice(4), opened: q.get('a') === '1' };
  return null;
}

export function fxUrl(id: string, o: { scale?: number; repeat?: boolean; every?: number } = {}) {
  const q = new URLSearchParams();
  if (o.scale && o.scale !== 1) q.set('s', String(Math.round(o.scale * 100) / 100));
  if (o.repeat === false) q.set('r', '0');
  if (o.every) q.set('e', String(o.every));
  const s = q.toString();
  return `fx:${id}${s ? `?${s}` : ''}`;
}

export function chestUrl(chestId: string, opened = false) {
  return `bau:${chestId}${opened ? '?a=1' : ''}`;
}

export const CHEST_FX = 'pickups/chest-open';
/** Quadro do baú aberto: tampa aberta e moedas já recolhidas, antes do "puf". */
const CHEST_OPEN_T = 3.1;

/** Gravação de um ciclo de efeito que repete, compartilhada por todas as cópias. */
interface Recording {
  frames: Array<HTMLCanvasElement | ImageBitmap>;
  /** Quadros do ciclo (sem a pausa). */
  n: number;
  /** Quadros vazios depois do ciclo (pausa entre repetições). */
  pause: number;
  /** Quadros por segundo desta gravação. */
  fps: number;
  done: boolean;
}
const RECORDINGS = new Map<string, Recording>();
/** Gravação padrão: 20 quadros/s, até 12 MB por efeito. */
const REC_FPS = 20;
const REC_MAX_BYTES = 12_000_000;
/** Clima de tela cheia (ciclos longos): 10 quadros/s, até 30 MB. */
const REC_FPS_BIG = 10;
const REC_MAX_BYTES_BIG = 30_000_000;
const LIVE_BIG_FPS = 12;

/**
 * Um efeito do pixelfx desenhado num canvas pequeno, pronto para o motor
 * escalar no mapa (pixel art, sem suavização).
 *
 * Modos:
 * - `loop`: efeitos que repetem sozinhos; os de uma vez recomeçam (com pausa `every`);
 * - `once`: toca uma vez e termina (`finished`);
 * - `still`: parado num instante (`at`) — baú fechado/aberto;
 * - `toStill`: toca até `at` e para (baú abrindo).
 *
 * Desempenho: no modo `loop`, o primeiro sprite de cada efeito grava um ciclo
 * (20 quadros/s) e depois todos só reproduzem as imagens prontas — simular e
 * desenhar pixel a pixel acontece uma vez só, não em todo quadro de toda tela.
 */
export class FxSprite {
  readonly info: FxInfo | undefined;
  canvas: HTMLCanvasElement | null = null;
  finished = false;
  ready = false;
  private ctx: CanvasRenderingContext2D | null = null;
  private frame: PixelFrame | null = null;
  private img: ImageData | null = null;
  // biome-ignore lint/suspicious/noExplicitAny: módulo de efeito sem tipos
  private mod: any = null;
  private inst: FxInstance | null = null;
  private acc = 0;
  private wait = 0;
  private seed: number;
  /** Gravação usada (reproduzir) ou sendo feita por este sprite (gravar). */
  private rec: Recording | null = null;
  private recording = false;
  private shown: HTMLCanvasElement | ImageBitmap | null = null;
  private lastIdx = -1;
  /** Desencontra cópias do mesmo efeito (duas tochas não piscam juntas). */
  private phase: number;

  constructor(
    readonly id: string,
    private mode: 'loop' | 'once' | 'still' | 'toStill',
    private opts: { every?: number; at?: number; seed?: number } = {},
  ) {
    this.info = fxInfo(id);
    this.seed = opts.seed ?? Math.floor(Math.random() * 1e6);
    this.phase = Math.floor(Math.random() * 1000);
    void loadFx(id)
      .then((m) => {
        this.mod = m;
        this.start();
      })
      .catch(() => {
        this.finished = true;
      });
  }

  /** Estático (não precisa de quadros contínuos). */
  get idle() {
    return this.mode === 'still' || this.finished || !this.ready;
  }

  /** O que desenhar agora (null = nada nesta fase, ex.: pausa entre repetições). */
  get source(): HTMLCanvasElement | ImageBitmap | null {
    if (this.rec?.done) return this.shown;
    return this.wait > 0 ? null : this.canvas;
  }

  setMode(mode: FxSprite['mode'], at?: number) {
    if (mode === this.mode && at === this.opts.at) return;
    this.mode = mode;
    this.opts.at = at;
    this.rec = null;
    this.recording = false;
    if (this.mod) this.start();
  }

  private get dims() {
    const w = this.mod?.meta?.size?.[0] ?? this.info?.w ?? 128;
    const h = this.mod?.meta?.size?.[1] ?? this.info?.h ?? 128;
    return { w, h, ox: this.mod?.meta?.origin?.[0] ?? w / 2, oy: this.mod?.meta?.origin?.[1] ?? h / 2 };
  }

  private get cycle() {
    return this.mod?.meta?.duration ?? this.info?.dur ?? 1;
  }

  private start() {
    const { w, h, ox, oy } = this.dims;
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = w;
      this.canvas.height = h;
      this.ctx = this.canvas.getContext('2d');
      this.frame = createFrame(w, h);
      this.img = new ImageData(w, h);
    }
    this.finished = false;
    this.acc = 0;
    this.wait = 0;

    if (this.mode === 'loop') {
      const key = `${this.id}|${this.opts.every ?? 0}`;
      const px = w * h * 4;
      const fps =
        Math.round(this.cycle * REC_FPS) * px <= REC_MAX_BYTES
          ? REC_FPS
          : Math.round(this.cycle * REC_FPS_BIG) * px <= REC_MAX_BYTES_BIG
            ? REC_FPS_BIG
            : 0;
      const n = Math.max(1, Math.round(this.cycle * fps));
      const existing = RECORDINGS.get(key);
      if (existing) {
        this.rec = existing;
      } else if (fps) {
        this.rec = { frames: [], n, pause: Math.round((this.opts.every ?? 0) * fps), fps, done: false };
        RECORDINGS.set(key, this.rec);
        this.recording = true;
      }
      if (this.rec?.done) {
        this.ready = true;
        this.pickFrame();
        return;
      }
    }

    this.inst = createFx(this.mod, { x: ox, y: oy, seed: this.recording ? 7 : this.seed });
    if (this.mode === 'still') this.inst.update(this.opts.at ?? 0);
    this.paint();
    if (this.recording) this.capture();
    this.ready = true;
  }

  /** Guarda o quadro atual na gravação; ao completar, todos passam a reproduzir. */
  private capture() {
    const rec = this.rec;
    if (!rec || !this.canvas || rec.done) return;
    const c = document.createElement('canvas');
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    c.getContext('2d')?.drawImage(this.canvas, 0, 0);
    rec.frames.push(c);
    if (rec.frames.length >= rec.n) {
      rec.done = true;
      this.recording = false;
      this.inst = null; // não precisa mais simular
      // Imagens prontas na GPU: desenhar fica ainda mais barato.
      if (typeof createImageBitmap === 'function') {
        rec.frames.forEach((f, i) => {
          void createImageBitmap(f as HTMLCanvasElement)
            .then((bmp) => {
              rec.frames[i] = bmp;
            })
            .catch(() => {});
        });
      }
    }
  }

  /** Reprodução: o quadro vem do relógio comum (todas as cópias trocam juntas). */
  private pickFrame(): boolean {
    const rec = this.rec;
    if (!rec?.done) return false;
    const total = rec.n + rec.pause;
    const idx = (Math.floor((performance.now() / 1000) * rec.fps) + this.phase) % total;
    if (idx === this.lastIdx) return false;
    this.lastIdx = idx;
    this.shown = idx < rec.n ? rec.frames[idx] : null;
    return true;
  }

  /** Avança o tempo; devolve true se o desenho mudou. */
  tick(dt: number): boolean {
    if (this.idle) return false;
    if (this.rec?.done) return this.pickFrame();
    if (!this.inst) return false;
    if (this.wait > 0) {
      this.wait -= dt;
      if (this.wait <= 0) this.restart();
      return false;
    }
    const big = this.mode === 'loop' && !this.recording && !this.rec;
    const fps = this.recording ? (this.rec?.fps ?? REC_FPS) : big ? LIVE_BIG_FPS : (this.inst.meta.fps ?? 30);
    const step = 1 / fps;
    this.acc += dt;
    if (this.acc < step) return false;
    // Gravando: passos fixos, para o ciclo ter exatamente n quadros.
    const adv = this.recording ? step : this.acc;
    this.acc = this.recording ? Math.min(this.acc - step, step) : 0;
    this.inst.update(adv);

    if (this.mode === 'toStill' && this.inst.t >= (this.opts.at ?? 0)) {
      this.mode = 'still';
    } else if (!this.inst.meta.loop && this.inst.t >= this.cycle) {
      if (this.mode === 'loop' && !this.recording) {
        if (this.opts.every) this.wait = this.opts.every;
        else this.restart();
      } else if (this.mode === 'once') {
        this.finished = true;
      }
    }
    this.paint();
    if (this.recording) this.capture();
    return true;
  }

  private restart() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    const { ox, oy } = this.dims;
    this.inst = createFx(this.mod, { seed: this.seed, x: ox, y: oy });
    this.paint();
  }

  private paint() {
    if (!this.inst || !this.frame || !this.img || !this.ctx) return;
    clearFrame(this.frame);
    if (this.wait <= 0) this.inst.draw(this.frame);
    composite(this.frame, this.img.data, null);
    this.ctx.putImageData(this.img, 0, 0);
  }

  /** Ponto de apoio e tamanho (pixels de pixel art). */
  get box() {
    const { w, h, ox, oy } = this.dims;
    return { w: this.canvas?.width ?? w, h: this.canvas?.height ?? h, ox, oy };
  }
}

export const CHEST_OPEN_AT = CHEST_OPEN_T;
