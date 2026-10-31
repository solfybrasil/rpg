import { describe, expect, it } from 'vitest';
import {
  ALL_13_SKILLS,
  GRAPH,
  calcSkillBonus,
  calcSkillMastery,
  calcSkillNextMilestone,
  calculateOathTreeBonuses,
  getDefaultHeroTree,
  mergeTreeStates,
} from '../entities/oath-tree';

describe('Árvore do Juramento & Grafo Canônico', () => {
  it('contém exatamente 200 nós canônicos e 13 perícias canônicas', () => {
    expect(GRAPH.IDS).toHaveLength(200);
    expect(ALL_13_SKILLS).toHaveLength(13);
  });

  it('possui o nó central do Juramento (hub) com custo 0', () => {
    const hub = GRAPH.N.hub;
    expect(hub).toBeDefined();
    expect(hub.tipo).toBe('hub');
    expect(hub.custo).toBe(0);
    expect(hub.x).toBe(0);
    expect(hub.y).toBe(0);
  });

  it('possui os 7 nós do Anel do Juramento ligados ao hub', () => {
    for (let i = 0; i < 7; i++) {
      const ringNode = GRAPH.N[`j${i}`];
      expect(ringNode).toBeDefined();
      expect(ringNode.adj.has('hub')).toBe(true);
      expect(GRAPH.N.hub.adj.has(`j${i}`)).toBe(true);
    }
  });

  it('calcula bônus, maestria e próximo marco de perícias infinitas corretamente', () => {
    // level 1: bonus +1, maestria 0, milestone 3
    expect(calcSkillBonus(1)).toBe(1);
    expect(calcSkillMastery(1)).toBe(0);
    expect(calcSkillNextMilestone(1)).toBe(3);

    // level 2: bonus +1, maestria 1, milestone 3
    expect(calcSkillBonus(2)).toBe(1);
    expect(calcSkillMastery(2)).toBe(1);
    expect(calcSkillNextMilestone(2)).toBe(3);

    // level 3: bonus +2, maestria 1, milestone 5
    expect(calcSkillBonus(3)).toBe(2);
    expect(calcSkillMastery(3)).toBe(1);
    expect(calcSkillNextMilestone(3)).toBe(5);

    // level 4: bonus +2, maestria 2, milestone 5
    expect(calcSkillBonus(4)).toBe(2);
    expect(calcSkillMastery(4)).toBe(2);

    // level 5: bonus +3, maestria 2, milestone 7
    expect(calcSkillBonus(5)).toBe(3);
  });

  it('calcula bônus cumulativos da árvore a partir de nós liberados', () => {
    // r0e: Sangue Quente (+1 Vida máxima)
    // r1t1p0: Constituição (+2 Vida máxima)
    // j1: Vontade de Ferro (+1 Foco máximo)
    // j6: Terceira Chama (Capacidade de Inspiração +1)
    const treeData = {
      m: { hub: 0, r0e: 1, r1t1p0: 2, j1: 2, j6: 5 },
      g: { hub: true, r0e: true, r1t1p0: true, j1: true, j6: true },
    };

    const bonuses = calculateOathTreeBonuses(treeData, GRAPH.N);
    expect(bonuses.hpBonus).toBeGreaterThanOrEqual(1);
    expect(bonuses.focusBonus).toBeGreaterThanOrEqual(1);
    expect(bonuses.maxInspBonus).toBe(1);
  });

  it('mescla estados de árvore preservando nós e marcas maiores', () => {
    const treeA = {
      m: { hub: 0, r0e: 1, r0t0p0: 1 },
      g: { hub: true, r0e: true },
    };
    const treeB = {
      m: { hub: 0, r0t0p0: 2, r2e: 1 },
      g: { hub: true, r0t0p0: true, r2e: true },
    };

    const merged = mergeTreeStates(treeA, treeB);
    expect(merged.m.r0e).toBe(1);
    expect(merged.m.r0t0p0).toBe(2);
    expect(merged.m.r2e).toBe(1);
    expect(merged.g.r0e).toBe(true);
    expect(merged.g.r0t0p0).toBe(true);
    expect(merged.g.r2e).toBe(true);
  });

  it('fornece árvore padrão para Tor Bjorn com Forja, Percepção e Intimidação', () => {
    const defaultTree = getDefaultHeroTree('tor_bjorn');
    expect(defaultTree.g.hub).toBe(true);
    // Forja is r4t0p0, entry r4e
    expect(defaultTree.g.r4e).toBe(true);
    expect(defaultTree.g.r4t0p0).toBe(true);
  });
});
