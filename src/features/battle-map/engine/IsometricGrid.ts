import type { CellCoord, Point } from './types.ts';

export function cellKey(c: number, r: number): string {
  return `${c},${r}`;
}

export function parseCellKey(key: string): CellCoord {
  const [c, r] = key.split(',').map(Number);
  return { c, r };
}

/**
 * Retorna as coordenadas de pixel (x, y) do centro do tile isométrico (c, r)
 */
export function center(
  c: number,
  r: number,
  ox: number,
  oy: number,
  tw: number,
  th: number = tw / 2,
): Point {
  return {
    x: ox + ((c - r) * tw) / 2,
    y: oy + ((c + r) * th) / 2,
  };
}

/**
 * Converte um ponto em pixels (x, y) na coordenada isométrica mais próxima (c, r)
 */
export function toCell(
  x: number,
  y: number,
  ox: number,
  oy: number,
  tw: number,
  th: number = tw / 2,
): CellCoord {
  const halfW = tw / 2;
  const halfH = th / 2;
  const a = (x - ox) / halfW;
  const b = (y - oy) / halfH;
  return {
    c: Math.round((a + b) / 2),
    r: Math.round((b - a) / 2),
  };
}

/**
 * Traça o caminho de um losango isométrico no Canvas 2D
 */
export function diamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number = w / 2,
): void {
  const halfW = w / 2;
  const halfH = h / 2;
  ctx.beginPath();
  ctx.moveTo(x, y - halfH);
  ctx.lineTo(x + halfW, y);
  ctx.lineTo(x, y + halfH);
  ctx.lineTo(x - halfW, y);
  ctx.closePath();
}

/**
 * Pré-computa o conjunto de células válidas que cabem no retângulo da imagem
 */
export function buildGrid(
  imgW: number,
  imgH: number,
  ox: number,
  oy: number,
  tw: number,
  th: number = tw / 2,
): Set<string> {
  const valid = new Set<string>();
  const corners: Array<[number, number]> = [
    [0, 0],
    [imgW, 0],
    [0, imgH],
    [imgW, imgH],
  ];

  const halfW = tw / 2;
  const halfH = th / 2;
  const pts = corners.map(([x, y]) => {
    const a = (x - ox) / halfW;
    const b = (y - oy) / halfH;
    return [(a + b) / 2, (b - a) / 2];
  });

  const cs = pts.map((p) => p[0]);
  const rs = pts.map((p) => p[1]);
  const minC = Math.floor(Math.min(...cs)) - 1;
  const maxC = Math.ceil(Math.max(...cs)) + 1;
  const minR = Math.floor(Math.min(...rs)) - 1;
  const maxR = Math.ceil(Math.max(...rs)) + 1;

  for (let c = minC; c <= maxC; c++) {
    for (let r = minR; r <= maxR; r++) {
      const p = center(c, r, ox, oy, tw, th);
      if (
        p.x > -tw / 2 &&
        p.x < imgW + tw / 2 &&
        p.y > -th / 2 &&
        p.y < imgH + th / 2
      ) {
        valid.add(cellKey(c, r));
      }
    }
  }

  return valid;
}

/**
 * Seleciona a célula sob o ponto (x, y) se estiver dentro dos limites e pertencer ao mapa válido
 */
export function pick(
  x: number,
  y: number,
  valid: Set<string>,
  ox: number,
  oy: number,
  tw: number,
  th: number = tw / 2,
  imgW: number = 1376,
  imgH: number = 768,
): CellCoord | null {
  if (x < 0 || y < 0 || x > imgW || y > imgH) return null;
  const cell = toCell(x, y, ox, oy, tw, th);
  return valid.has(cellKey(cell.c, cell.r)) ? cell : null;
}

/**
 * Distância tática em grade de 8 direções (distância de Chebyshev)
 */
export function gridDistance(
  c1: number,
  r1: number,
  c2: number,
  r2: number,
): number {
  return Math.max(Math.abs(c1 - c2), Math.abs(r1 - r2));
}
