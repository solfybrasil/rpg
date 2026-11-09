import { describe, expect, it } from 'vitest';
import {
  aplicarDescanso,
  aplicarPassagem,
  aplicarRefeicao,
  estadoFome,
  marcasCruzadas,
  quedaDeFome,
} from '../shared/lib/fome';

const H = 60;

describe('Fome — queda de saciedade', () => {
  it('cai 1 ponto a cada 4h do relógio e é determinística', () => {
    expect(quedaDeFome(0, 4 * H)).toBe(1);
    expect(quedaDeFome(0, 24 * H)).toBe(6);
    // 2h + 2h = 4h
    expect(quedaDeFome(0, 2 * H) + quedaDeFome(2 * H, 2 * H)).toBe(1);
    // começar às 03:00 e andar 1h cruza a marca das 04:00
    expect(quedaDeFome(3 * H, 1 * H)).toBe(1);
  });

  it('clima extremo dá 1,5× fome', () => {
    expect(quedaDeFome(0, 24 * H, true)).toBe(9);
  });

  it('marcasCruzadas ignora avanço zero ou negativo', () => {
    expect(marcasCruzadas(100, 0, 60)).toBe(0);
    expect(marcasCruzadas(100, -10, 60)).toBe(0);
  });
});

describe('Fome — estados', () => {
  it('classifica pelas faixas', () => {
    expect(estadoFome(10).chave).toBe('saciado');
    expect(estadoFome(7).chave).toBe('saciado');
    expect(estadoFome(5).chave).toBe('alimentado');
    expect(estadoFome(2).chave).toBe('fome');
    expect(estadoFome(0).chave).toBe('faminto');
  });
});

describe('Passagem do tempo', () => {
  it('soma horas acordado e deixa Exausto após 18h', () => {
    const p = aplicarPassagem({ saciedade: 10, horas_acordado: 10 }, { de: 0, minutos: 8 * H });
    expect(p.horas_acordado).toBe(18);
    expect(p.exausto).toBe(true);
  });

  it('faminto por 2 dias perde 2 de Vida máxima e a Vida atual respeita o teto', () => {
    const p = aplicarPassagem(
      { saciedade: 0, horas_faminto: 0, max_health: 10, health: 10 },
      { de: 0, minutos: 48 * H },
    );
    expect(p.vida_max_fome).toBe(2);
    expect(p.health).toBe(8);
  });

  it('dormindo zera o cansaço', () => {
    const p = aplicarPassagem({ saciedade: 8, horas_acordado: 20, exausto: true }, { de: 0, minutos: 8 * H, dormindo: true });
    expect(p.horas_acordado).toBe(0);
    expect(p.exausto).toBe(false);
  });
});

describe('Refeição e descanso', () => {
  it('comer devolve a Vida máxima perdida ao sair da fome', () => {
    expect(aplicarRefeicao({ saciedade: 0, horas_faminto: 30, vida_max_fome: 1 }, 4)).toEqual({
      saciedade: 4,
      horas_faminto: 0,
      vida_max_fome: 0,
    });
    expect(aplicarRefeicao({ saciedade: 9 }, 5).saciedade).toBe(10);
  });

  it('descanso curto: metade do Foco (+1 saciado) e 2 de Vida', () => {
    expect(aplicarDescanso({ saciedade: 8, focus: 0, max_focus: 4, health: 5, max_health: 10 }, 'curto')).toEqual({
      focus: 3,
      health: 7,
    });
  });

  it('faminto não recupera Vida; descanso longo enche o Foco e tira a Exaustão', () => {
    const r = aplicarDescanso({ saciedade: 0, focus: 0, max_focus: 3, health: 4, max_health: 10, exausto: true }, 'longo');
    expect(r).toMatchObject({ focus: 3, health: 4, exausto: false, horas_acordado: 0 });
  });
});
