// @ts-nocheck
/**
 * Desenhista dos ladrilhos (tiles) do continente de Aldrenor.
 * Portado do mapa original (Aldrenor — Mapa do Continente). Roda num Web Worker
 * (tileWorker.js) e, se o navegador não suportar, na tela principal em fatias.
 * Sem acesso ao DOM: só OffscreenCanvas/Path2D.
 */
export function createTileRenderer() {
  const SYM_DEF = {
    mtn:  [["fill","M-14,7 L-3,-11 L1,-4 L5,-9 L15,7 Z"],["shade","M-3,-11 L1,-4 L-1,7 L-7,7 Z"],["ink","M-14,7 L-3,-11 L1,-4 L5,-9 L15,7"]],
    snow: [["fill","M-14,7 L-3,-11 L1,-4 L5,-9 L15,7 Z"],["shade","M-3,-11 L1,-4 L-1,7 L-7,7 Z"],["snow","M-3,-11 L-7,-4 L-4,-5 L-2,-3 L0,-6 Z"],["ink","M-14,7 L-3,-11 L1,-4 L5,-9 L15,7"]],
    tree: [["tree","M0,-10 C6,-10 8,-3 5,1 C3,3 -3,3 -5,1 C-8,-3 -6,-10 0,-10 Z"],["ink","M0,2 V6"]],
    swamp:[["thin","M-6,2 V-3 M-3,2 V-6 M0,2 V-4 M3,2 V-7 M6,2 V-3 M-9,5 H-2 M2,6 H9"]],
    grass:[["thin","M-4,2 L-6,-3 M0,2 L0,-5 M4,2 L6,-3"]],
    dune: [["thin","M-11,3 Q-3,-6 4,1 Q7,3 11,3 M-4,6 Q0,3 4,6"]],
    hill: [["fill","M-10,5 Q-4,-7 2,5 Z"],["ink","M-10,5 Q-4,-7 2,5 M0,5 Q5,-2 10,5"]],
    field:[["hair","M-8,-3 L8,-3 M-8,0 L8,0 M-8,3 L8,3"]],
    mist: [["faint","M-10,0 Q-6,-4 -2,0 T6,0 M-6,5 Q-3,2 0,5 T6,5"]],
    ash:  [["thin","M-8,-1 L-3,2 L1,-3 L8,1 M-3,2 L-2,7"],["dot","M6.2,5 A1.2,1.2 0 1,1 3.8,5 A1.2,1.2 0 1,1 6.2,5 Z"]],
  };
  let D = null, C = null, K = null;
  const BUCKET = 100, GB = 1024;
  // ---- geometria cortada em pedaços com caixa: cada tile só mexe no que está perto dele ----
  function parseSegs(d){
    const out = []; let cur = null, cx = 0, cy = 0, sx = 0, sy = 0;
    const re = /([MLQCZ])([^MLQCZ]*)/g; let m;
    while ((m = re.exec(d))){
      const c = m[1], t = m[2].trim(), v = t ? t.split(/[\s,]+/).map(Number) : [];
      if (c === "M"){ cx = sx = v[0]; cy = sy = v[1]; cur = {x0:cx, y0:cy, segs:[]}; out.push(cur);
        for (let i = 2; i < v.length; i += 2){ cur.segs.push(["L", v[i], v[i+1]]); cx = v[i]; cy = v[i+1]; } }
      else if (c === "L"){ for (let i = 0; i < v.length; i += 2){ cur.segs.push(["L", v[i], v[i+1]]); cx = v[i]; cy = v[i+1]; } }
      else if (c === "Q"){ for (let i = 0; i < v.length; i += 4){ cur.segs.push(["Q", v[i], v[i+1], v[i+2], v[i+3]]); cx = v[i+2]; cy = v[i+3]; } }
      else if (c === "C"){ for (let i = 0; i < v.length; i += 6){ cur.segs.push(["C", v[i], v[i+1], v[i+2], v[i+3], v[i+4], v[i+5]]); cx = v[i+4]; cy = v[i+5]; } }
      else if (c === "Z" && cur){ if (cx !== sx || cy !== sy) cur.segs.push(["L", sx, sy]); cx = sx; cy = sy; }
    }
    return out;
  }
  function segLen(k, x, y, v){
    if (k === "L") return Math.hypot(v[0] - x, v[1] - y);
    let L = 0, px = x, py = y;
    for (let i = 1; i <= 8; i++){
      const t = i / 8, u = 1 - t; let qx, qy;
      if (k === "Q"){ qx = u*u*x + 2*u*t*v[0] + t*t*v[2]; qy = u*u*y + 2*u*t*v[1] + t*t*v[3]; }
      else { qx = u*u*u*x + 3*u*u*t*v[0] + 3*u*t*t*v[2] + t*t*t*v[4]; qy = u*u*u*y + 3*u*u*t*v[1] + 3*u*t*t*v[3] + t*t*t*v[5]; }
      L += Math.hypot(qx - px, qy - py); px = qx; py = qy;
    }
    return L;
  }
  function chunked(ds, N){
    const list = [];
    for (const d of ds) for (const sp of parseSegs(d)){
      let px = sp.x0, py = sp.y0, len = 0;
      for (let i = 0; i < sp.segs.length; i += N){
        const p = new Path2D(); p.moveTo(px, py);
        let a = px, b = py, c = px, e = py; const off = len;
        for (const s of sp.segs.slice(i, i + N)){
          const k = s[0], v = s.slice(1);
          if (k === "L") p.lineTo(v[0], v[1]); else if (k === "Q") p.quadraticCurveTo(v[0], v[1], v[2], v[3]); else p.bezierCurveTo(v[0], v[1], v[2], v[3], v[4], v[5]);
          for (let j = 0; j < v.length; j += 2){ if (v[j] < a) a = v[j]; if (v[j] > c) c = v[j]; if (v[j+1] < b) b = v[j+1]; if (v[j+1] > e) e = v[j+1]; }
          len += segLen(k, px, py, v); px = v[v.length - 2]; py = v[v.length - 1];
        }
        list.push({p, a, b, c, e, off});
      }
    }
    const grid = new Map();
    list.forEach((ch, n) => {
      for (let j = Math.floor(ch.b / GB); j <= Math.floor(ch.e / GB); j++)
        for (let i = Math.floor(ch.a / GB); i <= Math.floor(ch.c / GB); i++){ const k = i + "," + j; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(n); }
    });
    return {list, grid};
  }
  function near(ix, ax, ay, bx, by, m){
    const seen = new Set(), out = [];
    for (let j = Math.floor((ay - m) / GB); j <= Math.floor((by + m) / GB); j++)
      for (let i = Math.floor((ax - m) / GB); i <= Math.floor((bx + m) / GB); i++){
        const b = ix.grid.get(i + "," + j); if (!b) continue;
        for (const n of b){ if (seen.has(n)) continue; seen.add(n); const ch = ix.list[n];
          if (ch.c >= ax - m && ch.a <= bx + m && ch.e >= ay - m && ch.b <= by + m) out.push(ch); }
      }
    out.sort((p, q) => p.off - q.off);
    return out;
  }
  // ---- polígonos (terra e reinos) em vários níveis de detalhe, recortados no tile ----
  const LOD = [32, 16, 8, 4, 2, 1, 0.5, 0];
  function polyRings(ds){
    const out = [];
    for (const d of ds) for (const sp of parseSegs(d)){
      const pts = [sp.x0, sp.y0]; for (const s of sp.segs) pts.push(s[s.length - 2], s[s.length - 1]);
      let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity;
      for (let i = 0; i < pts.length; i += 2){ a = Math.min(a, pts[i]); c = Math.max(c, pts[i]); b = Math.min(b, pts[i+1]); e = Math.max(e, pts[i+1]); }
      const lods = LOD.map(tol => {
        if (!tol) return Float64Array.from(pts);
        const o = [pts[0], pts[1]]; let lx = pts[0], ly = pts[1];
        for (let i = 2; i < pts.length; i += 2){ if (Math.abs(pts[i] - lx) + Math.abs(pts[i+1] - ly) >= tol){ o.push(pts[i], pts[i+1]); lx = pts[i]; ly = pts[i+1]; } }
        return Float64Array.from(o);
      });
      out.push({a, b, c, e, lods});
    }
    return out;
  }
  function ringLods(r){
    const pts = r.pts;
    const lods = LOD.map(tol => {
      if (!tol) return pts;
      const o = [pts[0], pts[1]]; let lx = pts[0], ly = pts[1];
      for (let i = 2; i < pts.length; i += 2){ if (Math.abs(pts[i] - lx) + Math.abs(pts[i+1] - ly) >= tol){ o.push(pts[i], pts[i+1]); lx = pts[i]; ly = pts[i+1]; } }
      return Int32Array.from(o);
    });
    return {a: r.a, b: r.b, c: r.c, e: r.e, lods};
  }
  function ptsChunks(rs, N){
    const list = [];
    for (const r of rs){
      const P = r.pts, n = P.length / 2;
      for (let i = 0; i < n; i += N){
        const p = new Path2D(); let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity;
        for (let j = i; j <= Math.min(n, i + N); j++){
          const q = (j % n) * 2, x = P[q], y = P[q+1];
          j === i ? p.moveTo(x, y) : p.lineTo(x, y);
          if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > e) e = y;
        }
        list.push({p, a, b, c, e, off: 0});
      }
    }
    const grid = new Map();
    list.forEach((ch, n) => {
      for (let j = Math.floor(ch.b / GB); j <= Math.floor(ch.e / GB); j++)
        for (let i = Math.floor(ch.a / GB); i <= Math.floor(ch.c / GB); i++){ const k = i + "," + j; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(n); }
    });
    return {list, grid};
  }
  function lodFor(sL){ const tol = 0.3 / sL; for (let i = 0; i < LOD.length; i++) if (LOD[i] <= tol) return i; return LOD.length - 1; }
  // recorte do polígono na caixa do tile (Sutherland–Hodgman): mesmo desenho dentro dela, com bem menos pontos
  function clipEdge(P, k, v, keepLess){
    const o = [], n = P.length;
    if (!n) return o;
    let px = P[n-2], py = P[n-1], pin = keepLess ? (k ? py : px) <= v : (k ? py : px) >= v;
    for (let i = 0; i < n; i += 2){
      const x = P[i], y = P[i+1], c = k ? y : x, cin = keepLess ? c <= v : c >= v;
      if (cin !== pin){
        const pc = k ? py : px, t = (v - pc) / (c - pc);
        o.push(px + (x - px) * t, py + (y - py) * t);
      }
      if (cin) o.push(x, y);
      px = x; py = y; pin = cin;
    }
    return o;
  }
  function clampInto(path, P, ax, ay, bx, by){
    let Q = clipEdge(P, 0, ax, false); Q = clipEdge(Q, 0, bx, true); Q = clipEdge(Q, 1, ay, false); Q = clipEdge(Q, 1, by, true);
    if (Q.length < 6) return;
    path.moveTo(Q[0], Q[1]);
    for (let i = 2; i < Q.length; i += 2) path.lineTo(Q[i], Q[i+1]);
    path.closePath();
  }
  function init(geo, consts){
    K = consts;
    const SYM = {};
    for (const k in SYM_DEF) SYM[k] = SYM_DEF[k].map(([kind, d]) => [kind, new Path2D(d)]);
    const buckets = new Map();
    for (const t of geo.terrain){
      const key = Math.floor(t[1]/BUCKET) + "," + Math.floor(t[2]/BUCKET);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(t);
    }
    D = {
      SYM, buckets, grid: geo.grid,
      land: geo.contours.map(r => ringLods(r)),
      coastLines: ptsChunks(geo.contours, 48),
      tints: geo.tints.map(([c, d]) => [c, polyRings([d])]),
      rivers: chunked(geo.rivers, 12),
      roads: chunked([geo.roads], 6),
      borders: chunked([geo.borders], 24),
      arts: geo.arts || [],
    };
  }
  let sprites = new Map();
  function setColors(c){ C = c; sprites = new Map(); if (typeof waves !== 'undefined') waves.clear(); }
  function drawSym(g, k){
    for (const [kd, p] of D.SYM[k]){
      switch(kd){
        case "fill": g.fillStyle = C.land; g.fill(p); break;
        case "shade": g.fillStyle = C.shade; g.fill(p); break;
        case "snow": g.fillStyle = C.snow; g.fill(p); break;
        case "tree": g.fillStyle = C.tree; g.fill(p); g.strokeStyle = C.ink; g.globalAlpha = .88; g.lineWidth = 1; g.stroke(p); g.globalAlpha = 1; break;
        case "dot": g.fillStyle = C.ink; g.fill(p); break;
        default:
          g.strokeStyle = C.ink; g.lineWidth = kd === "ink" ? 1.3 : kd === "hair" ? .8 : 1;
          g.globalAlpha = kd === "hair" ? .5 : kd === "faint" ? .4 : .88; g.stroke(p); g.globalAlpha = 1;
      }
    }
  }
  // desenho de relevo pequeno vira carimbo pronto (mesmo traço, milhares de vezes mais rápido)
  function sprite(k, ps, fx, fy){
    const q = Math.round(Math.log(ps) / Math.log(1.01)), key = k + "|" + q + "|" + fx + fy;
    let s = sprites.get(key);
    if (!s){
      const qs = Math.pow(1.01, q), half = Math.ceil(18 * qs) + 2;
      const c = new OffscreenCanvas(half * 2, half * 2), g = c.getContext("2d");
      g.setTransform(qs, 0, 0, qs, half + fx / 4, half + fy / 4); g.lineCap = "round"; g.lineJoin = "round";
      drawSym(g, k); s = {c, half}; sprites.set(key, s);
    }
    return s;
  }
  // a grade diz se o tile é só mar, só terra ou costa (só a costa precisa do trabalho pesado)
  function cellKind(ax, ay, bx, by){
    const cs = K.CELL, g = D.grid;
    let land = false, sea = false;
    for (let j = Math.floor((ay - K.OY)/cs); j <= Math.floor((by - K.OY - 1e-6)/cs); j++){
      const row = g[j]; if (!row){ sea = true; continue; }
      for (let i = Math.floor((ax - K.OX)/cs); i <= Math.floor((bx - K.OX - 1e-6)/cs); i++){
        const ch = row[i] || "S";
        if (ch === "M") return "M";
        if (ch === "L") land = true; else sea = true;
        if (land && sea) return "M";
      }
    }
    return land ? "L" : "S";
  }

  // ---------- ilustrações do mapa (desenho a traço) ----------
  const DARK = "#241a13";
  function seg(g, pts, w0, w1){
    for (let i = 0; i < pts.length - 1; i++){ const t = i / (pts.length - 1); g.lineWidth = w0 + (w1 - w0) * t; g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[i+1][0], pts[i+1][1]); g.stroke(); }
  }
  function curl(x, y, a, len, amt, n){ const p = []; const st = len / n; for (let i = 0; i <= n; i++){ p.push([x, y]); a += amt * (i / n) * 0.32; x += Math.cos(a) * st; y += Math.sin(a) * st; } return p; }
  function rings(g, rx, ry, n, step, col, alpha){ g.strokeStyle = col; for (let i = 0; i < n; i++){ g.globalAlpha = alpha * (1 - i / n); g.lineWidth = 2.2; g.beginPath(); g.ellipse(0, 0, rx + i*step, ry + i*step*0.35, 0, 0, 7); g.stroke(); } g.globalAlpha = 1; }
  function ship(g){
    g.strokeStyle = C.ink; g.fillStyle = C.land; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-26, 0); g.quadraticCurveTo(0, 14, 26, 0); g.lineTo(20, -2); g.lineTo(-22, -2); g.closePath(); g.fillStyle = DARK; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-4, -2); g.lineTo(-4, -42); g.moveTo(10, -2); g.lineTo(10, -30); g.stroke();
    g.fillStyle = C.land; g.beginPath(); g.moveTo(-4, -40); g.quadraticCurveTo(10, -28, -4, -10); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(10, -29); g.quadraticCurveTo(21, -20, 10, -9); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = C.blood; g.beginPath(); g.moveTo(-4, -42); g.lineTo(6, -45); g.lineTo(-4, -48); g.closePath(); g.fill();
    g.strokeStyle = C.wave; g.globalAlpha = .8; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-30, 6); g.quadraticCurveTo(-46, 8, -60, 4); g.moveTo(-28, 10); g.quadraticCurveTo(-44, 14, -56, 12); g.stroke(); g.globalAlpha = 1;
  }
  const ART = {
    kraken(g){
      rings(g, 90, 32, 4, 26, C.wave, .8);
      g.strokeStyle = DARK; g.lineCap = "round";
      const T = [[-70,8,-2.6,230,-1.5],[-45,10,-2.1,260,1.7],[-15,12,-1.75,200,-1.3],[20,12,-1.35,250,1.5],[50,10,-0.95,235,-1.7],[80,6,-0.5,200,1.3],[-98,4,-2.95,170,1.2]];
      for (const [x, y, a, l, c] of T){
        const p = curl(x, y, a, l, c, 26);
        g.strokeStyle = DARK; seg(g, p, 18, 2.5);
        g.strokeStyle = C.ripple; g.globalAlpha = .55; seg(g, p.map(q => [q[0] + 2, q[1] + 2]), 4, .6); g.globalAlpha = 1;
        g.fillStyle = C.land; for (let i = 3; i < p.length - 4; i += 3){ const w = 18 - 15.5 * i / p.length; g.beginPath(); g.arc(p[i][0], p[i][1], Math.max(1, w * .18), 0, 7); g.fill(); }
      }
      g.fillStyle = DARK; g.beginPath(); g.ellipse(0, 0, 58, 50, 0, Math.PI, 0); g.lineTo(58, 6); g.lineTo(-58, 6); g.closePath(); g.fill();
      g.fillStyle = C.ripple; g.globalAlpha = .35; g.beginPath(); g.ellipse(-16, -30, 18, 10, -.4, 0, 7); g.fill(); g.globalAlpha = 1;
      g.fillStyle = "#e0b04a"; for (const ex of [-22, 22]){ g.beginPath(); g.ellipse(ex, -8, 9, 6, 0, 0, 7); g.fill(); }
      g.fillStyle = DARK; for (const ex of [-22, 22]){ g.beginPath(); g.ellipse(ex, -8, 2, 5, 0, 0, 7); g.fill(); }
      g.save(); g.translate(150, -120); g.rotate(-0.6); g.scale(.9, .9); ship(g); g.restore();
      g.strokeStyle = C.wave; g.lineWidth = 2; g.globalAlpha = .9;
      for (const [x, y] of [[-120,-20],[110,-30],[-60,-70],[70,-90]]){ g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y - 12); g.moveTo(x + 6, y); g.lineTo(x + 10, y - 14); g.stroke(); }
      g.globalAlpha = 1;
    },
    serpente(g){
      const humps = [[-140,0,-60,0],[-30,0,50,0],[80,0,150,0]];
      for (const [x0] of humps){ g.save(); g.translate(x0, 4); rings(g, 16, 6, 3, 10, C.wave, .8); g.restore(); }
      g.strokeStyle = DARK; g.lineCap = "round";
      for (const [x0, , x1] of humps){
        const p = []; for (let i = 0; i <= 20; i++){ const t = i / 20; p.push([x0 + (x1 - x0) * t, -Math.sin(t * Math.PI) * 60]); }
        seg(g, p, 22, 22);
        g.fillStyle = DARK; for (let i = 3; i < 18; i += 3){ const [x, y] = p[i]; g.beginPath(); g.moveTo(x - 5, y - 9); g.lineTo(x, y - 22); g.lineTo(x + 5, y - 9); g.closePath(); g.fill(); }
        g.strokeStyle = C.ripple; g.globalAlpha = .5; seg(g, p.map(q => [q[0], q[1] + 5]), 4, 4); g.globalAlpha = 1; g.strokeStyle = DARK;
      }
      g.save(); g.translate(150, 0);
      g.fillStyle = DARK; g.beginPath(); g.moveTo(-10, 0); g.quadraticCurveTo(10, -80, 40, -90); g.quadraticCurveTo(78, -90, 86, -70); g.lineTo(52, -62); g.quadraticCurveTo(30, -56, 12, 0); g.closePath(); g.fill();
      g.fillStyle = "#e0b04a"; g.beginPath(); g.ellipse(52, -80, 5, 3.4, 0, 0, 7); g.fill();
      g.strokeStyle = C.land; g.lineWidth = 2; g.beginPath(); g.moveTo(62, -66); g.lineTo(84, -70); g.stroke(); g.restore();
      g.strokeStyle = DARK; seg(g, curl(-140, 0, Math.PI + .3, 60, 3, 12), 18, 3);
    },
    leviata(g){
      rings(g, 240, 70, 4, 34, C.wave, .75);
      g.fillStyle = DARK; g.beginPath(); g.ellipse(0, 0, 240, 70, 0, Math.PI, 0); g.closePath(); g.fill();
      g.strokeStyle = C.ripple; g.globalAlpha = .45; g.lineWidth = 3;
      for (let i = -3; i <= 3; i++){ g.beginPath(); g.ellipse(0, 6, 220 - Math.abs(i) * 8, 55 - Math.abs(i) * 7, 0, Math.PI + .2, -.2); g.stroke(); }
      g.globalAlpha = 1; g.fillStyle = DARK; g.beginPath(); g.moveTo(40, -62); g.quadraticCurveTo(70, -150, 120, -150); g.quadraticCurveTo(100, -110, 110, -56); g.closePath(); g.fill();
      g.strokeStyle = C.ripple; g.lineWidth = 3; g.globalAlpha = .9;
      for (const a of [-1.9, -1.57, -1.2]){ g.beginPath(); g.moveTo(-120, -66); g.quadraticCurveTo(-120 + Math.cos(a) * 40, -66 - 120, -120 + Math.cos(a) * 90, -66 - 90); g.stroke(); }
      g.fillStyle = C.ripple; for (const [x, y] of [[-200,-150],[-50,-160],[-160,-190],[-80,-200],[-130,-215]]){ g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    },
    navio(g){ ship(g); },
    tartaruga(g){
      g.strokeStyle = DARK; g.fillStyle = "#6d7a5a"; g.lineWidth = 3;
      for (const [x, y, a] of [[110,-95,-.6],[110,95,.6],[-110,-95,-2.5],[-110,95,2.5]]){ g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, -14); g.quadraticCurveTo(70, -26, 96, 0); g.quadraticCurveTo(70, 18, 0, 14); g.closePath(); g.fill(); g.stroke(); g.restore(); }
      g.beginPath(); g.moveTo(140, -26); g.quadraticCurveTo(200, -36, 228, -4); g.quadraticCurveTo(206, 30, 140, 26); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = DARK; g.beginPath(); g.arc(205, -10, 4.5, 0, 7); g.fill();
      g.fillStyle = "#6d7a5a"; g.beginPath(); g.moveTo(-140, -10); g.lineTo(-190, 0); g.lineTo(-140, 10); g.closePath(); g.fill(); g.stroke();
      rings(g, 160, 130, 3, 18, C.wave, .75);
    },
    cratera(g){
      const gr = g.createRadialGradient(0, 0, 10, 0, 0, 210); gr.addColorStop(0, "rgba(232,96,30,.75)"); gr.addColorStop(.35, "rgba(170,60,25,.45)"); gr.addColorStop(1, "rgba(120,40,20,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 210, 0, 7); g.fill();
      for (const [r, a] of [[150,.35],[110,.55],[72,.8]]){
        g.strokeStyle = DARK; g.globalAlpha = a; g.lineWidth = 3; g.beginPath();
        for (let i = 0; i <= 64; i++){ const t = i / 64 * Math.PI * 2, rr = r * (1 + .07 * Math.sin(t * 5 + r) + .04 * Math.sin(t * 11)); const x = Math.cos(t) * rr, y = Math.sin(t) * rr * .78; i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.closePath(); g.stroke();
      }
      g.globalAlpha = 1; g.fillStyle = DARK; g.beginPath(); g.ellipse(0, 0, 44, 32, 0, 0, 7); g.fill();
      g.fillStyle = "rgba(255,150,60,.9)"; g.beginPath(); g.ellipse(0, 4, 20, 10, 0, 0, 7); g.fill();
      g.strokeStyle = DARK; g.lineWidth = 2; g.globalAlpha = .7;
      for (let i = 0; i < 16; i++){ const a = i / 16 * Math.PI * 2 + .2; let r = 50; g.beginPath(); g.moveTo(Math.cos(a) * r, Math.sin(a) * r * .78); for (let k = 0; k < 4; k++){ r += 30; const aa = a + (k % 2 ? .06 : -.06); g.lineTo(Math.cos(aa) * r, Math.sin(aa) * r * .78); } g.stroke(); }
      g.globalAlpha = 1;
    },
    vorthrax(g){
      const peak = (cx, h, w, shade) => {
        g.fillStyle = C.land; g.strokeStyle = C.ink; g.lineWidth = 2.6;
        g.beginPath(); g.moveTo(cx - w, 80); g.lineTo(cx - w * .25, 80 - h * .55); g.lineTo(cx, 80 - h); g.lineTo(cx + w * .3, 80 - h * .62); g.lineTo(cx + w, 80); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = C.shade; g.beginPath(); g.moveTo(cx, 80 - h); g.lineTo(cx + w * .3, 80 - h * .62); g.lineTo(cx + w, 80); g.lineTo(cx + w * .1, 80); g.closePath(); g.fill();
        g.strokeStyle = C.ink; g.globalAlpha = .35; g.lineWidth = 1.4;
        for (let i = 1; i < 7; i++){ const t = i / 7; g.beginPath(); g.moveTo(cx + w * .1 * t + w * .9 * t * .2, 80 - h * (1 - t) + 4); g.lineTo(cx + w * .1 + w * .8 * t, 80); g.stroke(); }
        g.globalAlpha = 1; g.fillStyle = C.snow;
        g.beginPath(); g.moveTo(cx, 80 - h); g.lineTo(cx - w * .2, 80 - h * .68); g.lineTo(cx - w * .08, 80 - h * .73); g.lineTo(cx + w * .02, 80 - h * .64); g.lineTo(cx + w * .14, 80 - h * .74); g.lineTo(cx + w * .3, 80 - h * .62); g.closePath(); g.fill();
      };
      peak(-120, 150, 110); peak(130, 165, 120); peak(0, 250, 170);
      // corpo enrolado em volta do cume
      const body = []; for (let i = 0; i <= 60; i++){ const t = i / 60, a = -0.3 + t * Math.PI * 2.15; body.push([Math.cos(a) * (95 - t * 35), -150 + Math.sin(a) * (34 - t * 10)]); }
      g.fillStyle = C.snow; g.strokeStyle = C.ink;
      for (let i = 4; i < 56; i += 3){ const [x, y] = body[i], w = 24 - 18 * i / 60; g.beginPath(); g.moveTo(x - w * .25, y - w * .45); g.lineTo(x, y - w * .45 - 9 * (1 - i / 60) - 4); g.lineTo(x + w * .25, y - w * .45); g.closePath(); g.fill(); g.lineWidth = 1.4; g.stroke(); }
      g.lineCap = "round"; g.strokeStyle = C.ink; seg(g, body, 28, 6); g.strokeStyle = C.snow; seg(g, body, 23, 3);
      g.strokeStyle = C.ink; g.globalAlpha = .35; g.lineWidth = 1.2; for (let i = 2; i < 56; i += 2){ const [x, y] = body[i]; g.beginPath(); g.arc(x, y, 3, 0, Math.PI); g.stroke(); } g.globalAlpha = 1;
      // asa dobrada
      g.fillStyle = C.snow; g.strokeStyle = C.ink; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(-10, -170); g.lineTo(-30, -250); g.lineTo(10, -205); g.lineTo(30, -262); g.lineTo(50, -200); g.lineTo(80, -238); g.lineTo(70, -172); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-10, -170); g.lineTo(10, -205); g.moveTo(20, -175); g.lineTo(50, -200); g.stroke();
      // cabeça dormindo apoiada na encosta
      const [hx, hy] = body[0];
      g.beginPath(); g.moveTo(hx - 4, hy - 13); g.quadraticCurveTo(hx + 34, hy - 24, hx + 62, hy - 2); g.quadraticCurveTo(hx + 40, hy + 16, hx - 2, hy + 12); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(hx + 4, hy - 12); g.quadraticCurveTo(hx - 18, hy - 40, hx - 30, hy - 44); g.moveTo(hx + 14, hy - 15); g.quadraticCurveTo(hx + 2, hy - 42, hx - 8, hy - 50); g.stroke();
      g.beginPath(); g.moveTo(hx + 26, hy - 6); g.quadraticCurveTo(hx + 32, hy - 2, hx + 38, hy - 6); g.stroke();
      g.strokeStyle = C.ripple; g.globalAlpha = .8; g.lineWidth = 2;
      for (const d of [0, 10, 20]){ g.beginPath(); g.moveTo(hx + 64, hy - 4 - d * .3); g.quadraticCurveTo(hx + 80 + d, hy - 14 - d, hx + 96 + d * 1.5, hy - 6 - d); g.stroke(); }
      g.globalAlpha = 1;
    },
    fosso(g){
      const gr = g.createRadialGradient(0, 0, 4, 0, 0, 80); gr.addColorStop(0, "#0d0907"); gr.addColorStop(1, "rgba(30,22,16,.15)");
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 80, 46, 0, 0, 7); g.fill();
      g.strokeStyle = C.ink; g.lineWidth = 2;
      for (const r of [80, 62, 44, 28]){ g.globalAlpha = .4 + (80 - r) / 120; g.beginPath(); g.ellipse(0, (80 - r) * .1, r, r * .58, 0, 0, 7); g.stroke(); }
      g.globalAlpha = .9; g.setLineDash([5, 5]); g.beginPath(); for (let i = 0; i <= 60; i++){ const t = i / 60 * Math.PI * 5, r = 78 - i; const x = Math.cos(t) * r, y = Math.sin(t) * r * .58 + (80 - r) * .1; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.setLineDash([]);
      g.globalAlpha = 1; g.lineWidth = 2.4; for (const [x, y] of [[-70,-30],[66,-32]]){ g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 34); g.lineTo(x + (x < 0 ? 26 : -26), y - 34); g.lineTo(x + (x < 0 ? 26 : -26), y - 18); g.stroke(); }
    },
    abismo(g){
      g.fillStyle = "#0d0907"; g.strokeStyle = C.ink; g.lineWidth = 2.5;
      g.beginPath(); const L = 130, P = [];
      for (let i = 0; i <= 14; i++){ const t = i / 14; P.push([-L + 2 * L * t, (i % 2 ? -1 : 1) * 6 - 14 * Math.sin(t * Math.PI)]); }
      for (let i = 14; i >= 0; i--){ const t = i / 14; P.push([-L + 2 * L * t, (i % 2 ? 1 : -1) * 6 + 14 * Math.sin(t * Math.PI)]); }
      P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); g.stroke();
      g.globalAlpha = .7; g.lineWidth = 1.6;
      for (const [x, d] of [[-80, 1], [-20, -1], [40, 1], [90, -1]]){ g.beginPath(); g.moveTo(x, 10 * d); g.lineTo(x + 12, 28 * d); g.lineTo(x + 6, 40 * d); g.stroke(); }
      g.globalAlpha = 1;
    },
    arvore(g){
      g.strokeStyle = C.ink; g.lineWidth = 3; g.fillStyle = "#6b4f33";
      g.beginPath(); g.moveTo(-14, 60); g.quadraticCurveTo(-10, 10, -20, -20); g.lineTo(20, -20); g.quadraticCurveTo(10, 10, 14, 60); g.closePath(); g.fill(); g.stroke();
      for (const [x, d] of [[-14, -1], [14, 1], [0, .3]]){ g.beginPath(); g.moveTo(x, 58); g.quadraticCurveTo(x + d * 40, 70, x + d * 70, 66); g.stroke(); }
      g.fillStyle = C.tree;
      for (const [x, y, r] of [[-50,-40,40],[45,-45,42],[0,-80,50],[-30,-95,34],[38,-100,36],[0,-30,38]]){ g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); }
      g.strokeStyle = C.wave; g.lineWidth = 2; g.globalAlpha = .8; g.beginPath(); g.ellipse(0, 66, 90, 14, 0, 0, 7); g.stroke(); g.globalAlpha = 1;
    },
  };
  const SEA_ART = new Set(["kraken","serpente","leviata","navio","tartaruga"]);
  function drawArts(g, base, ax, ay, bx, by, layer){
    for (const a of D.arts){
      if (SEA_ART.has(a.k) !== (layer === "sea")) continue;
      const rr = a.r * a.s;
      if (a.x + rr < ax || a.x - rr > bx || a.y + rr < ay || a.y - rr > by) continue;
      g.setTransform(base); g.translate(a.x, a.y); g.rotate(a.rot || 0); g.scale(a.s, a.s);
      g.lineCap = "round"; g.lineJoin = "round"; g.globalAlpha = 1; g.setLineDash([]);
      ART[a.k](g);
    }
    g.setTransform(base); g.globalAlpha = 1; g.setLineDash([]);
  }
  const waves = new Map();
  function wavePattern(g, sL){
    let w = waves.get(sL);
    if (!w){
      const R = 8, c = new OffscreenCanvas(Math.round(120 * R * sL * 4), Math.round(68 * R * sL * 4)), q = c.getContext("2d");
      const kx = c.width / (120 * R), ky = c.height / (68 * R);
      q.setTransform(kx, 0, 0, ky, 0, 0); q.lineCap = "round"; q.lineJoin = "round";
      q.strokeStyle = C.wave; q.globalAlpha = .55; q.lineWidth = 2.6; q.beginPath();
      for (let j = -1; j <= R; j++) for (let i = -1; i <= R; i++){
        const X = i*120, Y = j*68;
        q.moveTo(X+8, Y+40); q.quadraticCurveTo(X+24, Y+26, X+40, Y+40);
        q.moveTo(X+68, Y+12); q.quadraticCurveTo(X+84, Y-2, X+100, Y+12);
      }
      q.stroke();
      w = g.createPattern(c, "repeat");
      w.setTransform(new DOMMatrix([1 / kx, 0, 0, 1 / ky, 0, 0]));
      waves.set(sL, w);
    }
    return w;
  }
  function paint(g, L, x, y, layers){
    const sL = K.BASE * 2**L, u = K.TS / sL, ax = K.OX + x*u, ay = K.OY + y*u, bx = ax + u, by = ay + u;
    g.setTransform(sL, 0, 0, sL, -ax*sL, -ay*sL);
    const base = g.getTransform();
    const kind = cellKind(ax, ay, bx, by);
    const lv = lodFor(sL);
    g.lineCap = "round"; g.lineJoin = "round";
    let coast = null, coastInk = null;
    if (kind !== "L"){
      g.fillStyle = C.sea; g.fillRect(ax, ay, u, u);
      if (120 * sL < 32){
        // de longe as ondinhas viram uma textura pronta (mesmo desenho)
        g.fillStyle = wavePattern(g, sL); g.fillRect(ax, ay, u, u);
      } else {
        g.strokeStyle = C.wave; g.globalAlpha = .55; g.lineWidth = 2.6; g.beginPath();
        for (let j = Math.floor(ay/68) - 1; j <= Math.ceil(by/68); j++)
          for (let i = Math.floor(ax/120) - 1; i <= Math.ceil(bx/120); i++){
            const X = i*120, Y = j*68;
            g.moveTo(X+8, Y+40); g.quadraticCurveTo(X+24, Y+26, X+40, Y+40);
            g.moveTo(X+68, Y+12); g.quadraticCurveTo(X+84, Y-2, X+100, Y+12);
          }
        g.stroke(); g.globalAlpha = 1;
      }
      drawArts(g, base, ax, ay, bx, by, "sea");
      if (kind === "S") return;
      // terra: polígonos recortados na caixa do tile (com folga para as ondinhas da costa)
      const m = 48;
      coast = new Path2D();
      for (const r of D.land) if (r.c >= ax - m && r.a <= bx + m && r.e >= ay - m && r.b <= by + m) clampInto(coast, r.lods[lv], ax - m, ay - m, bx + m, by + m);
      coastInk = new Path2D();
      for (const ch of near(D.coastLines, ax, ay, bx, by, m)) coastInk.addPath(ch.p);
      g.strokeStyle = C.ripple;
      for (const [w, a] of [[60,.35],[36,.55],[16,.9]]){ g.globalAlpha = a; g.lineWidth = w; g.stroke(coastInk); }
      g.globalAlpha = 1;
      g.fillStyle = C.land; g.fill(coast, "evenodd");
      g.save(); g.clip(coast, "evenodd");
    } else {
      g.fillStyle = C.land; g.fillRect(ax, ay, u, u);
    }
    g.globalAlpha = .24;
    for (const [c, rs] of D.tints){
      const p = new Path2D(); let any = false;
      for (const r of rs) if (r.c >= ax - 2 && r.a <= bx + 2 && r.e >= ay - 2 && r.b <= by + 2){ clampInto(p, r.lods[lv], ax - 2, ay - 2, bx + 2, by + 2); any = true; }
      if (any){ g.fillStyle = c; g.fill(p, "evenodd"); }
    }
    g.globalAlpha = 1;
    const list = [];
    for (let j = Math.floor((ay-20)/BUCKET); j <= Math.floor((by+20)/BUCKET); j++)
      for (let i = Math.floor((ax-20)/BUCKET); i <= Math.floor((bx+20)/BUCKET); i++){
        const b = D.buckets.get(i + "," + j); if (b) for (const t of b) list.push(t);
      }
    list.sort((a, b) => a[2] - b[2]);
    const STAMP = 2.2;                     // até ~40 px por desenho usa o carimbo
    for (const [k, X, Y, sc] of list){
      const ps = sc * sL;
      if (ps < STAMP){
        // posição exata ao quarto de pixel, desenhado sem redimensionar: traço nítido como antes
        const px = (X - ax) * sL, py = (Y - ay) * sL, ix = Math.floor(px), iy = Math.floor(py);
        const qx = Math.round((px - ix) * 4), qy = Math.round((py - iy) * 4);
        const s = sprite(k, ps, qx & 3, qy & 3);
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.drawImage(s.c, ix + (qx >> 2) - s.half, iy + (qy >> 2) - s.half);
      } else {
        g.setTransform(base); g.translate(X, Y); g.scale(sc, sc); drawSym(g, k);
      }
    }
    g.setTransform(base);
    g.strokeStyle = C.river; g.lineWidth = 5.4;
    for (const ch of near(D.rivers, ax, ay, bx, by, 6)) g.stroke(ch.p);
    if (layers.roads){ g.strokeStyle = C.road; g.globalAlpha = .8; g.lineWidth = 2.8; g.setLineDash([9,9]);
      for (const ch of near(D.roads, ax, ay, bx, by, 4)){ g.lineDashOffset = ch.off; g.stroke(ch.p); } }
    if (layers.borders){ g.strokeStyle = C.border; g.globalAlpha = .7; g.lineWidth = 3.6; g.setLineDash([3,12]);
      for (const ch of near(D.borders, ax, ay, bx, by, 4)){ g.lineDashOffset = ch.off; g.stroke(ch.p); } }
    g.setLineDash([]); g.lineDashOffset = 0; g.globalAlpha = 1;
    drawArts(g, base, ax, ay, bx, by, "land");
    if (coast){ g.restore(); g.strokeStyle = C.ink; g.lineWidth = 3.4; g.stroke(coastInk); }
  }
  return {init, setColors, paint};
}
