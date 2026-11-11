import { FlipHorizontal, Loader2, RotateCcw, Sun, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, isVideoUrl, splitMediaUrl, withMediaParams } from '../engine/mediaParams.ts';
import type { ChromaMode } from '../engine/types.ts';
import {
  applyChromaToCanvas,
  detectChromaFromCanvas,
  processImageFile,
  processVideoFile,
  uploadBattleMedia,
} from '../media/mediaProcessor.ts';

/** Peça (ou fera do catálogo) cuja mídia está sendo editada. */
export interface MediaBattleTarget {
  /** Dono da mídia: herói, fera do catálogo ou a própria peça (pasta do arquivo enviado). */
  ownerId: string;
  name: string;
  kind: 'heroi' | 'fera' | string;
  media_url?: string | null;
  media_type?: string | null;
  poster_url?: string | null;
  idle_mp4_url?: string | null;
  idle_webm_url?: string | null;
  chroma?: string | null;
  anchor_x?: number | null;
  anchor_y?: number | null;
  size?: number | null;
  facing?: number | null;
}

/** Resultado salvo: só campos que existem nas peças (o brilho vai no fragmento de `media_url`). */
export interface MediaBattleResult {
  media_url: string | null;
  media_type: 'video' | 'imagem';
  poster_url: string | null;
  idle_mp4_url: string | null;
  idle_webm_url: string | null;
  chroma: ChromaMode;
  anchor_x: number;
  anchor_y: number;
  size: number;
  facing: number;
  /** Mídia nova enviada agora (não só ajustes). */
  uploaded: boolean;
}

interface Props {
  target: MediaBattleTarget;
  onClose: () => void;
  /** Grava (a tela decide onde). Se rejeitar, o modal mostra o erro e continua aberto. */
  onSave: (result: MediaBattleResult) => Promise<void>;
  /** Mostra os ajustes ao vivo na mesa (null = desfazer a prévia). */
  onPreview?: (result: MediaBattleResult | null) => void;
}

const label = "font-['Cinzel',serif] text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]";
const CHROMAS: Array<[ChromaMode, string]> = [
  ['verde', 'Fundo verde'],
  ['magenta', 'Fundo magenta'],
  ['nenhum', 'Sem fundo'],
];
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime';
const MAX_MB = 80;

function Slider({
  name,
  value,
  min,
  max,
  step,
  shown,
  onChange,
  testid,
}: {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  shown: string;
  onChange: (v: number) => void;
  testid?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between">
        <span className={label}>{name}</span>
        <span className="text-xs tabular-nums text-[var(--gold-hi)]">{shown}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        data-testid={testid}
        className="w-full accent-[var(--gold)]"
      />
    </label>
  );
}

/**
 * Mídia de uma peça do mapa: enviar imagem ou vídeo, recortar o fundo, acertar os pés, tamanho,
 * lado e brilho. O arquivo é processado e enviado assim que escolhido; depois os ajustes aparecem
 * ao vivo (aqui e na mesa) e só "Salvar" grava.
 */
export function MediaBattleModal({ target, onClose, onSave, onPreview }: Props) {
  const initial = splitMediaUrl(target.media_url);
  const [media, setMedia] = useState({
    url: initial.url || target.idle_mp4_url || target.idle_webm_url || target.poster_url || '',
    poster: target.poster_url ?? null,
    mp4: target.idle_mp4_url ?? null,
    webm: target.idle_webm_url ?? null,
  });
  const [chroma, setChroma] = useState<ChromaMode>(((target.chroma as ChromaMode) || 'verde') as ChromaMode);
  const [anchorX, setAnchorX] = useState(Number(target.anchor_x ?? 0.5));
  const [anchorY, setAnchorY] = useState(Number(target.anchor_y ?? 0.96));
  const [size, setSize] = useState(Number(target.size ?? 160));
  const [facing, setFacing] = useState(Number(target.facing ?? 1) < 0 ? -1 : 1);
  const [brightness, setBrightness] = useState(initial.brightness);
  const [uploaded, setUploaded] = useState(false);
  const [busy, setBusy] = useState<{ pct: number; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isVideo = isVideoUrl(media.url);

  const result = useCallback(
    (): MediaBattleResult => ({
      media_url: media.url ? withMediaParams(media.url, { brightness }) : null,
      media_type: isVideo ? 'video' : 'imagem',
      poster_url: media.poster,
      idle_mp4_url: media.mp4,
      idle_webm_url: media.webm,
      chroma,
      anchor_x: Math.round(anchorX * 1000) / 1000,
      anchor_y: Math.round(anchorY * 1000) / 1000,
      size: Math.round(size),
      facing,
      uploaded,
    }),
    [media, brightness, isVideo, chroma, anchorX, anchorY, size, facing, uploaded],
  );

  // Prévia ao vivo na mesa (agrupada: no máximo ~8 por segundo)
  useEffect(() => {
    if (!onPreview || !media.url) return;
    const t = setTimeout(() => onPreview(result()), 120);
    return () => clearTimeout(t);
  }, [onPreview, result, media.url]);

  const close = useCallback(() => {
    if (busy || saving) return;
    onPreview?.(null);
    onClose();
  }, [busy, saving, onPreview, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // ── Envio: processa e sobe na hora ──
  const handleFile = async (file: File) => {
    setError(null);
    const video = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    const image = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
    if (!video && !image) return setError('Escolha uma imagem (PNG, JPG, WEBP) ou um vídeo (MP4, WEBM, MOV).');
    if (file.size > MAX_MB * 1024 * 1024) return setError(`O arquivo passa de ${MAX_MB} MB. Corte ou comprima antes.`);

    const folder = target.kind === 'heroi' ? 'herois' : target.kind === 'fera' ? 'feras' : 'pecas';
    const base = `${folder}/${target.ownerId}`;
    const stamp = Date.now();
    try {
      // Descobre o fundo a partir de um quadro do arquivo
      setBusy({ pct: 5, text: 'Lendo o arquivo…' });
      const detected = await detectChroma(file, video);
      setChroma(detected);

      if (video) {
        const r = await processVideoFile(file, detected, (pct, step) => setBusy({ pct: Math.min(80, pct), text: step || 'Processando…' }));
        setBusy({ pct: 85, text: 'Enviando…' });
        const [poster, mp4, webm] = await Promise.all([
          uploadBattleMedia(r.posterBlob, `${base}/poster_${stamp}.png`, 'midias'),
          r.mp4Blob ? uploadBattleMedia(r.mp4Blob, `${base}/idle_${stamp}.mp4`, 'midias') : Promise.resolve(null),
          r.webmBlob ? uploadBattleMedia(r.webmBlob, `${base}/idle_${stamp}.webm`, 'midias') : Promise.resolve(null),
        ]);
        // MP4 (H.264) toca em qualquer aparelho, inclusive iPhone; o WEBM fica de reserva.
        const main = mp4 || webm;
        if (!main) throw new Error('Não deu para converter o vídeo neste navegador. Tente um MP4 curto.');
        setMedia({ url: main, poster, mp4, webm });
        // Os pés são medidos no vídeo já recortado (o recorte muda a posição relativa).
        setAnchorX(r.anchor_x);
        setAnchorY(r.anchor_y);
      } else {
        setBusy({ pct: 35, text: 'Recortando o fundo…' });
        const r = await processImageFile(file, detected);
        setBusy({ pct: 75, text: 'Enviando…' });
        const url = await uploadBattleMedia(r.blob, `${base}/imagem_${stamp}.png`, 'midias');
        setMedia({ url, poster: url, mp4: null, webm: null });
        setAnchorX(r.anchor_x);
        setAnchorY(r.anchor_y);
        // A imagem já sai sem fundo: recortar de novo na mesa comeria partes da peça.
        setChroma('nenhum');
      }
      setUploaded(true);
      setBusy(null);
      toast.success('Mídia enviada. Ajuste e salve.');
    } catch (err) {
      setBusy(null);
      setError(err instanceof Error ? err.message : 'Falha ao enviar a mídia.');
    }
  };

  const save = async () => {
    if (!media.url) return setError('Envie uma imagem ou vídeo primeiro.');
    setSaving(true);
    setError(null);
    try {
      await onSave(result());
      toast.success(`Mídia de ${target.name} salva.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  // ── Prévia: a peça sobre uma casa, com fundo recortado e brilho ──
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !media.url) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let alive = true;
    let raf = 0;
    let el: HTMLVideoElement | HTMLImageElement;
    if (isVideo) {
      const v = document.createElement('video');
      v.crossOrigin = 'anonymous';
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.src = media.url;
      void v.play().catch(() => {});
      el = v;
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = media.url;
      el = img;
    }
    const off = document.createElement('canvas');
    const offCtx = off.getContext('2d', { willReadFrequently: true });
    let last = 0;
    const draw = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(draw);
      if (now - last < 66) return; // ~15 quadros/s bastam para a prévia
      last = now;
      const W = cv.width;
      const H = cv.height;
      ctx.clearRect(0, 0, W, H);
      // casa
      const gx = W / 2;
      const gy = H * 0.8;
      ctx.beginPath();
      ctx.moveTo(gx, gy - 30);
      ctx.lineTo(gx + 60, gy);
      ctx.lineTo(gx, gy + 30);
      ctx.lineTo(gx - 60, gy);
      ctx.closePath();
      ctx.fillStyle = 'rgba(201, 164, 92, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(201, 164, 92, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(gx, gy + 2, 34, 13, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fill();

      const sw = isVideo ? (el as HTMLVideoElement).videoWidth : (el as HTMLImageElement).naturalWidth;
      const sh = isVideo ? (el as HTMLVideoElement).videoHeight : (el as HTMLImageElement).naturalHeight;
      if (!sw || !sh || !offCtx) return;
      if (isVideo && (el as HTMLVideoElement).readyState < 2) return;
      off.width = sw;
      off.height = sh;
      offCtx.drawImage(el, 0, 0);
      if (chroma !== 'nenhum') applyChromaToCanvas(offCtx, sw, sh, chroma);
      const h = size * (H / 320);
      const w = (h * sw) / sh;
      ctx.save();
      ctx.translate(gx, gy + 6);
      ctx.scale(facing, 1);
      if (Math.abs(brightness - 1) > 0.01) ctx.filter = `brightness(${brightness})`;
      ctx.drawImage(off, -w * anchorX, -h * anchorY, w, h);
      ctx.restore();
      // mira dos pés
      ctx.strokeStyle = '#ecd395';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx - 7, gy + 6);
      ctx.lineTo(gx + 7, gy + 6);
      ctx.moveTo(gx, gy - 1);
      ctx.lineTo(gx, gy + 13);
      ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      if (isVideo) {
        (el as HTMLVideoElement).pause();
        (el as HTMLVideoElement).removeAttribute('src');
      }
    };
  }, [media.url, isVideo, chroma, anchorX, anchorY, size, facing, brightness]);

  const node = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label={`Mídia de ${target.name}`} data-testid="media-battle-modal">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/80 cursor-default" onClick={close} />
      <div className="relative w-full max-w-3xl max-h-[94dvh] overflow-y-auto bg-[var(--stone)] border border-[var(--gold-lo)] shadow-[0_20px_60px_rgba(0,0,0,0.7)] font-[family-name:var(--body)] text-[var(--text)] animate-[fadeIn_var(--t-base)_var(--ease-out)]">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--iron)]">
          <h2 className="flex-1 font-['Cinzel',serif] text-base tracking-[0.12em] text-[var(--gold-hi)] truncate">Mídia · {target.name}</h2>
          <button type="button" onClick={close} aria-label="Fechar" className="w-9 h-9 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="grid md:grid-cols-[1fr_300px]">
          {/* Prévia + envio */}
          <section className="p-4 flex flex-col gap-3 border-b md:border-b-0 md:border-r border-[var(--iron)]">
            <div
              className={`relative aspect-[4/5] max-h-[52dvh] mx-auto w-full flex items-center justify-center border ${
                drag ? 'border-[var(--gold)] bg-[var(--gold)]/5' : 'border-[var(--iron)] bg-[var(--abyss)]'
              }`}
              style={{ backgroundImage: 'var(--mottle)' }}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const f = e.dataTransfer.files?.[0];
                if (f && !busy) void handleFile(f);
              }}
            >
              {media.url ? (
                <canvas ref={canvasRef} width={320} height={400} className="w-full h-full" data-testid="media-preview" />
              ) : (
                <p className="p-6 text-center text-sm italic text-[var(--muted)]">Arraste uma imagem ou vídeo para cá.</p>
              )}
              {busy && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--abyss)]/85">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)]" />
                  <p className="text-sm text-[var(--text)]">{busy.text}</p>
                  <div className="w-2/3 h-1.5 bg-[var(--abyss)] border border-[var(--iron)]">
                    <div className="h-full bg-[var(--gold)] origin-left transition-transform duration-[var(--t-base)]" style={{ transform: `scaleX(${busy.pct / 100})` }} />
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => fileRef.current?.click()}
              data-testid="media-pick"
              className="h-10 flex items-center justify-center gap-2 border border-[var(--iron)] text-sm cursor-pointer hover:border-[var(--gold-lo)] active:translate-y-px disabled:opacity-50"
            >
              <Upload className="w-4 h-4" /> {media.url ? 'Trocar imagem ou vídeo' : 'Enviar imagem ou vídeo'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              hidden
              data-testid="media-file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void handleFile(f);
              }}
            />
            <p className="text-[11px] text-[var(--muted)]">
              Vídeo: até 8 s, fundo verde ou magenta liso. Imagem: PNG sem fundo ou com fundo liso. O fundo é recortado e os pés,
              encontrados sozinhos.
            </p>
          </section>

          {/* Ajustes */}
          <section className="p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className={label}>Recorte do fundo</span>
              <div className="grid grid-cols-3 gap-1">
                {CHROMAS.map(([k, t]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={chroma === k}
                    onClick={() => setChroma(k)}
                    data-testid={`chroma-${k}`}
                    className={`h-8 text-[11px] border cursor-pointer ${
                      chroma === k ? 'border-[var(--gold)] text-[var(--gold-hi)] bg-[var(--gold)]/10' : 'border-[var(--iron)] text-[var(--muted)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <Slider name="Tamanho" value={size} min={60} max={360} step={2} shown={`${Math.round(size)} px`} onChange={setSize} testid="media-size" />
            <div className="flex flex-col gap-1">
              <Slider
                name="Brilho"
                value={brightness}
                min={BRIGHTNESS_MIN}
                max={BRIGHTNESS_MAX}
                step={0.05}
                shown={`${Math.round(brightness * 100)}%`}
                onChange={setBrightness}
                testid="media-brightness"
              />
              <div className="flex gap-1">
                {[
                  [0.75, 'Sombra'],
                  [1, 'Normal'],
                  [1.3, 'Iluminado'],
                ].map(([v, t]) => (
                  <button
                    key={t as string}
                    type="button"
                    onClick={() => setBrightness(v as number)}
                    className={`flex-1 h-7 text-[11px] border cursor-pointer ${
                      Math.abs(brightness - (v as number)) < 0.01 ? 'border-[var(--gold)] text-[var(--gold-hi)]' : 'border-[var(--iron)] text-[var(--muted)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className={label}>Pés na casa</span>
              <Slider name="Para os lados" value={anchorX} min={0} max={1} step={0.005} shown={`${Math.round(anchorX * 100)}%`} onChange={setAnchorX} />
              <Slider name="Para cima ou baixo" value={anchorY} min={0.5} max={1.05} step={0.005} shown={`${Math.round(anchorY * 100)}%`} onChange={setAnchorY} />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setFacing((f) => -f)}
                className="h-8 flex items-center justify-center gap-1.5 border border-[var(--iron)] text-xs cursor-pointer hover:border-[var(--gold-lo)]"
              >
                <FlipHorizontal className="w-3.5 h-3.5" /> {facing < 0 ? 'Virado' : 'Virar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSize(Number(target.size ?? 160));
                  setAnchorX(Number(target.anchor_x ?? 0.5));
                  setAnchorY(Number(target.anchor_y ?? 0.96));
                  setBrightness(initial.brightness);
                  setFacing(Number(target.facing ?? 1) < 0 ? -1 : 1);
                }}
                className="h-8 flex items-center justify-center gap-1.5 border border-[var(--iron)] text-xs cursor-pointer hover:border-[var(--gold-lo)]"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Desfazer ajustes
              </button>
            </div>

            {error && (
              <p className="px-2 py-1.5 border border-[var(--blood)] bg-[var(--blood)]/10 text-xs text-[#e0645a]" data-testid="media-error">
                {error}
              </p>
            )}

            <div className="flex gap-2 mt-auto">
              <button type="button" onClick={close} disabled={Boolean(busy) || saving} className="h-10 px-4 border border-[var(--iron)] text-sm cursor-pointer disabled:opacity-40">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={Boolean(busy) || saving || !media.url}
                data-testid="media-save"
                className="flex-1 h-10 flex items-center justify-center gap-2 border border-[var(--gold)] bg-[var(--gold)] text-[var(--abyss)] font-['Cinzel',serif] text-sm tracking-[0.1em] cursor-pointer active:translate-y-px disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sun className="w-4 h-4" />}
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

/** Lê um quadro do arquivo e descobre a cor do fundo. */
async function detectChroma(file: File, video: boolean): Promise<ChromaMode> {
  const url = URL.createObjectURL(file);
  try {
    const frame = await new Promise<HTMLCanvasElement>((resolve, reject) => {
      const toCanvas = (src: CanvasImageSource, w: number, h: number) => {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.min(640, w));
        c.height = Math.max(1, Math.round((c.width / Math.max(1, w)) * h));
        c.getContext('2d')?.drawImage(src, 0, 0, c.width, c.height);
        resolve(c);
      };
      if (video) {
        const v = document.createElement('video');
        v.muted = true;
        v.playsInline = true;
        v.preload = 'auto';
        v.src = url;
        v.onloadeddata = () => {
          v.currentTime = Math.min(0.5, (v.duration || 1) / 2);
        };
        v.onseeked = () => toCanvas(v, v.videoWidth, v.videoHeight);
        v.onerror = () => reject(new Error('Este vídeo não abre neste navegador. Tente MP4 (H.264).'));
      } else {
        const img = new Image();
        img.onload = () => toCanvas(img, img.naturalWidth, img.naturalHeight);
        img.onerror = () => reject(new Error('Não deu para abrir a imagem.'));
        img.src = url;
      }
    });
    const ctx = frame.getContext('2d', { willReadFrequently: true });
    return ctx ? detectChromaFromCanvas(ctx, frame.width, frame.height) : 'verde';
  } finally {
    URL.revokeObjectURL(url);
  }
}
