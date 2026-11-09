// @ts-nocheck
/**
 * Web Worker dos ladrilhos do mapa: desenha cada ladrilho fora da tela principal
 * e devolve um ImageBitmap (transferido, sem cópia). A interface nunca engasga.
 */
import { createTileRenderer } from './tileRenderer.js';

const R = createTileRenderer();

self.onmessage = (e) => {
  const m = e.data;
  if (m.t === 'init') {
    R.init(m.geo, m.k);
    R.setColors(m.c);
    self.postMessage({ ready: 1 });
    return;
  }
  if (m.t === 'colors') {
    R.setColors(m.c);
    return;
  }
  if (m.t === 'tile') {
    const oc = new OffscreenCanvas(m.ts, m.ts);
    const g = oc.getContext('2d');
    R.paint(g, m.L, m.x, m.y, m.layers);
    const b = oc.transferToImageBitmap();
    self.postMessage({ key: m.key, v: m.v, b }, [b]);
  }
};
