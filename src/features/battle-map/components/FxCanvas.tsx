import { memo, useEffect, useRef } from 'react';
import { FxSprite } from '../engine/FxSprite';

/**
 * Um efeito do pixelfx tocando num canvas próprio (prévia do Mestre, baú
 * abrindo). Para de pedir quadros quando o efeito fica parado e com a aba oculta.
 */
export const FxCanvas = memo(function FxCanvas({
  id,
  mode = 'loop',
  at,
  every,
  view,
  className = '',
  title,
}: {
  id: string;
  mode?: 'loop' | 'once' | 'still' | 'toStill';
  at?: number;
  every?: number;
  /** Perspectiva do chão do efeito (isométrica ou reta). */
  view?: 'iso' | 'reta';
  className?: string;
  title?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const sp = new FxSprite(id, mode, { at, every, view, seed: 3 });
    let raf = 0;
    let last = performance.now();
    let gone = false;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const paint = () => {
      const { w, h } = sp.box;
      if (!sp.ready) return;
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
      }
      ctx.clearRect(0, 0, cv.width, cv.height);
      const src = sp.source;
      if (src) ctx.drawImage(src, 0, 0);
    };
    const loop = (now: number) => {
      raf = 0;
      if (gone) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (sp.ready && sp.tick(reduce && mode === 'loop' ? 0 : dt)) paint();
      if (!sp.ready || !sp.idle) raf = requestAnimationFrame(loop);
      else paint();
    };
    raf = requestAnimationFrame(loop);
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [id, mode, at, every, view]);

  return (
    <canvas
      ref={ref}
      title={title}
      className={`block [image-rendering:pixelated] ${className}`}
      aria-hidden={title ? undefined : true}
    />
  );
});
