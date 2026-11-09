import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Path2D não existe no Node: um gravador simples basta para o teste.
class FakePath2D {
  cmds: string[] = [];
  moveTo() { this.cmds.push('M'); }
  bezierCurveTo() { this.cmds.push('C'); }
  lineTo() { this.cmds.push('L'); }
}
(globalThis as unknown as { Path2D: unknown }).Path2D ??= FakePath2D;
import { getCityMapData, KNOWN_CITIES } from '../features/world-map/data/cityData';
import { CITY_TYPES, isLand, MAJOR_TYPES, TYPE_ORDER, unpack, WORLD_H, WORLD_W } from '../features/world-map/aldrenor/data';
import { iconSVG, routePath } from '../features/world-map/aldrenor/mapEngine.js';
import type { MapPlace } from '../features/world-map/types';

const raw = JSON.parse(readFileSync(resolve(__dirname, '../../public/data/aldrenor.json'), 'utf8'));

describe('Mapa de Aldrenor', () => {
  it('traz as 11 regiões e ~1150 lugares dentro do mundo', () => {
    expect(raw.regions).toHaveLength(11);
    expect(raw.places.length).toBeGreaterThan(1000);
    for (const p of raw.places.slice(0, 200)) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(WORLD_W);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(WORLD_H);
      expect(TYPE_ORDER).toContain(p.t ?? p.type);
    }
  });

  it('desempacota o terreno e reconhece terra firme nas capitais', () => {
    const geo = unpack(raw.geo);
    const caps = raw.places.filter((p: { t?: string; type?: string }) => (p.t ?? p.type) === 'cap');
    expect(caps.length).toBeGreaterThan(0);
    expect(caps.some((c: { x: number; y: number }) => isLand(geo, c.x, c.y))).toBe(true);
  });

  it('cidades e grandes lugares são subconjuntos dos tipos', () => {
    for (const t of CITY_TYPES) expect(MAJOR_TYPES.has(t)).toBe(true);
  });

  it('gera caminho suave para a rota com qualquer quantidade de pontos', () => {
    expect(routePath([])).toBeDefined();
    expect(routePath([[100, 200]])).toBeDefined();
    const p = routePath([[0, 0], [100, 100], [200, 50]]) as unknown as FakePath2D;
    expect(p.cmds).toEqual(['M', 'C', 'C']);
  });

  it('produz SVG para todos os tipos de marcador', () => {
    for (const t of TYPE_ORDER) expect(iconSVG(t)).toContain('<svg');
  });

  it('gera o mapa de cidade (conhecida ou não)', () => {
    const name = Object.keys(KNOWN_CITIES)[0];
    const place: MapPlace = {
      id: 'x', session_code: 'MESA', name, type: 'cap', region_id: 'valdoria',
      x: 1, y: 1, discovered: true, visited: false,
    };
    expect(getCityMapData(place).districts.length).toBeGreaterThan(0);
    expect(getCityMapData({ ...place, name: 'Vila Qualquer', type: 'cid' }).districts.length).toBeGreaterThan(0);
  });
});
