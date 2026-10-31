import { describe, expect, it } from 'vitest';
import { evaluateRoll } from '../features/dice/engine/diceEngine';

describe('diceEngine — Motor de Avaliação 2d6 / Apple Pro', () => {
  it('avalia rolagem normal 2d6 somando os 2 dados e o modificador', () => {
    const res = evaluateRoll({
      dice: [3, 4],
      modifier: 2,
      peso: 8,
      mode: 'normal',
    });

    expect(res.kept).toEqual([3, 4]);
    expect(res.total).toBe(9); // 3 + 4 + 2
    expect(res.tone).toBe('sucesso');
  });

  it('mantém os 2 maiores dados em rolagem com vantagem (3d6)', () => {
    const res = evaluateRoll({
      dice: [2, 6, 4],
      modifier: 0,
      peso: 10,
      mode: 'vantagem',
    });

    expect(res.kept).toEqual([6, 4]);
    expect(res.total).toBe(10);
    expect(res.tone).toBe('sucesso');
  });

  it('mantém os 2 menores dados em rolagem com desvantagem (3d6)', () => {
    const res = evaluateRoll({
      dice: [5, 2, 4],
      modifier: 1,
      peso: 8,
      mode: 'desvantagem',
    });

    expect(res.kept).toEqual([2, 4]);
    expect(res.total).toBe(7); // 2 + 4 + 1
    expect(res.tone).toBe('falha');
  });

  it('identifica duplo 6 como Crítico com +1 Inspiração', () => {
    const res = evaluateRoll({
      dice: [6, 6],
      modifier: -2,
      peso: 12,
      mode: 'normal',
    });

    expect(res.kept).toEqual([6, 6]);
    expect(res.tone).toBe('critico');
    expect(res.label).toContain('Crítico');
  });

  it('identifica duplo 1 como Desastre Rúnico', () => {
    const res = evaluateRoll({
      dice: [1, 1],
      modifier: 10,
      peso: 8,
      mode: 'normal',
    });

    expect(res.kept).toEqual([1, 1]);
    expect(res.tone).toBe('desastre');
    expect(res.label).toContain('Desastre');
  });

  it('identifica sucesso brilhante quando total >= peso + 3', () => {
    const res = evaluateRoll({
      dice: [5, 5],
      modifier: 2,
      peso: 8,
      mode: 'normal',
    });

    expect(res.total).toBe(12); // 10 + 2 >= 8 + 3 = 11
    expect(res.tone).toBe('brilhante');
  });

  it('identifica falha quando total < peso', () => {
    const res = evaluateRoll({
      dice: [2, 3],
      modifier: 1,
      peso: 8,
      mode: 'normal',
    });

    expect(res.total).toBe(6);
    expect(res.tone).toBe('falha');
  });
});
