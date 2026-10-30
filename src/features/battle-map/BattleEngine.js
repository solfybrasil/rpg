/**
 * BattleEngine.js
 * Motor tático de batalha em Canvas 2D + WebGL Chroma Key.
 * Baseado no protótipo de alta performance (1 RAF loop, sem React no ciclo de renderização, zero PixiJS).
 */

const VS_CHROMA = `
attribute vec2 p;
varying vec2 v;
void main() {
  v = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

const FS_CHROMA = `
precision mediump float;
varying vec2 v;
uniform sampler2D t;
uniform float m;

void main() {
  vec4 c = texture2D(t, v);
  vec3 o = c.rgb;
  float k;
  if (m < 0.5) {
    // Verde: g - max(r, b)
    float mx = max(c.r, c.b);
    k = c.g - mx;
    o.g = min(c.g, mx);
  } else {
    // Magenta: min(r, b) - g
    k = min(c.r, c.b) - c.g;
    float s = max(0.0, k - 0.0706);
    o.r -= s;
    o.b -= s;
  }
  float a = 1.0 - smoothstep(0.0706, 0.2745, k);
  gl_FragColor = vec4(o * a, a);
}
`;

function makeWebGLKeyer(mode) {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl', {
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!gl) return null;

    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s) || 'Shader error');
      }
      return s;
    };

    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS_CHROMA));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS_CHROMA));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;

    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.uniform1f(gl.getUniformLocation(pr, 'm'), mode);
    gl.clearColor(0, 0, 0, 0);

    return {
      canvas: c,
      draw(source) {
        const sw = source.videoWidth || source.naturalWidth || source.width;
        const sh = source.videoHeight || source.naturalHeight || source.height;
        if (!sw || !sh) return;
        if (c.width !== sw || c.height !== sh) {
          c.width = sw;
          c.height = sh;
          gl.viewport(0, 0, sw, sh);
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
      destroy() {
        try {
          const loseContext = gl.getExtension('WEBGL_lose_context');
          if (loseContext) loseContext.loseContext();
        } catch (_) {}
      },
    };
  } catch (e) {
    return null;
  }
}

function resolveTokenMedia(t) {
  if (t.media_url) return t.media_url;
  if (t.idle_webm_url) return t.idle_webm_url;
  if (t.idle_mp4_url) return t.idle_mp4_url;
  if (t.idle_url) return t.idle_url;

  const hid = (t.hero_id || t.name || '').toLowerCase();
  if (hid.includes('tor')) return '/batalha/tor_idle.webm';
  if (hid.includes('kaelis')) return '/batalha/kaelis_idle.webm';
  if (hid.includes('malenia')) return '/batalha/malenia_idle.webm';
  return '/batalha/fera_idle.webm';
}

function resolveChroma(t) {
  if (t.chroma) return t.chroma;
  if (t.chroma_mode) return t.chroma_mode;
  const hid = (t.hero_id || t.name || '').toLowerCase();
  if (hid.includes('kaelis')) return 'magenta';
  return 'verde';
}

// Chaves de WebGL compartilhadas (máximo 2 instâncias no app todo: verde e magenta)
let sharedGreenKeyer = null;
let sharedMagentaKeyer = null;

function getSharedKeyer(mode) {
  if (mode === 1) {
    if (!sharedMagentaKeyer) sharedMagentaKeyer = makeWebGLKeyer(1);
    return sharedMagentaKeyer;
  }
  if (!sharedGreenKeyer) sharedGreenKeyer = makeWebGLKeyer(0);
  return sharedGreenKeyer;
}

// 2D CPU Chroma Key Fallback
function keyGreen2D(d) {
  for (let p = 0; p < d.length; p += 4) {
    const r = d[p],
      g = d[p + 1],
      b = d[p + 2],
      m = r > b ? r : b,
      k = g - m;
    if (k > 70) {
      d[p + 3] = 0;
      continue;
    }
    if (k > 18) d[p + 3] = 255 * (1 - (k - 18) / 52);
    if (g > m) d[p + 1] = m;
  }
}

function keyMagenta2D(d) {
  for (let p = 0; p < d.length; p += 4) {
    const r = d[p],
      g = d[p + 1],
      b = d[p + 2],
      k = (r < b ? r : b) - g;
    if (k > 70) {
      d[p + 3] = 0;
      continue;
    }
    if (k > 18) {
      d[p + 3] = 255 * (1 - (k - 18) / 52);
      const s = k - 18;
      d[p] = r - s;
      d[p + 2] = b - s;
    }
  }
}

// Gerenciador compartilhado de mídias de vídeo e imagens
class MediaRegistry {
  constructor() {
    this.cache = new Map(); // url -> { type, el, keyer, lastT, ready, off, octx, refCount }
  }

  get(url, chromaMode = 'verde') {
    if (!url) return null;
    let entry = this.cache.get(url);
    if (!entry) {
      const isVideo =
        /\.(mp4|webm|ogv)$/i.test(url) || url.startsWith('blob:') || url.includes('video');
      if (isVideo) {
        const v = document.createElement('video');
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.autoplay = true;
        v.preload = 'auto';
        v.crossOrigin = 'anonymous';
        v.src = url;

        const off = document.createElement('canvas');
        const octx = off.getContext('2d', { willReadFrequently: true });
        const mode = chromaMode === 'magenta' ? 1 : 0;
        const keyer = chromaMode !== 'none' ? getSharedKeyer(mode) : null;

        entry = {
          type: 'video',
          el: v,
          off,
          octx,
          keyer,
          chromaMode,
          lastT: -1,
          ready: false,
          refCount: 1,
        };

        v.addEventListener('loadeddata', () => {
          entry.ready = true;
        });
        v.play().catch(() => {});
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        entry = {
          type: 'image',
          el: img,
          ready: false,
          refCount: 1,
        };
        img.onload = () => {
          entry.ready = true;
        };
      }
      this.cache.set(url, entry);
    } else {
      entry.refCount++;
    }
    return entry;
  }

  release(url) {
    if (!url || !this.cache.has(url)) return;
    const entry = this.cache.get(url);
    entry.refCount--;
    if (entry.refCount <= 0) {
      if (entry.type === 'video') {
        entry.el.pause();
        entry.el.removeAttribute('src');
        entry.el.load();
        if (entry.keyer) entry.keyer.destroy();
      }
      this.cache.delete(url);
    }
  }

  updateFrame(entry) {
    if (!entry || !entry.ready) return false;
    if (entry.type === 'image') return false; // Imagens estáticas não demandam atualização contínua por quadro

    const v = entry.el;
    if (v.readyState < 2 || !v.videoWidth) return false;
    if (entry.lastT === v.currentTime) return false;
    entry.lastT = v.currentTime;

    if (entry.chromaMode === 'none') {
      entry.src = v;
      return true;
    }

    if (entry.keyer) {
      entry.keyer.draw(v);
      entry.src = entry.keyer.canvas;
      return true;
    }

    // Fallback 2D CPU
    const off = entry.off;
    const octx = entry.octx;
    const w = v.videoWidth >> 1;
    const h = v.videoHeight >> 1;
    if (off.width !== w || off.height !== h) {
      off.width = w;
      off.height = h;
    }
    octx.drawImage(v, 0, 0, w, h);
    try {
      const imgData = octx.getImageData(0, 0, w, h);
      if (entry.chromaMode === 'magenta') keyMagenta2D(imgData.data);
      else keyGreen2D(imgData.data);
      octx.putImageData(imgData, 0, 0);
      entry.src = off;
      return true;
    } catch (_) {
      entry.src = v;
      return true;
    }
  }
}

const globalMediaRegistry = new MediaRegistry();

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export class BattleEngine {
  constructor(canvas, options = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options;

    this.mode = options.mode || 'player'; // 'player' | 'dm_editor' | 'display'
    this.myHeroTokenId = options.myHeroTokenId || null;
    this.selectedTokenId = options.selectedTokenId || null;
    this.isPainting = options.isPainting || false;

    // Callbacks
    this.onMoveToken = options.onMoveToken || null;
    this.onSelectToken = options.onSelectToken || null;
    this.onUpdateTokenPosition = options.onUpdateTokenPosition || null;
    this.onBlockedChange = options.onBlockedChange || null;
    this.onHoverCellChange = options.onHoverCellChange || null;

    // Configurações e grade isométrica
    this.imgW = 1376;
    this.imgH = 768;
    this.TW = 86;
    this.TH = 43;
    this.OX = 688;
    this.OY = 384;
    this.moveLimit = 6;
    this.speed = 4.2;

    this.valid = new Set();
    this.blocked = new Set();

    // Estado da câmera
    this.view = { z: 1, x: 0, y: 0 };
    this.base = 1;
    this.scale = 1;
    this.ZMIN = 1;
    this.ZMAX = 4;

    // Dados do mapa e peças
    this.mapData = null;
    this.bgImg = new Image();
    this.bgLoaded = false;
    this.tokens = [];
    this.tokenStateMap = new Map(); // id -> local token state

    // Interação
    this.hover = null;
    this.prevPath = null;
    this.reach = new Map();
    this.graph = null;
    this.dirty = true;
    this.anim = null;
    this.floats = [];

    // Pointer events
    this.pts = new Map();
    this.press = null;
    this.pan = null;
    this.pinch = null;
    this.paint = null;
    this.draggedToken = null;
    this.lastClient = null;
    this.lastPt = null;

    // Binding dos loops e listeners
    this.rafId = null;
    this.lastTime = performance.now();
    this.step = this.step.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);

    this.init();
  }

  init() {
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.cv);
    this.handleResize();

    this.cv.addEventListener('contextmenu', (e) => e.preventDefault());
    this.cv.addEventListener('pointerdown', this.handlePointerDown);
    this.cv.addEventListener('pointermove', this.handlePointerMove);
    this.cv.addEventListener('pointerup', this.handlePointerUp);
    this.cv.addEventListener('pointercancel', this.handlePointerUp);
    this.cv.addEventListener('wheel', this.handleWheel, { passive: false });

    this.rafId = requestAnimationFrame(this.step);
  }

  handleResize() {
    const rc = this.cv.getBoundingClientRect();
    if (!rc.width || !rc.height) return;
    const dpr = Math.min(window.innerWidth < 900 ? 1.5 : 2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(rc.width * dpr);
    this.cv.height = Math.round(rc.height * dpr);
    this.base = this.cv.width / (this.imgW || 1376);
    this.dirty = true;
  }

  setMap(mapData) {
    if (!mapData) return;
    this.mapData = mapData;
    this.imgW = Number(mapData.img_w) || 1376;
    this.imgH = Number(mapData.img_h) || 768;
    this.TW = Number(mapData.tile_size) || 86;
    this.TH = this.TW / 2;
    this.OX = Number(mapData.origin_x ?? this.imgW / 2);
    this.OY = Number(mapData.origin_y ?? this.imgH / 2);
    this.moveLimit = Number(mapData.move_limit ?? 6);

    const bList = Array.isArray(mapData.blocked) ? mapData.blocked : [];
    this.blocked = new Set(bList);

    if (mapData.background_url && this.bgImg.src !== mapData.background_url) {
      this.bgLoaded = false;
      this.bgImg.crossOrigin = 'anonymous';
      this.bgImg.onload = () => {
        this.bgLoaded = true;
        this.dirty = true;
      };
      this.bgImg.src = mapData.background_url;
      if (this.bgImg.complete && this.bgImg.naturalWidth) {
        this.bgLoaded = true;
      }
    }

    this.buildGrid();
    this.recompute();
    this.handleResize();
    this.dirty = true;
  }

  setTokens(tokenList) {
    this.tokens = tokenList || [];
    const activeIds = new Set(this.tokens.map((t) => t.id));

    // Remove estados de peças que não existem mais
    for (const [id, st] of this.tokenStateMap.entries()) {
      if (!activeIds.has(id)) {
        if (st.media) globalMediaRegistry.release(st.mediaUrl);
        this.tokenStateMap.delete(id);
      }
    }

    // Atualiza ou cria estado local de cada token
    for (const t of this.tokens) {
      let st = this.tokenStateMap.get(t.id);
      const mediaUrl = resolveTokenMedia(t);
      const chromaMode = resolveChroma(t);
      const tokenScale = t.size || t.scale || (t.name?.toLowerCase().includes('tor') ? 130 : 160);

      if (!st) {
        const p = this.center(t.c, t.r);
        const media = globalMediaRegistry.get(mediaUrl, chromaMode);
        st = {
          id: t.id,
          name: t.name,
          kind: t.kind,
          hero_id: t.hero_id,
          c: t.c,
          r: t.r,
          x: p.x,
          y: p.y,
          face: t.facing || 1,
          moving: false,
          path: [],
          mediaUrl,
          media,
          recoil: 0,
          lunge: 0,
          shake: 0,
          flash: 0,
          scale: tokenScale,
          ax: t.anchor_x ?? (t.kind === 'monstro' || t.kind === 'fera' ? 0.284 : 0.487),
          ay: t.anchor_y ?? 0.98,
        };
        this.tokenStateMap.set(t.id, st);
      } else {
        // Atualiza props do servidor se não estiver andando localmente
        st.name = t.name;
        st.kind = t.kind;
        st.scale = tokenScale;
        if (!st.moving && (st.c !== t.c || st.r !== t.r)) {
          st.c = t.c;
          st.r = t.r;
          const p = this.center(t.c, t.r);
          st.x = p.x;
          st.y = p.y;
        }
        if (st.mediaUrl !== mediaUrl) {
          globalMediaRegistry.release(st.mediaUrl);
          st.mediaUrl = mediaUrl;
          st.media = globalMediaRegistry.get(mediaUrl, chromaMode);
        }
      }
    }

    this.recompute();
    this.dirty = true;
  }

  setMode(mode) {
    this.mode = mode;
    this.recompute();
    this.dirty = true;
  }

  setMyHeroTokenId(id) {
    this.myHeroTokenId = id;
    this.recompute();
    this.dirty = true;
  }

  setSelectedTokenId(id) {
    this.selectedTokenId = id;
    this.recompute();
    this.dirty = true;
  }

  setIsPainting(isPainting) {
    this.isPainting = isPainting;
    this.dirty = true;
  }

  // Coordenadas da Grade Isométrica
  key(c, r) {
    return c + ',' + r;
  }

  center(c, r) {
    return {
      x: this.OX + ((c - r) * this.TW) / 2,
      y: this.OY + ((c + r) * this.TH) / 2,
    };
  }

  toCell(x, y) {
    const a = (x - this.OX) / (this.TW / 2);
    const b = (y - this.OY) / (this.TH / 2);
    return {
      c: Math.round((a + b) / 2),
      r: Math.round((b - a) / 2),
    };
  }

  buildGrid() {
    this.valid = new Set();
    const pts = [
      [0, 0],
      [this.imgW, 0],
      [0, this.imgH],
      [this.imgW, this.imgH],
    ].map(([x, y]) => {
      const a = (x - this.OX) / (this.TW / 2);
      const b = (y - this.OY) / (this.TH / 2);
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
        const p = this.center(c, r);
        if (
          p.x > -this.TW / 2 &&
          p.x < this.imgW + this.TW / 2 &&
          p.y > -this.TH / 2 &&
          p.y < this.imgH + this.TH / 2
        ) {
          this.valid.add(this.key(c, r));
        }
      }
    }
  }

  pick(x, y) {
    if (x < 0 || y < 0 || x > this.imgW || y > this.imgH) return null;
    const t = this.toCell(x, y);
    return this.valid.has(this.key(t.c, t.r)) ? t : null;
  }

  getActiveUnit() {
    if (this.mode === 'player') {
      return (
        [...this.tokenStateMap.values()].find(
          (t) => t.id === this.myHeroTokenId || t.kind === 'heroi',
        ) || null
      );
    }
    if (this.selectedTokenId) {
      return this.tokenStateMap.get(this.selectedTokenId) || null;
    }
    return [...this.tokenStateMap.values()][0] || null;
  }

  isCellBlocked(k, activeUnit) {
    if (this.blocked.has(k)) return true;
    for (const [id, u] of this.tokenStateMap.entries()) {
      if (activeUnit && id === activeUnit.id) continue;
      if (this.key(u.c, u.r) === k) return true;
    }
    return false;
  }

  bfs(sc, sr, limit) {
    const activeUnit = this.getActiveUnit();
    const dist = new Map([[this.key(sc, sr), 0]]);
    const prev = new Map();
    const q = [[sc, sr]];

    for (let h = 0; h < q.length; h++) {
      const [c, r] = q[h];
      const d = dist.get(this.key(c, r));
      if (d >= limit) continue;
      for (const [dc, dr] of DIRS) {
        const nc = c + dc;
        const nr = r + dr;
        const k = this.key(nc, nr);
        if (!this.valid.has(k) || this.isCellBlocked(k, activeUnit) || dist.has(k)) continue;
        dist.set(k, d + 1);
        prev.set(k, this.key(c, r));
        q.push([nc, nr]);
      }
    }
    return { dist, prev };
  }

  recompute() {
    this.dirty = true;
    const u = this.getActiveUnit();
    if (!u) {
      this.reach = new Map();
      this.graph = null;
      return;
    }

    const tokenData = this.tokens.find((tk) => tk.id === u.id);
    const maxMoves = tokenData?.moves_left ?? this.moveLimit;
    this.graph = this.bfs(u.c, u.r, 60);
    this.reach = new Map([...this.graph.dist].filter(([k, d]) => d > 0 && d <= maxMoves));
  }

  pathTo(c, r) {
    const u = this.getActiveUnit();
    if (!u || !this.graph || !this.graph.dist.has(this.key(c, r))) return null;
    const out = [];
    let k = this.key(c, r);
    const startKey = this.key(u.c, u.r);
    while (k !== startKey) {
      out.unshift(k);
      k = this.graph.prev.get(k);
      if (!k) return null;
    }
    return out;
  }

  showFloatingText(txt, x, y, col = '#e8b45a') {
    this.floats.push({ x, y, t: 0, txt, col });
    this.dirty = true;
  }

  // ---------- CICLO DE DESENHO ----------
  drawDiamond(x, y, w = this.TW, h = this.TH) {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - h / 2);
    this.ctx.lineTo(x + w / 2, y);
    this.ctx.lineTo(x, y + h / 2);
    this.ctx.lineTo(x - w / 2, y);
    this.ctx.closePath();
  }

  drawShadow(x, y) {
    this.ctx.beginPath();
    this.ctx.ellipse(x, y + 2, this.TW * 0.32, this.TH * 0.28, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0,0,0,0.45)';
    this.ctx.fill();
  }

  drawUnit(u, now, dt) {
    const active = u.id === this.getActiveUnit()?.id;
    const lw = 1.2 / this.scale;
    const H = u.scale || 170;
    const bob = u.moving ? Math.abs(Math.sin(now / 95)) * -H * 0.025 : 0;

    this.drawShadow(u.x, u.y);

    // Losango de base
    this.drawDiamond(u.x, u.y, this.TW * 0.9, this.TH * 0.9);
    this.ctx.lineWidth = lw * (active ? 2.5 : 1.4);
    this.ctx.strokeStyle = active
      ? u.kind === 'heroi'
        ? 'rgba(232,180,90,0.95)'
        : 'rgba(255,107,94,0.95)'
      : 'rgba(235,230,210,0.35)';
    this.ctx.stroke();

    if (!u.media || !u.media.ready || !u.media.src) return;

    const src = u.media.src;
    const sw = src.videoWidth || src.naturalWidth || src.width;
    const sh = src.videoHeight || src.naturalHeight || src.height;
    if (!sw || !sh) return;

    const w = (H * sw) / sh;
    const kick = -u.recoil * this.TW * 0.06;
    const lx = u.lunge * this.TW * 0.3;
    const ly = u.lunge * this.TH * 0.3;

    this.ctx.save();
    this.ctx.translate(u.x + kick * u.face + lx, u.y + this.TH * 0.14 + bob + ly);
    this.ctx.scale(u.face, 1);
    this.ctx.drawImage(src, -w * u.ax, -H * u.ay, w, H);
    this.ctx.restore();

    // Barra de Vida e Nome para Monstros ou em seleção
    const tokenData = this.tokens.find((t) => t.id === u.id);
    const hp = tokenData?.hp;
    const maxHp = tokenData?.max_hp || hp;
    if (hp !== undefined && maxHp && (u.kind === 'monstro' || active)) {
      const bw = this.TW * 0.9;
      const bh = Math.max(4, this.TH * 0.13);
      const bx = u.x - bw / 2;
      const by = u.y - H - bh * 3;

      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      this.ctx.fillStyle = u.kind === 'monstro' ? '#c8423a' : '#52b788';
      this.ctx.fillRect(bx, by, Math.max(0, (bw * Math.min(hp, maxHp)) / maxHp), bh);

      this.ctx.font = `600 ${Math.max(10, this.TH * 0.32)}px Inter, system-ui, sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.lineWidth = 3 / this.scale;
      this.ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      this.ctx.fillStyle = '#f3e6d8';
      const label = `${u.name} ${hp}/${maxHp}`;
      this.ctx.strokeText(label, u.x, by - bh * 0.8);
      this.ctx.fillText(label, u.x, by - bh * 0.8);
    }
  }

  draw(now, dt) {
    this.scale = this.base * this.view.z;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    this.ctx.setTransform(
      this.scale,
      0,
      0,
      this.scale,
      -this.view.x * this.scale,
      -this.view.y * this.scale,
    );

    // 1. Fundo do mapa
    if (this.bgLoaded && this.bgImg.naturalWidth) {
      this.ctx.drawImage(this.bgImg, 0, 0, this.imgW, this.imgH);
    } else {
      this.ctx.fillStyle = '#0c0f0e';
      this.ctx.fillRect(0, 0, this.imgW, this.imgH);
    }

    const lw = 1.2 / this.scale;
    const addD = (k) => {
      const [c, r] = k.split(',').map(Number);
      const p = this.center(c, r);
      this.ctx.moveTo(p.x, p.y - this.TH / 2);
      this.ctx.lineTo(p.x + this.TW / 2, p.y);
      this.ctx.lineTo(p.x, p.y + this.TH / 2);
      this.ctx.lineTo(p.x - this.TW / 2, p.y);
      this.ctx.closePath();
    };

    // 2. Grade e células alcançáveis/bloqueadas num caminho só (alta performance)
    if (this.mapData?.show_grid !== false || this.isPainting) {
      const fillSet = this.isPainting ? this.blocked : this.reach.keys();
      if (fillSet) {
        this.ctx.beginPath();
        for (const k of fillSet) {
          if (this.valid.has(k)) addD(k);
        }
        this.ctx.fillStyle = this.isPainting ? 'rgba(255,90,70,0.38)' : 'rgba(232,180,90,0.2)';
        this.ctx.fill();
      }

      this.ctx.beginPath();
      for (const k of this.valid) addD(k);
      this.ctx.lineWidth = lw;
      this.ctx.strokeStyle = this.isPainting ? 'rgba(255,255,255,0.35)' : 'rgba(235,230,210,0.22)';
      this.ctx.stroke();
    }

    // 3. Caminho projetado (pontos / waypoints)
    const activeUnit = this.getActiveUnit();
    const tokenData = activeUnit ? this.tokens.find((t) => t.id === activeUnit.id) : null;
    const movesLeft = tokenData?.moves_left ?? this.moveLimit;

    if (!this.isPainting && this.hover && this.prevPath) {
      this.prevPath.forEach((k, n) => {
        const [c, r] = k.split(',').map(Number);
        const p = this.center(c, r);
        this.ctx.beginPath();
        this.ctx.ellipse(p.x, p.y, this.TW * 0.08, this.TH * 0.08, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = n < movesLeft ? 'rgba(242,194,114,0.95)' : 'rgba(255,122,107,0.9)';
        this.ctx.fill();
      });
    }

    // 4. Hover diamond
    if (this.hover) {
      const p = this.center(this.hover.c, this.hover.r);
      const k = this.key(this.hover.c, this.hover.r);
      this.drawDiamond(p.x, p.y);
      const isBlk = this.blocked.has(k);
      const bad = !this.isPainting && (isBlk || !this.prevPath || this.prevPath.length > movesLeft);
      this.ctx.fillStyle = this.isPainting
        ? 'rgba(255,255,255,0.16)'
        : bad
          ? 'rgba(255,122,107,0.22)'
          : 'rgba(232,180,90,0.28)';
      this.ctx.fill();
      this.ctx.lineWidth = lw * 2;
      this.ctx.strokeStyle = this.isPainting ? '#fff' : bad ? '#ff7a6b' : '#f2c272';
      this.ctx.stroke();
    }

    // 5. Peças ordenadas por Y
    const units = [...this.tokenStateMap.values()].sort((a, b) => a.y - b.y);
    for (const u of units) {
      this.drawUnit(u, now, dt);
    }

    // 6. Textos flutuantes (Dano / Curas)
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt;
      if (f.t > 1.4) {
        this.floats.splice(i, 1);
        continue;
      }
      this.ctx.globalAlpha = Math.min(1, 2 - f.t * 1.4);
      this.ctx.font = `800 ${Math.max(16, this.TH * 0.6)}px Inter, system-ui, sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.lineWidth = 4 / this.scale;
      this.ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      this.ctx.fillStyle = f.col;
      const yy = f.y - f.t * this.TH * 1.4;
      this.ctx.strokeText(f.txt, f.x, yy);
      this.ctx.fillText(f.txt, f.x, yy);
      this.ctx.globalAlpha = 1;
    }
  }

  // ---------- LAÇO PRINCIPAL (STEP) ----------
  step(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    let hasMediaUpdate = false;
    for (const u of this.tokenStateMap.values()) {
      if (u.media && globalMediaRegistry.updateFrame(u.media)) {
        hasMediaUpdate = true;
      }

      // Movimentação suave ao longo do path
      if (u.path && u.path.length) {
        u.moving = true;
        const [tc, tr] = u.path[0].split(',').map(Number);
        const p = this.center(tc, tr);
        const dx = p.x - u.x;
        const dy = p.y - u.y;
        const dist = Math.hypot(dx, dy);
        const sp = this.speed * Math.hypot(this.TW / 2, this.TH / 2) * dt;

        if (Math.abs(dx) > 1) u.face = dx < 0 ? -1 : 1;

        if (dist <= sp) {
          u.x = p.x;
          u.y = p.y;
          u.c = tc;
          u.r = tr;
          u.path.shift();
        } else {
          u.x += (dx / dist) * sp;
          u.y += (dy / dist) * sp;
        }

        if (!u.path.length) {
          u.moving = false;
          this.recompute();
          this.updateHover();
        }
      }
    }

    if (this.anim) this.anim(now);

    const isMovingAny = [...this.tokenStateMap.values()].some((u) => u.moving);
    if (this.dirty || hasMediaUpdate || this.anim || isMovingAny || this.floats.length > 0) {
      this.draw(now, dt);
      this.dirty = false;
    }

    this.rafId = requestAnimationFrame(this.step);
  }

  // ---------- NAVEGAÇÃO E ENTRADA ----------
  toImg(e) {
    const rc = this.cv.getBoundingClientRect();
    return {
      x: this.view.x + ((e.clientX - rc.left) / rc.width) * (this.imgW / this.view.z),
      y: this.view.y + ((e.clientY - rc.top) / rc.height) * (this.imgH / this.view.z),
    };
  }

  clampView() {
    this.dirty = true;
    this.view.z = Math.min(this.ZMAX, Math.max(this.ZMIN, this.view.z));
    this.view.x = Math.min(this.imgW - this.imgW / this.view.z, Math.max(0, this.view.x));
    this.view.y = Math.min(this.imgH - this.imgH / this.view.z, Math.max(0, this.view.y));
  }

  zoomAt(z, px, py) {
    const nz = Math.min(this.ZMAX, Math.max(this.ZMIN, z));
    this.view.x = px - ((px - this.view.x) * this.view.z) / nz;
    this.view.y = py - ((py - this.view.y) * this.view.z) / nz;
    this.view.z = nz;
    this.clampView();
    if (this.lastClient) {
      this.lastPt = this.toImg(this.lastClient);
      this.updateHover();
    }
  }

  animateTo(z, cx, cy) {
    const from = { ...this.view };
    const nz = Math.min(this.ZMAX, Math.max(this.ZMIN, z));
    const to = {
      z: nz,
      x: cx - this.imgW / nz / 2,
      y: cy - this.imgH / nz / 2,
    };
    const t0 = performance.now();
    this.anim = (now) => {
      const k = Math.min(1, (now - t0) / 320);
      const e = 1 - Math.pow(1 - k, 3);
      this.view.z = from.z + (to.z - from.z) * e;
      this.view.x = from.x + (to.x - from.x) * e;
      this.view.y = from.y + (to.y - from.y) * e;
      this.clampView();
      if (k >= 1) this.anim = null;
    };
  }

  updateHover() {
    this.dirty = true;
    this.hover = this.lastPt ? this.pick(this.lastPt.x, this.lastPt.y) : null;
    if (this.onHoverCellChange) {
      this.onHoverCellChange(
        this.hover ? { ...this.hover, key: this.key(this.hover.c, this.hover.r) } : null,
      );
    }
    const isMovingAny = [...this.tokenStateMap.values()].some((u) => u.moving);
    this.prevPath =
      this.hover && !this.isPainting && !isMovingAny
        ? this.pathTo(this.hover.c, this.hover.r)
        : null;
  }

  paintCell() {
    if (!this.paint || !this.hover) return;
    const k = this.key(this.hover.c, this.hover.r);
    if (k === this.paint.last) return;
    this.paint.last = k;

    if (this.paint.mode === 'block') this.blocked.add(k);
    else this.blocked.delete(k);

    this.recompute();
    if (this.onBlockedChange) {
      this.onBlockedChange([...this.blocked]);
    }
  }

  act() {
    if (!this.hover) return;
    const k = this.key(this.hover.c, this.hover.r);

    // 1. Verifica se clicou sobre alguma peça
    const clickedUnit = [...this.tokenStateMap.values()].find((u) => this.key(u.c, u.r) === k);

    if (this.mode === 'dm_editor' && clickedUnit) {
      this.selectedTokenId = clickedUnit.id;
      if (this.onSelectToken) this.onSelectToken(clickedUnit);
      this.recompute();
      return;
    }

    if (this.mode === 'player') {
      const activeUnit = this.getActiveUnit();
      if (!activeUnit || activeUnit.moving) return;

      if (!this.prevPath || !this.prevPath.length) return;
      const tokenData = this.tokens.find((t) => t.id === activeUnit.id);
      const movesLeft = tokenData?.moves_left ?? this.moveLimit;
      if (this.prevPath.length > movesLeft) return;

      const pathCopy = this.prevPath.slice();
      activeUnit.path = pathCopy;
      this.prevPath = null;

      if (this.onMoveToken) {
        this.onMoveToken(activeUnit, pathCopy, { c: this.hover.c, r: this.hover.r });
      }
      this.recompute();
    }
  }

  startPan(e) {
    this.pan = {
      cx: e.clientX,
      cy: e.clientY,
      vx: this.view.x,
      vy: this.view.y,
    };
    this.cv.classList.add('grab');
  }

  startPinch() {
    const [a, b] = [...this.pts.values()];
    const mid = { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 };
    this.pinch = {
      d: Math.hypot(a.x - b.x, a.y - b.y),
      z: this.view.z,
      p: this.toImg(mid),
    };
    this.press = null;
    this.pan = null;
    this.paint = null;
  }

  handlePointerDown(e) {
    this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      this.cv.setPointerCapture(e.pointerId);
    } catch (_) {}

    if (this.pts.size === 2) {
      this.startPinch();
      return;
    }

    this.lastClient = e;
    this.lastPt = this.toImg(e);
    this.updateHover();

    if (e.button === 1 || e.button === 2) {
      this.startPan(e);
      return;
    }

    if (this.isPainting && this.mode === 'dm_editor') {
      if (!this.hover) return;
      this.paint = {
        mode: this.blocked.has(this.key(this.hover.c, this.hover.r)) ? 'clear' : 'block',
        last: null,
      };
      this.paintCell();
      return;
    }

    this.press = { x: e.clientX, y: e.clientY };
  }

  handlePointerMove(e) {
    if (this.pts.has(e.pointerId)) {
      this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (this.pinch && this.pts.size >= 2) {
      const [a, b] = [...this.pts.values()];
      const rc = this.cv.getBoundingClientRect();
      const dd = Math.hypot(a.x - b.x, a.y - b.y);
      const nz = Math.min(this.ZMAX, Math.max(this.ZMIN, (this.pinch.z * dd) / this.pinch.d));
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      this.view.z = nz;
      this.view.x = this.pinch.p.x - ((mx - rc.left) / rc.width) * (this.imgW / nz);
      this.view.y = this.pinch.p.y - ((my - rc.top) / rc.height) * (this.imgH / nz);
      this.clampView();
      return;
    }

    if (
      this.press &&
      !this.pan &&
      Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y) > 6 &&
      this.view.z > 1.001
    ) {
      this.startPan({ clientX: this.press.x, clientY: this.press.y });
    }

    if (this.pan) {
      const rc = this.cv.getBoundingClientRect();
      this.view.x =
        this.pan.vx - ((e.clientX - this.pan.cx) / rc.width) * (this.imgW / this.view.z);
      this.view.y =
        this.pan.vy - ((e.clientY - this.pan.cy) / rc.height) * (this.imgH / this.view.z);
      this.clampView();
      this.press = null;
    }

    this.lastClient = e;
    this.lastPt = this.toImg(e);
    this.updateHover();
    this.paintCell();
  }

  handlePointerUp(e) {
    this.pts.delete(e.pointerId);
    if (this.pinch) {
      if (this.pts.size < 2) this.pinch = null;
      return;
    }

    if (this.press && !this.pan) {
      this.act();
    }

    this.press = null;
    if (this.pan) {
      this.pan = null;
      this.cv.classList.remove('grab');
    }
    this.paint = null;
  }

  handleWheel(e) {
    e.preventDefault();
    const p = this.toImg(e);
    this.lastClient = e;
    this.zoomAt(this.view.z * Math.exp(-e.deltaY * 0.0016), p.x, p.y);
  }

  zoomIn() {
    this.animateTo(
      this.view.z * 1.5,
      this.view.x + this.imgW / this.view.z / 2,
      this.view.y + this.imgH / this.view.z / 2,
    );
  }

  zoomOut() {
    this.animateTo(
      this.view.z / 1.5,
      this.view.x + this.imgW / this.view.z / 2,
      this.view.y + this.imgH / this.view.z / 2,
    );
  }

  zoomFit() {
    this.animateTo(1, this.imgW / 2, this.imgH / 2);
  }

  zoomHero() {
    const u = this.getActiveUnit();
    if (u) {
      this.animateTo(Math.max(this.view.z, 2), u.x, u.y - (u.scale || 170) * 0.4);
    }
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.cv.removeEventListener('pointerdown', this.handlePointerDown);
    this.cv.removeEventListener('pointermove', this.handlePointerMove);
    this.cv.removeEventListener('pointerup', this.handlePointerUp);
    this.cv.removeEventListener('pointercancel', this.handlePointerUp);
    this.cv.removeEventListener('wheel', this.handleWheel);

    for (const st of this.tokenStateMap.values()) {
      if (st.mediaUrl) globalMediaRegistry.release(st.mediaUrl);
    }
    this.tokenStateMap.clear();
  }
}

export default BattleEngine;
