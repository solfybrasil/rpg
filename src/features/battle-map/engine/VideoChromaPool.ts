import type { ChromaMode } from './types.ts';

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

interface WebGLKeyer {
  canvas: HTMLCanvasElement;
  draw: (source: HTMLVideoElement | HTMLImageElement) => void;
  destroy: () => void;
}

function makeWebGLKeyer(mode: number, maxDim: number): WebGLKeyer | null {
  if (typeof document === 'undefined') return null;
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

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) throw new Error('Cannot create shader');
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s) || 'Shader error');
      }
      return s;
    };

    const pr = gl.createProgram();
    if (!pr) return null;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS_CHROMA));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS_CHROMA));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;

    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

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
        const sw = (source as HTMLVideoElement).videoWidth || source.width;
        const sh = (source as HTMLVideoElement).videoHeight || source.height;
        if (!sw || !sh) return;

        // Limita o canvas de chroma key ao tamanho configurado (máx 300px PC, 200px Celular)
        const scale = Math.min(1, maxDim / Math.max(sw, sh));
        const tw = Math.round(sw * scale);
        const th = Math.round(sh * scale);

        if (c.width !== tw || c.height !== th) {
          c.width = tw;
          c.height = th;
          gl.viewport(0, 0, tw, th);
        }
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          source,
        );
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
  } catch (_) {
    return null;
  }
}

export function keyGreen2D(d: Uint8ClampedArray): void {
  for (let p = 0; p < d.length; p += 4) {
    const r = d[p];
    const g = d[p + 1];
    const b = d[p + 2];
    const m = r > b ? r : b;
    const k = g - m;
    if (k > 70) {
      d[p + 3] = 0;
      continue;
    }
    if (k > 18) d[p + 3] = 255 * (1 - (k - 18) / 52);
    if (g > m) d[p + 1] = m;
  }
}

export function keyMagenta2D(d: Uint8ClampedArray): void {
  for (let p = 0; p < d.length; p += 4) {
    const r = d[p];
    const g = d[p + 1];
    const b = d[p + 2];
    const k = (r < b ? r : b) - g;
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

export interface MediaEntry {
  type: 'video' | 'image';
  el: HTMLVideoElement | HTMLImageElement;
  off?: HTMLCanvasElement;
  octx?: CanvasRenderingContext2D | null;
  keyer?: WebGLKeyer | null;
  chromaMode: ChromaMode;
  lastT: number;
  lastProcessTime: number;
  ready: boolean;
  refCount: number;
  src?: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement;
  isPlaying?: boolean;
}

export class VideoChromaPool {
  private cache = new Map<string, MediaEntry>();
  private autoplayUnlocked = false;

  constructor() {
    this.setupAutoplayUnlock();
  }

  private isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 900;
  }

  private getMaxDim(): number {
    return this.isMobile() ? 200 : 300;
  }

  public getMaxActiveVideos(): number {
    return this.isMobile() ? 5 : 8;
  }

  private setupAutoplayUnlock(): void {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.autoplayUnlocked = true;
      for (const entry of this.cache.values()) {
        if (entry.type === 'video' && (entry.el as HTMLVideoElement).paused) {
          (entry.el as HTMLVideoElement).play().catch(() => {});
        }
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  public get(url: string, chromaMode: ChromaMode = 'verde'): MediaEntry | null {
    if (!url || typeof document === 'undefined') return null;

    let entry = this.cache.get(url);
    if (!entry) {
      const isVideo =
        /\.(mp4|webm|ogv)$/i.test(url) ||
        url.startsWith('blob:') ||
        url.includes('video');

      if (isVideo) {
        const v = document.createElement('video');
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.autoplay = true;
        v.preload = 'auto';
        v.crossOrigin = 'anonymous';
        v.src = url;

        const maxDim = this.getMaxDim();
        const mode = chromaMode === 'magenta' ? 1 : 0;
        const keyer =
          chromaMode !== 'nenhum' ? makeWebGLKeyer(mode, maxDim) : null;

        const off = document.createElement('canvas');
        const octx = off.getContext('2d', { willReadFrequently: true });

        entry = {
          type: 'video',
          el: v,
          off,
          octx,
          keyer,
          chromaMode,
          lastT: -1,
          lastProcessTime: 0,
          ready: false,
          refCount: 1,
          isPlaying: false,
        };

        v.addEventListener('loadeddata', () => {
          if (entry) entry.ready = true;
        });

        const activeCount = this.getActiveVideoCount();
        if (activeCount < this.getMaxActiveVideos()) {
          v.play()
            .then(() => {
              if (entry) entry.isPlaying = true;
            })
            .catch(() => {});
        }
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        entry = {
          type: 'image',
          el: img,
          chromaMode: 'nenhum',
          lastT: -1,
          lastProcessTime: 0,
          ready: false,
          refCount: 1,
        };
        img.onload = () => {
          if (entry) {
            entry.ready = true;
            entry.src = img;
          }
        };
      }
      this.cache.set(url, entry);
    } else {
      entry.refCount++;
    }

    return entry;
  }

  public getActiveVideoCount(): number {
    let count = 0;
    for (const e of this.cache.values()) {
      if (e.type === 'video' && e.isPlaying) count++;
    }
    return count;
  }

  public release(url: string): void {
    if (!url || !this.cache.has(url)) return;
    const entry = this.cache.get(url)!;
    entry.refCount--;
    if (entry.refCount <= 0) {
      if (entry.type === 'video') {
        const v = entry.el as HTMLVideoElement;
        v.pause();
        v.removeAttribute('src');
        v.load();
        if (entry.keyer) entry.keyer.destroy();
      }
      this.cache.delete(url);
    }
  }

  /**
   * Atualiza o quadro de chroma key se houver novo frame e respeitando o limite de 24 fps
   */
  public updateFrame(entry: MediaEntry, now: number): boolean {
    if (!entry || !entry.ready) return false;
    if (entry.type === 'image') return false;

    const v = entry.el as HTMLVideoElement;
    if (v.readyState < 2 || !v.videoWidth) return false;

    // Respeita limite máximo de 24 fps (intervalo mínimo de ~41.6ms)
    if (now - entry.lastProcessTime < 41.6) {
      return false;
    }

    // Só processa quando o vídeo avançou de tempo
    if (entry.lastT === v.currentTime) {
      return false;
    }

    entry.lastT = v.currentTime;
    entry.lastProcessTime = now;

    if (entry.chromaMode === 'nenhum') {
      entry.src = v;
      return true;
    }

    // Modo WebGL acelerado por hardware
    if (entry.keyer) {
      entry.keyer.draw(v);
      entry.src = entry.keyer.canvas;
      return true;
    }

    // Fallback 2D CPU em resolução limitada (maxDim)
    const off = entry.off;
    const octx = entry.octx;
    if (!off || !octx) {
      entry.src = v;
      return true;
    }

    const maxDim = this.getMaxDim();
    const scale = Math.min(1, maxDim / Math.max(v.videoWidth, v.videoHeight));
    const w = Math.round(v.videoWidth * scale);
    const h = Math.round(v.videoHeight * scale);

    if (off.width !== w || off.height !== h) {
      off.width = w;
      off.height = h;
    }

    octx.drawImage(v, 0, 0, w, h);
    try {
      const imgData = octx.getImageData(0, 0, w, h);
      if (entry.chromaMode === 'magenta') {
        keyMagenta2D(imgData.data);
      } else {
        keyGreen2D(imgData.data);
      }
      octx.putImageData(imgData, 0, 0);
      entry.src = off;
      return true;
    } catch (_) {
      entry.src = v;
      return true;
    }
  }

  /**
   * Culling: pausa vídeos que estão fora da tela ou além do limite
   */
  public applyVideoLimits(visibleUrls: Set<string>): void {
    const maxActive = this.getMaxActiveVideos();
    let playing = 0;

    for (const [url, entry] of this.cache.entries()) {
      if (entry.type !== 'video') continue;
      const v = entry.el as HTMLVideoElement;
      const isVisible = visibleUrls.has(url);

      if (isVisible && playing < maxActive) {
        if (v.paused) {
          v.play()
            .then(() => {
              entry.isPlaying = true;
            })
            .catch(() => {});
        } else {
          entry.isPlaying = true;
        }
        playing++;
      } else {
        if (!v.paused) {
          v.pause();
          entry.isPlaying = false;
        }
      }
    }
  }

  public destroy(): void {
    for (const url of [...this.cache.keys()]) {
      this.release(url);
    }
    this.cache.clear();
  }
}
