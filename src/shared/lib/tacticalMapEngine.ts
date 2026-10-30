/**
 * tacticalMapEngine.js — Motor Tático Isométrico e Chroma Key
 * Baseado rigorosamente no protótipo de referência.
 */

export const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export const key = (c, r) => `${c},${r}`;

export function parseKey(k) {
  const [c, r] = k.split(',').map(Number);
  return { c, r };
}

export function center(c, r, ox, oy, tw, th = tw / 2) {
  return {
    x: ox + ((c - r) * tw) / 2,
    y: oy + ((c + r) * th) / 2,
  };
}

export function toCell(x, y, ox, oy, tw, th = tw / 2) {
  const a = (x - ox) / (tw / 2);
  const b = (y - oy) / (th / 2);
  return {
    c: Math.round((a + b) / 2),
    r: Math.round((b - a) / 2),
  };
}

export function buildGrid(imgW, imgH, ox, oy, tw, th = tw / 2) {
  const valid = new Set();
  const pts = [
    [0, 0],
    [imgW, 0],
    [0, imgH],
    [imgW, imgH],
  ].map(([x, y]) => {
    const a = (x - ox) / (tw / 2);
    const b = (y - oy) / (th / 2);
    return [(a + b) / 2, (b - a) / 2];
  });

  const cs = pts.map((p) => p[0]);
  const rs = pts.map((p) => p[1]);

  const minC = Math.floor(Math.min(...cs)) - 2;
  const maxC = Math.ceil(Math.max(...cs)) + 2;
  const minR = Math.floor(Math.min(...rs)) - 2;
  const maxR = Math.ceil(Math.max(...rs)) + 2;

  for (let c = minC; c <= maxC; c++) {
    for (let r = minR; r <= maxR; r++) {
      const p = center(c, r, ox, oy, tw, th);
      if (p.x >= -tw && p.x <= imgW + tw && p.y >= -th && p.y <= imgH + th) {
        valid.add(key(c, r));
      }
    }
  }
  return valid;
}

export function bfs(sc, sr, limit, validSet, isBlockedFn) {
  const startK = key(sc, sr);
  const dist = new Map([[startK, 0]]);
  const prev = new Map();
  const queue = [[sc, sr]];

  for (let h = 0; h < queue.length; h++) {
    const [c, r] = queue[h];
    const currK = key(c, r);
    const d = dist.get(currK);
    if (d >= limit) continue;

    for (const [dc, dr] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      const nK = key(nc, nr);

      if (!validSet.has(nK)) continue;
      if (isBlockedFn(nK, nc, nr)) continue;
      if (dist.has(nK)) continue;

      dist.set(nK, d + 1);
      prev.set(nK, currK);
      queue.push([nc, nr]);
    }
  }

  return { dist, prev };
}

export function pathTo(c, r, graph, sc, sr) {
  if (!graph || !graph.dist) return null;
  const targetK = key(c, r);
  const startK = key(sc, sr);
  if (!graph.dist.has(targetK)) return null;

  const path = [];
  let curr = targetK;
  while (curr !== startK) {
    path.unshift(curr);
    curr = graph.prev.get(curr);
    if (!curr) break;
  }
  return path;
}

export function gridDist(a, b) {
  return Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r));
}

// ── MEMOIZED BFS ──
const bfsCache = new Map();

export function memoizedBfs(sc, sr, limit, validSet, isBlockedFn, cacheKey) {
  if (cacheKey && bfsCache.has(cacheKey)) {
    return bfsCache.get(cacheKey);
  }
  const result = bfs(sc, sr, limit, validSet, isBlockedFn);
  if (cacheKey) {
    if (bfsCache.size > 200) bfsCache.clear();
    bfsCache.set(cacheKey, result);
  }
  return result;
}

export function clearBfsCache() {
  bfsCache.clear();
}
