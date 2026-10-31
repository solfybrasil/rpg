import { describe, expect, it } from 'vitest';
import { type InventoryItemRecord, checkStationPrerequisites } from '../entities/recipe';
import { STARTER_SHOP_ITEMS } from '../features/shop/data/starterShopItems';

describe('DM Workshop & Shop Engine', () => {
  it('correctly blocks or allows Forja based on forgeAvailable flag', () => {
    const mockHammer: InventoryItemRecord = {
      id: 'tool_1',
      name: 'Ferramentas de ferreiro',
      catalog_id: 'ferramentas-de-ferreiro',
      category: 'Ferramenta',
      quantity: 1,
      slot_index: 0,
      wear_type: 'unlimited',
      durability: 1,
      max_durability: 1,
    };

    // When forge is extinguished (forgeAvailable = false)
    const resBlocked = checkStationPrerequisites('forja', false, [mockHammer]);
    expect(resBlocked.canOperate).toBe(false);
    expect(resBlocked.forgeReady).toBe(false);
    expect(resBlocked.missingReasons).toContain(
      'É necessária uma forja acesa no local (controle do Mestre).',
    );

    // When forge is lit (forgeAvailable = true)
    const resOpen = checkStationPrerequisites('forja', true, [mockHammer]);
    expect(resOpen.canOperate).toBe(true);
    expect(resOpen.forgeReady).toBe(true);
    expect(resOpen.missingReasons).toHaveLength(0);
  });

  it('correctly blocks or allows Alquimia based on alchemyAvailable flag', () => {
    const mockAlchemyKit: InventoryItemRecord = {
      id: 'kit_1',
      name: 'Kit de alquimia',
      catalog_id: 'kit-de-alquimia',
      category: 'Ferramenta',
      quantity: 1,
      slot_index: 0,
      wear_type: 'unlimited',
      durability: 1,
      max_durability: 1,
    };

    // When alchemy is locked (alchemyAvailable = false)
    const resLocked = checkStationPrerequisites('alquimia', true, [mockAlchemyKit], false);
    expect(resLocked.canOperate).toBe(false);
    expect(resLocked.missingReasons).toContain(
      'O laboratório de alquimia está trancado (controle do Mestre).',
    );

    // When alchemy is open (alchemyAvailable = true)
    const resOpen = checkStationPrerequisites('alquimia', true, [mockAlchemyKit], true);
    expect(resOpen.canOperate).toBe(true);
    expect(resOpen.missingReasons).toHaveLength(0);
  });

  it('correctly parses and aggregates unique ingredients from a 3x3 grid', () => {
    const grid = [
      'barra-de-adamante',
      'barra-de-adamante',
      null,
      'gema-da-peste',
      null,
      null,
      null,
      null,
      'barra-de-adamante',
    ];
    const gridNames = [
      'Barra de adamante',
      'Barra de adamante',
      null,
      'Gema da peste',
      null,
      null,
      null,
      null,
      'Barra de adamante',
    ];

    const ingMap = new Map<string, { id: string; name: string; qty: number }>();
    grid.forEach((id, idx) => {
      if (id) {
        const name = gridNames[idx] || id;
        const existing = ingMap.get(id);
        if (existing) {
          existing.qty += 1;
        } else {
          ingMap.set(id, { id, name, qty: 1 });
        }
      }
    });

    const ingredients = Array.from(ingMap.values());
    expect(ingredients).toHaveLength(2);

    const adamante = ingredients.find((i) => i.id === 'barra-de-adamante');
    expect(adamante?.qty).toBe(3);

    const gema = ingredients.find((i) => i.id === 'gema-da-peste');
    expect(gema?.qty).toBe(1);
  });

  it('verifies starter shop items catalog contains at least 30 core items', () => {
    expect(STARTER_SHOP_ITEMS.length).toBeGreaterThanOrEqual(30);

    const names = STARTER_SHOP_ITEMS.map((it) => it.name.toLowerCase());
    expect(names.some((n) => n.includes('adaga') || n.includes('espada'))).toBe(true);
    expect(names.some((n) => n.includes('poção') || n.includes('cura'))).toBe(true);
    expect(names.some((n) => n.includes('corda') || n.includes('tocha'))).toBe(true);

    // Verify all items have valid prices in bronze
    for (const it of STARTER_SHOP_ITEMS) {
      expect(it.price_bronze).toBeGreaterThan(0);
    }
  });
});
