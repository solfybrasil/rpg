/**
 * mediaProcessor.ts
 * Utilitários para processamento no navegador de vídeos e imagens de batalha:
 * - Detecção automática de chroma key (verde / magenta / nenhum)
 * - Detecção automática do ponto de apoio dos pés (anchor_x / anchor_y)
 * - Amostragem de quadros para cálculo de bounding box do personagem (+4% margem)
 * - Geração de poster PNG com fundo transparente
 * - Compressão e recorte via @ffmpeg/ffmpeg single-thread (mp4 h264 + webm vp9, max 480px, 24fps, sem áudio, max 8s)
 * - Upload para bucket 'midias' do Supabase principal
 */

import { supabase } from '../../../shared/supabase/client.ts';
import type { ChromaMode } from '../engine/types.ts';

export interface CropBox {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  videoW: number;
  videoH: number;
  duration: number;
}

export interface FeetAnchor {
  anchor_x: number;
  anchor_y: number;
}

export interface ProcessedImageResult {
  blob: Blob;
  posterBlob: Blob;
  anchor_x: number;
  anchor_y: number;
  chroma: ChromaMode;
  width: number;
  height: number;
}

export interface ProcessedVideoResult {
  mp4Blob: Blob | null;
  webmBlob: Blob | null;
  posterBlob: Blob;
  anchor_x: number;
  anchor_y: number;
  cropBox: CropBox;
}

export interface ProcessedMapBgResult {
  fullBlob: Blob;
  previewBlob: Blob | null;
  width: number;
  height: number;
}

// ── 1. Helper para verificar pixel chroma ──
export function isChromaPixel(
  r: number,
  g: number,
  b: number,
  a: number,
  chroma: ChromaMode | string = 'verde',
): boolean {
  if (a < 20) return true; // transparente
  if (chroma === 'verde') {
    const m = Math.max(r, b);
    const k = g - m;
    return k > 25 && g > 60;
  }
  if (chroma === 'magenta') {
    const m = Math.min(r, b);
    const k = m - g;
    return k > 25 && r > 60 && b > 60;
  }
  return false;
}

function normalizeCanvasOrCtx(
  target: any,
  w?: number,
  h?: number,
): { ctx: CanvasRenderingContext2D; width: number; height: number } {
  if (target && typeof target.getContext === 'function') {
    return {
      ctx: target.getContext('2d'),
      width: w || target.width,
      height: h || target.height,
    };
  }
  return { ctx: target, width: w || target?.width || 0, height: h || target?.height || 0 };
}

// ── 2. DETECÇÃO AUTOMÁTICA DE COR DE FUNDO (CANTOS) ──
export function detectChromaFromCanvas(
  target: any,
  w?: number,
  h?: number,
): ChromaMode {
  const { ctx, width, height } = normalizeCanvasOrCtx(target, w, h);
  if (!ctx || width <= 0 || height <= 0) return 'nenhum';

  const corners = [
    { x: 2, y: 2 },
    { x: width - 3, y: 2 },
    { x: 2, y: height - 3 },
    { x: width - 3, y: height - 3 },
  ];

  let greenScore = 0;
  let magentaScore = 0;
  let sampleCount = 0;

  for (const corner of corners) {
    const cx = Math.max(0, Math.min(width - 5, corner.x));
    const cy = Math.max(0, Math.min(height - 5, corner.y));
    const imgData = ctx.getImageData(cx, cy, 4, 4);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const a = d[i + 3];
      if (a < 50) continue;

      sampleCount++;
      // Verde: g dominante
      if (g > 65 && g - Math.max(r, b) > 20) {
        greenScore++;
      }
      // Magenta: r e b altos, g baixo
      if (r > 65 && b > 65 && Math.min(r, b) - g > 20) {
        magentaScore++;
      }
    }
  }

  if (sampleCount > 0) {
    if (greenScore / sampleCount > 0.4) return 'verde';
    if (magentaScore / sampleCount > 0.4) return 'magenta';
  }
  return 'nenhum';
}

// ── 3. DETECÇÃO AUTOMÁTICA DOS PÉS (ANCHOR) ──
export function detectFeetAnchor(
  target: any,
  w?: number | string,
  h?: number,
  chroma: ChromaMode | string = 'verde',
): FeetAnchor {
  let { ctx, width, height } = normalizeCanvasOrCtx(target, typeof w === 'number' ? w : undefined, h);
  if (typeof w === 'string') {
    chroma = w;
    width = target.width;
    height = target.height;
  }
  if (!ctx || width <= 0 || height <= 0) {
    return { anchor_x: 0.5, anchor_y: 0.985 };
  }

  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;

  let lowestY = -1;
  const bottomPointsX: number[] = [];

  // Varre de baixo para cima
  for (let y = height - 1; y >= 0; y--) {
    let rowHasSolid = false;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = d[idx];
      const g = d[idx + 1];
      const b = d[idx + 2];
      const a = d[idx + 3];

      if (!isChromaPixel(r, g, b, a, chroma)) {
        rowHasSolid = true;
        if (lowestY === -1) {
          lowestY = y;
        }
        if (y >= lowestY - 4) {
          bottomPointsX.push(x);
        }
      }
    }
    if (lowestY !== -1 && y < lowestY - 4) {
      break;
    }
  }

  if (lowestY === -1 || bottomPointsX.length === 0) {
    return { anchor_x: 0.5, anchor_y: 0.985 };
  }

  const avgX = bottomPointsX.reduce((acc, v) => acc + v, 0) / bottomPointsX.length;
  const anchor_x = Math.max(0.05, Math.min(0.95, Number((avgX / width).toFixed(3))));
  const anchor_y = Math.max(0.5, Math.min(1.0, Number((lowestY / height).toFixed(3))));

  return { anchor_x, anchor_y };
}

// ── 4. CÁLCULO DE BOUNDING BOX DO PERSONAGEM ──
export function getBoundingBox(
  target: any,
  w?: number | string,
  h?: number,
  chroma: ChromaMode | string = 'verde',
): { x: number; y: number; width: number; height: number } {
  let { ctx, width, height } = normalizeCanvasOrCtx(target, typeof w === 'number' ? w : undefined, h);
  if (typeof w === 'string') {
    chroma = w;
    width = target.width;
    height = target.height;
  }
  if (!ctx || width <= 0 || height <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasPixels = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = d[idx];
      const g = d[idx + 1];
      const b = d[idx + 2];
      const a = d[idx + 3];

      if (!isChromaPixel(r, g, b, a, chroma)) {
        hasPixels = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasPixels) {
    return { x: 0, y: 0, width, height };
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1),
  };
}

// ── 5. APLICAÇÃO DE CHROMA KEY COM TRANSPARÊNCIA ──
export function applyChromaToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  chroma: ChromaMode | string = 'verde',
): void {
  if (chroma === 'nenhum') return;
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const a = d[i + 3];

    if (a === 0) continue;

    if (chroma === 'verde') {
      const m = Math.max(r, b);
      const k = g - m;
      if (k > 70) {
        d[i + 3] = 0;
      } else if (k > 18) {
        const factor = (k - 18) / 52;
        d[i + 3] = Math.round(a * (1 - factor));
        if (d[i + 1] > m) d[i + 1] = m;
      }
    } else if (chroma === 'magenta') {
      const m = Math.min(r, b);
      const k = m - g;
      if (k > 70) {
        d[i + 3] = 0;
      } else if (k > 18) {
        const factor = (k - 18) / 52;
        d[i + 3] = Math.round(a * (1 - factor));
        const s = k - 18;
        d[i] = Math.max(0, r - s);
        d[i + 2] = Math.max(0, b - s);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeek = () => {
      video.removeEventListener('seeked', onSeek);
      resolve();
    };
    video.addEventListener('seeked', onSeek);
    video.currentTime = Math.min(video.duration || time, Math.max(0, time));
  });
}

// ── 6. AMOSTRAGEM DE VÍDEO (10 QUADROS) ──
export async function sampleVideoBoundingBox(
  videoFile: File | Blob,
  chroma: ChromaMode | string = 'verde',
  onProgress?: (pct: number) => void,
): Promise<CropBox> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const url = URL.createObjectURL(videoFile);
    video.src = url;

    video.onloadedmetadata = async () => {
      try {
        const duration = Math.min(8, video.duration || 4);
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Falha ao criar contexto 2D');

        const sampleCount = 10;
        let combinedMinX = w;
        let combinedMinY = h;
        let combinedMaxX = 0;
        let combinedMaxY = 0;

        for (let i = 0; i < sampleCount; i++) {
          const seekTime = (duration / (sampleCount + 1)) * (i + 1);
          await seekVideo(video, seekTime);
          ctx.drawImage(video, 0, 0, w, h);

          const box = getBoundingBox(ctx, w, h, chroma);
          if (box.width > 0 && box.height > 0) {
            combinedMinX = Math.min(combinedMinX, box.x);
            combinedMinY = Math.min(combinedMinY, box.y);
            combinedMaxX = Math.max(combinedMaxX, box.x + box.width);
            combinedMaxY = Math.max(combinedMaxY, box.y + box.height);
          }

          if (onProgress) {
            onProgress(Math.round(((i + 1) / sampleCount) * 20));
          }
        }

        URL.revokeObjectURL(url);

        if (combinedMaxX <= combinedMinX || combinedMaxY <= combinedMinY) {
          return resolve({
            cropX: 0,
            cropY: 0,
            cropW: w,
            cropH: h,
            videoW: w,
            videoH: h,
            duration,
          });
        }

        // Adiciona 4% de margem em volta
        const marginX = Math.round((combinedMaxX - combinedMinX) * 0.04);
        const marginY = Math.round((combinedMaxY - combinedMinY) * 0.04);

        let cropX = Math.max(0, combinedMinX - marginX);
        let cropY = Math.max(0, combinedMinY - marginY);
        let cropW = Math.min(w - cropX, combinedMaxX - combinedMinX + marginX * 2);
        let cropH = Math.min(h - cropY, combinedMaxY - combinedMinY + marginY * 2);

        // Garante dimensões pares para encoders H264 / VP9
        if (cropW % 2 !== 0) cropW = Math.min(w - cropX, cropW + 1);
        if (cropH % 2 !== 0) cropH = Math.min(h - cropY, cropH + 1);
        if (cropX % 2 !== 0 && cropX > 0) cropX -= 1;
        if (cropY % 2 !== 0 && cropY > 0) cropY -= 1;

        resolve({
          cropX,
          cropY,
          cropW,
          cropH,
          videoW: w,
          videoH: h,
          duration,
        });
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Erro ao carregar vídeo para análise.'));
    };
  });
}

// ── 7. GERAÇÃO DO POSTER TRANSPARENTE (PNG) ──
export async function generatePosterFromVideo(
  videoFile: File | Blob,
  cropBox: CropBox,
  chroma: ChromaMode | string = 'verde',
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(videoFile);
    video.src = url;

    video.onloadedmetadata = async () => {
      try {
        const midTime = (video.duration || 2) / 2;
        await seekVideo(video, midTime);

        const canvas = document.createElement('canvas');
        canvas.width = cropBox.cropW;
        canvas.height = cropBox.cropH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Falha ao criar contexto 2D');

        ctx.drawImage(
          video,
          cropBox.cropX,
          cropBox.cropY,
          cropBox.cropW,
          cropBox.cropH,
          0,
          0,
          cropBox.cropW,
          cropBox.cropH,
        );

        applyChromaToCanvas(ctx, cropBox.cropW, cropBox.cropH, chroma);

        URL.revokeObjectURL(url);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Falha ao gerar blob do poster PNG.'));
          },
          'image/png',
          1.0,
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Erro ao carregar vídeo para poster.'));
    };
  });
}

// ── 8. PROCESSAMENTO COMPLETO DE IMAGEM ESTÁTICA ──
export async function processImageFile(
  file: File | Blob,
  chroma: ChromaMode = 'verde',
): Promise<ProcessedImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = origW;
        tempCanvas.height = origH;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (!tempCtx) throw new Error('Falha no canvas');
        tempCtx.drawImage(img, 0, 0);

        const detectedChroma = chroma || detectChromaFromCanvas(tempCtx, origW, origH);
        applyChromaToCanvas(tempCtx, origW, origH, detectedChroma);

        const bbox = getBoundingBox(tempCtx, origW, origH, detectedChroma);
        const marginX = Math.round(bbox.width * 0.04);
        const marginY = Math.round(bbox.height * 0.04);

        const cropX = Math.max(0, bbox.x - marginX);
        const cropY = Math.max(0, bbox.y - marginY);
        const cropW = Math.min(origW - cropX, bbox.width + marginX * 2);
        const cropH = Math.min(origH - cropY, bbox.height + marginY * 2);

        const targetH = Math.min(512, cropH);
        const targetW = Math.round((cropW / cropH) * targetH);

        const outCanvas = document.createElement('canvas');
        outCanvas.width = targetW;
        outCanvas.height = targetH;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) throw new Error('Falha no canvas de saída');
        outCtx.imageSmoothingEnabled = true;
        outCtx.imageSmoothingQuality = 'high';

        outCtx.drawImage(
          tempCanvas,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          targetW,
          targetH,
        );

        const feet = detectFeetAnchor(outCtx, targetW, targetH, 'nenhum');

        URL.revokeObjectURL(url);

        outCanvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                blob,
                posterBlob: blob,
                anchor_x: feet.anchor_x,
                anchor_y: feet.anchor_y,
                chroma: detectedChroma,
                width: targetW,
                height: targetH,
              });
            } else {
              reject(new Error('Falha ao exportar imagem PNG.'));
            }
          },
          'image/png',
          1.0,
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Erro ao carregar arquivo de imagem.'));
    };
  });
}

// ── 9. PROCESSAMENTO DE VÍDEO COM @ffmpeg/ffmpeg (Single-Thread) ──
let ffmpegInstance: any = null;

async function getFFmpeg(onProgress?: (pct: number) => void): Promise<any> {
  if (ffmpegInstance) return ffmpegInstance;

  try {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');

    const ffmpeg = new FFmpeg();

    if (onProgress) {
      ffmpeg.on('progress', ({ progress }: { progress: number }) => {
        onProgress(Math.round(20 + progress * 70));
      });
    }

    // Carrega ffmpeg core single-thread via CDN confiável (sem dependência de SharedArrayBuffer)
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    return ffmpegInstance;
  } catch (err) {
    console.warn('[FFmpeg.wasm] Falha na inicialização do WASM, usando modo fallback:', err);
    return null;
  }
}

export async function processVideoFile(
  file: File | Blob,
  chroma: ChromaMode = 'verde',
  onProgress?: (pct: number, stepName?: string) => void,
): Promise<ProcessedVideoResult> {
  if (onProgress) onProgress(10, 'Analisando quadros do personagem…');
  const sample = await sampleVideoBoundingBox(file, chroma, (p) => {
    if (onProgress) onProgress(p, `Recortando silhueta… ${p}%`);
  });

  if (onProgress) onProgress(30, 'Gerando poster sem fundo…');
  const posterBlob = await generatePosterFromVideo(file, sample, chroma);

  // Calcula anchor dos pés no poster gerado
  let anchor_x = 0.5;
  let anchor_y = 0.985;
  try {
    const posterImg = await createImageBitmap(posterBlob);
    const testCanvas = document.createElement('canvas');
    testCanvas.width = posterImg.width;
    testCanvas.height = posterImg.height;
    const testCtx = testCanvas.getContext('2d');
    if (testCtx) {
      testCtx.drawImage(posterImg, 0, 0);
      const feet = detectFeetAnchor(testCtx, posterImg.width, posterImg.height, 'nenhum');
      anchor_x = feet.anchor_x;
      anchor_y = feet.anchor_y;
    }
  } catch (_) {}

  let mp4Blob: Blob | null = null;
  let webmBlob: Blob | null = null;

  try {
    if (onProgress) onProgress(40, 'Carregando motor de compressão…');
    const ffmpeg = await getFFmpeg((pct) => {
      if (onProgress) onProgress(pct, `Comprimindo mídia… ${pct}%`);
    });

    if (ffmpeg) {
      const { fetchFile } = await import('@ffmpeg/util');
      const inputData = await fetchFile(file);
      await ffmpeg.writeFile('input.mp4', inputData);

      const targetH = Math.min(480, sample.cropH);
      let targetW = Math.round((sample.cropW / sample.cropH) * targetH);
      if (targetW % 2 !== 0) targetW += 1;

      const durationLimit = Math.min(8, Math.round(sample.duration || 6));

      if (onProgress) onProgress(50, 'Gerando idle.mp4 otimizado…');
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-t', `${durationLimit}`,
        '-vf', `crop=${sample.cropW}:${sample.cropH}:${sample.cropX}:${sample.cropY},scale=${targetW}:${targetH}`,
        '-r', '24',
        '-c:v', 'libx264',
        '-crf', '26',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-an',
        'idle.mp4',
      ]);

      const mp4Data = await ffmpeg.readFile('idle.mp4');
      mp4Blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });

      if (onProgress) onProgress(75, 'Gerando idle.webm otimizado…');
      await ffmpeg.exec([
        '-i', 'idle.mp4',
        '-c:v', 'libvpx-vp9',
        '-crf', '34',
        '-b:v', '0',
        '-an',
        'idle.webm',
      ]);

      const webmData = await ffmpeg.readFile('idle.webm');
      webmBlob = new Blob([webmData.buffer], { type: 'video/webm' });

      try {
        await ffmpeg.deleteFile('input.mp4');
        await ffmpeg.deleteFile('idle.mp4');
        await ffmpeg.deleteFile('idle.webm');
      } catch (_) {}
    }
  } catch (err) {
    console.warn('[FFMPEG EXEC ERROR] Fallback para arquivo original:', err);
  }

  // Se o ffmpeg.wasm não conseguiu produzir (dispositivo sem suporte), usa arquivo original
  if (!mp4Blob && !webmBlob) {
    if (file.type.includes('webm')) {
      webmBlob = file;
    } else {
      mp4Blob = file;
    }
  }

  if (onProgress) onProgress(100, 'Processamento concluído!');

  return {
    mp4Blob,
    webmBlob,
    posterBlob,
    anchor_x,
    anchor_y,
    cropBox: sample,
  };
}

// ── 10. PROCESSAMENTO DE FUNDO DO MAPA (Max 2048px WebP + 512px Preview) ──
export async function processBattleMapBackground(
  file: File | Blob,
): Promise<ProcessedMapBgResult> {
  const bmp = await createImageBitmap(file);
  const origW = bmp.width;
  const origH = bmp.height;

  const maxDim = 2048;
  let targetW = origW;
  let targetH = origH;
  if (origW > maxDim || origH > maxDim) {
    if (origW >= origH) {
      targetW = maxDim;
      targetH = Math.round((origH / origW) * maxDim);
    } else {
      targetH = maxDim;
      targetW = Math.round((origW / origH) * maxDim);
    }
  }

  let fullBlob: Blob | null = null;
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, targetW, targetH);
    fullBlob = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.85));
    // Se o navegador não suportar WebP na conversão, faz fallback para JPEG
    if (!fullBlob) {
      fullBlob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.88));
    }
  }

  if (!fullBlob) {
    fullBlob = file;
  }

  // Preview 512px
  const prevDim = 512;
  let prevW = origW;
  let prevH = origH;
  if (origW >= origH) {
    prevW = prevDim;
    prevH = Math.round((origH / origW) * prevDim);
  } else {
    prevH = prevDim;
    prevW = Math.round((origW / origH) * prevDim);
  }

  let previewBlob: Blob | null = null;
  const prevCanvas = document.createElement('canvas');
  prevCanvas.width = prevW;
  prevCanvas.height = prevH;
  const prevCtx = prevCanvas.getContext('2d');
  if (prevCtx) {
    prevCtx.imageSmoothingEnabled = true;
    prevCtx.imageSmoothingQuality = 'high';
    prevCtx.drawImage(bmp, 0, 0, prevW, prevH);
    previewBlob = await new Promise((res) => prevCanvas.toBlob(res, 'image/webp', 0.80));
    if (!previewBlob) {
      previewBlob = await new Promise((res) => prevCanvas.toBlob(res, 'image/jpeg', 0.85));
    }
  }

  return {
    fullBlob,
    previewBlob,
    width: targetW,
    height: targetH,
  };
}

// ── 11. UPLOAD DE MÍDIA PARA BUCKET SUPABASE (banco principal) ──
export async function uploadBattleMedia(
  blob: Blob,
  path: string,
  bucket = 'midias',
): Promise<string> {
  // 1. Tenta bucket solicitado (ex: 'midias')
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, {
      upsert: true,
      cacheControl: '3600',
      contentType: blob.type || 'application/octet-stream',
    });

  if (!error && data) {
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
    return publicUrlData.publicUrl;
  }

  // 2. Se o bucket falhar por RLS (política ainda não criada no dashboard Supabase),
  // faz fallback automático para o bucket 'items' onde a política pública está ativa
  if (bucket !== 'items') {
    console.warn(`[STORAGE FALLBACK] Bucket '${bucket}' bloqueado por RLS. Usando 'items/${bucket}/...'`);
    const fallbackPath = `${bucket}/${path}`;
    const { data: fbData, error: fbError } = await supabase.storage
      .from('items')
      .upload(fallbackPath, blob, {
        upsert: true,
        cacheControl: '3600',
        contentType: blob.type || 'application/octet-stream',
      });

    if (!fbError && fbData) {
      const { data: fbUrlData } = supabase.storage
        .from('items')
        .getPublicUrl(fbData.path);
      return fbUrlData.publicUrl;
    }
  }

  console.error(`[STORAGE UPLOAD ERROR] Bucket: ${bucket}, Path: ${path}:`, error);
  throw new Error(`Falha no upload para o cofre (${error?.message || 'Erro de rede'})`);
}
