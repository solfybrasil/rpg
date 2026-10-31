import { describe, expect, it } from 'vitest';
import { rulebook } from '../data/rules';
import { fromBronzeToCoins } from '../features/system/api/useDMSystem';
import {
  ATMOSPHERES,
  SFX_ITEMS,
  getActiveAtmosphere,
  getSoundboardVolume,
  setSoundboardVolume,
  stopAtmosphere,
} from '../features/system/services/soundboardService';

describe('DM System Engine & Utilities', () => {
  describe('fromBronzeToCoins conversion', () => {
    it('converts 0 bronze to 0 PO, 0 PP, 0 PB', () => {
      const res = fromBronzeToCoins(0);
      expect(res.gold).toBe(0);
      expect(res.silver).toBe(0);
      expect(res.bronze).toBe(0);
      expect(res.formatado).toBe('0 PO, 0 PP, 0 PB');
    });

    it('converts 125 bronze to 1 PO, 2 PP, 5 PB', () => {
      const res = fromBronzeToCoins(125);
      expect(res.gold).toBe(1);
      expect(res.silver).toBe(2);
      expect(res.bronze).toBe(5);
      expect(res.formatado).toBe('1 PO, 2 PP, 5 PB');
    });

    it('converts 350 bronze to 3 PO, 5 PP, 0 PB', () => {
      const res = fromBronzeToCoins(350);
      expect(res.gold).toBe(3);
      expect(res.silver).toBe(5);
      expect(res.bronze).toBe(0);
      expect(res.formatado).toBe('3 PO, 5 PP, 0 PB');
    });

    it('handles negative or invalid numbers safely', () => {
      const res = fromBronzeToCoins(-50);
      expect(res.gold).toBe(0);
      expect(res.silver).toBe(0);
      expect(res.bronze).toBe(0);
    });
  });

  describe('Rulebook Codex Canon', () => {
    it('contains all 10 canonical rule chapters', () => {
      expect(rulebook.chapters).toHaveLength(10);
    });

    it('has sequential chapter numbers from 1 to 10', () => {
      let idx = 0;
      for (const chapter of rulebook.chapters) {
        expect(chapter.number).toBe(idx + 1);
        expect(chapter.id).toBeTruthy();
        expect(chapter.title).toBeTruthy();
        expect(chapter.content.length).toBeGreaterThan(50);
        idx++;
      }
    });

    it('contains specific core chapters (O Mundo, Como Jogar, Atributos, O Juramento)', () => {
      const chapterIds = rulebook.chapters.map((c) => c.id);
      expect(chapterIds).toContain('mundo');
      expect(chapterIds).toContain('como-jogar');
      expect(chapterIds).toContain('atributos');
      expect(chapterIds).toContain('juramento');
      expect(chapterIds).toContain('combate');
      expect(chapterIds).toContain('peste');
    });
  });

  describe('Soundboard Synthesizer Service', () => {
    it('defines 6 ambient atmosphere loops', () => {
      expect(ATMOSPHERES).toHaveLength(6);
      const ids = ATMOSPHERES.map((a) => a.id);
      expect(ids).toEqual(['tavern', 'chapel', 'plague', 'catacombs', 'rain', 'war']);
      for (const item of ATMOSPHERES) {
        expect(item.category).toBe('ambiente');
        expect(item.icon).toBeTruthy();
      }
    });

    it('defines 6 instant sound effects (SFX)', () => {
      expect(SFX_ITEMS).toHaveLength(6);
      const ids = SFX_ITEMS.map((s) => s.id);
      expect(ids).toEqual(['dice', 'sword', 'shield', 'plague_stab', 'spell', 'death']);
      for (const item of SFX_ITEMS) {
        expect(item.category).toBe('sfx');
        expect(item.icon).toBeTruthy();
      }
    });

    it('clamps volume correctly between 0 and 1', () => {
      setSoundboardVolume(0.8);
      expect(getSoundboardVolume()).toBe(0.8);

      setSoundboardVolume(1.5);
      expect(getSoundboardVolume()).toBe(1);

      setSoundboardVolume(-0.3);
      expect(getSoundboardVolume()).toBe(0);
    });

    it('clears active atmosphere on stopAtmosphere()', () => {
      stopAtmosphere();
      expect(getActiveAtmosphere()).toBeNull();
    });
  });
});
