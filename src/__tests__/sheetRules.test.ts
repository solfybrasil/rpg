import { describe, expect, it } from 'vitest';
import {
  XP_THRESHOLDS,
  calcDefesa,
  calcFocoMax,
  calcSkillBonus,
  calcSkillMastery,
  calcSkillNextMilestone,
  calcVidaMax,
  getPlagueStage,
  getProximoXp,
} from '../entities/hero';

describe('Regras Canônicas da Ficha (Prompt 04)', () => {
  describe('Cálculo de Vida Máxima (calcVidaMax)', () => {
    it('calcula vida nível 1 com corpo 0', () => {
      expect(calcVidaMax(10, 0, 1)).toBe(10);
    });

    it('calcula vida nível 1 com corpo positivo e negativo', () => {
      expect(calcVidaMax(10, 2, 1)).toBe(14); // 10 + 2*2 + 0
      expect(calcVidaMax(10, -1, 1)).toBe(8); // 10 + (-1)*2 + 0
    });

    it('adiciona 4 de vida por nível acima do nível 1', () => {
      expect(calcVidaMax(10, 1, 2)).toBe(16); // 10 + 2 + 4 = 16
      expect(calcVidaMax(10, 2, 3)).toBe(22); // 10 + 4 + 8 = 22
      expect(calcVidaMax(12, 3, 5)).toBe(34); // 12 + 6 + 16 = 34
    });
  });

  describe('Cálculo de Foco Máximo (calcFocoMax)', () => {
    it('garante base mínima de 2 de foco', () => {
      expect(calcFocoMax(1, -2, 1)).toBe(2);
      expect(calcFocoMax(3, -1, 1)).toBe(2);
    });

    it('calcula foco nível 1 com base e vontade', () => {
      expect(calcFocoMax(3, 1, 1)).toBe(4);
      expect(calcFocoMax(3, 2, 1)).toBe(5);
    });

    it('adiciona bônus nos níveis pares (+1 a cada 2 níveis)', () => {
      expect(calcFocoMax(3, 1, 2)).toBe(5); // 4 + floor(2/2) = 5
      expect(calcFocoMax(3, 1, 3)).toBe(5); // 4 + floor(3/2) = 5
      expect(calcFocoMax(3, 1, 4)).toBe(6); // 4 + floor(4/2) = 6
    });
  });

  describe('Cálculo de Defesa (calcDefesa)', () => {
    it('base sem armadura ou escudo é 7', () => {
      expect(calcDefesa(0, 0)).toBe(7);
    });

    it('soma bônus de armadura e escudo', () => {
      expect(calcDefesa(2, 0)).toBe(9);
      expect(calcDefesa(2, 1)).toBe(10);
      expect(calcDefesa(3, 2)).toBe(12);
    });
  });

  describe('Tabela de XP e Próximo Nível (getProximoXp)', () => {
    it('limiares canônicos de XP', () => {
      expect(XP_THRESHOLDS[2]).toBe(14);
      expect(XP_THRESHOLDS[3]).toBe(24);
      expect(XP_THRESHOLDS[4]).toBe(36);
      expect(XP_THRESHOLDS[5]).toBe(50);
      expect(XP_THRESHOLDS[6]).toBe(66);
      expect(XP_THRESHOLDS[7]).toBe(84);
      expect(XP_THRESHOLDS[8]).toBe(104);
      expect(XP_THRESHOLDS[9]).toBe(126);
    });

    it('retorna meta de XP para o próximo nível', () => {
      expect(getProximoXp(1)).toBe(14);
      expect(getProximoXp(2)).toBe(24);
      expect(getProximoXp(3)).toBe(36);
      expect(getProximoXp(9)).toBe(126);
      expect(getProximoXp(10)).toBe(126);
    });
  });

  describe('Estágios da Peste do Juramento (getPlagueStage)', () => {
    it('estágio Limpo para <= 0', () => {
      const stage = getPlagueStage(0);
      expect(stage.id).toBe('limpo');
      expect(stage.nome).toBe('Limpo');
    });

    it('estágio Mancha para 1 a 3', () => {
      expect(getPlagueStage(1).id).toBe('mancha');
      expect(getPlagueStage(3).id).toBe('mancha');
    });

    it('estágio Corrupção para 4 a 7', () => {
      expect(getPlagueStage(4).id).toBe('corrupcao');
      expect(getPlagueStage(7).id).toBe('corrupcao');
    });

    it('estágio Transformação para 8 a 9', () => {
      expect(getPlagueStage(8).id).toBe('transformacao');
      expect(getPlagueStage(9).id).toBe('transformacao');
    });

    it('estágio Perdido para 10+', () => {
      expect(getPlagueStage(10).id).toBe('perdido');
      expect(getPlagueStage(12).id).toBe('perdido');
    });
  });

  describe('Perícias de Nível Infinito', () => {
    it('calcula bônus de perícia corretamente', () => {
      expect(calcSkillBonus(0)).toBe(0);
      expect(calcSkillBonus(1)).toBe(1);
      expect(calcSkillBonus(2)).toBe(1);
      expect(calcSkillBonus(3)).toBe(2);
      expect(calcSkillBonus(4)).toBe(2);
      expect(calcSkillBonus(5)).toBe(3);
    });

    it('calcula maestria de perícia (rolagens extras de 1 dado)', () => {
      expect(calcSkillMastery(0)).toBe(0);
      expect(calcSkillMastery(1)).toBe(0);
      expect(calcSkillMastery(2)).toBe(1);
      expect(calcSkillMastery(3)).toBe(1);
      expect(calcSkillMastery(4)).toBe(2);
    });

    it('calcula próximo marco de nível de perícia', () => {
      expect(calcSkillNextMilestone(1)).toBe(3);
      expect(calcSkillNextMilestone(2)).toBe(3);
      expect(calcSkillNextMilestone(3)).toBe(5);
    });
  });
});
