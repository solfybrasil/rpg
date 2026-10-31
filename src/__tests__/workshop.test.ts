import { describe, expect, it } from 'vitest';
import type { InventoryItemRecord } from '../entities/item';
import {
  type GridRecipeRecord,
  calculateCraftRollOutcome,
  calculateSuccessChance,
  checkStationPrerequisites,
  deriveRecipeCategory,
  matchWorkshopRecipe3x3,
} from '../entities/recipe';

describe('Workshop & Crafting Rules Engine (Prompt 07)', () => {
  const mockRecipes: GridRecipeRecord[] = [
    {
      id: 'rec_espada_aco',
      station: 'forja',
      result_id: 'espada-aco',
      result_name: 'Espada de Aço Valírio',
      peso: 8,
      grid: ['barra-aco', 'barra-aco', null, null, 'couro', null, null, null, null],
      result_qty: 1,
    },
    {
      id: 'rec_pocao_cura',
      station: 'alquimia',
      result_id: 'pocao-cura',
      result_name: 'Poção de Sangue Puro',
      peso: 7,
      grid: ['agua-pura', 'erva-cura', null, null, 'frasco-vidro', null, null, null, null],
      result_qty: 1,
    },
    {
      id: 'rec_ensopado_javali',
      station: 'cozinha',
      result_id: 'ensopado-javali',
      result_name: 'Ensopado de Javali Selvagem',
      peso: 6,
      grid: ['carne-javali', 'agua-pura', null, 'sal', null, null, null, null, null],
      result_qty: 2,
    },
  ];

  const mockBackpack: InventoryItemRecord[] = [
    {
      id: 'inv_1',
      catalog_id: 'barra-aco',
      name: 'Barra de Aço',
      quantity: 2,
      category: 'Material',
    },
    {
      id: 'inv_2',
      catalog_id: 'couro',
      name: 'Tira de Couro',
      quantity: 1,
      category: 'Material',
    },
    {
      id: 'inv_3',
      catalog_id: 'ferramentas-de-ferreiro',
      name: 'Ferramentas de Ferreiro Pesadas',
      quantity: 1,
      category: 'Ferramenta',
    },
    {
      id: 'inv_4',
      catalog_id: 'kit-de-alquimia',
      name: 'Kit de Alquimia de Bolso',
      quantity: 1,
      category: 'Ferramenta',
    },
  ];

  describe('3x3 Recipe Matching (matchWorkshopRecipe3x3)', () => {
    it('reconhece a receita da Espada de Aço quando o grid e itens são exatos', () => {
      const grid = [
        { catalog_id: 'barra-aco' },
        { catalog_id: 'barra-aco' },
        null,
        null,
        { catalog_id: 'couro' },
        null,
        null,
        null,
        null,
      ];

      const res = matchWorkshopRecipe3x3(mockRecipes, 'forja', grid, mockBackpack);
      expect(res.matched).toBe(true);
      expect(res.canCraft).toBe(true);
      expect(res.recipe?.id).toBe('rec_espada_aco');
    });

    it('rejeita receita se a estação for diferente', () => {
      const grid = [
        { catalog_id: 'barra-aco' },
        { catalog_id: 'barra-aco' },
        null,
        null,
        { catalog_id: 'couro' },
        null,
        null,
        null,
        null,
      ];

      const res = matchWorkshopRecipe3x3(mockRecipes, 'alquimia', grid, mockBackpack);
      expect(res.matched).toBe(false);
      expect(res.canCraft).toBe(false);
    });

    it('detecta falta de ingredientes quando a quantidade possuída é menor que a necessária', () => {
      const smallBackpack: InventoryItemRecord[] = [
        {
          id: 'inv_1',
          catalog_id: 'barra-aco',
          name: 'Barra de Aço',
          quantity: 1, // Precisa de 2!
        },
        {
          id: 'inv_2',
          catalog_id: 'couro',
          name: 'Tira de Couro',
          quantity: 1,
        },
      ];

      const grid = [
        { catalog_id: 'barra-aco' },
        { catalog_id: 'barra-aco' },
        null,
        null,
        { catalog_id: 'couro' },
        null,
        null,
        null,
        null,
      ];

      const res = matchWorkshopRecipe3x3(mockRecipes, 'forja', grid, smallBackpack);
      expect(res.matched).toBe(true);
      expect(res.canCraft).toBe(false);
      expect(res.reason).toBe('falta_ingrediente');
      expect(res.missingCatalogId).toBe('barra-aco');
    });
  });

  describe('Probabilidade de Sucesso 2d6 (calculateSuccessChance)', () => {
    it('calcula 100% se o modificador superar o peso máximo', () => {
      const chance = calculateSuccessChance(10, 5);
      // 1,1 sempre falha (1/36 = ~3%), logo máxima chance é ~97% no 2d6 clássico
      expect(chance).toBeGreaterThanOrEqual(95);
    });

    it('calcula chance correta para mod 0 vs peso 7 (espera-se 58%)', () => {
      const chance = calculateSuccessChance(0, 7);
      expect(chance).toBe(58);
    });
  });

  describe('Resolução do Teste 2d6 (calculateCraftRollOutcome)', () => {
    it('retorna desastre se rolou 1,1 (olhos de cobra)', () => {
      const res = calculateCraftRollOutcome(1, 1, 10, 5);
      expect(res.outcome).toBe('desastre');
      expect(res.yieldMultiplier).toBe(0);
    });

    it('retorna crítico se rolou 6,6', () => {
      const res = calculateCraftRollOutcome(6, 6, 0, 15);
      expect(res.outcome).toBe('critico');
      expect(res.isBrilliant).toBe(true);
      expect(res.yieldMultiplier).toBe(2);
    });

    it('retorna sucesso brilhante com dobro de rendimento quando total >= peso + 3', () => {
      // 4 + 4 + 3 = 11 vs Peso 8 (11 >= 8 + 3)
      const res = calculateCraftRollOutcome(4, 4, 3, 8);
      expect(res.outcome).toBe('brilhante');
      expect(res.isBrilliant).toBe(true);
      expect(res.yieldMultiplier).toBe(2);
    });

    it('retorna sucesso normal com 1x rendimento quando total >= peso', () => {
      // 3 + 3 + 2 = 8 vs Peso 8
      const res = calculateCraftRollOutcome(3, 3, 2, 8);
      expect(res.outcome).toBe('sucesso');
      expect(res.isBrilliant).toBe(false);
      expect(res.yieldMultiplier).toBe(1);
    });

    it('retorna falha com 0 rendimento quando total < peso', () => {
      // 2 + 2 + 1 = 5 vs Peso 8
      const res = calculateCraftRollOutcome(2, 2, 1, 8);
      expect(res.outcome).toBe('falha');
      expect(res.yieldMultiplier).toBe(0);
    });
  });

  describe('Pré-requisitos de Estação (checkStationPrerequisites)', () => {
    it('bloqueia forja se forja_available for false', () => {
      const prereqs = checkStationPrerequisites('forja', false, mockBackpack);
      expect(prereqs.canOperate).toBe(false);
      expect(prereqs.forgeReady).toBe(false);
    });

    it('permite forja se forja_available for true e tiver ferramentas de ferreiro', () => {
      const prereqs = checkStationPrerequisites('forja', true, mockBackpack);
      expect(prereqs.canOperate).toBe(true);
      expect(prereqs.hasTools).toBe(true);
    });

    it('bloqueia alquimia se faltar kit de alquimia', () => {
      const withoutKit = mockBackpack.filter((it) => it.catalog_id !== 'kit-de-alquimia');
      const prereqs = checkStationPrerequisites('alquimia', true, withoutKit);
      expect(prereqs.canOperate).toBe(false);
      expect(prereqs.hasTools).toBe(false);
    });
  });

  describe('Derivação de Categorias de Receitas (deriveRecipeCategory)', () => {
    it('deriva Armas para espadas e martelos', () => {
      expect(deriveRecipeCategory({ station: 'forja', result_name: 'Espada de Ferro' })).toBe(
        'Armas',
      );
      expect(deriveRecipeCategory({ station: 'forja', result_name: 'Machado Duplo' })).toBe(
        'Armas',
      );
    });

    it('deriva Poções & Elixires para poções de alquimia', () => {
      expect(
        deriveRecipeCategory({ station: 'alquimia', result_name: 'Poção de Cura Menor' }),
      ).toBe('Poções & Elixires');
    });

    it('deriva Sopas & Caldos para ensopados', () => {
      expect(
        deriveRecipeCategory({ station: 'cozinha', result_name: 'Caldo de Raízes Negras' }),
      ).toBe('Sopas & Caldos');
    });
  });
});
