// @ts-nocheck
/**
 * Motor do mapa do continente de Aldrenor (tela principal).
 * Portado do mapa original: ladrilhos desenhados num Web Worker, nível 0 sempre
 * como reserva, ladrilhos do nível seguinte pré-carregados, marcadores/nomes como
 * imagens prontas (cache LRU) e sem nomes encavalados.
 *
 * Acrescentado: lugares vindos do banco (editáveis), rota da campanha editável,
 * posição do grupo, alfinetes e as ferramentas do Mestre (mover, adicionar, rota, grupo).
 */
import { MAX_LEVEL, TILE_CONST, WORLD_H as H, WORLD_W as W } from './data.ts';
import { createTileRenderer } from './tileRenderer.js';

const { OX, OY, EXT_W, EXT_H, TS, BASE } = TILE_CONST;
const MAXL = MAX_LEVEL;
const MAX_TILES = 300;
const MAX_SPR = 900;
const ZF = 1.7;
const ZMAX = 30;

/** Paleta pergaminho (igual ao mapa original, tema claro). */
export const MAP_COLORS = {
  sea: '#7d9693', wave: '#5f7a77', ripple: '#93a9a5', land: '#e7d8b3', ink: '#3b2a1b',
  shade: 'rgba(59,42,27,.18)', tree: '#a9b37c', river: '#5c8790', road: '#8a6a43', border: '#6b3a2a',
  blood: '#8c1d18', gold: '#a87b22', snow: '#f7f3ea', mkbg: '#f3e9cf', halo: '#e7d8b3', ocean: '#4d6663',
};

const SERIF = '"EB Garamond", Georgia, serif';
const SC = '"Cinzel", Georgia, serif';
const CITY = new Set(['cap', 'cid', 'por']);

/* ---------- ícones dos lugares (mesmos desenhos do original) ---------- */
export const ICONS = {
  cap: { fill: ['M-6,4 L-6,-4 L-3,0 L0,-6 L3,0 L6,-4 L6,4 Z'] },
  cid: { fill: ['M-5,5 V-1 H-3 V-4 H-1 V-1 H1 V-4 H3 V-1 H5 V5 Z'] },
  por: { line: ['M1.8,-5 A1.8,1.8 0 1,1 -1.8,-5 A1.8,1.8 0 1,1 1.8,-5 Z', 'M0,-3 V6 M-3.5,-1 H3.5 M-6,2 Q-5,6 0,6 Q5,6 6,2'] },
  vil: { fill: ['M-5,5 V-1 L0,-5.5 L5,-1 V5 Z'] },
  for: { fill: ['M-4,6 V-3 H-5 V-6.5 H-3 V-4.5 H-1 V-6.5 H1 V-4.5 H3 V-6.5 H5 V-3 H4 V6 Z'] },
  rui: { line: ['M-6,6 H6 M-3,6 V-2 L-1,-4.5 L0,-1 L2,-5.5 L3,-3 V6'] },
  mas: { fill: ['M-5,1 A5,5 0 1,1 5,1 V3 H3 V6 H-3 V3 H-5 Z'], hole: ['M-0.6,0 A1.4,1.4 0 1,1 -3.4,0 A1.4,1.4 0 1,1 -0.6,0 Z M3.4,0 A1.4,1.4 0 1,1 0.6,0 A1.4,1.4 0 1,1 3.4,0 Z'] },
  tem: { fill: ['M-6,-1.5 L0,-6.5 L6,-1.5 Z'], line: ['M-4,0 V5 M0,0 V5 M4,0 V5 M-6,6 H6'] },
  cov: { flame: ['M0,-7 C4.5,-3 5.5,0 3.5,4 C2,6.5 -2,6.5 -3.5,4 C-5.5,0 -2,-2 0,-7 Z'] },
  mar: { fill: ['M0,-6.5 L1.8,-1.8 L6.5,0 L1.8,1.8 L0,6.5 L-1.8,1.8 L-6.5,0 L-1.8,-1.8 Z'] },
  tor: { fill: ['M-2.2,6 V-1.5 L0,-7 L2.2,-1.5 V6 Z'], line: ['M-4.5,6 H4.5'] },
  gui: { fill: ['M-5,-5 H5 V0 C5,4 0,6.5 0,6.5 C0,6.5 -5,4 -5,0 Z'] },
  est: { fill: ['M-4.5,-4 H2.5 V5 H-4.5 Z'], line: ['M2.5,-2 H5 V3 H2.5'] },
  min: { line: ['M-5,5 L4,-4', 'M0,-6 Q5,-6 6,-1', 'M5,5 L-4,-4', 'M0,-6 Q-5,-6 -6,-1'] },
  acp: { fill: ['M-6.5,5 L0,-5.5 L6.5,5 Z'], hole: ['M-1.6,5 L0,1.2 L1.6,5 Z'] },
  fer: { fill: ['M-3.6,2.6 A3.6,3 0 1,0 3.6,2.6 A3.6,3 0 1,0 -3.6,2.6 Z', 'M-5.4,-1.6 A1.5,1.9 0 1,0 -2.4,-1.6 A1.5,1.9 0 1,0 -5.4,-1.6 Z', 'M-1.5,-3.8 A1.5,1.9 0 1,0 1.5,-3.8 A1.5,1.9 0 1,0 -1.5,-3.8 Z', 'M2.4,-1.6 A1.5,1.9 0 1,0 5.4,-1.6 A1.5,1.9 0 1,0 2.4,-1.6 Z'] },
  pon: { line: ['M-6,3 Q0,-5 6,3', 'M-6.5,3 H6.5', 'M-4,3 V6', 'M4,3 V6'] },
  far: { fill: ['M-2.6,6 L-1.6,-3 H1.6 L2.6,6 Z', 'M-2,-3.4 H2 V-5.6 H-2 Z'], line: ['M-6.2,-5.6 L-3.2,-4.6', 'M6.2,-5.6 L3.2,-4.6'] },
};

/** SVG do ícone (para listas em HTML). */
export function iconSVG(t) {
  const fg = t === 'cap' ? MAP_COLORS.mkbg : MAP_COLORS.ink;
  const bg = t === 'cap' ? MAP_COLORS.blood : MAP_COLORS.mkbg;
  const P = ICONS[t] || ICONS.mar;
  let s = `<svg viewBox="-10 -10 20 20" aria-hidden="true" width="18" height="18"><circle r="9" style="fill:${bg};stroke:${MAP_COLORS.ink}"/>`;
  (P.fill || []).forEach((d) => (s += `<path d="${d}" fill="${fg}"/>`));
  (P.flame || []).forEach((d) => (s += `<path d="${d}" fill="${MAP_COLORS.blood}"/>`));
  (P.hole || []).forEach((d) => (s += `<path d="${d}" fill="${bg}"/>`));
  (P.line || []).forEach((d) => (s += `<path d="${d}" fill="none" stroke="${fg}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`));
  return `${s}</svg>`;
}

/** Curva suave (Catmull-Rom → Bézier) por uma lista de pontos. */
export function routePath(points) {
  const p = new Path2D();
  if (!points || points.length < 2) return p;
  p.moveTo(points[0][0], points[0][1]);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    p.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1],
    );
  }
  return p;
}

const q2 = (v) => {
  const n = Math.round(Math.log(Math.max(v, 1)) / Math.log(1.05));
  return Math.round(Math.pow(1.05, n) * 100) / 100;
};

export class AldrenorEngine {
  /**
   * @param {HTMLCanvasElement} cv
   * @param {{ geo: any, onSelect?: Function, onTap?: Function, onPlaceMove?: Function, onView?: Function }} opts
   */
  constructor(cv, opts) {
    this.cv = cv;
    this.ctx = cv.getContext('2d', { alpha: false });
    this.G = opts.geo;
    this.opts = opts;
    this.C = MAP_COLORS;

    this.places = [];
    this.byId = new Map();
    this.shownIds = null; // null = todos
    this.sel = null;
    this.mode = 'view';
    this.layers = { route: true, roads: true, borders: true };
    this.route = null; // [[x,y]...] ou null (rota base)
    this.routeP = new Path2D(this.G.route);
    this.party = null;
    this.pins = [];
    this.insets = { left: 0, bottom: 0 };

    this.s = 1; this.tx = 0; this.ty = 0; this.s0 = 1; this.dpr = 1; this.vw = 0; this.vh = 0;
    this.version = 1;
    this.tiles = new Map();
    this.inflight = new Map();
    this.wanted = [];
    this.worker = null; this.workerOK = false; this.localR = null; this.localQueue = []; this.pumping = false;
    this.sprites = new Map();
    this.measure = document.createElement('canvas').getContext('2d');
    this.pending = false; this.lastF = 0; this.settleT = 0; this.anim = 0;
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.L0N = [Math.ceil((EXT_W * BASE) / TS), Math.ceil((EXT_H * BASE) / TS)];
    this.destroyed = false;

    this.frame = this.frame.bind(this);
    this.bindGestures();
    this.ro = new ResizeObserver(() => {
      const first = !this.vw;
      this.resize();
      if (first) this.fit(); else { this.clamp(); this.req(); }
    });
    this.ro.observe(cv);
    this.resize();
    this.fit();
    this.startWorker();
    if (document.fonts?.ready) document.fonts.ready.then(() => { this.sprites.clear(); this.req(); });
  }

  /* ───────── dados ───────── */
  setPlaces(list) {
    this.places = list;
    this.byId = new Map(list.map((p) => [p.id, p]));
    this.sprites.forEach((_v, k) => { if (k.startsWith('l|')) this.sprites.delete(k); });
    this.req();
  }
  setFilter(ids) { this.shownIds = ids; this.req(); }
  setSelected(id) { this.sel = id ?? null; this.req(); }
  setMode(m) { this.mode = m; this.cv.style.cursor = m === 'view' ? '' : m === 'move' ? 'grab' : 'crosshair'; }
  setRoute(points) { this.route = points && points.length ? points : null; this.routeP = this.route ? routePath(this.route) : new Path2D(this.G.route); this.req(); }
  setParty(p) { this.party = p; this.req(); }
  setPins(pins) { this.pins = pins || []; this.req(); }
  /** Área coberta por painéis; mantém o mesmo ponto do mundo no centro do que fica visível. */
  setInsets(i) {
    const hadView = this.vw > 0 && this.s > 0;
    const [cx, cy] = this.center(); const wx = (cx - this.tx) / this.s; const wy = (cy - this.ty) / this.s;
    this.insets = { ...this.insets, ...i };
    if (!hadView) return;
    const [nx, ny] = this.center();
    this.tx = nx - wx * this.s; this.ty = ny - wy * this.s;
    this.clamp(); this.req();
  }
  setLayers(l) {
    const tilesChange = l.roads !== this.layers.roads || l.borders !== this.layers.borders;
    this.layers = { ...this.layers, ...l };
    if (tilesChange) this.invalidate(); else this.req();
  }

  /* ───────── ladrilhos ───────── */
  startWorker() {
    const geo = this.G;
    const tileGeo = { terrain: geo.terrain, grid: geo.grid, contours: geo.contours, tints: geo.tints, rivers: geo.rivers, roads: geo.roads, borders: geo.borders, arts: geo.arts };
    this.tileGeo = tileGeo;
    try {
      if (typeof OffscreenCanvas === 'undefined' || typeof Worker === 'undefined') throw 0;
      const w = new Worker(new URL('./tileWorker.js', import.meta.url), { type: 'module' });
      w.onmessage = (e) => {
        if (e.data.ready) { this.workerOK = true; this.feed(); return; }
        const { key, v, b } = e.data;
        this.inflight.delete(key);
        if (this.destroyed) { b.close?.(); return; }
        this.storeTile(key, v, b); this.req(); this.feed();
      };
      w.onerror = () => { try { w.terminate(); } catch (_) {} this.worker = null; this.fallback(); };
      w.postMessage({ t: 'init', geo: tileGeo, k: TILE_CONST, c: this.C });
      this.worker = w;
      setTimeout(() => { if (!this.workerOK && this.worker) { this.worker.terminate(); this.worker = null; this.fallback(); } }, 4000);
    } catch (_) { this.fallback(); }
  }
  fallback() {
    if (this.localR || this.destroyed) return;
    this.localR = createTileRenderer();
    this.localR.init(this.tileGeo, TILE_CONST);
    this.localR.setColors(this.C);
    this.inflight.clear(); this.feed();
  }
  storeTile(key, v, img) {
    const old = this.tiles.get(key);
    if (old && old.img.close && old.img !== img) old.img.close();
    this.tiles.delete(key); this.tiles.set(key, { v, img });
    if (this.tiles.size > MAX_TILES) {
      for (const [k, t] of this.tiles) {
        if (this.tiles.size <= MAX_TILES) break;
        if (k.startsWith('0/') || k.startsWith('1/')) continue;
        if (t.img.close) t.img.close();
        this.tiles.delete(k);
      }
    }
  }
  getTile(L, x, y) {
    const k = `${L}/${x}/${y}`; const t = this.tiles.get(k);
    if (t) { this.tiles.delete(k); this.tiles.set(k, t); }
    return t;
  }
  feed() {
    if (this.worker && this.workerOK) {
      for (const w of this.wanted) {
        if (this.inflight.size >= 6) break;
        if (this.inflight.get(w.key) === this.version) continue;
        const t = this.tiles.get(w.key); if (t && t.v === this.version) continue;
        this.inflight.set(w.key, this.version);
        this.worker.postMessage({ t: 'tile', key: w.key, v: this.version, L: w.L, x: w.x, y: w.y, ts: TS, layers: { roads: this.layers.roads, borders: this.layers.borders } });
      }
    } else if (this.localR) {
      this.localQueue = this.wanted.filter((w) => { const t = this.tiles.get(w.key); return !t || t.v !== this.version; });
      this.pumpLocal();
    }
  }
  pumpLocal() {
    if (this.pumping || !this.localQueue.length) return;
    this.pumping = true;
    requestAnimationFrame(() => {
      const t0 = performance.now(); let did = 0;
      while (this.localQueue.length && performance.now() - t0 < 7) {
        const w = this.localQueue.shift();
        const c = document.createElement('canvas'); c.width = c.height = TS;
        this.localR.paint(c.getContext('2d'), w.L, w.x, w.y, this.layers);
        this.storeTile(w.key, this.version, c); did++;
      }
      this.pumping = false;
      if (did) this.req();
      if (this.localQueue.length) this.pumpLocal();
    });
  }
  invalidate() { this.version++; this.inflight.clear(); this.req(); }

  /* ───────── sprites (imagens prontas) ───────── */
  spr(key, make) {
    let o = this.sprites.get(key);
    if (o) { this.sprites.delete(key); this.sprites.set(key, o); return o; }
    o = make(); this.sprites.set(key, o);
    if (this.sprites.size > MAX_SPR) this.sprites.delete(this.sprites.keys().next().value);
    return o;
  }
  markerSprite(type, visited, isSel, hidden, rDev) {
    const C = this.C;
    return this.spr(`m|${type}|${+visited}|${+isSel}|${+hidden}|${rDev}`, () => {
      const k = rDev / 7; const pad = Math.ceil(11 * k + 3); const size = pad * 2;
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, pad, pad); g.lineCap = 'round'; g.lineJoin = 'round';
      if (hidden) g.globalAlpha = 0.45;
      if (visited) { g.beginPath(); g.arc(0, 0, 9.5, 0, 7); g.strokeStyle = C.gold; g.lineWidth = 1.8; g.stroke(); }
      if (isSel) { g.beginPath(); g.arc(0, 0, 10.5, 0, 7); g.strokeStyle = C.blood; g.lineWidth = 2.2; g.stroke(); }
      const IP = iconPaths(); const I = IP[type] || IP.mar; const fg = type === 'cap' || type === 'cov' ? C.blood : C.ink;
      g.strokeStyle = C.halo; g.lineWidth = 3.6;
      (I.fill || []).forEach((q) => g.stroke(q)); (I.flame || []).forEach((q) => g.stroke(q)); (I.line || []).forEach((q) => g.stroke(q));
      g.fillStyle = fg; (I.fill || []).forEach((q) => g.fill(q));
      g.fillStyle = C.blood; (I.flame || []).forEach((q) => g.fill(q));
      g.fillStyle = C.halo; (I.hole || []).forEach((q) => g.fill(q));
      if (I.line) { g.strokeStyle = fg; g.lineWidth = 1.5; I.line.forEach((q) => g.stroke(q)); }
      if (hidden) {
        g.globalAlpha = 1; g.strokeStyle = C.ink; g.lineWidth = 1.2; g.setLineDash([2, 2]);
        g.beginPath(); g.arc(0, 0, 9.5, 0, 7); g.stroke();
      }
      return { c, half: pad };
    });
  }
  dotSprite(rDev) {
    const C = this.C;
    return this.spr(`d|${rDev}`, () => {
      const pad = Math.ceil(rDev + 2); const c = document.createElement('canvas'); c.width = c.height = pad * 2;
      const g = c.getContext('2d'); g.beginPath(); g.arc(pad, pad, rDev, 0, 7); g.fillStyle = C.ink; g.globalAlpha = 0.7; g.fill();
      g.globalAlpha = 1; g.lineWidth = 1; g.strokeStyle = C.halo; g.stroke();
      return { c, half: pad };
    });
  }
  textSprite(key, text, px, family, fill, alpha, halo, haloW, spacing) {
    return this.spr(key, () => {
      const font = `${family.startsWith('italic') ? 'italic ' : ''}${px}px ${family.replace(/^italic /, '')}`;
      const m = this.measure; m.font = font; if ('letterSpacing' in m) m.letterSpacing = spacing ? `${spacing}px` : '0px';
      const w = Math.ceil(m.measureText(text).width + haloW * 2 + 4); const h = Math.ceil(px * 1.5 + haloW * 2);
      const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
      const g = c.getContext('2d'); g.font = font; g.textBaseline = 'middle'; g.lineJoin = 'round';
      if ('letterSpacing' in g) g.letterSpacing = spacing ? `${spacing}px` : '0px';
      if (halo) { g.strokeStyle = halo; g.lineWidth = haloW; g.strokeText(text, haloW + 2, h / 2); }
      g.globalAlpha = alpha; g.fillStyle = fill; g.fillText(text, haloW + 2, h / 2);
      return { c, w, h, ox: haloW + 2 };
    });
  }
  partySprite(rDev) {
    const C = this.C;
    return this.spr(`party|${rDev}`, () => {
      const k = rDev / 12; const pad = Math.ceil(26 * k + 4); const c = document.createElement('canvas'); c.width = pad * 2; c.height = pad * 2;
      const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, pad, pad);
      g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fillStyle = 'rgba(140,29,24,.18)'; g.fill();
      g.lineWidth = 2.5; g.strokeStyle = C.blood; g.stroke();
      // estandarte
      g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(-2, 8); g.lineTo(-2, -20); g.stroke();
      g.fillStyle = C.blood; g.beginPath(); g.moveTo(-2, -20); g.lineTo(14, -15); g.lineTo(-2, -9); g.closePath(); g.fill();
      g.strokeStyle = C.gold; g.lineWidth = 1; g.stroke();
      return { c, half: pad };
    });
  }
  pinSprite(mine, rDev) {
    const C = this.C;
    return this.spr(`pin|${+mine}|${rDev}`, () => {
      const k = rDev / 10; const pad = Math.ceil(16 * k + 3); const c = document.createElement('canvas'); c.width = pad * 2; c.height = pad * 2;
      const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, pad, pad);
      g.fillStyle = mine ? C.gold : C.ink; g.strokeStyle = C.halo; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, 10); g.bezierCurveTo(-9, -1, -8, -12, 0, -12); g.bezierCurveTo(8, -12, 9, -1, 0, 10); g.closePath(); g.stroke(); g.fill();
      g.fillStyle = C.halo; g.beginPath(); g.arc(0, -4, 3, 0, 7); g.fill();
      return { c, half: pad };
    });
  }

  /* ───────── câmera ───────── */
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.vw = this.cv.clientWidth; this.vh = this.cv.clientHeight;
    this.cv.width = Math.max(1, Math.round(this.vw * this.dpr)); this.cv.height = Math.max(1, Math.round(this.vh * this.dpr));
  }
  req() { if (!this.pending && !this.destroyed) { this.pending = true; requestAnimationFrame(this.frame); } }
  clamp() {
    this.s = Math.max(this.s0 * 0.7, Math.min(this.s0 * ZMAX, this.s));
    const [cx, cy] = this.center();
    this.tx = Math.max(cx - W * this.s, Math.min(cx, this.tx));
    this.ty = Math.max(cy - H * this.s, Math.min(cy, this.ty));
  }
  fitScale() { const { left, bottom } = this.insets; return Math.min((this.vw - left) / W, (this.vh - bottom) / H) * 0.96; }
  fit() {
    if (!this.vw) return;
    const { left, bottom } = this.insets;
    this.s0 = this.s = this.fitScale();
    this.tx = left + (this.vw - left - W * this.s) / 2; this.ty = (this.vh - bottom - H * this.s) / 2;
    this.req();
  }
  zoomAt(px, py, f) {
    const r = this.cv.getBoundingClientRect(); const sx = px - r.left; const sy = py - r.top;
    const ux = (sx - this.tx) / this.s; const uy = (sy - this.ty) / this.s;
    this.s = Math.max(this.s0 * 0.7, Math.min(this.s0 * ZMAX, this.s * f));
    this.tx = sx - ux * this.s; this.ty = sy - uy * this.s;
    this.clamp(); this.req();
  }
  stopAnim() { if (this.anim) cancelAnimationFrame(this.anim); this.anim = 0; }
  animateTo(ts, ccx, ccy, cxp, cyp, dur) {
    this.stopAnim();
    if (this.reduce) { this.s = ts; this.tx = cxp - ccx * ts; this.ty = cyp - ccy * ts; this.clamp(); this.req(); return; }
    const fs = this.s; const fcx = (cxp - this.tx) / this.s; const fcy = (cyp - this.ty) / this.s; const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur); const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.s = fs * Math.pow(ts / fs, e);
      this.tx = cxp - (fcx + (ccx - fcx) * e) * this.s; this.ty = cyp - (fcy + (ccy - fcy) * e) * this.s;
      this.pending = false; this.frame();
      this.anim = t < 1 ? requestAnimationFrame(step) : 0;
    };
    this.anim = requestAnimationFrame(step);
  }
  center() { const { left, bottom } = this.insets; return [left + (this.vw - left) / 2, (this.vh - bottom) / 2]; }
  flyTo(x, y, z) { const [cx, cy] = this.center(); this.animateTo(this.s0 * z, x, y, cx, cy, 600); }
  zoomBy(f) {
    const [px, py] = this.center();
    this.animateTo(Math.max(this.s0 * 0.7, Math.min(this.s0 * ZMAX, this.s * f)), (px - this.tx) / this.s, (py - this.ty) / this.s, px, py, 260);
  }
  zoomFit() { const [cx, cy] = this.center(); this.animateTo(this.fitScale(), W / 2, H / 2, cx, cy, 500); }
  zoomLevel() { return this.s / this.s0; }
  toWorld(clientX, clientY) {
    const r = this.cv.getBoundingClientRect();
    return [(clientX - r.left - this.tx) / this.s, (clientY - r.top - this.ty) / this.s];
  }

  /* ───────── desenho ───────── */
  metrics() {
    const z = this.s / this.s0 / ZF; const mob = window.innerWidth <= 760;
    return {
      z, mob, major: (mob ? 4.2 : 5.6) * Math.pow(z, 0.42), minor: (mob ? 3.4 : 4.4) * Math.pow(z, 0.42),
      dot: Math.min(2.6, 1.1 * Math.pow(z, 0.5)), capF: 13.5 * Math.pow(z, 0.16), cityF: 12 * Math.pow(z, 0.16), smallF: 11 * Math.pow(z, 0.14),
    };
  }
  minorMode(z) { return z < 1.25 ? 'none' : z < 2.4 ? 'dot' : 'icon'; }
  isMinor(p) { return !p.major && this.sel !== p.id && !p.visited; }
  prio(p) { return this.sel === p.id ? 0 : p.type === 'cap' ? 1 : p.visited ? 2 : CITY.has(p.type) ? 3 : p.major ? 4 : 5; }
  wantsLabel(p, M) {
    if (this.sel === p.id || p.type === 'cap') return true;
    if (p.visited) return !M.mob || M.z >= 1.7;
    if (CITY.has(p.type)) return M.z >= 1.35;
    if (p.major) return M.z >= 2.2;
    return M.z >= 3.4;
  }

  frame() {
    this.pending = false;
    if (this.destroyed || !this.vw) return;
    const { ctx, C, G, dpr } = this;
    const { s, tx, ty, vw, vh } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.sea; ctx.fillRect(0, 0, this.cv.width, this.cv.height);
    const S = s * dpr;
    const L = Math.max(0, Math.min(MAXL, Math.ceil(Math.log2(S / BASE) - 1e-6)));
    const sL = BASE * 2 ** L; const u = TS / sL;
    const ux0 = -tx / s; const uy0 = -ty / s; const ux1 = (vw - tx) / s; const uy1 = (vh - ty) / s;
    const nx = Math.ceil((EXT_W * sL) / TS); const ny = Math.ceil((EXT_H * sL) / TS);
    const ix0 = Math.max(0, Math.floor((ux0 - OX) / u)); const ix1 = Math.min(nx - 1, Math.floor((ux1 - OX) / u));
    const iy0 = Math.max(0, Math.floor((uy0 - OY) / u)); const iy1 = Math.min(ny - 1, Math.floor((uy1 - OY) / u));
    const nowF = performance.now(); const moving = nowF - this.lastF < 110; this.lastF = nowF;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = moving ? 'low' : 'high';
    if (moving) { clearTimeout(this.settleT); this.settleT = setTimeout(() => this.req(), 160); }
    const want = [];
    for (let y = 0; y < this.L0N[1]; y++) for (let x = 0; x < this.L0N[0]; x++) {
      const t = this.tiles.get(`0/${x}/${y}`); if (!t || t.v !== this.version) want.push({ key: `0/${x}/${y}`, L: 0, x, y, d: -1 });
    }
    const cxT = ((ux0 + ux1) / 2 - OX) / u; const cyT = ((uy0 + uy1) / 2 - OY) / u;
    for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) {
      const x0 = OX + x * u; const y0 = OY + y * u;
      const dx0 = Math.round((tx + x0 * s) * dpr); const dy0 = Math.round((ty + y0 * s) * dpr);
      const dx1 = Math.round((tx + (x0 + u) * s) * dpr); const dy1 = Math.round((ty + (y0 + u) * s) * dpr);
      const t = this.getTile(L, x, y);
      if (L > 0 && (!t || t.v !== this.version)) want.push({ key: `${L}/${x}/${y}`, L, x, y, d: (x - cxT) ** 2 + (y - cyT) ** 2 });
      if (t) { ctx.drawImage(t.img, dx0, dy0, dx1 - dx0, dy1 - dy0); continue; }
      for (let A = L - 1; A >= 0; A--) {
        const f = 2 ** (L - A); const px = Math.floor(x / f); const py = Math.floor(y / f); const pt = this.getTile(A, px, py);
        if (pt) { const sub = TS / f; ctx.drawImage(pt.img, (x - px * f) * sub, (y - py * f) * sub, sub, sub, dx0, dy0, dx1 - dx0, dy1 - dy0); break; }
      }
    }
    if (this.layers.route) {
      ctx.setTransform(S, 0, 0, S, tx * dpr, ty * dpr);
      ctx.strokeStyle = C.blood; ctx.lineWidth = 5.6; ctx.lineCap = 'round'; ctx.setLineDash([16, 11]); ctx.stroke(this.routeP); ctx.setLineDash([]);
      if (this.mode === 'route' && this.route) {
        ctx.fillStyle = C.blood;
        for (const [x, y] of this.route) { ctx.beginPath(); ctx.arc(x, y, 7 / s, 0, 7); ctx.fill(); }
      }
    }
    const lv = 2 ** Math.ceil(Math.log2(Math.max(S, 0.05)));
    for (const [name, x, y, rot, size] of G.reglabels) {
      const l2 = Math.min(lv, 2 ** Math.floor(Math.log2(420 / size)));
      const sp = this.textSprite(`r|${name}|${l2}`, name, size * l2, SC, C.ink, 0.72, C.halo, 5 * l2, size * l2 * 0.14);
      this.drawRotated(sp, x, y, rot, S / l2);
    }
    for (const [name, x, y, rot, size] of G.oceans) {
      const l2 = Math.min(lv, 2 ** Math.floor(Math.log2(420 / size)));
      const sp = this.textSprite(`o|${name}|${l2}`, name, size * l2, `italic ${SERIF}`, C.ocean, 1, null, 0, size * l2 * 0.2);
      this.drawRotated(sp, x, y, rot, S / l2);
    }
    this.drawCompass(S * 4, Math.min(lv * 4, 8));

    // marcadores e nomes
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const M = this.metrics(); const vis = [];
    for (const p of this.places) {
      if (this.shownIds && !this.shownIds.has(p.id)) continue;
      const sx = tx + p.x * s; const sy = ty + p.y * s;
      if (sx < -260 || sy < -40 || sx > vw + 40 || sy > vh + 40) continue;
      vis.push([p, sx, sy, this.prio(p), 0]);
    }
    vis.sort((a, b) => b[3] - a[3]);
    const mm = this.minorMode(M.z);
    for (const v of vis) {
      const [p, sx, sy] = v;
      if (this.isMinor(p)) {
        if (mm === 'none') { v[4] = 0; continue; }
        if (mm === 'dot') { const rd = q2(M.dot * dpr); const sp = this.dotSprite(rd); ctx.drawImage(sp.c, sx * dpr - sp.half, sy * dpr - sp.half); v[4] = M.dot; continue; }
      }
      const base = p.major || this.sel === p.id || p.visited ? M.major : M.minor;
      const r = (p.type === 'cap' ? base * 1.3 : base) * dpr; const rq = q2(r);
      const sp = this.markerSprite(p.type, p.visited, this.sel === p.id, p.hidden, rq); const k = r / rq;
      ctx.drawImage(sp.c, sx * dpr - sp.half * k, sy * dpr - sp.half * k, sp.c.width * k, sp.c.height * k);
      v[4] = r / dpr;
    }
    const placed = [];
    for (let i = vis.length - 1; i >= 0; i--) {
      const [p, sx, sy, pr] = vis[i];
      if (!this.wantsLabel(p, M)) continue;
      if (this.isMinor(p) && mm === 'none') continue;
      const r = (vis[i][4] || M.minor) * 1.1;
      const fx = (p.type === 'cap' ? M.capF : CITY.has(p.type) ? M.cityF : M.smallF) * dpr; const f = q2(fx); const k = fx / f;
      const sp = this.textSprite(`l|${p.id}|${p.name}|${f}|${+!!p.hidden}`, p.name, f, p.type === 'cap' ? SC : SERIF, C.ink, p.hidden ? 0.5 : 1, C.halo, 3.5 * dpr, 0);
      const w = sp.w * k; const h = sp.h * k; const ox = sp.ox * k;
      const lx = (sx + r + 3) * dpr - ox; const ly = sy * dpr - h / 2;
      const box = [lx + ox, ly + h * 0.22, lx + w - ox, ly + h * 0.78];
      if (pr > 1 && placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      placed.push(box);
      if (k > 0.999 && k < 1.001) ctx.drawImage(sp.c, Math.round(lx), Math.round(ly)); else ctx.drawImage(sp.c, lx, ly, w, h);
    }

    // alfinetes
    const pr = q2(Math.max(8, M.major * 1.6) * dpr);
    for (const pin of this.pins) {
      const sx = tx + pin.x * s; const sy = ty + pin.y * s;
      if (sx < -30 || sy < -30 || sx > vw + 30 || sy > vh + 30) continue;
      const sp = this.pinSprite(pin.mine, pr);
      ctx.drawImage(sp.c, sx * dpr - sp.half, sy * dpr - sp.half * 1.6);
    }
    // grupo
    if (this.party) {
      const sp = this.partySprite(q2(Math.max(10, M.major * 2.2) * dpr));
      ctx.drawImage(sp.c, (tx + this.party.x * s) * dpr - sp.half, (ty + this.party.y * s) * dpr - sp.half);
    }

    want.sort((a, b) => a.d - b.d);
    this.wanted = want.length ? want : this.prefetchList(L, ix0, ix1, iy0, iy1);
    this.feed();
    this.opts.onView?.(this.s / this.s0);
  }
  drawRotated(sp, x, y, rot, k) {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, (this.tx + x * this.s) * this.dpr, (this.ty + y * this.s) * this.dpr);
    ctx.rotate((rot * Math.PI) / 180); ctx.scale(k, k);
    ctx.drawImage(sp.c, -sp.w / 2, -sp.h * 0.62);
  }
  drawCompass(S, lv) {
    const { C, ctx } = this;
    const sp = this.spr(`compass|${lv}`, () => {
      const size = Math.ceil(280 * lv);
      const c = document.createElement('canvas'); c.width = c.height = Math.max(1, size);
      const g = c.getContext('2d'); g.setTransform(lv, 0, 0, lv, size / 2, size / 2);
      g.strokeStyle = C.ink; g.globalAlpha = 0.7; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 62, 0, 7); g.stroke();
      g.lineWidth = 0.8; g.beginPath(); g.arc(0, 0, 48, 0, 7); g.stroke(); g.globalAlpha = 1;
      const dark = new Path2D('M0,-78 L9,-9 L0,0 Z'); const light = new Path2D('M0,-78 L-9,-9 L0,0 Z');
      for (let i = 0; i < 4; i++) { g.fillStyle = C.ink; g.fill(dark); g.fillStyle = C.land; g.fill(light); g.lineWidth = 1; g.strokeStyle = C.ink; g.stroke(light); g.rotate(Math.PI / 2); }
      g.save(); g.rotate(Math.PI / 4); const st = new Path2D('M0,-40 L5,-5 L40,0 L5,5 L0,40 L-5,5 L-40,0 L-5,-5 Z'); g.fillStyle = C.land; g.fill(st); g.stroke(st); g.restore();
      g.fillStyle = C.ink; g.textAlign = 'center'; g.font = `26px ${SC}`; g.fillText('N', 0, -88);
      g.translate(-75, 120); g.lineWidth = 2; g.beginPath();
      g.moveTo(0, 0); g.lineTo(150, 0); g.moveTo(0, -6); g.lineTo(0, 6); g.moveTo(75, -4); g.lineTo(75, 4); g.moveTo(150, -6); g.lineTo(150, 6); g.stroke();
      g.font = `italic 18px ${SERIF}`; g.fillText('100 léguas', 75, 26);
      return { c, w: size, h: size };
    });
    const [cx, cy] = this.G.compass; const k = S / lv;
    ctx.setTransform(k, 0, 0, k, (this.tx + cx * this.s) * this.dpr - (sp.w * k) / 2, (this.ty + cy * this.s) * this.dpr - (sp.h * k) / 2);
    ctx.drawImage(sp.c, 0, 0);
  }
  prefetchList(L, ix0, ix1, iy0, iy1) {
    if (L >= MAXL) return [];
    const out = [];
    for (let y = iy0 * 2; y <= iy1 * 2 + 1; y++) for (let x = ix0 * 2; x <= ix1 * 2 + 1; x++) {
      const t = this.tiles.get(`${L + 1}/${x}/${y}`); if (!t || t.v !== this.version) out.push({ key: `${L + 1}/${x}/${y}`, L: L + 1, x, y, d: 0 });
    }
    return out.length <= 64 ? out : [];
  }

  /* ───────── gestos ───────── */
  hitTest(cx, cy) {
    const r = this.cv.getBoundingClientRect(); const x = cx - r.left; const y = cy - r.top;
    const M = this.metrics(); const mm = this.minorMode(M.z);
    let best = null; let bd = Infinity;
    for (const p of this.places) {
      if (this.shownIds && !this.shownIds.has(p.id)) continue;
      const minor = this.isMinor(p);
      if (minor && mm === 'none') continue;
      const rad = (minor ? (mm === 'dot' ? 6 : M.minor) : p.type === 'cap' ? M.major * 1.3 : M.major) + 5;
      const d = Math.hypot(this.tx + p.x * this.s - x, this.ty + p.y * this.s - y);
      if (d <= rad && d < bd) { bd = d; best = p; }
    }
    return best;
  }
  hitPin(cx, cy) {
    const r = this.cv.getBoundingClientRect(); const x = cx - r.left; const y = cy - r.top;
    for (const pin of this.pins) {
      const d = Math.hypot(this.tx + pin.x * this.s - x, this.ty + pin.y * this.s - y - 10);
      if (d < 14) return pin;
    }
    return null;
  }
  bindGestures() {
    const cv = this.cv;
    const pts = new Map(); let moved = 0; let last = null; let pinch = null; let hist = []; let drag = null;
    cv.style.touchAction = 'none';
    this.onDown = (ev) => {
      this.stopAnim();
      cv.setPointerCapture(ev.pointerId); pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      moved = 0; last = { x: ev.clientX, y: ev.clientY }; hist = [{ x: ev.clientX, y: ev.clientY, t: performance.now() }];
      drag = null;
      if (pts.size === 1 && this.mode === 'move') {
        const p = this.hitTest(ev.clientX, ev.clientY);
        if (p) { drag = { p, ox: p.x, oy: p.y }; this.sel = p.id; cv.style.cursor = 'grabbing'; this.req(); }
      }
      if (pts.size === 2) { drag = null; const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); last = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    };
    this.onMove = (ev) => {
      if (!pts.has(ev.pointerId)) {
        if (ev.pointerType === 'mouse' && !this.hoverRaf) {
          this.hoverRaf = requestAnimationFrame(() => {
            this.hoverRaf = 0;
            if (this.mode === 'view' || this.mode === 'move') {
              const hit = this.hitTest(ev.clientX, ev.clientY);
              cv.style.cursor = hit ? (this.mode === 'move' ? 'grab' : 'pointer') : this.mode === 'move' ? 'grab' : '';
            }
          });
        }
        return;
      }
      pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
        if (pinch) { this.tx += mx - last.x; this.ty += my - last.y; this.zoomAt(mx, my, d / pinch); moved += 10; }
        pinch = d; last = { x: mx, y: my }; hist = []; return;
      }
      const dx = ev.clientX - last.x; const dy = ev.clientY - last.y;
      moved += Math.abs(dx) + Math.abs(dy);
      last = { x: ev.clientX, y: ev.clientY };
      if (drag) {
        const [wx, wy] = this.toWorld(ev.clientX, ev.clientY);
        drag.p.x = Math.round(wx); drag.p.y = Math.round(wy);
        this.req(); return;
      }
      this.tx += dx; this.ty += dy;
      const now = performance.now(); hist.push({ x: ev.clientX, y: ev.clientY, t: now }); while (hist.length > 2 && now - hist[0].t > 90) hist.shift();
      this.clamp(); this.req();
    };
    this.onUp = (ev) => {
      const wasPinch = pts.size === 2;
      pts.delete(ev.pointerId); if (pts.size < 2) pinch = null;
      if (pts.size === 1) { last = [...pts.values()][0]; hist = []; }
      if (pts.size) return;
      if (drag) {
        const d = drag; drag = null; this.setMode(this.mode);
        if (moved >= 4 && (d.p.x !== d.ox || d.p.y !== d.oy)) this.opts.onPlaceMove?.(d.p.id, d.p.x, d.p.y);
        else this.opts.onSelect?.(d.p.id);
        return;
      }
      if (moved < 6 && ev.type === 'pointerup') {
        const [wx, wy] = this.toWorld(ev.clientX, ev.clientY);
        if (this.mode === 'view' || this.mode === 'move') {
          const pin = this.hitPin(ev.clientX, ev.clientY);
          if (pin) { this.opts.onPin?.(pin); return; }
          const p = this.hitTest(ev.clientX, ev.clientY);
          this.opts.onSelect?.(p ? p.id : null);
        } else {
          this.opts.onTap?.(this.mode, Math.round(wx), Math.round(wy));
        }
      } else if (ev.type === 'pointerup' && !wasPinch) this.fling(hist);
    };
    this.onWheel = (ev) => {
      ev.preventDefault(); this.stopAnim();
      const dy = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY;
      this.zoomAt(ev.clientX, ev.clientY, Math.exp(-dy * (ev.ctrlKey ? 0.01 : 0.0016)));
    };
    this.onDbl = (ev) => {
      if (this.mode !== 'view') return;
      const r = cv.getBoundingClientRect(); const px = ev.clientX - r.left; const py = ev.clientY - r.top;
      this.animateTo(Math.min(this.s0 * ZMAX, this.s * 2), (px - this.tx) / this.s, (py - this.ty) / this.s, px, py, 300);
    };
    this.onKey = (ev) => {
      const k = ev.key; const st = 90;
      if (k === '+' || k === '=') return this.zoomBy(1.5);
      if (k === '-' || k === '_') return this.zoomBy(1 / 1.5);
      if (k === 'ArrowLeft') this.tx += st; else if (k === 'ArrowRight') this.tx -= st;
      else if (k === 'ArrowUp') this.ty += st; else if (k === 'ArrowDown') this.ty -= st; else return;
      ev.preventDefault(); this.clamp(); this.req();
    };
    cv.tabIndex = 0;
    cv.addEventListener('pointerdown', this.onDown);
    cv.addEventListener('pointermove', this.onMove);
    cv.addEventListener('pointerup', this.onUp);
    cv.addEventListener('pointercancel', this.onUp);
    cv.addEventListener('wheel', this.onWheel, { passive: false });
    cv.addEventListener('dblclick', this.onDbl);
    cv.addEventListener('keydown', this.onKey);
  }
  fling(hist) {
    if (this.reduce || hist.length < 2) return;
    const a = hist[0]; const b = hist[hist.length - 1]; const dt = b.t - a.t;
    if (dt <= 0 || performance.now() - b.t > 60) return;
    let vx = (b.x - a.x) / dt; let vy = (b.y - a.y) / dt;
    if (Math.hypot(vx, vy) < 0.25) return;
    let lt = performance.now();
    const step = (now) => {
      const d = Math.min(40, now - lt); lt = now;
      this.tx += vx * d; this.ty += vy * d; const f = Math.pow(0.994, d); vx *= f; vy *= f;
      this.clamp(); this.pending = false; this.frame();
      this.anim = Math.hypot(vx, vy) > 0.02 ? requestAnimationFrame(step) : 0;
    };
    this.anim = requestAnimationFrame(step);
  }

  destroy() {
    this.destroyed = true;
    this.stopAnim();
    this.ro.disconnect();
    clearTimeout(this.settleT);
    const cv = this.cv;
    cv.removeEventListener('pointerdown', this.onDown);
    cv.removeEventListener('pointermove', this.onMove);
    cv.removeEventListener('pointerup', this.onUp);
    cv.removeEventListener('pointercancel', this.onUp);
    cv.removeEventListener('wheel', this.onWheel);
    cv.removeEventListener('dblclick', this.onDbl);
    cv.removeEventListener('keydown', this.onKey);
    this.worker?.terminate();
    for (const t of this.tiles.values()) t.img.close?.();
    this.tiles.clear();
    this.sprites.clear();
  }
}

let ICON_P = null;
/** Path2D dos ícones, criados só na primeira vez (fora do navegador não existe Path2D). */
function iconPaths() {
  if (!ICON_P) {
    ICON_P = {};
    for (const [t, parts] of Object.entries(ICONS)) {
      ICON_P[t] = {};
      for (const [k, arr] of Object.entries(parts)) ICON_P[t][k] = arr.map((d) => new Path2D(d));
    }
  }
  return ICON_P;
}
