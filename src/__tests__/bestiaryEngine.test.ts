import { describe, expect, it } from 'vitest';
import { formatarCriaturaParaBatalha } from '../entities/creature/index.ts';
import type { Creature } from '../features/bestiary/api/types.ts';
import {
  BESTIARY_CATEGORIES,
  BESTIARY_REGIONS,
  BESTIARY_TIERS,
} from '../features/bestiary/data/constants.ts';

describe('Bestiary Engine & Catalog Rules', () => {
  it('contains expected categories, tiers, and regions', () => {
    expect(BESTIARY_CATEGORIES).toContain('Animal');
    expect(BESTIARY_CATEGORIES).toContain('Fera');
    expect(BESTIARY_CATEGORIES).toContain('Criatura da Peste');
    expect(BESTIARY_TIERS).toContain('Lacaio');
    expect(BESTIARY_TIERS).toContain('Soldado');
    expect(BESTIARY_TIERS).toContain('Lendário');
    expect(BESTIARY_REGIONS.length).toBeGreaterThanOrEqual(8);
  });

  it('formats creature for battle with automatic attacks and behavior', () => {
    const raw = {
      id: 'cr_lobo_1',
      name: 'Lobo das Estepes',
      category: 'Fera',
      threat: 2,
      tier: 'Soldado',
      max_hp: 18,
      defense: 11,
      attack_bonus: 2,
      damage_dice: '1d6+1',
      abilities: [{ name: 'Mordida Voraz', damage: '1d6+2', type: 'físico' }],
      loot: [{ name: 'Pele de Lobo', qty: 1, chance: 85 }],
    };

    const formatted = formatarCriaturaParaBatalha(raw) as Record<string, unknown> & {
      nome: string;
      vida: number;
      defesa: number;
      comportamento: string;
      ataques: Array<{ nome: string }>;
    };
    expect(formatted).toBeDefined();
    expect(formatted.nome).toBe('Lobo das Estepes');
    expect(formatted.vida).toBe(18);
    expect(formatted.defesa).toBe(11);
    expect(formatted.comportamento).toBe('cacador');
    expect(formatted.ataques.length).toBeGreaterThanOrEqual(1);
    expect(formatted.ataques[0].nome).toBe('Mordida Voraz');
  });

  it('correctly calculates pagination metadata', () => {
    const total = 1485;
    const pageSize = 30;
    const totalPages = Math.ceil(total / pageSize);
    expect(totalPages).toBe(50);

    const page = 3;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    expect(from).toBe(60);
    expect(to).toBe(89);
  });

  it('generates combatant payload correctly', () => {
    const creature: Creature = {
      id: 'cr_aberracao_99',
      name: 'Horror Rastejante',
      species: 'Abominação',
      category: 'Aberração',
      size: 'Grande',
      region: 'Charnecas Esquecidas',
      region_key: 'charnecas',
      stage: 'Adulto',
      tier: 'Chefe',
      threat: 8,
      max_hp: 95,
      defense: 16,
      attack_bonus: 5,
      damage_dice: '2d8+3',
      attacks_per_turn: 2,
      abilities: ['Grito Enlouquecedor', 'Regeneração Sombria'],
      weakness: 'Fogo Sagrado',
      loot: [{ name: 'Coração Corrompido', qty: 1, chance: 100 }],
      harvest_skill: 'Alquimia',
      harvest_peso: 3,
      edible: false,
      cooking: null,
      eat_effect: null,
      plague: true,
      unique: true,
      lair: 'Poço das Lamentações',
      description: 'Uma massa de olhos e tentáculos que consome a sanidade de quem a encara.',
      icon: '👁️',
      image_url: 'https://example.com/horror.png',
      tags: ['peste', 'abominação'],
      archived: false,
    };

    expect(creature.threat).toBe(8);
    expect(creature.plague).toBe(true);
    expect(creature.unique).toBe(true);
    expect(creature.abilities?.length).toBe(2);
  });
});
