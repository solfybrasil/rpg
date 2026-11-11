import { describe, expect, it } from 'vitest';
// @ts-ignore: biblioteca em JS puro
import { clearFrame, createFrame, createFx } from '../vendor/pixelfx/core/fx.js';
// @ts-ignore: efeito em JS puro
import * as incendio from '../vendor/pixelfx/fx/fire/incendio.js';
// @ts-ignore: efeito em JS puro
import * as runas from '../vendor/pixelfx/fx/arcane/rune-circle.js';

const [W, H] = incendio.meta.size as [number, number];
const [OX, OY] = incendio.meta.origin as [number, number];

/** Pixels opacos do leito + chamas numa faixa de colunas/linhas em volta do centro da casa. */
function render(view: 'iso' | 'reta', mask: number, t = 0.7) {
  const fx = createFx(incendio, { x: OX, y: OY, view, mask, seed: 5 });
  fx.update(t);
  const f = createFrame(W, H);
  clearFrame(f);
  fx.draw(f);
  const solid = (x: number, y: number) => (f.color[(OY + y) * W + (OX + x)] >>> 24) > 0;
  return { solid };
}

describe('Incêndio de terreno', () => {
  it('reto: com vizinha à direita o fogo chega à borda; sem vizinha, recua', () => {
    // borda direita do quadrado: x = +19; meio da altura
    const joined = render('reta', 1);
    const open = render('reta', 0);
    const col = (r: ReturnType<typeof render>) => [-6, -2, 2, 6].filter((y) => r.solid(19, y)).length;
    expect(col(joined)).toBeGreaterThanOrEqual(3);
    expect(col(open)).toBe(0);
    // o lado oposto (sem vizinha nos dois casos) recua igual
    expect([-6, -2, 2, 6].filter((y) => joined.solid(-20, y)).length).toBe(0);
  });

  it('isométrico: o leito segue o losango e emenda na aresta da vizinha', () => {
    // aresta c+1 do losango: de (20, 0) a (0, 10); ponto médio (10, 5), um pouco para dentro
    const joined = render('iso', 1);
    const open = render('iso', 0);
    expect(joined.solid(9, 4)).toBe(true);
    expect(open.solid(9, 4)).toBe(false);
    // fora do losango (canto do retângulo) nunca tem chão queimado
    expect(joined.solid(18, 9)).toBe(false);
    // o centro sempre queima
    expect(open.solid(0, 0)).toBe(true);
  });

  it('é um laço perfeito: o fim do ciclo é igual ao começo', () => {
    const a = createFx(incendio, { x: OX, y: OY, view: 'iso', mask: 15, seed: 5 });
    const b = createFx(incendio, { x: OX, y: OY, view: 'iso', mask: 15, seed: 5 });
    a.update(0.25);
    b.update(0.25 + incendio.meta.duration);
    const fa = createFrame(W, H);
    const fb = createFrame(W, H);
    clearFrame(fa);
    clearFrame(fb);
    a.draw(fa);
    b.draw(fb);
    let diff = 0;
    for (let i = 0; i < fa.color.length; i++) if (fa.color[i] !== fb.color[i]) diff++;
    expect(diff).toBe(0);
  });
});

describe('Efeitos de chão em duas perspectivas', () => {
  it('o círculo de runas abre de elipse (0.5) para círculo (1)', () => {
    const height = (sy: number) => {
      runas.setSY(sy);
      const pad = 60;
      const [w, h] = runas.meta.size as [number, number];
      const [ox, oy] = runas.meta.origin as [number, number];
      const fx = createFx(runas, { x: ox, y: oy + pad, seed: 3 });
      fx.update(1);
      const f = createFrame(w, h + pad * 2);
      clearFrame(f);
      fx.draw(f);
      // altura do anel na coluna central, abaixo do centro
      let last = 0;
      for (let y = 0; y < 60; y++) if ((f.color[(oy + pad + y) * w + ox] >>> 24) > 0) last = y;
      runas.setSY(runas.SY0);
      return last;
    };
    const iso = height(0.5);
    const reta = height(1);
    expect(iso).toBeGreaterThan(15);
    expect(reta).toBeGreaterThan(iso * 1.7);
  });
});
