import { describe, expect, it } from 'vitest';
import type { InventoryItemRecord } from '../entities/item';
import {
  type GridRecipeRecord,
  deriveRecipeCategory,
  enrichRecipeWithInventory,
  filterRecipeList,
} from '../entities/recipe';

describe('Livro de Receitas (Prompt 08)', () => {
  const mockRecipes: GridRecipeRecord[] = [
    {
      id: 'rec_adaga_aco',
      station: 'forja',
      result_id: 'adaga-aco',
      result_name: 'Adaga de Aço Negro',
      peso: 7,
      category: 'Armas',
      grid: ['barra-aco', 'couro', null, null, null, null, null, null, null],
      grid_names: ['Barra de Aço', 'Couro Rústico', null, null, null, null, null, null, null],
      result_qty: 1,
    },
    {
      id: 'rec_pocao_vigor',
      station: 'alquimia',
      result_id: 'pocao-vigor',
      result_name: 'Poção do Vigor Férreo',
      peso: 6,
      category: 'Poções & Elixires',
      grid: ['erva-sol', 'agua-pura', null, null, null, null, null, null, null],
      grid_names: ['Erva do Sol', 'Água Pura', null, null, null, null, null, null, null],
      result_qty: 1,
    },
    {
      id: 'rec_sopa_cogumelos',
      station: 'cozinha',
      result_id: 'sopa-cogumelos',
      result_name: 'Sopa de Cogumelos Lunares',
      peso: 5,
      category: 'Sopas & Caldos',
      grid: ['cogumelo-lunar', 'agua-pura', 'sal', null, null, null, null, null, null],
      grid_names: [
        'Cogumelo Lunar',
        'Água Pura',
        'Sal da Mina',
        null,
        null,
        null,
        null,
        null,
        null,
      ],
      result_qty: 2,
    },
  ];

  const mockBackpack: InventoryItemRecord[] = [
    {
      id: 'inv_1',
      catalog_id: 'barra-aco',
      name: 'Barra de Aço',
      quantity: 1,
      category: 'Material',
    },
    {
      id: 'inv_2',
      catalog_id: 'couro',
      name: 'Couro Rústico',
      quantity: 1,
      category: 'Material',
    },
    {
      id: 'inv_3',
      catalog_id: 'agua-pura',
      name: 'Água Pura',
      quantity: 3,
      category: 'Material',
    },
    // Falta 'erva-sol', 'cogumelo-lunar' e 'sal'
  ];

  describe('Enriquecimento de Receitas com Inventário (enrichRecipeWithInventory)', () => {
    it('marca canCraftNow = true para Adaga de Aço (tem barra-aco e couro)', () => {
      const enriched = enrichRecipeWithInventory(mockRecipes[0], mockBackpack, true);
      expect(enriched.canCraftNow).toBe(true);
      expect(enriched.progressPercent).toBe(100);
      expect(enriched.ingredientsStatus.every((i) => i.isSatisfied)).toBe(true);
    });

    it('marca canCraftNow = false para Poção do Vigor (falta erva-sol)', () => {
      const enriched = enrichRecipeWithInventory(mockRecipes[1], mockBackpack, true);
      expect(enriched.canCraftNow).toBe(false);
      expect(enriched.progressPercent).toBe(50); // 1 de 2 ingredientes

      const erva = enriched.ingredientsStatus.find((i) => i.id === 'erva-sol');
      expect(erva?.isSatisfied).toBe(false);
      expect(erva?.owned).toBe(0);
      expect(erva?.needed).toBe(1);
    });

    it('marca canCraftNow = false para Sopa de Cogumelos (tem apenas água pura)', () => {
      const enriched = enrichRecipeWithInventory(mockRecipes[2], mockBackpack, true);
      expect(enriched.canCraftNow).toBe(false);
      expect(enriched.progressPercent).toBe(33); // 1 de 3 ingredientes
    });
  });

  describe('Filtros do Livro de Receitas (filterRecipeList)', () => {
    const enrichedAll = mockRecipes.map((r) => enrichRecipeWithInventory(r, mockBackpack, true));

    it('filtra por estação (forja)', () => {
      const filtered = filterRecipeList(enrichedAll, { station: 'forja' });
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('rec_adaga_aco');
    });

    it('filtra por "Posso fazer agora" (onlyCraftable)', () => {
      const filtered = filterRecipeList(enrichedAll, { onlyCraftable: true });
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('rec_adaga_aco');
    });

    it('busca por nome do resultado', () => {
      const filtered = filterRecipeList(enrichedAll, { search: 'cogumelo' });
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('rec_sopa_cogumelos');
    });

    it('busca por nome de ingrediente (erva)', () => {
      const filtered = filterRecipeList(enrichedAll, { search: 'erva' });
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('rec_pocao_vigor');
    });
  });
});
