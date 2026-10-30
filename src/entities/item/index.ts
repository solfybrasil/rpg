export interface InventoryItemRecord {
  id: string;
  character_id?: string | null;
  player_id?: string | null;
  catalog_id?: string | null;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  type?: string | null;
  rarity?: string | null;
  quantity?: number | null;
  slot_index?: number | null;
  equip_slot?: string | null;
  equippable_as?: string | null;
  equipped?: boolean | null;
  image_url?: string | null;
  icon?: string | null;
  description?: string | null;
  stats?: Record<string, unknown> | null;
  wear_type?: string | null;
  durability?: number | null;
  max_durability?: number | null;
  damage_dice?: string | null;
  armor_bonus?: number | null;
  attack_bonus?: number | null;
  damage_bonus?: number | null;
  two_handed?: boolean | null;
  ranged?: boolean | null;
  special?: string | null;
  saciedade?: number | null;
  plague_cost?: number | null;
  price_bronze?: number | null;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface CoinsBreakdown {
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

export function toBronze(
  ouro: number | string | null | undefined = 0,
  prata: number | string | null | undefined = 0,
  bronze: number | string | null | undefined = 0,
): number {
  const g = Math.max(0, Number.parseInt(String(ouro ?? 0), 10) || 0);
  const s = Math.max(0, Number.parseInt(String(prata ?? 0), 10) || 0);
  const b = Math.max(0, Number.parseInt(String(bronze ?? 0), 10) || 0);
  return g * 2500 + s * 50 + b;
}

export function fromBronze(totalBronze: number | string | null | undefined = 0): CoinsBreakdown {
  const total = Math.max(0, Math.floor(Number(totalBronze) || 0));
  const gold = Math.floor(total / 2500);
  const silver = Math.floor((total % 2500) / 50);
  const bronze = total % 50;
  return { gold, silver, bronze, total };
}

export function formatCoinsString(totalBronze: number | string | null | undefined = 0): string {
  const { gold, silver, bronze, total } = fromBronze(totalBronze);
  if (total === 0) return '0b';

  const parts: string[] = [];
  if (gold > 0) parts.push(`${gold}o`);
  if (silver > 0) parts.push(`${silver}p`);
  if (bronze > 0 || parts.length === 0) parts.push(`${bronze}b`);

  return parts.join(' ');
}

export function formatCoinsDescription(
  totalBronze: number | string | null | undefined = 0,
): string {
  const abs = Math.abs(Math.floor(Number(totalBronze) || 0));
  const { gold, silver, bronze } = fromBronze(abs);
  if (abs === 0) return '0 moedas';

  const parts: string[] = [];
  if (gold > 0) {
    parts.push(`${gold} ${gold === 1 ? 'ouro' : 'ouros'}`);
  }
  if (silver > 0) {
    parts.push(`${silver} ${silver === 1 ? 'prata' : 'pratas'}`);
  }
  if (bronze > 0) {
    parts.push(`${bronze} ${bronze === 1 ? 'bronze' : 'bronzes'}`);
  }

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} e ${parts[1]}`;
  return `${parts[0]}, ${parts[1]} e ${parts[2]}`;
}

export function formatLedgerReason(reason = ''): string {
  switch (reason) {
    case 'mestre':
      return 'Dádiva do Mestre';
    case 'mestre_todos':
      return 'Dádiva a Todos (Mestre)';
    case 'transferencia_enviada':
      return 'Transferência Enviada';
    case 'transferencia_recebida':
      return 'Transferência Recebida';
    case 'compra':
      return 'Compra na Loja';
    case 'venda':
      return 'Venda de Item';
    case 'saque':
      return 'Saque / Espólio';
    case 'ajuste':
      return 'Ajuste de Saldo';
    default:
      return reason || 'Transação';
  }
}

export function allocateInventoryGrid40(playerDbItems: InventoryItemRecord[]): {
  grid: Array<InventoryItemRecord | null>;
  overflow: InventoryItemRecord[];
} {
  const grid: Array<InventoryItemRecord | null> = new Array(40).fill(null);
  const unallocated: InventoryItemRecord[] = [];

  for (const item of playerDbItems) {
    if (item.equip_slot) continue;
    const idx = item.slot_index;
    if (typeof idx === 'number' && idx >= 0 && idx < 40 && !grid[idx]) {
      grid[idx] = { ...item };
    } else {
      unallocated.push({ ...item });
    }
  }

  const overflow: InventoryItemRecord[] = [];
  for (const item of unallocated) {
    const freeIdx = grid.findIndex((slot) => slot === null);
    if (freeIdx !== -1) {
      grid[freeIdx] = { ...item, slot_index: freeIdx };
    } else {
      overflow.push(item);
    }
  }

  return { grid, overflow };
}

export function isStackable(item: InventoryItemRecord | null | undefined): boolean {
  if (!item) return false;
  if (item.stackable === false) return false;
  const cat = (item.category || item.type || '').toLowerCase();
  const eqAs = (item.equippable_as || '').toLowerCase();
  if (cat.includes('arma') || cat.includes('armadura') || cat.includes('escudo')) return false;
  if (eqAs === 'weapon' || eqAs === 'armor' || eqAs === 'shield') return false;
  if (item.damage_dice || (item.armor_bonus && Number(item.armor_bonus) > 0)) return false;
  if (item.wear_type === 'durability') return false;
  return true;
}

export function canStackTogether(
  a: InventoryItemRecord | null | undefined,
  b: InventoryItemRecord | null | undefined,
): boolean {
  if (!a || !b) return false;
  if (a.id === b.id) return false;
  if (!isStackable(a) || !isStackable(b)) return false;
  if (a.catalog_id && b.catalog_id && a.catalog_id === b.catalog_id) return true;
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase() && a.rarity === b.rarity;
}

export function moveOrSwapSlot(
  grid: Array<InventoryItemRecord | null>,
  fromSlot: number,
  toSlot: number,
): {
  ok: boolean;
  action?: 'stacked' | 'swapped' | 'moved';
  error?: string;
  grid: Array<InventoryItemRecord | null>;
} {
  if (fromSlot < 0 || fromSlot >= 40 || toSlot < 0 || toSlot >= 40) {
    return { ok: false, error: 'slot_invalido', grid };
  }
  const next = [...grid];
  const moving = next[fromSlot];
  if (!moving) return { ok: false, error: 'slot_vazio', grid };

  const target = next[toSlot];
  if (target && canStackTogether(target, moving)) {
    next[toSlot] = {
      ...target,
      quantity: Number(target.quantity || 1) + Number(moving.quantity || 1),
      slot_index: toSlot,
    };
    next[fromSlot] = null;
    return { ok: true, action: 'stacked', grid: next };
  }

  next[toSlot] = { ...moving, slot_index: toSlot };
  next[fromSlot] = target ? { ...target, slot_index: fromSlot } : null;
  return { ok: true, action: target ? 'swapped' : 'moved', grid: next };
}

export function transferItemBetweenInventories(
  senderItems: InventoryItemRecord[],
  receiverItems: InventoryItemRecord[],
  itemId: string,
  qtyToSend: number,
  targetHeroId: string,
): {
  ok: boolean;
  error?: string;
  senderItems?: InventoryItemRecord[];
  receiverItems?: InventoryItemRecord[];
} {
  const idx = senderItems.findIndex((i) => i.id === itemId);
  if (idx === -1) return { ok: false, error: 'item_nao_encontrado' };

  const item = senderItems[idx];
  const currentQty = Number(item.quantity || 1);
  if (qtyToSend <= 0 || qtyToSend > currentQty) {
    return { ok: false, error: 'quantidade_invalida' };
  }

  const { grid: recvGrid } = allocateInventoryGrid40(receiverItems);
  const existingStackIdx = receiverItems.findIndex(
    (r) => !r.equip_slot && canStackTogether(r, item),
  );
  const freeSlotIdx = recvGrid.findIndex((s) => s === null);

  if (existingStackIdx === -1 && freeSlotIdx === -1) {
    return { ok: false, error: 'mochila_destinatario_cheia' };
  }

  const nextSender = [...senderItems];
  if (qtyToSend === currentQty) {
    nextSender.splice(idx, 1);
  } else {
    nextSender[idx] = { ...item, quantity: currentQty - qtyToSend };
  }

  const nextReceiver = [...receiverItems];
  if (existingStackIdx !== -1) {
    const existing = nextReceiver[existingStackIdx];
    nextReceiver[existingStackIdx] = {
      ...existing,
      quantity: Number(existing.quantity || 1) + qtyToSend,
    };
  } else {
    nextReceiver.push({
      ...item,
      id: `${item.id}_transfer`,
      character_id: targetHeroId,
      player_id: targetHeroId,
      equip_slot: null,
      slot_index: freeSlotIdx,
      quantity: qtyToSend,
    });
  }

  return { ok: true, senderItems: nextSender, receiverItems: nextReceiver };
}

export type EquipSlotKey =
  | 'head'
  | 'chest'
  | 'hands'
  | 'main_hand'
  | 'off_hand'
  | 'ring_1'
  | 'ring_2'
  | 'amulet';

export function canEquipInSlot(
  item: InventoryItemRecord | null | undefined,
  slotKey: EquipSlotKey,
  mainHandItem?: InventoryItemRecord | null,
): boolean {
  if (!item) return false;
  const eqAs = (item.equippable_as || '').toLowerCase();
  const cat = (item.category || item.type || '').toLowerCase();
  const name = (item.name || '').toLowerCase();

  if (slotKey === 'head') {
    return (
      eqAs === 'head' ||
      eqAs === 'capacete' ||
      eqAs === 'elmo' ||
      cat.includes('elmo') ||
      cat.includes('capacete') ||
      cat.includes('tiara') ||
      cat.includes('coroa') ||
      name.includes('elmo') ||
      name.includes('capacete') ||
      name.includes('capuz') ||
      name.includes('tiara') ||
      name.includes('diadema') ||
      name.includes('coroa')
    );
  }

  if (slotKey === 'chest') {
    return (
      eqAs === 'armor' ||
      eqAs === 'armadura' ||
      eqAs === 'chest' ||
      cat.includes('armadura') ||
      cat.includes('proteção') ||
      cat.includes('protecao') ||
      name.includes('armadura') ||
      name.includes('cota') ||
      name.includes('traje') ||
      name.includes('couraça') ||
      name.includes('couraca') ||
      name.includes('peitoral') ||
      name.includes('gibão') ||
      name.includes('gibao') ||
      name.includes('manto') ||
      name.includes('malha') ||
      name.includes('placas') ||
      name.includes('escamas') ||
      name.includes('loriga') ||
      name.includes('vestimenta') ||
      name.includes('túnica') ||
      name.includes('tunica') ||
      name.includes('couro')
    );
  }

  if (slotKey === 'hands') {
    return (
      eqAs === 'hands' ||
      eqAs === 'luvas' ||
      eqAs === 'manoplas' ||
      cat.includes('luvas') ||
      cat.includes('manoplas') ||
      name.includes('luvas') ||
      name.includes('manoplas') ||
      name.includes('braceletes')
    );
  }

  if (slotKey === 'amulet') {
    return (
      eqAs === 'amulet' ||
      eqAs === 'amuleto' ||
      eqAs === 'reliquia' ||
      cat.includes('amuleto') ||
      cat.includes('relíquia') ||
      cat.includes('reliquia') ||
      name.includes('amuleto') ||
      name.includes('talismã') ||
      name.includes('talisma') ||
      name.includes('colar') ||
      name.includes('medalhão') ||
      name.includes('medalhao') ||
      name.includes('pingente') ||
      name.includes('relicário') ||
      name.includes('relicario')
    );
  }

  if (slotKey === 'ring_1' || slotKey === 'ring_2') {
    return (
      eqAs === 'ring' ||
      eqAs === 'anel' ||
      cat.includes('anel') ||
      name.includes('anel') ||
      name.includes('aliança') ||
      name.includes('alianca') ||
      name.includes('elo')
    );
  }

  if (slotKey === 'main_hand') {
    const dmgDice = item.damage_dice;
    return (
      eqAs === 'weapon' ||
      eqAs === 'main_hand' ||
      eqAs === 'two_hands' ||
      eqAs === 'two_handed' ||
      eqAs === 'two_handed_weapon' ||
      eqAs === 'arma' ||
      !!dmgDice ||
      cat.includes('arma') ||
      cat.includes('lâmina') ||
      cat.includes('lamina') ||
      cat.includes('espada') ||
      cat.includes('machado') ||
      cat.includes('arco') ||
      cat.includes('besta') ||
      cat.includes('adaga') ||
      name.includes('espada') ||
      name.includes('adaga') ||
      name.includes('lâmina') ||
      name.includes('lamina') ||
      name.includes('faca') ||
      name.includes('machado') ||
      name.includes('lança') ||
      name.includes('lanca') ||
      name.includes('arco') ||
      name.includes('besta') ||
      name.includes('maça') ||
      name.includes('maca') ||
      name.includes('martelo') ||
      name.includes('bordão') ||
      name.includes('bordao') ||
      name.includes('cajado') ||
      name.includes('foice') ||
      name.includes('alabarda') ||
      name.includes('mangual') ||
      name.includes('clava') ||
      name.includes('tacape')
    );
  }

  if (slotKey === 'off_hand') {
    if (mainHandItem?.two_handed) return false;
    const dmgDice = item.damage_dice;
    return (
      eqAs === 'shield' ||
      eqAs === 'escudo' ||
      eqAs === 'off_hand' ||
      cat.includes('escudo') ||
      name.includes('escudo') ||
      name.includes('broquel') ||
      name.includes('tarja') ||
      name.includes('pavise') ||
      ((!!dmgDice ||
        eqAs === 'weapon' ||
        eqAs === 'main_hand' ||
        cat.includes('arma') ||
        name.includes('adaga') ||
        name.includes('faca') ||
        name.includes('espada')) &&
        !item.two_handed)
    );
  }

  return false;
}

export function getDefaultEquipSlot(
  item: InventoryItemRecord | null | undefined,
  equippedMap?: Record<string, InventoryItemRecord | null | undefined>,
): EquipSlotKey | null {
  if (!item) return null;
  const eqAs = (item.equippable_as || '').toLowerCase();
  const cat = (item.category || item.type || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const armorB = Number(item.armor_bonus || 0);
  const dmgDice = item.damage_dice;

  if (eqAs === 'head' || cat.includes('elmo') || cat.includes('capacete') || name.includes('elmo'))
    return 'head';
  if (eqAs === 'hands' || cat.includes('luvas') || name.includes('luvas')) return 'hands';
  if (eqAs === 'armor' || eqAs === 'armadura' || eqAs === 'chest') return 'chest';
  if (eqAs === 'shield' || eqAs === 'escudo') return 'off_hand';
  if (eqAs === 'amulet' || eqAs === 'amuleto' || eqAs === 'reliquia') return 'amulet';
  if (eqAs === 'ring' || eqAs === 'anel') return equippedMap?.ring_1 ? 'ring_2' : 'ring_1';
  if (eqAs === 'weapon' || eqAs === 'arma' || eqAs === 'main_hand') return 'main_hand';
  if (eqAs === 'off_hand') return 'off_hand';

  if (armorB > 0) {
    if (cat.includes('escudo') || name.includes('escudo') || name.includes('broquel'))
      return 'off_hand';
    if (cat.includes('anel') || name.includes('anel'))
      return equippedMap?.ring_1 ? 'ring_2' : 'ring_1';
    if (cat.includes('amuleto') || name.includes('amuleto') || name.includes('colar'))
      return 'amulet';
    return 'chest';
  }

  if (dmgDice) {
    if (!equippedMap?.main_hand) return 'main_hand';
    if (!equippedMap?.off_hand && !equippedMap?.main_hand?.two_handed && !item.two_handed)
      return 'off_hand';
    return 'main_hand';
  }

  if (canEquipInSlot(item, 'amulet')) return 'amulet';
  if (canEquipInSlot(item, 'head')) return 'head';
  if (canEquipInSlot(item, 'hands')) return 'hands';
  if (canEquipInSlot(item, 'chest')) return 'chest';
  if (canEquipInSlot(item, 'off_hand', equippedMap?.main_hand)) return 'off_hand';
  if (canEquipInSlot(item, 'ring_1')) return equippedMap?.ring_1 ? 'ring_2' : 'ring_1';
  if (canEquipInSlot(item, 'main_hand')) return 'main_hand';

  return null;
}

export function parseConsumableEffects(item: InventoryItemRecord | null | undefined): {
  isFood: boolean;
  saciedade: number;
  givesPlague: boolean;
  healsHp: number | null;
  healsAllHp: boolean;
  restoresFocus: number | null;
  restoresAllFocus: boolean;
} {
  if (!item) {
    return {
      isFood: false,
      saciedade: 0,
      givesPlague: false,
      healsHp: null,
      healsAllHp: false,
      restoresFocus: null,
      restoresAllFocus: false,
    };
  }

  const special = (item.special || item.description || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  const sub = (item.subcategory || '').toLowerCase();

  // Saciedade / Comida
  let sac = Number(item.saciedade || 0);
  let isFood = sac > 0 || cat.includes('comida') || sub.includes('comida') || cat.includes('prato');
  if (
    !sac &&
    (name.includes('ração') ||
      name.includes('racao') ||
      name.includes('assado') ||
      name.includes('pão') ||
      name.includes('pao') ||
      name.includes('queijo') ||
      name.includes('torta') ||
      name.includes('ensopado'))
  ) {
    isFood = true;
    if (name.includes('ração') || name.includes('racao')) sac = 4;
    else if (name.includes('assado') || name.includes('ensopado')) sac = 5;
    else sac = 2;
  }

  // Peste
  const plagueCost = Number(item.plague_cost || 0);
  const givesPlague =
    plagueCost > 0 || special.includes('+1 de peste') || special.includes('dá +1 de peste');

  // Vida
  let healsHp: number | null = null;
  let healsAllHp = false;
  if (special.includes('cura toda a vida') || special.includes('restaura toda a vida')) {
    healsAllHp = true;
  } else {
    const healMatch = special.match(/cura\s+(\d+)/);
    if (healMatch) {
      healsHp = Number.parseInt(healMatch[1], 10);
    }
  }

  // Foco
  let restoresFocus: number | null = null;
  let restoresAllFocus = false;
  if (special.includes('recupera todo o foco') || special.includes('restaura todo o foco')) {
    restoresAllFocus = true;
  } else {
    const focusMatch = special.match(/recupera\s+(\d+)\s+de\s+foco/);
    if (focusMatch) {
      restoresFocus = Number.parseInt(focusMatch[1], 10);
    }
  }

  return {
    isFood,
    saciedade: sac,
    givesPlague,
    healsHp,
    healsAllHp,
    restoresFocus,
    restoresAllFocus,
  };
}

export function calcTotalInventoryWeight(items: InventoryItemRecord[]): number {
  return items.reduce((acc, it) => {
    const qty = Math.max(1, Number(it.quantity || 1));
    const isEquipped = Boolean(it.equip_slot);
    // Equipamentos contam como 1 de carga, itens leves na mochila
    return acc + (isEquipped ? 1 : Math.ceil(qty / 5));
  }, 0);
}
