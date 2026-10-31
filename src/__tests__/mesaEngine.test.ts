import { describe, it, expect } from 'vitest';
import { calculateDiceOutcome } from '../features/mesa/services/mesaRealtime';

describe('Mesa Engine & 2d6 Rules', () => {
  describe('calculateDiceOutcome', () => {
    it('detects disaster (Duplo 1)', () => {
      const outcome = calculateDiceOutcome([1, 1], 5, 8);
      expect(outcome.result).toBe('desastre');
      expect(outcome.total).toBe(7);
    });

    it('detects critical success (Duplo 6)', () => {
      const outcome = calculateDiceOutcome([6, 6], 0, 8);
      expect(outcome.result).toBe('critico');
      expect(outcome.total).toBe(12);
    });

    it('detects brilliant success when total >= peso + 4', () => {
      const outcome = calculateDiceOutcome([5, 5], 2, 8); // 10 + 2 = 12 >= 8 + 4
      expect(outcome.result).toBe('brilhante');
      expect(outcome.total).toBe(12);
    });

    it('detects standard success when total >= peso and < peso + 4', () => {
      const outcome = calculateDiceOutcome([3, 4], 2, 8); // 7 + 2 = 9 >= 8
      expect(outcome.result).toBe('sucesso');
      expect(outcome.total).toBe(9);
    });

    it('detects failure when total < peso', () => {
      const outcome = calculateDiceOutcome([2, 3], 1, 8); // 5 + 1 = 6 < 8
      expect(outcome.result).toBe('falha');
      expect(outcome.total).toBe(6);
    });
  });

  describe('Timer formatting logic', () => {
    it('formats seconds into MM:SS correctly', () => {
      const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      };

      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(75)).toBe('01:15');
      expect(formatTime(9)).toBe('00:09');
      expect(formatTime(300)).toBe('05:00');
      expect(formatTime(0)).toBe('00:00');
    });

    it('computes correct SVG stroke dashoffset progress', () => {
      const radius = 48;
      const circumference = 2 * Math.PI * radius;
      const getOffset = (left: number, total: number) => {
        const progress = total > 0 ? left / total : 0;
        return circumference - progress * circumference;
      };

      expect(getOffset(60, 60)).toBeCloseTo(0);
      expect(getOffset(0, 60)).toBeCloseTo(circumference);
      expect(getOffset(30, 60)).toBeCloseTo(circumference / 2);
    });
  });
});
