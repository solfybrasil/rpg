/**
 * Ajustes de aparência da peça que não têm coluna própria em `battle_tokens` ficam no fragmento do
 * endereço da mídia (`…/idle.mp4#b=1.2`). O fragmento não vai na requisição HTTP: o arquivo carrega
 * igual e não é preciso migrar o banco (mesma ideia de `mapSettings`).
 */
export interface MediaParams {
  /** Endereço sem o fragmento (o que o navegador baixa). */
  url: string;
  /** Brilho: 1 = original, 0.5 = metade, 1.5 = 50% mais claro. */
  brightness: number;
}

export const BRIGHTNESS_MIN = 0.4;
export const BRIGHTNESS_MAX = 2;

export function splitMediaUrl(raw: string | null | undefined): MediaParams {
  const [url = '', frag = ''] = String(raw ?? '').split('#');
  const q = new URLSearchParams(frag);
  const b = Number(q.get('b'));
  return {
    url,
    brightness: Number.isFinite(b) && b > 0 ? Math.min(BRIGHTNESS_MAX, Math.max(BRIGHTNESS_MIN, b)) : 1,
  };
}

/** Junta o endereço e o brilho (sem fragmento quando o brilho é o original). */
export function withMediaParams(raw: string | null | undefined, p: Partial<Omit<MediaParams, 'url'>>): string {
  const cur = splitMediaUrl(raw);
  const b = Math.round((p.brightness ?? cur.brightness) * 100) / 100;
  if (!cur.url) return '';
  return Math.abs(b - 1) < 0.005 ? cur.url : `${cur.url}#b=${b}`;
}

export function isVideoUrl(url: string | null | undefined): boolean {
  return /\.(mp4|webm|mov|m4v|ogv)$/i.test(splitMediaUrl(url).url);
}

/**
 * Mídia de batalha de uma fera do catálogo. A tabela `creature_catalog` só tem `image_url`, então
 * o vídeo e os ajustes vão no fragmento dele: `poster.png#mp4=…&webm=…&c=verde&ax=0.5&ay=0.96&s=160&f=1&b=1`.
 * A imagem continua abrindo normalmente em qualquer lugar que use `image_url`.
 */
export interface CreatureMedia {
  image: string | null;
  mp4: string | null;
  webm: string | null;
  chroma: string | null;
  anchorX: number | null;
  anchorY: number | null;
  size: number | null;
  facing: number | null;
  brightness: number;
}

export function decodeCreatureMedia(raw: string | null | undefined): CreatureMedia {
  const [image = '', frag = ''] = String(raw ?? '').split('#');
  const q = new URLSearchParams(frag);
  const num = (k: string) => (q.has(k) && Number.isFinite(Number(q.get(k))) ? Number(q.get(k)) : null);
  const b = num('b');
  return {
    image: image || null,
    mp4: q.get('mp4'),
    webm: q.get('webm'),
    chroma: q.get('c'),
    anchorX: num('ax'),
    anchorY: num('ay'),
    size: num('s'),
    facing: num('f'),
    brightness: b && b > 0 ? Math.min(BRIGHTNESS_MAX, Math.max(BRIGHTNESS_MIN, b)) : 1,
  };
}

export function encodeCreatureMedia(m: Partial<CreatureMedia> & { image: string | null }): string | null {
  if (!m.image) return null;
  const q = new URLSearchParams();
  if (m.mp4) q.set('mp4', m.mp4);
  if (m.webm) q.set('webm', m.webm);
  if (m.chroma) q.set('c', m.chroma);
  if (m.anchorX != null) q.set('ax', String(m.anchorX));
  if (m.anchorY != null) q.set('ay', String(m.anchorY));
  if (m.size != null) q.set('s', String(Math.round(m.size)));
  if (m.facing != null) q.set('f', String(m.facing < 0 ? -1 : 1));
  if (m.brightness != null && Math.abs(m.brightness - 1) > 0.005) q.set('b', String(Math.round(m.brightness * 100) / 100));
  const s = q.toString();
  return s ? `${m.image}#${s}` : m.image;
}

/** Campos de peça a partir da mídia de uma fera do catálogo. */
export function creatureTokenMedia(imageUrl: string | null | undefined) {
  const m = decodeCreatureMedia(imageUrl);
  const main = m.mp4 || m.webm || m.image;
  if (!main) return null;
  return {
    media_url: withMediaParams(main, { brightness: m.brightness }),
    media_type: (isVideoUrl(main) ? 'video' : 'imagem') as 'video' | 'imagem',
    poster_url: m.image,
    idle_mp4_url: m.mp4,
    idle_webm_url: m.webm,
    chroma: m.chroma || (isVideoUrl(main) ? 'verde' : 'nenhum'),
    anchor_x: m.anchorX ?? 0.5,
    anchor_y: m.anchorY ?? 0.96,
    size: m.size ?? 160,
    facing: m.facing ?? 1,
  };
}
