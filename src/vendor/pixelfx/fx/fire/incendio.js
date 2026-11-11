// Incêndio de terreno: uma casa do mapa em chamas, feita para ser repetida lado a lado.
// Escrito para o Peste do Juramento sobre as peças de fogo do pixelfx (./_lib.js: língua, labareda, brasa e
// fumaça adaptadas do fogo aberto do Sprite Fusion, MIT License, Copyright (c) 2026 Hugo Duprez).
//
// Duas versões (o.view):
//   "iso"  — a casa é um losango 2:1 (40 x 20 px), para mapas isométricos;
//   "reta" — a casa é um quadrado (40 x 40 px), para mapas vistos de cima.
// o.mask diz quais vizinhas também queimam (bits: 1 = c+1, 2 = c-1, 4 = r+1, 8 = r-1). Na borda com uma vizinha
// em chamas o fogo vai até o limite da casa (as duas se emendam); nas bordas livres ele recua, irregular e baixo.
import { fit, hex, rand, rng, clamp, mix, WHITE } from "../../core/index.js";
import { noiseFor, hotFirst, flameTongue, looped, ember, smokePuff, drift, lick, LAYERS, BACK_LAYERS, BIG_LAYERS } from "./_lib.js";

export const meta = {
  name: "Ground fire",
  desc: "One map tile on fire, built to tile: a bed of coals and a crowd of tongues that reach the tile's edge where the neighbour burns too and die down ragged where it doesn't. Isometric (diamond) and straight (square) versions.",
  tags: ["fire", "ground", "tile", "terrain", "isometric", "top-down", "loop"],
  size: [76, 84],
  origin: [38, 60],
  duration: 2,
  loop: true,
  fps: 20,
  bg: "ground",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    view: "iso",
    mask: 0,
    seed: 5,
  },
};

const D = meta.duration, NL = noiseFor(D), TW = 40;
const CHAR = [hex("#0c0707"), hex("#1c0e0b"), hex("#2e1510")], SMOKE1 = hex("#5b5566");

// casa (u, v em -0.5..0.5, eixos da grade) <-> tela (px a partir do centro da casa)
const toScreen = (iso, u, v) => (iso ? [(u - v) * (TW / 2), (u + v) * (TW / 4)] : [u * TW, v * TW]);
const toCell = (iso, x, y) => (iso ? [(x / (TW / 2) + y / (TW / 4)) / 2, (y / (TW / 4) - x / (TW / 2)) / 2] : [x / TW, y / TW]);

/**
 * Quão dentro do fogo está o ponto (u, v): distância (em casas) até a borda livre mais próxima, com os cantos
 * livres arredondados. Bordas com vizinha em chamas não contam (o fogo passa direto). Infinity = sem borda livre.
 */
function inside(u, v, mask) {
  const dc1 = mask & 1 ? 9 : 0.5 - u, dc0 = mask & 2 ? 9 : 0.5 + u, dr1 = mask & 4 ? 9 : 0.5 - v, dr0 = mask & 8 ? 9 : 0.5 + v;
  const du = Math.min(dc1, dc0), dv = Math.min(dr1, dr0);
  if (du > 8 && dv > 8) return Infinity;
  const R = 0.32;
  if (du < R && dv < R) return R - Math.hypot(R - du, R - dv);
  return Math.min(du, dv);
}

// o leito: chão carbonizado com brasas que respiram; borda livre roída, borda com vizinha reta até o limite
function bed(p, H, t, S, iso, mask) {
  const hx = TW / 2 + 1, hy = (iso ? TW / 4 : TW / 2) + 1;
  p.shade(-hx, -hy, hx, hy, (x, y, out) => {
    const [u, v] = toCell(iso, x, y);
    // meio pixel de sobra nas bordas emendadas, para não aparecer fresta entre duas casas
    if (Math.abs(u) > 0.5 + 0.02 || Math.abs(v) > 0.5 + 0.02) return;
    const d = inside(u, v, mask);
    const rag = 0.07 + 0.07 * rand(Math.floor(x / 2), Math.floor(y / 2), S + 3);
    if (d < rag) return;
    const h = rand(Math.floor(x / 2), Math.floor(y), S + 20), edge = d < rag + 0.07;
    if (!edge && h > 0.6) {
      // brasas: a maioria escura, algumas acendem e apagam
      const g = 0.5 + 0.5 * Math.sin((t / D) * Math.PI * 4 + h * 40);
      out.k = 0.22 * g;
      return g > 0.8 ? H[4] : g > 0.5 ? H[5] : g > 0.25 ? H[6] : H[7];
    }
    return edge ? CHAR[h < 0.5 ? 0 : 1] : h > 0.22 ? CHAR[1] : CHAR[2];
  });
}

export function draw(p, t, o) {
  const F = fit(o.palette, 9), H = hotFirst(F), S = o.seed, iso = o.view !== "reta", mask = o.mask | 0;
  const N = (rate, seed = 0, off = 0) => NL(t, rate, seed, off);
  const fla = (tt) => 0.74 + 0.16 * NL(tt, 7.3, S + 1) + 0.1 * NL(tt, 19, S + 2), fl = fla(t);
  const lean = (tt) => NL(tt, 0.67, S + 90) * 0.1;
  const EMB = [H[1], H[2], H[4], H[6]], SMOKE = mix(SMOKE1, H[6], 0.25), GLOW = mix(mix(H[3], H[4], 0.5), WHITE, 0.2);

  // as línguas: uma grade G x G com as posições sacudidas; perto de borda livre ficam baixas ou somem.
  // O quadrado tem o dobro da área do losango na tela, então leva mais línguas (e mais desencontradas).
  const G = iso ? 3 : 4, JIT = iso ? 0.11 : 0.13;
  const R = rng(S, 77), T = [];
  for (let j = 0; j < G; j++)
    for (let i = 0; i < G; i++) {
      // linhas alternadas deslocadas meia casa: quebra as colunas
      const off = !iso && j % 2 ? 0.5 / G : 0;
      const u = clamp((i + 0.5) / G - 0.5 + off + R.range(-JIT, JIT), -0.49, 0.49), v = (j + 0.5) / G - 0.5 + R.range(-JIT, JIT);
      const d = inside(u, v, mask), k = d === Infinity ? 1 : clamp((d - 0.06) / 0.26);
      const hh = iso ? R.range(13, 22) : R.range(12, 20), ww = R.range(3.1, 4.6), n = (S * 7 + i + j * G) * 13;
      if (k <= 0.05) continue;
      const [x, y] = toScreen(iso, u, v);
      T.push({ x, y, h: hh * (0.45 + 0.55 * k), w: ww * (0.7 + 0.3 * k), n, depth: iso ? u + v : v });
    }
  T.sort((a, b) => a.depth - b.depth);
  const back = T.length ? T[0].depth + (T[T.length - 1].depth - T[0].depth) * 0.4 : 0;
  const height = (q, tt) => {
    const leap = Math.max(0, NL(tt, 2.6, q.n + 70) - 0.55) * 1.3;
    return (q.h + 0.25 * q.h * NL(tt, 3.3, q.n) + q.h * leap) * (0.9 + 0.1 * fla(tt));
  };
  const sweep = (q, tt, h) => NL(tt, 2.2, q.n + 40) * (1 + h * 0.08) + lean(tt) * h * 0.9;
  const tip = (q, tt) => {
    const h = height(q, tt);
    return [q.x + sweep(q, tt, h) * 0.85, q.y - h * 0.88 + 3];
  };

  bed(p, H, t, S, iso, mask);
  if (!T.length) return;

  // fumaça: poucas baforadas escuras saindo de cima das chamas
  looped(t, D, 5, S + 300, (r) => ({ q: T[r.int(0, T.length - 1)], vx: r.range(-2, 2), vy: -r.range(9, 14), life: r.range(0.9, 1.4), s: r.range(1.6, 2.4) }), (q, age) => {
    const [x, y] = drift(q.q.x, q.q.y - q.q.h * 0.9, q.vx, q.vy, age, 2, -14, 1.6, 1);
    smokePuff(p, x + NL(t - age, 0.8, S + 60) * (1 + 2 * age), Math.max(y, -52), 1 - age / q.life, q.s, SMOKE, false, 0.8);
  });

  // as chamas, de trás para a frente (as de trás um tom mais frias)
  for (const q of T) {
    const h = height(q, t);
    flameTongue(p, q.x, q.y, h, q.w, sweep(q, t, h), N, q.n, H, q.depth < back ? BACK_LAYERS : q.w > 4 ? BIG_LAYERS : LAYERS, 0.5, 1.1 + h * 0.04);
  }

  // labaredas soltas das pontas
  looped(t, D, T.length * 3, S + 220, (r, j) => ({ q: T[j % T.length], vx: r.range(-3, 3), vy: -r.range(11, 20), s: r.range(0.9, 1.5), life: 0.26 }), (q, age) => {
    const [tx, ty] = tip(q.q, t - age);
    lick(p, tx + q.vx * age, ty - 2 + q.vy * age, 1 - age / q.life, q.s, H);
  });

  // brasas subindo com o calor
  looped(t, D, 7, S + 500, (r) => ({ q: T[r.int(0, T.length - 1)], ox: r.range(-4, 4), vx: r.range(-10, 10), vy: -r.range(20, 38), life: r.range(0.8, 1.5), s: r.chance(0.15) ? 2 : r.range(1, 1.6), a: r.range(0, 6.3) }), (q, age) => {
    const [x, y] = drift(q.q.x + q.ox, q.q.y - q.q.h * 0.5, q.vx, q.vy, age, 0, -26, 1.6, 1.6);
    if (y > -54) ember(p, x + 4 * (Math.sin(age * 2.3 + q.a) - Math.sin(q.a)), y, 1 - age / q.life, q.s, EMB, age * 40 + q.a);
  });

  // luz: um clarão quente sobre as chamas e um coração aceso no chão
  const cy = iso ? 0 : -2;
  p.glow(0, cy - 9, 26, GLOW, 0.2 * fl);
  p.glow(0, cy - 3, 13, H[2], 0.16 * fl);
}
