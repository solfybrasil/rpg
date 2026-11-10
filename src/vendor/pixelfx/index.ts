// Ponte entre o app e o pixelfx (src/vendor/pixelfx, MIT, ver LICENSE e NOTICE.md).
// Cada efeito vira um pacote próprio e só é baixado quando aparece na tela.

// @ts-ignore: biblioteca em JS puro
import { clearFrame as _clear, composite as _composite, createFrame as _frame, createFx as _createFx } from './core/fx.js';
import { FX_BY_ID, type FxInfo } from './catalog';

export { FX_BY_ID, FX_CATS, FX_LIST, type FxCat, type FxInfo } from './catalog';

export interface PixelFrame {
  w: number;
  h: number;
  ox: number;
  oy: number;
  color: Uint32Array;
  light: Uint32Array;
}

export interface FxInstance {
  meta: { loop?: boolean; duration?: number; fps?: number; size?: [number, number]; origin?: [number, number] };
  readonly t: number;
  update(dt: number): void;
  draw(frame: PixelFrame, layer?: 'back' | 'front'): void;
  stop(): void;
  done(): boolean;
}

export const createFrame = _frame as (w: number, h: number, ox?: number, oy?: number) => PixelFrame;
export const clearFrame = _clear as (f: PixelFrame) => PixelFrame;
export const composite = _composite as (f: PixelFrame, out: Uint8ClampedArray, bg?: null | number, lightK?: number) => Uint8ClampedArray;
// biome-ignore lint/suspicious/noExplicitAny: módulo de efeito sem tipos
export const createFx = _createFx as (mod: any, opts?: Record<string, unknown>) => FxInstance;

// biome-ignore lint/suspicious/noExplicitAny: módulos de efeito sem tipos
type Loader = () => Promise<any>;
// @ts-ignore: tipos do Vite (import.meta.glob) fora do tsconfig deste projeto
const loaders: Record<string, Loader> = import.meta.glob(['./fx/*/*.js', '!./fx/*/_*.js']);

// biome-ignore lint/suspicious/noExplicitAny: módulo de efeito sem tipos
const cache = new Map<string, Promise<any>>();

/** Carrega o código de um efeito (uma vez só). */
export function loadFx(id: string) {
  let p = cache.get(id);
  if (p === undefined) {
    const load = loaders[`./fx/${id}.js`];
    p = load ? load() : Promise.reject(new Error(`Efeito desconhecido: ${id}`));
    cache.set(id, p as Promise<unknown>);
  }
  return p as Promise<any>;
}

export function fxInfo(id: string): FxInfo | undefined {
  return FX_BY_ID.get(id);
}
