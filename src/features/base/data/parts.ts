import {
  Anchor,
  BrickWall,
  Castle,
  Cog,
  DoorOpen,
  Fence,
  Flag,
  House,
  type LucideIcon,
  Sailboat,
  Ship,
  Tent,
  Wrench,
} from 'lucide-react';

export type PartKind =
  | 'casco'
  | 'vela'
  | 'ancora'
  | 'telhado'
  | 'muro'
  | 'portao'
  | 'cerca'
  | 'torre'
  | 'mecanismo'
  | 'estandarte'
  | 'tenda'
  | 'reparo';

export const PART_KINDS: Record<PartKind, { label: string; icon: LucideIcon }> = {
  casco: { label: 'Casco', icon: Ship },
  vela: { label: 'Velas', icon: Sailboat },
  ancora: { label: 'Âncora', icon: Anchor },
  telhado: { label: 'Telhado', icon: House },
  muro: { label: 'Muro', icon: BrickWall },
  portao: { label: 'Portão', icon: DoorOpen },
  cerca: { label: 'Cerca', icon: Fence },
  torre: { label: 'Torre', icon: Castle },
  mecanismo: { label: 'Mecanismo', icon: Cog },
  estandarte: { label: 'Estandarte', icon: Flag },
  tenda: { label: 'Tenda', icon: Tent },
  reparo: { label: 'Outro', icon: Wrench },
};

export const PART_ORDER = Object.keys(PART_KINDS) as PartKind[];

export function partKind(kind: string | null | undefined) {
  return PART_KINDS[(kind as PartKind) ?? 'reparo'] ?? PART_KINDS.reparo;
}

export interface RepairNeed {
  name: string;
  qty: number;
}

export interface PartLike {
  condition: number;
  max_condition: number;
  wear_per_day: number;
  cond_minutes: number;
}

/** Estado atual (0 a max) descontando o desgaste desde a última gravação, pelo relógio do mundo. */
export function currentCondition(p: PartLike, worldMinutes: number) {
  const max = Math.max(1, Number(p.max_condition) || 100);
  const base = Math.min(max, Math.max(0, Number(p.condition) || 0));
  const wear = Math.max(0, Number(p.wear_per_day) || 0);
  const since = Math.max(0, worldMinutes - (Number(p.cond_minutes) || 0));
  return Math.max(0, base - (wear * since) / 1440);
}

export function conditionLabel(frac: number) {
  if (frac <= 0) return 'Quebrado';
  if (frac < 0.4) return 'Danificado';
  if (frac < 0.75) return 'Desgastado';
  if (frac < 1) return 'Bom';
  return 'Perfeito';
}

/** Dias do mundo até quebrar (null se não desgasta). */
export function daysToBreak(p: PartLike, worldMinutes: number) {
  const wear = Number(p.wear_per_day) || 0;
  if (wear <= 0) return null;
  return currentCondition(p, worldMinutes) / wear;
}

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

/** Quanto de cada material o grupo tem (soma por nome). */
export function countByName(items: Array<{ name?: unknown; quantity?: unknown }>) {
  const m = new Map<string, number>();
  for (const it of items) m.set(norm(it.name), (m.get(norm(it.name)) ?? 0) + (Number(it.quantity) || 1));
  return m;
}

export function needsKey(name: string) {
  return norm(name);
}

export function parseNeeds(raw: unknown): RepairNeed[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => ({ name: String((r as RepairNeed)?.name ?? '').trim(), qty: Math.max(1, Math.round(Number((r as RepairNeed)?.qty) || 1)) }))
    .filter((r) => r.name);
}
