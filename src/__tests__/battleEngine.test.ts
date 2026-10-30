import { describe, expect, it } from 'vitest';
import {
  buildGrid,
  cellKey,
  center,
  gridDistance,
  parseCellKey,
  pick,
  toCell,
} from '../features/battle-map/engine/IsometricGrid.ts';
import {
  TACTICAL_DIRECTIONS,
  bfs,
  computeReach,
  reconstructCoordPath,
  reconstructPath,
} from '../features/battle-map/engine/Pathfinding.ts';

describe('Battle Engine — Isometric Grid Math', () => {
  const OX = 690;
  const OY = 418;
  const TW = 86;
  const TH = 43;

  it('calculates center of isometric origin (0,0) exactly at (OX, OY)', () => {
    const p = center(0, 0, OX, OY, TW, TH);
    expect(p.x).toBe(OX);
    expect(p.y).toBe(OY);
  });

  it('converts point at (OX, OY) back to cell (0,0)', () => {
    const c = toCell(OX, OY, OX, OY, TW, TH);
    expect(c.c).toBe(0);
    expect(c.r).toBe(0);
  });

  it('maintains roundtrip conversion between cell and center coordinates', () => {
    const testCases: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [-1, 2],
      [3, -2],
      [-4, -5],
      [7, 6],
    ];

    for (const [tc, tr] of testCases) {
      const p = center(tc, tr, OX, OY, TW, TH);
      const converted = toCell(p.x, p.y, OX, OY, TW, TH);
      expect(converted.c).toBe(tc);
      expect(converted.r).toBe(tr);
    }
  });

  it('formats and parses cell keys correctly', () => {
    expect(cellKey(3, -2)).toBe('3,-2');
    expect(parseCellKey('3,-2')).toEqual({ c: 3, r: -2 });
  });

  it('calculates 8-direction Chebyshev tactical distance correctly', () => {
    expect(gridDistance(0, 0, 0, 0)).toBe(0);
    expect(gridDistance(0, 0, 1, 0)).toBe(1);
    expect(gridDistance(0, 0, 1, 1)).toBe(1); // diagonal is 1 step in 8-dir
    expect(gridDistance(-2, 3, 2, -1)).toBe(4);
  });

  it('buildGrid populates valid cells within map boundaries', () => {
    const valid = buildGrid(1376, 768, OX, OY, TW, TH);
    expect(valid.size).toBeGreaterThan(50);
    expect(valid.has(cellKey(0, 0))).toBe(true);
  });

  it('pick selects valid cell within boundaries and rejects points outside image', () => {
    const valid = buildGrid(1376, 768, OX, OY, TW, TH);
    const originPoint = center(0, 0, OX, OY, TW, TH);

    const picked = pick(originPoint.x, originPoint.y, valid, OX, OY, TW, TH, 1376, 768);
    expect(picked).not.toBeNull();
    expect(picked?.c).toBe(0);
    expect(picked?.r).toBe(0);

    const outOfBounds = pick(-100, -100, valid, OX, OY, TW, TH, 1376, 768);
    expect(outOfBounds).toBeNull();
  });
});

describe('Battle Engine — 8-Direction BFS Pathfinding & Reach', () => {
  const OX = 690;
  const OY = 418;
  const TW = 86;
  const TH = 43;
  const valid = buildGrid(1376, 768, OX, OY, TW, TH);

  it('has exactly 8 tactical directions including diagonals', () => {
    expect(TACTICAL_DIRECTIONS.length).toBe(8);
  });

  it('finds direct adjacent neighbors at distance 1', () => {
    const result = bfs(0, 0, 1, valid, () => false);
    expect(result.dist.get(cellKey(0, 0))).toBe(0);

    for (const [dc, dr] of TACTICAL_DIRECTIONS) {
      const k = cellKey(dc, dr);
      if (valid.has(k)) {
        expect(result.dist.get(k)).toBe(1);
      }
    }
  });

  it('navigates around blocked obstacles correctly', () => {
    // Block direct path at (1, 0)
    const blockedSet = new Set(['1,0']);
    const isBlocked = (k: string) => blockedSet.has(k);

    const result = bfs(0, 0, 6, valid, isBlocked);
    // (1,0) should not be reachable
    expect(result.dist.has('1,0')).toBe(false);

    // Diagonal (1,1) or (1,-1) should still be reachable
    expect(result.dist.get('1,1')).toBe(1);
    expect(result.dist.get('1,-1')).toBe(1);

    // Can reconstruct path avoiding (1,0)
    const path = reconstructCoordPath(result.prev, result.dist, 2, 0, 0, 0);
    expect(path).not.toBeNull();
    expect(path?.some(([c, r]) => c === 1 && r === 0)).toBe(false);
  });

  it('computes reachable tiles limited by movement points', () => {
    const result = bfs(0, 0, 10, valid, () => false);
    const reach3 = computeReach(result.dist, 3);
    const reach6 = computeReach(result.dist, 6);

    expect(reach3.size).toBeGreaterThan(0);
    expect(reach6.size).toBeGreaterThan(reach3.size);

    for (const [k, d] of reach3.entries()) {
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThanOrEqual(3);
    }
  });

  it('reconstructs path with correct sequence of steps', () => {
    const result = bfs(0, 0, 5, valid, () => false);
    const path = reconstructPath(result.prev, result.dist, 0, 3, 0, 0);

    expect(path).not.toBeNull();
    expect(path?.length).toBe(3);
    expect(path?.[path.length - 1]).toBe('0,3');

    const coordPath = reconstructCoordPath(result.prev, result.dist, 0, 3, 0, 0);
    expect(coordPath).toEqual([
      [0, 1],
      [0, 2],
      [0, 3],
    ]);
  });
});
