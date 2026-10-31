import { describe, expect, it } from 'vitest';
import {
  TABELA_SURTO_MAGICO,
  avaliarPipelineCondicoes,
  rolar2d6,
  rolarSurtoMagico,
  verificarRiscoPeste,
} from '../entities/spell';

describe('Grimoire & Spell Engine', () => {
  describe('TABELA_SURTO_MAGICO & rolarSurtoMagico', () => {
    it('possui 6 entradas canônicas na tabela de surto mágico', () => {
      expect(TABELA_SURTO_MAGICO).toHaveLength(6);
      expect(TABELA_SURTO_MAGICO.map((s) => s.dado)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('rola surto mágico retornando um dos efeitos com dados válidos', () => {
      const res = rolarSurtoMagico(2);
      expect(res.dado).toBeGreaterThanOrEqual(1);
      expect(res.dado).toBeLessThanOrEqual(6);
      expect(res.nome).toBeTruthy();
      expect(res.descricao).toBeTruthy();
      expect(res.textoLog).toContain('SURTO MÁGICO');

      if (res.efeito === 'dano_proprio') {
        expect(res.danoExtra).toBeGreaterThanOrEqual(3); // 1d6 + circulo (2)
      }
    });
  });

  describe('verificarRiscoPeste', () => {
    it('retorna sem risco quando risco.peste for falso ou nulo', () => {
      const res = verificarRiscoPeste(null as unknown as { peste?: boolean; texto?: string });
      expect(res.ganhaPeste).toBe(false);
      expect(res.textoLog).toBeNull();
    });

    it('aplica peste imediata para texto com "sempre"', () => {
      const res = verificarRiscoPeste({ peste: true, texto: 'Sempre adquire peste' });
      expect(res.ganhaPeste).toBe(true);
      expect(res.textoLog).toContain('Risco da Peste inevitável');
    });

    it('avalia probabilidade 1 a 3 corretamente', () => {
      const res = verificarRiscoPeste({ peste: true, texto: 'Risco de 1 a 3 no d6' });
      expect(typeof res.ganhaPeste).toBe('boolean');
      expect(res.textoLog).toBeTruthy();
    });
  });

  describe('avaliarPipelineCondicoes', () => {
    it('detecta ator silenciado e bloqueia conjuração', () => {
      const ator = { condicoes: ['silenciado'] };
      const pipeline = avaliarPipelineCondicoes(ator);
      expect(pipeline.silenciado).toBe(true);
      expect(pipeline.impedidoAgir).toBe(false);
    });

    it('detecta atordoado ou dormindo como impedido de agir', () => {
      const ator = { condicoes: ['atordoado'] };
      const pipeline = avaliarPipelineCondicoes(ator);
      expect(pipeline.impedidoAgir).toBe(true);
    });

    it('aplica desvantagem se o conjurador estiver cego ou envenenado', () => {
      const ator = { condicoes: ['cego'] };
      const pipeline = avaliarPipelineCondicoes(ator);
      expect(pipeline.temDesvantagem).toBe(true);
    });

    it('aplica vantagem contra alvo caído', () => {
      const ator = { condicoes: [] };
      const alvo = { condicoes: ['caido'] };
      const pipeline = avaliarPipelineCondicoes(ator, alvo);
      expect(pipeline.temVantagem).toBe(true);
    });
  });

  describe('rolar2d6', () => {
    it('rola 2 dados normais entre 2 e 12', () => {
      const r = rolar2d6(false, false);
      expect(r.soma).toBeGreaterThanOrEqual(2);
      expect(r.soma).toBeLessThanOrEqual(12);
      expect(r.dados).toHaveLength(2);
      if (r.d1 === 6 && r.d2 === 6) expect(r.isDuplo6).toBe(true);
      if (r.d1 === 1 && r.d2 === 1) expect(r.isDuplo1).toBe(true);
    });

    it('aceita resultado físico pré-definido', () => {
      const r = rolar2d6(false, false, { d1: 1, d2: 1 });
      expect(r.soma).toBe(2);
      expect(r.isDuplo1).toBe(true);
      expect(r.isDuplo6).toBe(false);
    });
  });
});
