import { useCallback, useEffect, useRef } from 'react';
import { buildGrid, cellKey, center } from '../../engine/IsometricGrid.ts';
import type { BattleMap, BattleToken } from '../../engine/types.ts';

/**
 * Gravação com debounce POR ITEM, juntando os campos alterados.
 * (Antes um único timer servia mapa, peça e bloqueios: um cancelava o outro.)
 */
export function useDebouncedSaver<T extends object>(
  save: (id: string, patch: Partial<T>) => Promise<unknown>,
  delay = 400,
) {
  const pending = useRef(new Map<string, { patch: Partial<T>; timer: ReturnType<typeof setTimeout> }>());
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback((id: string) => {
    const entry = pending.current.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.current.delete(id);
    saveRef.current(id, entry.patch).catch((err) => console.warn('[mesa] falha ao salvar', id, err));
  }, []);

  const queue = useCallback(
    (id: string, patch: Partial<T>) => {
      const prev = pending.current.get(id);
      if (prev) clearTimeout(prev.timer);
      const merged = { ...(prev?.patch ?? {}), ...patch };
      const timer = setTimeout(() => flush(id), delay);
      pending.current.set(id, { patch: merged, timer });
    },
    [delay, flush],
  );

  // Ao sair da tela, grava o que estiver pendente.
  useEffect(() => {
    const map = pending.current;
    return () => {
      for (const id of [...map.keys()]) flush(id);
    };
  }, [flush]);

  return queue;
}

/** Procura `count` células livres em espiral a partir do centro da imagem. */
export function findFreeCells(map: BattleMap, tokens: BattleToken[], count: number) {
  const imgW = Number(map.img_w) || 1376;
  const imgH = Number(map.img_h) || 768;
  const tw = Math.max(16, Number(map.tile_size) || 86);
  const th = tw / 2;
  const ox = Number(map.origin_x ?? 690);
  const oy = Number(map.origin_y ?? 418);
  const valid = buildGrid(imgW, imgH, ox, oy, tw, th);
  const taken = new Set<string>(Array.isArray(map.blocked) ? map.blocked : []);
  for (const t of tokens) taken.add(cellKey(t.c ?? 0, t.r ?? 0));

  // Célula mais próxima do centro visual do mapa
  let best = { c: 0, r: 0, d: Number.POSITIVE_INFINITY };
  for (const k of valid) {
    const [c, r] = k.split(',').map(Number);
    const p = center(c, r, ox, oy, tw, th);
    const d = Math.hypot(p.x - imgW / 2, p.y - imgH / 2);
    if (d < best.d) best = { c, r, d };
  }

  const out: Array<{ c: number; r: number }> = [];
  for (let ring = 0; ring < 40 && out.length < count; ring++) {
    for (let dc = -ring; dc <= ring && out.length < count; dc++) {
      for (let dr = -ring; dr <= ring && out.length < count; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
        const c = best.c + dc;
        const r = best.r + dr;
        const k = cellKey(c, r);
        if (!valid.has(k) || taken.has(k)) continue;
        taken.add(k);
        out.push({ c, r });
      }
    }
  }
  while (out.length < count) out.push({ c: best.c, r: best.r });
  return out;
}

/** Mídias padrão dos heróis que já têm vídeo em /public/batalha. */
const HERO_MEDIA: Array<{
  match: string;
  media_url: string;
  chroma: string;
  anchor_x: number;
  anchor_y: number;
  size: number;
}> = [
  { match: 'malenia', media_url: '/batalha/malenia_idle.webm', chroma: 'verde', anchor_x: 0.487, anchor_y: 0.985, size: 172 },
  { match: 'kaelis', media_url: '/batalha/kaelis_idle.webm', chroma: 'magenta', anchor_x: 0.486, anchor_y: 0.985, size: 166 },
  { match: 'tor', media_url: '/batalha/tor_idle.webm', chroma: 'verde', anchor_x: 0.412, anchor_y: 0.954, size: 130 },
];

export function heroMediaFor(id: string, name: string) {
  const ident = `${id} ${name}`.toLowerCase();
  const preset = HERO_MEDIA.find((p) => ident.includes(p.match));
  if (preset) {
    const { match: _m, ...rest } = preset;
    return rest;
  }
  return { media_url: null, chroma: 'nenhum', anchor_x: 0.5, anchor_y: 0.95, size: 150 };
}

/** Ordem de turno salva por mesa (no navegador do Mestre). */
export function loadTurnOrder(mapId: string): string[] {
  try {
    const raw = localStorage.getItem(`mesa.turno.${mapId}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveTurnOrder(mapId: string, ids: string[]) {
  try {
    localStorage.setItem(`mesa.turno.${mapId}`, JSON.stringify(ids));
  } catch {
    // sem armazenamento: só não persiste
  }
}

export function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
}
