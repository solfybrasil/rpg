import { describe, expect, it } from 'vitest';
import { applyTokenPayload } from '../features/battle-map/api/useBattle.ts';
import { findFreeCells } from '../features/battle-map/components/dm/editorUtils.ts';
import { cellKey } from '../features/battle-map/engine/IsometricGrid.ts';
import type { BattleMap, BattleToken } from '../features/battle-map/engine/types.ts';

const tok = (id: string, c: number, r: number): BattleToken => ({ id, map_id: 'm', kind: 'heroi', name: id, c, r });

describe('Mesa de batalha — realtime das peças', () => {
  it('INSERT adiciona e um INSERT repetido vira atualização (sem duplicar)', () => {
    let list = applyTokenPayload([], { eventType: 'INSERT', new: tok('a', 0, 0), old: {} } as never);
    list = applyTokenPayload(list, { eventType: 'INSERT', new: tok('a', 2, 3), old: {} } as never);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ c: 2, r: 3 });
  });

  it('UPDATE mescla campos e DELETE remove', () => {
    let list = [tok('a', 0, 0), tok('b', 1, 1)];
    list = applyTokenPayload(list, { eventType: 'UPDATE', new: { id: 'b', moves_left: 2 }, old: {} } as never);
    expect(list[1]).toMatchObject({ c: 1, r: 1, moves_left: 2 });
    list = applyTokenPayload(list, { eventType: 'DELETE', new: {}, old: { id: 'a' } } as never);
    expect(list.map((t) => t.id)).toEqual(['b']);
  });
});

describe('Mesa de batalha — células livres para novas peças', () => {
  const map: BattleMap = {
    id: 'm',
    name: 'Teste',
    background_url: null,
    img_w: 1376,
    img_h: 768,
    tile_size: 86,
    origin_x: 690,
    origin_y: 418,
    show_grid: true,
    blocked: ['0,0'],
    move_limit: 6,
    status: 'rascunho',
    round: 1,
  };

  it('não repete células nem usa bloqueios ou células ocupadas', () => {
    const occupied = [tok('x', 1, 0), tok('y', 0, 1)];
    const cells = findFreeCells(map, occupied, 6);
    const keys = cells.map((c) => cellKey(c.c, c.r));
    expect(new Set(keys).size).toBe(6);
    expect(keys).not.toContain('0,0');
    expect(keys).not.toContain('1,0');
    expect(keys).not.toContain('0,1');
  });
});

import { buildGridG, centerG, pickG, toCellG } from '../features/battle-map/engine/IsometricGrid.ts';
import { readMapSettings, writeMapSettings } from '../features/battle-map/engine/mapSettings.ts';

describe('Mesa de batalha — grade vista de cima', () => {
  it('centro e célula são inversos', () => {
    const p = centerG('square', 3, 2, 32, 32, 64);
    expect(p).toEqual({ x: 32 + 192, y: 32 + 128 });
    expect(toCellG('square', p.x + 20, p.y - 20, 32, 32, 64)).toEqual({ c: 3, r: 2 });
  });

  it('cobre a imagem inteira com quadrados', () => {
    const valid = buildGridG('square', 640, 384, 32, 32, 64);
    expect(valid.size).toBe(10 * 6);
    expect(pickG('square', 5, 5, valid, 32, 32, 64, 640, 384)).toEqual({ c: 0, r: 0 });
    expect(pickG('square', 700, 5, valid, 32, 32, 64, 640, 384)).toBeNull();
  });

  it('isométrica continua igual à de antes', () => {
    expect(centerG('iso', 0, 0, 690, 418, 86)).toEqual({ x: 690, y: 418 });
  });
});

describe('Mesa de batalha — configurações no fundo', () => {
  it('lê e grava o tipo de grade sem estragar a URL', () => {
    const url = writeMapSettings('https://x/fundo.mp4', { grid: 'square' });
    expect(url).toBe('https://x/fundo.mp4#grade=quadrada');
    expect(readMapSettings(url)).toEqual({ url: 'https://x/fundo.mp4', grid: 'square', isVideo: true });
    expect(readMapSettings('/batalha/santuario.jpg')).toEqual({ url: '/batalha/santuario.jpg', grid: 'iso', isVideo: false });
    expect(writeMapSettings(url, { grid: 'iso' })).toBe('https://x/fundo.mp4');
  });
});
