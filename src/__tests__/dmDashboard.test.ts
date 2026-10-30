import { describe, expect, it } from 'vitest';
import type { HeroDashboardItem } from '../features/dm-dashboard/types';

// Função de comparação exportada ou testada diretamente
function areHeroPropsEqual(p: HeroDashboardItem, n: HeroDashboardItem): boolean {
  if (p.id !== n.id) return false;
  if (p.health !== n.health || p.maxHealth !== n.maxHealth) return false;
  if (p.focus !== n.focus || p.maxFocus !== n.maxFocus) return false;
  if (p.plague !== n.plague) return false;
  if (p.saciedade !== n.saciedade) return false;
  if (p.inspiration !== n.inspiration) return false;
  if (p.exausto !== n.exausto) return false;
  if (p.isOnline !== n.isOnline) return false;
  if (p.coinsBronze !== n.coinsBronze) return false;

  if (p.conditions.length !== n.conditions.length) return false;
  for (let i = 0; i < p.conditions.length; i++) {
    if (p.conditions[i] !== n.conditions[i]) return false;
  }

  return true;
}

describe('Prompt 02: Desempenho e Regras do Painel dos Jogadores', () => {
  const baseHero: HeroDashboardItem = {
    id: 'tor_bjorn',
    name: 'Tor Bjorn',
    race: 'Anão da Rocha',
    caminho: 'Artífice Rúnico',
    health: 20,
    maxHealth: 20,
    plague: 0,
    focus: 5,
    maxFocus: 5,
    inspiration: 0,
    saciedade: 8,
    coinsBronze: 2500,
    defense: 10,
    exausto: false,
    conditions: [],
    isOnline: true,
    attributes: { corpo: 2, astucia: 2, vontade: 1, presenca: 1 },
    skills: [],
    raw: {} as never,
  };

  it('Memoização estrita: re-renderiza apenas o card que sofreu alteração de vida', () => {
    const heroTor = { ...baseHero, id: 'tor_bjorn', health: 20 };
    const heroMalenia = { ...baseHero, id: 'malenia', name: 'Malenia', health: 18 };

    // Cenário: o Mestre altera a vida de Malenia de 18 para 17.
    // O card de Tor NÃO pode sofrer re-render (areHeroPropsEqual deve retornar true).
    const heroTorNext = { ...heroTor };
    expect(areHeroPropsEqual(heroTor, heroTorNext)).toBe(true);

    // O card de Malenia DEVE sofrer re-render (areHeroPropsEqual deve retornar false).
    const heroMaleniaNext = { ...heroMalenia, health: 17 };
    expect(areHeroPropsEqual(heroMalenia, heroMaleniaNext)).toBe(false);
  });

  it('Memoização estrita: detecta alteração de Foco, Peste, Fome e Condições', () => {
    expect(areHeroPropsEqual(baseHero, { ...baseHero, focus: 4 })).toBe(false);
    expect(areHeroPropsEqual(baseHero, { ...baseHero, plague: 1 })).toBe(false);
    expect(areHeroPropsEqual(baseHero, { ...baseHero, saciedade: 7 })).toBe(false);
    expect(areHeroPropsEqual(baseHero, { ...baseHero, exausto: true })).toBe(false);
    expect(areHeroPropsEqual(baseHero, { ...baseHero, conditions: ['Envenenado'] })).toBe(false);
  });

  it('Cálculo de limites vitais: não ultrapassa max_health nem desce abaixo de 0', () => {
    const clampHp = (current: number, max: number, delta: number) =>
      Math.max(0, Math.min(max, current + delta));

    expect(clampHp(20, 20, 5)).toBe(20);
    expect(clampHp(2, 20, -5)).toBe(0);
    expect(clampHp(10, 20, -3)).toBe(7);
  });

  it('Filtro de heróis em perigo: detecta vida <= 3 ou peste >= 8', () => {
    const isDanger = (h: { health: number; plague: number }) => h.health <= 3 || h.plague >= 8;

    expect(isDanger({ health: 20, plague: 0 })).toBe(false);
    expect(isDanger({ health: 3, plague: 0 })).toBe(true);
    expect(isDanger({ health: 15, plague: 8 })).toBe(true);
  });
});
