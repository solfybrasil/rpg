import { cellKey, parseCellKey } from './IsometricGrid.ts';

export const TACTICAL_DIRECTIONS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export interface BFSResult {
  dist: Map<string, number>;
  prev: Map<string, string>;
}

/**
 * Busca em Largura (BFS) em 8 direções para movimento tático isométrico
 */
export function bfs(
  startC: number,
  startR: number,
  maxDistance: number,
  validSet: Set<string>,
  isBlocked: (key: string) => boolean,
): BFSResult {
  const startKey = cellKey(startC, startR);
  const dist = new Map<string, number>([[startKey, 0]]);
  const prev = new Map<string, string>();
  const queue: Array<[number, number]> = [[startC, startR]];

  for (let i = 0; i < queue.length; i++) {
    const [c, r] = queue[i];
    const currentDist = dist.get(cellKey(c, r)) ?? 0;

    if (currentDist >= maxDistance) continue;

    for (const [dc, dr] of TACTICAL_DIRECTIONS) {
      const nc = c + dc;
      const nr = r + dr;
      const nk = cellKey(nc, nr);

      if (!validSet.has(nk) || isBlocked(nk) || dist.has(nk)) {
        continue;
      }

      dist.set(nk, currentDist + 1);
      prev.set(nk, cellKey(c, r));
      queue.push([nc, nr]);
    }
  }

  return { dist, prev };
}

/**
 * Reconstrói a sequência de chaves "c,r" do caminho do início até o destino
 */
export function reconstructPath(
  prev: Map<string, string>,
  dist: Map<string, number>,
  destC: number,
  destR: number,
  startC: number,
  startR: number,
): string[] | null {
  const destKey = cellKey(destC, destR);
  const startKey = cellKey(startC, startR);

  if (!dist.has(destKey)) return null;

  const path: string[] = [];
  let curr = destKey;

  while (curr !== startKey) {
    path.unshift(curr);
    const p = prev.get(curr);
    if (!p) return null;
    curr = p;
  }

  return path;
}

/**
 * Reconstrói o caminho em coordenadas numéricas [c, r]
 */
export function reconstructCoordPath(
  prev: Map<string, string>,
  dist: Map<string, number>,
  destC: number,
  destR: number,
  startC: number,
  startR: number,
): Array<[number, number]> | null {
  const stringPath = reconstructPath(prev, dist, destC, destR, startC, startR);
  if (!stringPath) return null;

  return stringPath.map((k) => {
    const { c, r } = parseCellKey(k);
    return [c, r];
  });
}

/**
 * Filtra as células alcançáveis com base no saldo de passos disponíveis
 */
export function computeReach(
  dist: Map<string, number>,
  movesLeft: number,
): Map<string, number> {
  const reach = new Map<string, number>();
  for (const [k, d] of dist.entries()) {
    if (d > 0 && d <= movesLeft) {
      reach.set(k, d);
    }
  }
  return reach;
}
