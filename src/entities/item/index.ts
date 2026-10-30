export interface InventoryItemRecord {
  id: string;
  character_id?: string | null;
  player_id?: string | null;
  catalog_id?: string | null;
  name: string;
  category?: string | null;
  type?: string | null;
  rarity?: string | null;
  quantity?: number | null;
  slot_index?: number | null;
  equip_slot?: string | null;
  equipped?: boolean | null;
  image_url?: string | null;
  description?: string | null;
  stats?: Record<string, unknown> | null;
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
  if (
    target &&
    target.id !== moving.id &&
    target.catalog_id &&
    target.catalog_id === moving.catalog_id &&
    target.category !== 'arma' &&
    target.category !== 'armadura'
  ) {
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
    (r) =>
      !r.equip_slot && r.catalog_id && r.catalog_id === item.catalog_id && r.category !== 'arma',
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
