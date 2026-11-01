import type { MapPin, MapPlace } from '../types';
import mapRegions from '../data/mapRegions';

const W = 2400;
const H = 1600;
const OX = -700;
const OY = -700;
const TS = 256;
const BASE = 0.125;
const MAX_TILES = 360;
const BUCKET = 100;

// Ícones dos marcadores
export const ICONS: Record<string, { fill?: string[]; line?: string[]; hole?: string[]; flame?: string[] }> = {
  cap: { fill: ['M-6,4 L-6,-4 L-3,0 L0,-6 L3,0 L6,-4 L6,4 Z'] },
  cid: { fill: ['M-5,5 V-1 H-3 V-4 H-1 V-1 H1 V-4 H3 V-1 H5 V5 Z'] },
  por: { line: ['M1.8,-5 A1.8,1.8 0 1,1 -1.8,-5 A1.8,1.8 0 1,1 1.8,-5 Z', 'M0,-3 V6 M-3.5,-1 H3.5 M-6,2 Q-5,6 0,6 Q5,6 6,2'] },
  vil: { fill: ['M-5,5 V-1 L0,-5.5 L5,-1 V5 Z'] },
  for: { fill: ['M-4,6 V-3 H-5 V-6.5 H-3 V-4.5 H-1 V-6.5 H1 V-4.5 H3 V-6.5 H5 V-3 H4 V6 Z'] },
  rui: { line: ['M-6,6 H6 M-3,6 V-2 L-1,-4.5 L0,-1 L2,-5.5 L3,-3 V6'] },
  mas: {
    fill: ['M-5,1 A5,5 0 1,1 5,1 V3 H3 V6 H-3 V3 H-5 Z'],
    hole: ['M-0.6,0 A1.4,1.4 0 1,1 -3.4,0 A1.4,1.4 0 1,1 -0.6,0 Z M3.4,0 A1.4,1.4 0 1,1 0.6,0 A1.4,1.4 0 1,1 3.4,0 Z'],
  },
  tem: { fill: ['M-6,-1.5 L0,-6.5 L6,-1.5 Z'], line: ['M-4,0 V5 M0,0 V5 M4,0 V5 M-6,6 H6'] },
  cov: { flame: ['M0,-7 C4.5,-3 5.5,0 3.5,4 C2,6.5 -2,6.5 -3.5,4 C-5.5,0 -2,-2 0,-7 Z'] },
  mar: { fill: ['M0,-6.5 L1.8,-1.8 L6.5,0 L1.8,1.8 L0,6.5 L-1.8,1.8 L-6.5,0 L-1.8,-1.8 Z'] },
  tor: { fill: ['M-2.2,6 V-1.5 L0,-7 L2.2,-1.5 V6 Z'], line: ['M-4.5,6 H4.5'] },
  gui: { fill: ['M-5,-5 H5 V0 C5,4 0,6.5 0,6.5 C0,6.5 -5,4 -5,0 Z'] },
};

export function iconSVG(t: string): string {
  const fg = t === 'cap' ? '#18120c' : '#ecd395';
  const bg = t === 'cap' ? '#a3291f' : '#231b14';
  const P = ICONS[t];
  if (!P) return '';
  let s = `<svg viewBox="-10 -10 20 20" aria-hidden="true" style="width:18px;height:18px;display:inline-block;vertical-align:middle"><circle r="9.5" style="fill:${bg};stroke:#c9a45c;stroke-width:1"/>`;
  (P.fill || []).forEach((d) => {
    s += `<path d="${d}" fill="${fg}"/>`;
  });
  (P.flame || []).forEach((d) => {
    s += `<path d="${d}" fill="#a3291f"/>`;
  });
  (P.hole || []).forEach((d) => {
    s += `<path d="${d}" fill="${bg}"/>`;
  });
  (P.line || []).forEach((d) => {
    s += `<path d="${d}" fill="none" stroke="${fg}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  return `${s}</svg>`;
}

// Símbolos de relevo
const SYM_DEF: Record<string, [string, string][]> = {
  mtn: [
    ['fill', 'M-14,7 L-3,-11 L1,-4 L5,-9 L15,7 Z'],
    ['shade', 'M-3,-11 L1,-4 L-1,7 L-7,7 Z'],
    ['ink', 'M-14,7 L-3,-11 L1,-4 L5,-9 L15,7'],
  ],
  snow: [
    ['fill', 'M-14,7 L-3,-11 L1,-4 L5,-9 L15,7 Z'],
    ['shade', 'M-3,-11 L1,-4 L-1,7 L-7,7 Z'],
    ['snow', 'M-3,-11 L-7,-4 L-4,-5 L-2,-3 L0,-6 Z'],
    ['ink', 'M-14,7 L-3,-11 L1,-4 L5,-9 L15,7'],
  ],
  tree: [
    ['tree', 'M0,-10 C6,-10 8,-3 5,1 C3,3 -3,3 -5,1 C-8,-3 -6,-10 0,-10 Z'],
    ['ink', 'M0,2 V6'],
  ],
  swamp: [['thin', 'M-6,2 V-3 M-3,2 V-6 M0,2 V-4 M3,2 V-7 M6,2 V-3 M-9,5 H-2 M2,6 H9']],
  grass: [['thin', 'M-4,2 L-6,-3 M0,2 L0,-5 M4,2 L6,-3']],
  dune: [['thin', 'M-11,3 Q-3,-6 4,1 Q7,3 11,3 M-4,6 Q0,3 4,6']],
  hill: [
    ['fill', 'M-10,5 Q-4,-7 2,5 Z'],
    ['ink', 'M-10,5 Q-4,-7 2,5 M0,5 Q5,-2 10,5'],
  ],
  field: [['hair', 'M-8,-3 L8,-3 M-8,0 L8,0 M-8,3 L8,3']],
  mist: [['faint', 'M-10,0 Q-6,-4 -2,0 T6,0 M-6,5 Q-3,2 0,5 T6,5']],
  ash: [
    ['thin', 'M-8,-1 L-3,2 L1,-3 L8,1 M-3,2 L-2,7'],
    ['dot', 'M6.2,5 A1.2,1.2 0 1,1 3.8,5 A1.2,1.2 0 1,1 6.2,5 Z'],
  ],
};

const SafePath2D: typeof Path2D =
  typeof Path2D !== 'undefined'
    ? Path2D
    : (class {
        arc() {}
        moveTo() {}
        lineTo() {}
        bezierCurveTo() {}
      } as any);

// Curva Catmull-Rom para rota contínua
export function pointsToCatmullRom(points: [number, number][]): Path2D {
  if (!points || points.length === 0) return new SafePath2D();
  if (points.length === 1) {
    const p = new SafePath2D();
    p.arc(points[0][0], points[0][1], 2, 0, Math.PI * 2);
    return p;
  }
  if (points.length === 2) {
    const p = new SafePath2D();
    p.moveTo(points[0][0], points[0][1]);
    p.lineTo(points[1][0], points[1][1]);
    return p;
  }
  const p = new SafePath2D();
  p.moveTo(points[0][0], points[0][1]);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i === 0 ? points[0] : points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : p2;

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    p.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
  }
  return p;
}

export interface MapEngineOptions {
  places?: MapPlace[];
  regionsFog?: Record<string, boolean>;
  party?: { x: number; y: number; place_id?: string | null };
  route?: [number, number][];
  pins?: MapPin[];
  role?: 'player' | 'dm';
  isPlayerView?: boolean;
  ping?: { x: number; y: number; at: number } | null;
  selectedId?: string | null;
  onSelectPlace?: (place: MapPlace | null) => void;
  onPinClick?: (pin: MapPin) => void;
  onEmptyLongPress?: (coords: { x: number; y: number }) => void;
  onEmptyRightClick?: (coords: { x: number; y: number }) => void;
}

export function createMapEngine(canvas: HTMLCanvasElement, options: MapEngineOptions = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Falha ao obter contexto 2D do Canvas');

  let places = options.places || [];
  let regionsFog = options.regionsFog || { charnecas: true, aridas: true, fuligem: true };
  let party = options.party || { x: 1090, y: 1045, place_id: null };
  let route = options.route || [[975, 515], [995, 548], [1018, 585], [1040, 655], [1070, 885], [1090, 1045]];
  let routeP = pointsToCatmullRom(route);
  let pins = options.pins || [];
  const role = options.role || 'player';
  let isPlayerView = Boolean(options.isPlayerView);
  let pingObj = options.ping || null;
  let sel: string | null = options.selectedId ?? null;

  const onSelectPlace = options.onSelectPlace || (() => {});
  const onPinClick = options.onPinClick || (() => {});
  const onEmptyLongPress = options.onEmptyLongPress || (() => {});
  const onEmptyRightClick = options.onEmptyRightClick || (() => {});

  let isDestroyed = false;
  let isPaused = false;

  // Camadas
  let layers = { route: true, roads: true, borders: true };
  let hiddenTypes = new Set<string>();
  const CITY = new Set(['cap', 'cid', 'por']);

  // Cores do tema Pedra e Pergaminho
  const C = {
    sea: '#10181b',
    wave: '#16252b',
    ripple: '#1d333b',
    land: '#181512',
    ink: '#ecd395',
    shade: 'rgba(0,0,0,0.35)',
    tree: '#344026',
    river: '#325866',
    road: '#7c5e37',
    border: '#8f4625',
    blood: '#a3291f',
    gold: '#c9a45c',
    snow: '#e2ddcb',
    mkbg: '#211a14',
    halo: '#181512',
    ocean: '#426875',
  };

  // Caminhos carregados sob demanda via fetch
  let coastP = new SafePath2D();
  let roadsP = new SafePath2D();
  let bordersP = new SafePath2D();
  let riverP: Path2D[] = [];
  let tintP: [string, Path2D][] = [];
  const buckets = new Map<string, [string, number, number, number][]>();
  const SYM: Record<string, [string, Path2D][]> = {};

  // Inicializa símbolos Path2D
  for (const [k, parts] of Object.entries(SYM_DEF)) {
    SYM[k] = parts.map(([kind, d]) => [kind, new SafePath2D(d)]);
  }

  // Prepara polígonos das regiões para névoa de guerra
  const REGION_IDS = ['brumas', 'ermos', 'estepes', 'charnecas', 'silvarenna', 'aridas', 'fuligem', 'bib', 'valdoria', 'cinzas', 'ilhas'];
  const regionPolygons: Record<string, Path2D> = {};

  // Carrega mapGeo.json de forma assíncrona (fora do bundle Vite)
  let geoLoaded = false;
  fetch('/data/mapGeo.json')
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then((geo) => {
      if (isDestroyed) return;
      coastP = new SafePath2D(geo.coast || '');
      roadsP = new SafePath2D(geo.roads || '');
      bordersP = new SafePath2D(geo.borders || '');
      riverP = (geo.rivers || []).map((d: string) => new SafePath2D(d));
      tintP = (geo.tints || []).map(([c, d]: [string, string]) => [c, new SafePath2D(d)]);

      (geo.tints || []).forEach(([_, d]: [string, string], idx: number) => {
        if (idx < REGION_IDS.length - 1) {
          regionPolygons[REGION_IDS[idx]] = new SafePath2D(d);
        }
      });
      regionPolygons.ilhas = new SafePath2D('M2010,0 L2500,0 L2500,1600 L2010,1600 Z');

      if (Array.isArray(geo.terrain)) {
        geo.terrain.forEach((t: [string, number, number, number]) => {
          const key = Math.floor(t[1] / BUCKET) + ',' + Math.floor(t[2] / BUCKET);
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key)!.push(t);
        });
      }

      geoLoaded = true;
      cache.clear();
      req();
    })
    .catch((err) => {
      console.warn('[MAP] mapGeo.json fallback procedural:', err.message);
      geoLoaded = true;
      req();
    });

  // Transformada da câmera
  let s = 1;
  let tx = 0;
  let ty = 0;
  let s0 = 1;
  let reqId: number | null = null;

  // Cache de tiles
  const cache = new Map<string, HTMLCanvasElement>();
  const queue: [number, number, number][] = [];

  function tileKey(L: number, x: number, y: number) {
    return `${L}/${x}/${y}`;
  }

  function drawStatic(g: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number) {
    const base = g.getTransform();
    g.fillStyle = C.sea;
    g.fillRect(ax, ay, bx - ax, by - ay);

    // Ondas
    g.strokeStyle = C.wave;
    g.globalAlpha = 0.5;
    g.lineWidth = 1.4;
    g.lineCap = 'round';
    g.beginPath();
    for (let j = Math.floor(ay / 34) - 1; j <= Math.ceil(by / 34); j++) {
      for (let i = Math.floor(ax / 60) - 1; i <= Math.ceil(bx / 60); i++) {
        const x = i * 60;
        const y = j * 34;
        g.moveTo(x + 4, y + 20);
        g.quadraticCurveTo(x + 12, y + 13, x + 20, y + 20);
        g.moveTo(x + 34, y + 6);
        g.quadraticCurveTo(x + 42, y - 1, x + 50, y + 6);
      }
    }
    g.stroke();
    g.globalAlpha = 1;

    // Ondulações da costa
    g.lineJoin = 'round';
    g.strokeStyle = C.ripple;
    for (const [w, a] of [[34, 0.35], [20, 0.55], [9, 0.9]]) {
      g.globalAlpha = a;
      g.lineWidth = w;
      g.stroke(coastP);
    }
    g.globalAlpha = 1;

    // Terra e preenchimento
    g.fillStyle = C.land;
    g.fill(coastP, 'evenodd');
    g.save();
    g.clip(coastP, 'evenodd');

    g.globalAlpha = 0.22;
    for (const [c, p] of tintP) {
      g.fillStyle = c;
      g.fill(p);
    }
    g.globalAlpha = 1;

    // Relevo
    const list: [string, number, number, number][] = [];
    for (let by_ = Math.floor((ay - 20) / BUCKET); by_ <= Math.floor((by + 20) / BUCKET); by_++) {
      for (let bx_ = Math.floor((ax - 20) / BUCKET); bx_ <= Math.floor((bx + 20) / BUCKET); bx_++) {
        const b = buckets.get(bx_ + ',' + by_);
        if (b) list.push(...b);
      }
    }
    list.sort((a, b) => a[2] - b[2]);
    g.lineCap = 'round';
    g.lineJoin = 'round';

    for (const [k, x, y, sc] of list) {
      g.setTransform(base);
      g.translate(x, y);
      g.scale(sc, sc);
      const symParts = SYM[k] || [];
      for (const [kind, p] of symParts) {
        switch (kind) {
          case 'fill':
            g.fillStyle = C.land;
            g.fill(p);
            break;
          case 'shade':
            g.fillStyle = C.shade;
            g.fill(p);
            break;
          case 'snow':
            g.fillStyle = C.snow;
            g.fill(p);
            break;
          case 'tree':
            g.fillStyle = C.tree;
            g.fill(p);
            g.strokeStyle = C.ink;
            g.globalAlpha = 0.88;
            g.lineWidth = 1;
            g.stroke(p);
            g.globalAlpha = 1;
            break;
          case 'dot':
            g.fillStyle = C.ink;
            g.fill(p);
            break;
          default:
            g.strokeStyle = C.ink;
            g.lineWidth = kind === 'ink' ? 1.3 : kind === 'hair' ? 0.8 : 1;
            g.globalAlpha = kind === 'hair' ? 0.5 : kind === 'faint' ? 0.4 : 0.88;
            g.stroke(p);
            g.globalAlpha = 1;
        }
      }
    }

    g.setTransform(base);
    g.strokeStyle = C.river;
    g.lineWidth = 3.2;
    for (const p of riverP) g.stroke(p);
    g.restore();

    g.strokeStyle = C.ink;
    g.lineWidth = 2.2;
    g.lineJoin = 'round';
    g.stroke(coastP);
  }

  function renderTile(L: number, x: number, y: number) {
    const sL = BASE * 2 ** L;
    const u = TS / sL;
    const x0 = OX + x * u;
    const y0 = OY + y * u;
    const c = document.createElement('canvas');
    c.width = c.height = TS;
    const g = c.getContext('2d');
    if (!g) return;
    g.setTransform(sL, 0, 0, sL, -x0 * sL, -y0 * sL);
    drawStatic(g, x0, y0, x0 + u, y0 + u);
    cache.set(tileKey(L, x, y), c);

    while (cache.size > MAX_TILES) {
      const first = cache.keys().next().value;
      if (!first) break;
      if (first.startsWith('0/')) {
        const v = cache.get(first)!;
        cache.delete(first);
        cache.set(first, v);
        continue;
      }
      cache.delete(first);
    }
  }

  let pumping = false;
  function pump() {
    if (pumping || !queue.length || isDestroyed || isPaused) return;
    pumping = true;
    requestAnimationFrame(() => {
      if (isDestroyed || isPaused) {
        pumping = false;
        return;
      }
      const t0 = performance.now();
      while (queue.length && performance.now() - t0 < 9) {
        const [L, x, y] = queue.shift()!;
        if (!cache.has(tileKey(L, x, y))) {
          renderTile(L, x, y);
        }
      }
      pumping = false;
      if (queue.length) pump();
      req();
    });
  }

  function fit() {
    const r = canvas.getBoundingClientRect();
    const w = r.width;
    const h = r.height;
    if (w <= 0 || h <= 0) return;
    s0 = Math.min(w / W, h / H);
    s = s0;
    tx = (w - W * s) / 2;
    ty = (h - H * s) / 2;
    req();
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    const pw = Math.round(r.width * dpr);
    const ph = Math.round(r.height * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    req();
  }

  function req() {
    if (reqId === null && !isDestroyed && !isPaused) {
      reqId = requestAnimationFrame(frame);
    }
  }

  function frame() {
    reqId = null;
    if (isDestroyed || isPaused) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);

    // Fundo do oceano
    ctx.fillStyle = C.sea;
    ctx.fillRect(0, 0, r.width, r.height);

    if (!geoLoaded) {
      ctx.fillStyle = C.ink;
      ctx.font = '14px "Cinzel", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('Desenhando Cartografia de Aldrenor...', r.width / 2, r.height / 2);
      return;
    }

    // Desenha tiles visíveis
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(s, s);

    const L = Math.max(0, Math.min(6, Math.floor(Math.log2(s / BASE))));
    const sL = BASE * 2 ** L;
    const u = TS / sL;

    const vx0 = -tx / s;
    const vy0 = -ty / s;
    const vx1 = (-tx + r.width) / s;
    const vy1 = (-ty + r.height) / s;

    const ix0 = Math.max(0, Math.floor((vx0 - OX) / u));
    const iy0 = Math.max(0, Math.floor((vy0 - OY) / u));
    const ix1 = Math.min(Math.ceil((3800) / u), Math.ceil((vx1 - OX) / u));
    const iy1 = Math.min(Math.ceil((3000) / u), Math.ceil((vy1 - OY) / u));

    for (let iy = iy0; iy <= iy1; iy++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        const k = tileKey(L, ix, iy);
        const tile = cache.get(k);
        const x0 = OX + ix * u;
        const y0 = OY + iy * u;
        if (tile) {
          ctx.drawImage(tile, x0, y0, u, u);
        } else {
          queue.push([L, ix, iy]);
        }
      }
    }
    if (queue.length) pump();

    // Névoa de guerra para jogadores ou visão de jogador
    const effectiveIsPlayer = role === 'player' || isPlayerView;
    if (effectiveIsPlayer) {
      ctx.save();
      for (const reg of mapRegions) {
        const isDiscovered = Boolean(regionsFog[reg.id]);
        if (!isDiscovered && regionPolygons[reg.id]) {
          ctx.fillStyle = 'rgba(12, 10, 8, 0.78)';
          ctx.fill(regionPolygons[reg.id]);
        }
      }
      ctx.restore();
    }

    // Estradas
    if (layers.roads) {
      ctx.strokeStyle = C.road;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke(roadsP);
      ctx.setLineDash([]);
    }

    // Fronteiras
    if (layers.borders) {
      ctx.strokeStyle = C.border;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([8, 6]);
      ctx.stroke(bordersP);
      ctx.setLineDash([]);
    }

    // Rota da Campanha (Catmull-Rom spline)
    if (layers.route && route.length > 1) {
      ctx.save();
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.stroke(routeP);
      ctx.restore();
    }

    // Marcadores de Lugares
    drawPlaces(ctx, effectiveIsPlayer);

    // Marcador do Grupo (Pino dourado pulsando suavemente)
    drawParty(ctx);

    // Marcadores / Alfinetes Pessoais
    drawPins(ctx);

    // Sinal de Ping
    drawPing(ctx);

    ctx.restore();
  }

  function drawPlaces(g: CanvasRenderingContext2D, isPlayerMode: boolean) {
    const scaleFactor = s / s0;
    const now = performance.now();

    for (const p of places) {
      if (isPlayerMode && !p.discovered) continue;
      if (hiddenTypes.has(p.type)) continue;

      const isCapital = p.type === 'cap';
      const isSelected = sel === p.id;
      const x = Number(p.x);
      const y = Number(p.y);

      g.save();
      g.translate(x, y);

      // Ícone do lugar
      const bg = isCapital ? C.blood : isSelected ? C.gold : C.mkbg;
      const border = isSelected ? '#fff' : isCapital ? C.gold : C.ink;

      g.beginPath();
      g.arc(0, 0, isCapital ? 9 : 7, 0, Math.PI * 2);
      g.fillStyle = bg;
      g.fill();
      g.strokeStyle = border;
      g.lineWidth = isSelected ? 2.5 : 1.5;
      g.stroke();

      // Rótulo / Nome
      if (isCapital || isSelected || scaleFactor >= 1.2 || p.visited) {
        g.font = isCapital
          ? 'bold 13px "Cinzel", Georgia, serif'
          : '12px "EB Garamond", Georgia, serif';
        g.textAlign = 'center';
        g.textBaseline = 'top';

        // Sombra de leitura
        g.fillStyle = '#0a0806';
        g.fillText(p.name, 1, 11);
        g.fillText(p.name, -1, 11);
        g.fillText(p.name, 0, 12);
        g.fillText(p.name, 0, 10);

        g.fillStyle = isSelected ? '#fff' : isCapital ? '#f5e0a0' : C.ink;
        g.fillText(p.name, 0, 11);
      }

      g.restore();
    }
  }

  function drawParty(g: CanvasRenderingContext2D) {
    if (!party || typeof party.x !== 'number' || typeof party.y !== 'number') return;
    const now = performance.now();
    const pulse = (Math.sin(now / 450) + 1) / 2; // 0..1 pulsando devagar
    const radius = 10 + pulse * 6;

    g.save();
    g.translate(party.x, party.y);

    // Halo dourado pulsante
    g.beginPath();
    g.arc(0, 0, radius, 0, Math.PI * 2);
    g.strokeStyle = `rgba(201, 164, 92, ${0.7 - pulse * 0.5})`;
    g.lineWidth = 2.5;
    g.stroke();

    // Centro do grupo
    g.beginPath();
    g.arc(0, 0, 6.5, 0, Math.PI * 2);
    g.fillStyle = '#c9a45c';
    g.fill();
    g.strokeStyle = '#2b1a0d';
    g.lineWidth = 2;
    g.stroke();

    // Rótulo "O Grupo"
    g.font = 'bold 11px "Cinzel", Georgia, serif';
    g.textAlign = 'center';
    g.fillStyle = '#0a0806';
    g.fillText('O GRUPO', 1, -14);
    g.fillText('O GRUPO', -1, -14);
    g.fillStyle = '#fef08a';
    g.fillText('O GRUPO', 0, -14);

    g.restore();
  }

  function drawPins(g: CanvasRenderingContext2D) {
    for (const pin of pins) {
      g.save();
      g.translate(Number(pin.x), Number(pin.y));
      g.fillStyle = '#ef4444';
      g.beginPath();
      g.arc(0, 0, 5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#fff';
      g.lineWidth = 1.5;
      g.stroke();
      g.restore();
    }
  }

  function drawPing(g: CanvasRenderingContext2D) {
    if (!pingObj) return;
    const elapsed = Date.now() - pingObj.at;
    if (elapsed > 4500) {
      pingObj = null;
      return;
    }
    const progress = elapsed / 4500;
    const radius = 10 + progress * 60;
    const alpha = Math.max(0, 1 - progress);

    g.save();
    g.translate(pingObj.x, pingObj.y);
    g.beginPath();
    g.arc(0, 0, radius, 0, Math.PI * 2);
    g.strokeStyle = `rgba(234, 179, 8, ${alpha})`;
    g.lineWidth = 3;
    g.stroke();
    g.restore();
    req(); // Continua o loop de animação do ping
  }

  // Interações e Gestos (Pan, Zoom, Long Press, ContextMenu, Click)
  const pts = new Map<number, { x: number; y: number }>();
  let moved = 0;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressFired = false;
  let lastDist = 0;

  function hitTest(cx: number, cy: number): MapPlace | null {
    const r = canvas.getBoundingClientRect();
    const mx = (cx - r.left - tx) / s;
    const my = (cy - r.top - ty) / s;
    const effectiveIsPlayer = role === 'player' || isPlayerView;

    for (let i = places.length - 1; i >= 0; i--) {
      const p = places[i];
      if (effectiveIsPlayer && !p.discovered) continue;
      if (hiddenTypes.has(p.type)) continue;
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d <= 14 / s || d <= 12) return p;
    }
    return null;
  }

  function hitTestPin(cx: number, cy: number): MapPin | null {
    const r = canvas.getBoundingClientRect();
    const mx = (cx - r.left - tx) / s;
    const my = (cy - r.top - ty) / s;
    for (let i = pins.length - 1; i >= 0; i--) {
      const pin = pins[i];
      const d = Math.hypot(pin.x - mx, pin.y - my);
      if (d <= 12 / s || d <= 10) return pin;
    }
    return null;
  }

  function handlePointerDown(e: PointerEvent) {
    canvas.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = 0;
    longPressFired = false;

    if (pts.size === 1) {
      const r = canvas.getBoundingClientRect();
      const wx = (e.clientX - r.left - tx) / s;
      const wy = (e.clientY - r.top - ty) / s;
      longPressTimer = setTimeout(() => {
        if (moved < 10 && pts.size === 1) {
          longPressFired = true;
          onEmptyLongPress({ x: Math.round(wx * 10) / 10, y: Math.round(wy * 10) / 10 });
        }
      }, 550);
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId)!;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    moved += Math.hypot(dx, dy);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (moved > 8 && longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    if (pts.size === 1) {
      tx += dx;
      ty += dy;
      req();
    } else if (pts.size === 2) {
      const arr = Array.from(pts.values());
      const dist = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      if (lastDist > 0) {
        const factor = dist / lastDist;
        const midX = (arr[0].x + arr[1].x) / 2;
        const midY = (arr[0].y + arr[1].y) / 2;
        zoomBy(factor, midX, midY);
      }
      lastDist = dist;
    }
  }

  function handlePointerUp(e: PointerEvent) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    pts.delete(e.pointerId);
    if (pts.size < 2) lastDist = 0;

    if (pts.size === 0 && moved < 8 && !longPressFired) {
      const pin = hitTestPin(e.clientX, e.clientY);
      if (pin) {
        onPinClick(pin);
        return;
      }
      const p = hitTest(e.clientX, e.clientY);
      if (p) {
        sel = p.id;
        onSelectPlace(p);
      } else {
        sel = null;
        onSelectPlace(null);
      }
      req();
    }
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    zoomBy(factor, e.clientX, e.clientY);
  }

  function zoomBy(factor: number, cx: number, cy: number) {
    const r = canvas.getBoundingClientRect();
    const targetS = Math.max(0.35, Math.min(6.5, s * factor));
    const mx = cx - r.left;
    const my = cy - r.top;
    tx = mx - (mx - tx) * (targetS / s);
    ty = my - (my - ty) * (targetS / s);
    s = targetS;
    req();
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left - tx) / s;
    const my = (e.clientY - r.top - ty) / s;
    const hit = hitTest(e.clientX, e.clientY);
    if (!hit) {
      onEmptyRightClick({ x: Math.round(mx * 10) / 10, y: Math.round(my * 10) / 10 });
    }
  }

  // Registra eventos
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('contextmenu', handleContextMenu);
  window.addEventListener('resize', resize);

  // Inicializa dimensões e câmera
  resize();
  fit();

  // Loop contínuo para animação do grupo
  let animTimer: number | null = null;
  function animLoop() {
    if (!isDestroyed && !isPaused) {
      req();
      animTimer = window.setTimeout(animLoop, 80); // ~12 fps para pulso calmo sem fritar CPU
    }
  }
  animLoop();

  return {
    flyTo(x: number, y: number, targetZoom = 2.5) {
      const r = canvas.getBoundingClientRect();
      s = Math.max(0.35, Math.min(6.5, targetZoom));
      tx = r.width / 2 - x * s;
      ty = r.height / 2 - y * s;
      req();
    },
    zoomIn() {
      const r = canvas.getBoundingClientRect();
      zoomBy(1.3, r.left + r.width / 2, r.top + r.height / 2);
    },
    zoomOut() {
      const r = canvas.getBoundingClientRect();
      zoomBy(0.77, r.left + r.width / 2, r.top + r.height / 2);
    },
    fit,
    setPlaces(newPlaces: MapPlace[]) {
      places = newPlaces;
      req();
    },
    setRegionsFog(newFog: Record<string, boolean>) {
      regionsFog = newFog;
      req();
    },
    setParty(newParty: { x: number; y: number; place_id?: string | null }) {
      party = newParty;
      req();
    },
    setRoute(newRoute: [number, number][]) {
      route = newRoute;
      routeP = pointsToCatmullRom(newRoute);
      req();
    },
    setPins(newPins: MapPin[]) {
      pins = newPins;
      req();
    },
    setPlayerView(pv: boolean) {
      isPlayerView = pv;
      req();
    },
    ping(p: { x: number; y: number; at: number } | null) {
      pingObj = p;
      req();
    },
    setLayers(next: { route: boolean; roads: boolean; borders: boolean }) {
      layers = next;
      req();
    },
    setHiddenTypes(hidden: Set<string>) {
      hiddenTypes = hidden;
      req();
    },
    pause() {
      isPaused = true;
    },
    resume() {
      if (isPaused) {
        isPaused = false;
        req();
        animLoop();
      }
    },
    destroy() {
      isDestroyed = true;
      if (longPressTimer) clearTimeout(longPressTimer);
      if (animTimer) clearTimeout(animTimer);
      if (reqId) cancelAnimationFrame(reqId);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('resize', resize);
    },
  };
}
