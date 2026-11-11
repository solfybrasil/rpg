import { describe, expect, it } from 'vitest';
import { pickTokenMedia } from '../features/battle-map/api/battleApi';
import {
  creatureTokenMedia,
  decodeCreatureMedia,
  encodeCreatureMedia,
  isVideoUrl,
  splitMediaUrl,
  withMediaParams,
} from '../features/battle-map/engine/mediaParams';

describe('Brilho guardado no endereço da mídia', () => {
  it('lê e grava o brilho sem mexer no arquivo', () => {
    const u = 'https://x.supabase.co/storage/v1/object/public/midias/herois/k/idle_1.mp4';
    expect(splitMediaUrl(u)).toEqual({ url: u, brightness: 1 });
    const b = withMediaParams(u, { brightness: 1.35 });
    expect(b).toBe(`${u}#b=1.35`);
    expect(splitMediaUrl(b)).toEqual({ url: u, brightness: 1.35 });
    // brilho normal não deixa fragmento
    expect(withMediaParams(b, { brightness: 1 })).toBe(u);
    // limites
    expect(splitMediaUrl(`${u}#b=9`).brightness).toBe(2);
    expect(splitMediaUrl(`${u}#b=0.01`).brightness).toBe(0.4);
    expect(splitMediaUrl(`${u}#b=abc`).brightness).toBe(1);
  });

  it('vídeo ou imagem pelo arquivo, ignorando o fragmento', () => {
    expect(isVideoUrl('a/idle.mp4#b=1.2')).toBe(true);
    expect(isVideoUrl('a/idle.webm')).toBe(true);
    expect(isVideoUrl('a/imagem.png#b=0.8')).toBe(false);
    expect(isVideoUrl(null)).toBe(false);
  });
});

describe('Mídia da fera no catálogo', () => {
  it('vai e volta pelo image_url', () => {
    const raw = encodeCreatureMedia({
      image: 'https://x/poster.png',
      mp4: 'https://x/idle.mp4',
      webm: 'https://x/idle.webm',
      chroma: 'verde',
      anchorX: 0.42,
      anchorY: 0.97,
      size: 180,
      facing: -1,
      brightness: 1.2,
    });
    expect(raw?.startsWith('https://x/poster.png#')).toBe(true);
    const m = decodeCreatureMedia(raw);
    expect(m).toMatchObject({ image: 'https://x/poster.png', mp4: 'https://x/idle.mp4', chroma: 'verde', anchorX: 0.42, size: 180, facing: -1, brightness: 1.2 });
    // imagem antiga, sem fragmento, continua válida
    expect(decodeCreatureMedia('https://x/a.png')).toMatchObject({ image: 'https://x/a.png', mp4: null, brightness: 1 });
  });

  it('vira campos de peça com o MP4 como principal', () => {
    const t = creatureTokenMedia(encodeCreatureMedia({ image: 'p.png', mp4: 'v.mp4', webm: 'v.webm', chroma: 'magenta', brightness: 0.8 }));
    expect(t).toMatchObject({ media_url: 'v.mp4#b=0.8', media_type: 'video', chroma: 'magenta', poster_url: 'p.png', idle_webm_url: 'v.webm' });
    expect(creatureTokenMedia('so.png')).toMatchObject({ media_url: 'so.png', media_type: 'imagem', chroma: 'nenhum' });
    expect(creatureTokenMedia(null)).toBeNull();
  });
});

describe('Gravação da peça', () => {
  it('só manda colunas que existem em battle_tokens', () => {
    const p = pickTokenMedia({
      media_url: 'a.mp4',
      chroma: 'verde',
      size: 150,
      media_chroma: 'verde',
      media_size: 150,
      image_url: 'x.png',
      uploaded: true,
    });
    expect(Object.keys(p).sort()).toEqual(['chroma', 'media_url', 'size']);
  });
});
