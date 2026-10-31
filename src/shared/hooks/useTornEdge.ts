import { type RefObject, useEffect } from 'react';

function createPseudoRandom(seedVal: number) {
  let s = seedVal;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * useTornEdge gera borda rasgada procedural via clip-path polygon.
 * Recalcula exclusivamente sob alteração de dimensão via ResizeObserver com seed fixa.
 */
export function useTornEdge(ref: RefObject<HTMLElement | null>, seed = 42, disabled = false) {
  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;

    const updateClipPath = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w === 0 || h === 0) return;

      const R = createPseudoRandom(seed * 97 + 13);
      const pts: string[] = [];
      const step = 9;
      const j = 4;

      for (let x = 0; x <= w; x += step) pts.push(`${x}px ${R() * j}px`);
      for (let y = 0; y <= h; y += step) pts.push(`${w - R() * j}px ${y}px`);
      for (let x2 = w; x2 >= 0; x2 -= step) pts.push(`${x2}px ${h - R() * j}px`);
      for (let y2 = h; y2 >= 0; y2 -= step) pts.push(`${R() * j}px ${y2}px`);

      el.style.clipPath = `polygon(${pts.join(',')})`;
    };

    updateClipPath();

    const ro = new ResizeObserver(() => {
      updateClipPath();
    });

    ro.observe(el);

    return () => {
      ro.disconnect();
      if (el) el.style.clipPath = '';
    };
  }, [ref, seed, disabled]);
}
