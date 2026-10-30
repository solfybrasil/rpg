import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Film,
  Image as ImageIcon,
  Loader2,
  Sliders,
  RotateCcw,
  Sparkles,
  ArrowRightLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  applyChromaToCanvas,
  detectChromaFromCanvas,
  detectFeetAnchor,
  processImageFile,
  processVideoFile,
  uploadBattleMedia,
} from '../media/mediaProcessor.ts';
import { supabase } from '../../../shared/supabase/client.ts';
import type { ChromaMode } from '../engine/types.ts';

export interface MediaBattleTarget {
  id: string;
  name?: string;
  kind?: 'heroi' | 'fera' | string;
  media_url?: string | null;
  idle_mp4_url?: string | null;
  idle_webm_url?: string | null;
  poster_url?: string | null;
  image_url?: string | null;
  chroma?: ChromaMode | string | null;
  media_chroma?: ChromaMode | string | null;
  anchor_x?: number | null;
  media_anchor_x?: number | null;
  anchor_y?: number | null;
  media_anchor_y?: number | null;
  size?: number | null;
  media_size?: number | null;
  facing?: number | null;
  media_facing?: number | null;
}

interface MediaBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType?: 'heroi' | 'fera';
  targetData: MediaBattleTarget | null;
  onMediaSaved?: (updatedTarget: MediaBattleTarget) => void;
}

export function MediaBattleModal({
  isOpen,
  onClose,
  targetType = 'heroi',
  targetData,
  onMediaSaved,
}: MediaBattleModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [chroma, setChroma] = useState<ChromaMode>('verde');
  const [anchorX, setAnchorX] = useState(0.5);
  const [anchorY, setAnchorY] = useState(0.985);
  const [size, setSize] = useState(160);
  const [facing, setFacing] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen || !targetData) return;

    const initialChroma =
      (targetData.media_chroma as ChromaMode) ||
      (targetData.chroma as ChromaMode) ||
      'verde';
    const initialAnchorX = Number(
      targetData.media_anchor_x ?? targetData.anchor_x ?? 0.5,
    );
    const initialAnchorY = Number(
      targetData.media_anchor_y ?? targetData.anchor_y ?? 0.985,
    );
    const initialSize = Number(
      targetData.media_size ?? targetData.size ?? 160,
    );
    const initialFacing = Number(
      targetData.media_facing ?? targetData.facing ?? 1,
    );

    setChroma(initialChroma);
    setAnchorX(initialAnchorX);
    setAnchorY(initialAnchorY);
    setSize(initialSize);
    setFacing(initialFacing);

    const existingMedia =
      targetData.idle_webm_url ||
      targetData.idle_mp4_url ||
      targetData.media_url ||
      targetData.poster_url ||
      targetData.image_url;

    if (existingMedia) {
      setPreviewSrc(existingMedia);
      const isVid =
        existingMedia.endsWith('.webm') || existingMedia.endsWith('.mp4');
      setIsVideo(isVid);
    } else {
      setPreviewSrc(null);
      setFile(null);
    }
  }, [isOpen, targetData]);

  const handleFileChange = async (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 50 MB.');
      return;
    }

    const isVid =
      selectedFile.type.startsWith('video/') ||
      Boolean(selectedFile.name.match(/\.(mp4|webm)$/i));
    setFile(selectedFile);
    setIsVideo(isVid);

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewSrc(objectUrl);

    // Auto-detecta fundo e pés
    if (isVid) {
      const vid = document.createElement('video');
      vid.crossOrigin = 'anonymous';
      vid.muted = true;
      vid.playsInline = true;
      vid.src = objectUrl;

      vid.onloadeddata = () => {
        vid.currentTime = 0.5;
      };
      vid.onseeked = () => {
        const c = document.createElement('canvas');
        c.width = vid.videoWidth || 640;
        c.height = vid.videoHeight || 480;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(vid, 0, 0, c.width, c.height);

        const detected = detectChromaFromCanvas(ctx, c.width, c.height);
        setChroma(detected);

        const feet = detectFeetAnchor(ctx, c.width, c.height, detected);
        setAnchorX(feet.anchor_x);
        setAnchorY(feet.anchor_y);
      };
    } else {
      const img = new Image();
      img.src = objectUrl;
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || 512;
        c.height = img.naturalHeight || 512;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        const detected = detectChromaFromCanvas(ctx, c.width, c.height);
        setChroma(detected);

        const feet = detectFeetAnchor(ctx, c.width, c.height, detected);
        setAnchorX(feet.anchor_x);
        setAnchorY(feet.anchor_y);
      };
    }
  };

  // Loop de renderização no canvas a 15 fps
  useEffect(() => {
    if (!isOpen || !previewSrc) return;

    let isRunning = true;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let vid: HTMLVideoElement | null = null;
    let img: HTMLImageElement | null = null;

    if (isVideo) {
      vid = document.createElement('video');
      vid.crossOrigin = 'anonymous';
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.autoplay = true;
      vid.src = previewSrc;
      vid.play().catch(() => {});
    } else {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = previewSrc;
    }

    let lastDraw = 0;
    const targetInterval = 1000 / 15; // 15 fps

    const render = (now: number) => {
      if (!isRunning) return;

      if (now - lastDraw >= targetInterval) {
        lastDraw = now;
        const cw = canvas.width;
        const ch = canvas.height;

        // Fundo xadrez escuro de masmorra
        ctx.fillStyle = '#0a0d0c';
        ctx.fillRect(0, 0, cw, ch);

        const checkSize = 16;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        for (let y = 0; y < ch; y += checkSize) {
          for (let x = 0; x < cw; x += checkSize) {
            if ((Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0) {
              ctx.fillRect(x, y, checkSize, checkSize);
            }
          }
        }

        // Losango Isométrico do chão de batalha
        const tw = 120;
        const th = 60;
        const groundX = cw / 2;
        const groundY = ch * 0.78;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(groundX, groundY - th / 2);
        ctx.lineTo(groundX + tw / 2, groundY);
        ctx.lineTo(groundX, groundY + th / 2);
        ctx.lineTo(groundX - tw / 2, groundY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(245, 182, 91, 0.08)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 182, 91, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Sombra suave do token
        ctx.beginPath();
        ctx.ellipse(groundX, groundY + 4, tw * 0.28, th * 0.22, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();
        ctx.restore();

        // Sprite com remoção de fundo e transformações
        const source = isVideo ? vid : img;
        const isReady = isVideo ? vid && vid.readyState >= 2 : img && img.complete;

        if (source && isReady) {
          const sw = isVideo
            ? (source as HTMLVideoElement).videoWidth
            : (source as HTMLImageElement).naturalWidth;
          const sh = isVideo
            ? (source as HTMLVideoElement).videoHeight
            : (source as HTMLImageElement).naturalHeight;

          if (sw > 0 && sh > 0) {
            const off = document.createElement('canvas');
            off.width = sw;
            off.height = sh;
            const offCtx = off.getContext('2d', { willReadFrequently: true });
            if (offCtx) {
              offCtx.drawImage(source, 0, 0, sw, sh);
              if (chroma !== 'nenhum') {
                applyChromaToCanvas(offCtx, sw, sh, chroma);
              }

              const scale = (size / sh) * 0.85;
              const dw = sw * scale;
              const dh = sh * scale;

              ctx.save();
              ctx.translate(groundX, groundY);
              ctx.scale(facing, 1);
              ctx.drawImage(off, -dw * anchorX, -dh * anchorY, dw, dh);
              ctx.restore();

              // Indicador visual dos pés (Anchor reticle dourado)
              ctx.save();
              ctx.strokeStyle = '#f5b65b';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(groundX, groundY, 4, 0, Math.PI * 2);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(groundX - 8, groundY);
              ctx.lineTo(groundX + 8, groundY);
              ctx.moveTo(groundX, groundY - 8);
              ctx.lineTo(groundX, groundY + 8);
              ctx.stroke();
              ctx.restore();
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (vid) {
        vid.pause();
        vid.src = '';
      }
    };
  }, [isOpen, previewSrc, isVideo, chroma, anchorX, anchorY, size, facing]);

  const handleSave = async () => {
    if (!targetData) return;

    try {
      setIsProcessing(true);
      setProgressPercent(10);
      setProgressText('Preparando arquivos…');

      const id = targetData.id;
      const folder = targetType === 'heroi' ? 'herois' : 'feras';

      let idleMp4Url = targetData.idle_mp4_url || null;
      let idleWebmUrl = targetData.idle_webm_url || null;
      let posterUrl = targetData.poster_url || null;
      let imageUrl = targetData.image_url || null;

      if (file) {
        if (isVideo) {
          const result = await processVideoFile(file, chroma, (pct, msg) => {
            setProgressPercent(pct);
            if (msg) setProgressText(msg);
          });

          setProgressText('Enviando arquivos para o cofre…');
          setProgressPercent(85);

          if (result.posterBlob) {
            posterUrl = await uploadBattleMedia(
              result.posterBlob,
              `${folder}/${id}/poster_${Date.now()}.png`,
              'midias',
            );
          }

          if (result.webmBlob) {
            idleWebmUrl = await uploadBattleMedia(
              result.webmBlob,
              `${folder}/${id}/idle_${Date.now()}.webm`,
              'midias',
            );
          }

          if (result.mp4Blob) {
            idleMp4Url = await uploadBattleMedia(
              result.mp4Blob,
              `${folder}/${id}/idle_${Date.now()}.mp4`,
              'midias',
            );
          }
        } else {
          setProgressText('Recortando e removendo fundo…');
          setProgressPercent(40);
          const result = await processImageFile(file, chroma);

          setProgressText('Enviando imagem…');
          setProgressPercent(80);
          imageUrl = await uploadBattleMedia(
            result.blob,
            `${folder}/${id}/image_${Date.now()}.png`,
            'midias',
          );
          posterUrl = imageUrl;
        }
      }

      const mediaUpdates = {
        idle_mp4_url: idleMp4Url,
        idle_webm_url: idleWebmUrl,
        poster_url: posterUrl,
        image_url: imageUrl,
        media_url: idleWebmUrl || idleMp4Url || imageUrl || posterUrl,
        media_chroma: chroma,
        chroma,
        media_anchor_x: Number(anchorX),
        anchor_x: Number(anchorX),
        media_anchor_y: Number(anchorY),
        anchor_y: Number(anchorY),
        media_size: Number(size),
        size: Number(size),
        media_facing: Number(facing),
        facing: Number(facing),
      };

      setProgressText('Salvando registro no banco…');
      setProgressPercent(95);

      const tableName = targetType === 'heroi' ? 'characters' : 'creature_catalog';
      const { error: dbError } = await supabase
        .from(tableName as any)
        .update(mediaUpdates)
        .eq('id', id);

      if (dbError) {
        throw new Error(`Falha ao gravar no banco: ${dbError.message}`);
      }

      // Propaga evento para tokens ativos da mesa atualizarem em tempo real
      window.dispatchEvent(
        new CustomEvent('peste-media-updated', {
          detail: {
            type: targetType,
            id,
            media: mediaUpdates,
          },
        }),
      );

      setProgressPercent(100);
      toast.success(
        `Mídia de ${targetData.name || 'peça'} salva com sucesso!`,
      );

      const updated = { ...targetData, ...mediaUpdates };
      onMediaSaved?.(updated);

      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 350);
    } catch (err: any) {
      console.error('[ERRO SALVAR MÍDIA]', err);
      toast.error(`Falha no processamento de mídia: ${err.message || 'Erro desconhecido'}`);
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-modal-title"
      data-testid="media-battle-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl bg-[#111114] border border-[#26262a] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#ebe6d6]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#26262a] bg-[#16161a]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#f5b65b]" />
            <h2 id="media-modal-title" className="text-base font-semibold font-cinzel text-[#f5b65b]">
              Mídia de Batalha · {targetData?.name || 'Peça'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8a8a93] hover:text-white hover:bg-[#26262a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[80vh]">
          {/* Canvas Preview */}
          <div className="flex flex-col items-center">
            <div className="relative w-full aspect-square max-w-[280px] rounded-xl overflow-hidden border border-[#26262a] bg-[#0a0d0c]">
              <canvas
                ref={previewCanvasRef}
                width={280}
                height={280}
                className="w-full h-full block"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-[#8a8a93] font-mono">
                15 FPS · Prévia
              </div>
            </div>

            <div className="mt-4 flex gap-2 w-full max-w-[280px]">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 px-3 rounded-lg border border-[#3b3b40] bg-[#1b1b1f] hover:bg-[#26262a] text-xs font-medium text-[#ebe6d6] flex items-center justify-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4 text-[#f5b65b]" />
                Escolher Arquivo
              </button>
              <button
                type="button"
                title="Inverter direção"
                onClick={() => setFacing((f) => (f === 1 ? -1 : 1))}
                className="p-2 rounded-lg border border-[#3b3b40] bg-[#1b1b1f] hover:bg-[#26262a] text-xs font-medium text-[#ebe6d6] transition-colors"
              >
                <ArrowRightLeft className="w-4 h-4 text-[#8a8a93]" />
              </button>
            </div>
          </div>

          {/* Controls & Sliders */}
          <div className="flex flex-col gap-4">
            {/* Chroma Key Selector */}
            <div>
              <label className="text-xs font-medium text-[#a1a1aa] mb-1.5 block">
                Fundo Croma Key
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['verde', 'magenta', 'nenhum'] as ChromaMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setChroma(mode)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-medium capitalize border transition-all ${
                      chroma === mode
                        ? 'border-[#f5b65b] bg-[#f5b65b]/10 text-[#f5b65b]'
                        : 'border-[#26262a] bg-[#16161a] text-[#a1a1aa] hover:border-[#3b3b40]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-2 border-t border-[#26262a]">
              <div>
                <div className="flex justify-between text-xs text-[#a1a1aa] mb-1">
                  <span>Tamanho da Peça</span>
                  <span className="font-mono text-[#f5b65b]">{size}px</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="320"
                  step="2"
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full accent-[#f5b65b] bg-[#26262a] h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-[#a1a1aa] mb-1">
                  <span>Apoio dos Pés (X)</span>
                  <span className="font-mono text-[#f5b65b]">{(anchorX * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.005"
                  value={anchorX}
                  onChange={(e) => setAnchorX(Number(e.target.value))}
                  className="w-full accent-[#f5b65b] bg-[#26262a] h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-[#a1a1aa] mb-1">
                  <span>Apoio dos Pés (Y)</span>
                  <span className="font-mono text-[#f5b65b]">{(anchorY * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.005"
                  value={anchorY}
                  onChange={(e) => setAnchorY(Number(e.target.value))}
                  className="w-full accent-[#f5b65b] bg-[#26262a] h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Processing Progress Bar */}
            {isProcessing && (
              <div className="mt-2 p-3 rounded-lg bg-[#16161a] border border-[#26262a] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-medium text-[#f5b65b]">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {progressText}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-[#26262a] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#f5b65b] h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#26262a] bg-[#16161a] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="py-2 px-4 rounded-xl border border-[#26262a] text-xs font-medium text-[#a1a1aa] hover:bg-[#26262a] hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isProcessing}
            className="py-2 px-5 rounded-xl bg-gradient-to-r from-[#f5b65b] to-[#d99a3e] text-[#111114] text-xs font-semibold shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando…
              </>
            ) : (
              'Salvar Mídia'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
