import { decodeCreatureMedia } from '../../battle-map/engine/mediaParams';

// biome-ignore lint/suspicious/noExplicitAny: linhas do catálogo vindas do banco
type Row = Record<string, any>;

/** Campos de mídia de batalha de uma fera, lidos do fragmento de `image_url` (com reserva local). */
export function creatureMediaFields(c: Row, local: Row = {}) {
  const m = decodeCreatureMedia(c.image_url);
  return {
    image_url: m.image,
    idle_mp4_url: m.mp4 || c.idle_mp4_url || local.idle_mp4_url || null,
    idle_webm_url: m.webm || c.idle_webm_url || local.idle_webm_url || null,
    poster_url: m.image || c.poster_url || local.poster_url || null,
    media_chroma: m.chroma || c.media_chroma || local.media_chroma || 'verde',
    media_anchor_x: Number(m.anchorX ?? c.media_anchor_x ?? local.media_anchor_x ?? 0.5),
    media_anchor_y: Number(m.anchorY ?? c.media_anchor_y ?? local.media_anchor_y ?? 0.98),
    media_size: Number(m.size ?? c.media_size ?? local.media_size ?? 160),
    media_facing: Number(m.facing ?? c.media_facing ?? local.media_facing ?? 1),
    media_brightness: m.brightness,
  };
}
