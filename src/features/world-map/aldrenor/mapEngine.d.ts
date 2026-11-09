import type { Geo, PlaceType } from './data';

export interface EnginePlace {
  id: string;
  name: string;
  type: PlaceType;
  region: string;
  x: number;
  y: number;
  visited: boolean;
  major: boolean;
  /** Oculto dos jogadores (o Mestre vê translúcido). */
  hidden?: boolean;
}

export interface EnginePin {
  id: string;
  x: number;
  y: number;
  note?: string | null;
  mine: boolean;
}

export type EngineMode = 'view' | 'move' | 'add' | 'route' | 'party' | 'pin';

export interface EngineOptions {
  geo: Geo;
  onSelect?: (id: string | null) => void;
  onTap?: (mode: EngineMode, x: number, y: number) => void;
  onPlaceMove?: (id: string, x: number, y: number) => void;
  onPin?: (pin: EnginePin) => void;
  onView?: (zoom: number) => void;
}

export declare const MAP_COLORS: Record<string, string>;
export declare const ICONS: Record<string, Record<string, string[]>>;
export declare function iconSVG(type: string): string;
export declare function routePath(points: Array<[number, number]>): Path2D;

export declare class AldrenorEngine {
  constructor(canvas: HTMLCanvasElement, opts: EngineOptions);
  setPlaces(list: EnginePlace[]): void;
  setFilter(ids: Set<string> | null): void;
  setSelected(id: string | null): void;
  setMode(mode: EngineMode): void;
  setRoute(points: Array<[number, number]> | null): void;
  setParty(p: { x: number; y: number } | null): void;
  setPins(pins: EnginePin[]): void;
  setInsets(i: { left?: number; bottom?: number }): void;
  setLayers(l: { route?: boolean; roads?: boolean; borders?: boolean }): void;
  flyTo(x: number, y: number, zoom: number): void;
  zoomBy(f: number): void;
  zoomFit(): void;
  zoomLevel(): number;
  destroy(): void;
}
