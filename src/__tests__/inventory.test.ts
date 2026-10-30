import { describe, expect, it } from 'vitest';
import {
  type InventoryItemRecord,
  allocateInventoryGrid40,
  canEquipInSlot,
  canStackTogether,
  fromBronze,
  getDefaultEquipSlot,
  isStackable,
  moveOrSwapSlot,
  parseConsumableEffects,
  toBronze,
  transferItemBetweenInventories,
} from '../entities/item';

describe('Inventory Domain Rules & Mechanics', () => {
  it('converte e formata moedas perfeitamente (1 ouro = 2500 bronze, 1 prata = 50 bronze)', () => {
    const totalBronze = toBronze(2, 3, 15); // 2*2500 + 3*50 + 15 = 5165
    expect(totalBronze).toBe(5165);

    const breakdown = fromBronze(5165);
    expect(breakdown.gold).toBe(2);
    expect(breakdown.silver).toBe(3);
    expect(breakdown.bronze).toBe(15);
  });

  it('aloca grid de 40 slots mantendo índices fixos e preenchendo vazios', () => {
    const items: InventoryItemRecord[] = [
      { id: 'item_1', name: 'Poção', slot_index: 0 },
      { id: 'item_2', name: 'Tocha', slot_index: 5 },
      { id: 'item_3', name: 'Ração' }, // sem slot_index -> deve ir para o primeiro vazio (slot 1)
      { id: 'item_4', name: 'Espada Longa', equip_slot: 'main_hand' }, // equipado -> não vai na grade
    ];

    const { grid, overflow } = allocateInventoryGrid40(items);
    expect(grid).toHaveLength(40);
    expect(grid[0]?.id).toBe('item_1');
    expect(grid[1]?.id).toBe('item_3');
    expect(grid[5]?.id).toBe('item_2');
    expect(overflow).toHaveLength(0);
  });

  it('identifica corretamente itens empilháveis vs não empilháveis', () => {
    const sword: InventoryItemRecord = {
      id: 'sw_1',
      name: 'Espada de Ferro',
      category: 'arma',
      damage_dice: '1d8',
    };
    const armor: InventoryItemRecord = {
      id: 'ar_1',
      name: 'Cota de Malha',
      category: 'armadura',
      armor_bonus: 3,
    };
    const potion: InventoryItemRecord = {
      id: 'pot_1',
      name: 'Poção de Cura',
      category: 'alquimia',
      rarity: 'comum',
    };
    const herb: InventoryItemRecord = {
      id: 'herb_1',
      name: 'Erva de Sangue',
      category: 'reagente',
      rarity: 'incomum',
    };

    expect(isStackable(sword)).toBe(false);
    expect(isStackable(armor)).toBe(false);
    expect(isStackable(potion)).toBe(true);
    expect(isStackable(herb)).toBe(true);
  });

  it('valida empilhamento automático entre itens compatíveis', () => {
    const potA: InventoryItemRecord = {
      id: 'pot_1',
      catalog_id: 'cat_cura_1',
      name: 'Poção de Cura',
      rarity: 'comum',
      quantity: 2,
    };
    const potB: InventoryItemRecord = {
      id: 'pot_2',
      catalog_id: 'cat_cura_1',
      name: 'Poção de Cura',
      rarity: 'comum',
      quantity: 3,
    };
    const potC: InventoryItemRecord = {
      id: 'pot_3',
      catalog_id: 'cat_veneno_1',
      name: 'Veneno',
      rarity: 'raro',
      quantity: 1,
    };

    expect(canStackTogether(potA, potB)).toBe(true);
    expect(canStackTogether(potA, potC)).toBe(false);
  });

  it('moveOrSwapSlot move para vazio, troca posições e empilha itens iguais', () => {
    const grid: Array<InventoryItemRecord | null> = new Array(40).fill(null);
    grid[0] = {
      id: 'herb_1',
      catalog_id: 'herb_root',
      name: 'Raiz Amarga',
      quantity: 2,
      slot_index: 0,
    };
    grid[1] = {
      id: 'herb_2',
      catalog_id: 'herb_root',
      name: 'Raiz Amarga',
      quantity: 3,
      slot_index: 1,
    };
    grid[2] = { id: 'sword_1', name: 'Adaga', category: 'arma', slot_index: 2 };

    // 1. Empilhar slot 0 em slot 1
    const resStack = moveOrSwapSlot(grid, 0, 1);
    expect(resStack.ok).toBe(true);
    expect(resStack.action).toBe('stacked');
    expect(resStack.grid[1]?.quantity).toBe(5);
    expect(resStack.grid[0]).toBeNull();

    // 2. Mover slot 2 para slot 5 (vazio)
    const resMove = moveOrSwapSlot(resStack.grid, 2, 5);
    expect(resMove.ok).toBe(true);
    expect(resMove.action).toBe('moved');
    expect(resMove.grid[5]?.id).toBe('sword_1');
    expect(resMove.grid[2]).toBeNull();

    // 3. Trocar de posição entre slot 1 e slot 5
    const resSwap = moveOrSwapSlot(resMove.grid, 1, 5);
    expect(resSwap.ok).toBe(true);
    expect(resSwap.action).toBe('swapped');
    expect(resSwap.grid[1]?.id).toBe('sword_1');
    expect(resSwap.grid[5]?.id).toBe('herb_2');
  });

  it('transfere itens entre heróis com divisão de pilha e empilhamento no destino', () => {
    const senderItems: InventoryItemRecord[] = [
      { id: 'arrow_1', catalog_id: 'cat_flechas', name: 'Flechas', quantity: 15 },
    ];
    const receiverItems: InventoryItemRecord[] = [
      { id: 'arrow_2', catalog_id: 'cat_flechas', name: 'Flechas', quantity: 5 },
    ];

    // Transfere 5 flechas de 15
    const res = transferItemBetweenInventories(
      senderItems,
      receiverItems,
      'arrow_1',
      5,
      'hero_dest',
    );
    expect(res.ok).toBe(true);
    expect(res.senderItems?.[0].quantity).toBe(10);
    expect(res.receiverItems?.[0].quantity).toBe(10); // 5 + 5 empilhadas no destino!
  });

  it('valida regras estritas de equipamento por slot', () => {
    const helmet: InventoryItemRecord = { id: 'h1', name: 'Elmo de Ferro', equippable_as: 'head' };
    const armor: InventoryItemRecord = {
      id: 'a1',
      name: 'Peitoral de Bronze',
      equippable_as: 'armor',
    };
    const dagger: InventoryItemRecord = {
      id: 'd1',
      name: 'Adaga Sorrateira',
      damage_dice: '1d4',
      equippable_as: 'weapon',
    };
    const twoHandSword: InventoryItemRecord = {
      id: 'sw2',
      name: 'Montante do Abismo',
      damage_dice: '2d6',
      two_handed: true,
    };
    const shield: InventoryItemRecord = {
      id: 'sh1',
      name: 'Escudo Redondo',
      equippable_as: 'shield',
    };
    const amulet: InventoryItemRecord = {
      id: 'am1',
      name: 'Amuleto de Sangue',
      equippable_as: 'amulet',
    };
    const ring: InventoryItemRecord = {
      id: 'r1',
      name: 'Anel do Juramento',
      equippable_as: 'ring',
    };

    // Cabeça
    expect(canEquipInSlot(helmet, 'head')).toBe(true);
    expect(canEquipInSlot(armor, 'head')).toBe(false);

    // Peito
    expect(canEquipInSlot(armor, 'chest')).toBe(true);
    expect(canEquipInSlot(dagger, 'chest')).toBe(false);

    // Mão principal
    expect(canEquipInSlot(dagger, 'main_hand')).toBe(true);
    expect(canEquipInSlot(twoHandSword, 'main_hand')).toBe(true);

    // Mão secundária
    expect(canEquipInSlot(shield, 'off_hand')).toBe(true);
    expect(canEquipInSlot(shield, 'off_hand', twoHandSword)).toBe(false); // Bloqueado se arma de duas mãos equipada!

    // Anéis e amuleto
    expect(canEquipInSlot(ring, 'ring_1')).toBe(true);
    expect(canEquipInSlot(ring, 'ring_2')).toBe(true);
    expect(canEquipInSlot(amulet, 'amulet')).toBe(true);
    expect(canEquipInSlot(ring, 'amulet')).toBe(false);

    // Slot automático
    expect(getDefaultEquipSlot(helmet)).toBe('head');
    expect(getDefaultEquipSlot(armor)).toBe('chest');
    expect(getDefaultEquipSlot(shield)).toBe('off_hand');
  });

  it('analisa efeitos de consumíveis (cura, foco, saciedade e peste)', () => {
    const ration: InventoryItemRecord = {
      id: 'r1',
      name: 'Ração de Viagem',
      category: 'comida',
      special: 'Alimento substancial que sacia a fome.',
    };
    const healingPotion: InventoryItemRecord = {
      id: 'p1',
      name: 'Elixir de Cura Menor',
      category: 'alquimia',
      special: 'Cura 6 pontos de vida imediatamente.',
    };
    const darkHeart: InventoryItemRecord = {
      id: 'h1',
      name: 'Coração Corrompido',
      category: 'comida',
      special: 'Comer crua recupera todo o foco, mas dá +1 de peste ao jurado.',
    };

    const effRation = parseConsumableEffects(ration);
    expect(effRation.isFood).toBe(true);
    expect(effRation.saciedade).toBe(4);

    const effPotion = parseConsumableEffects(healingPotion);
    expect(effPotion.healsHp).toBe(6);

    const effDark = parseConsumableEffects(darkHeart);
    expect(effDark.givesPlague).toBe(true);
    expect(effDark.restoresAllFocus).toBe(true);
  });
});
