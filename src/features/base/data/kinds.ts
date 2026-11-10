import {
  Archive,
  Beer,
  Box,
  DoorClosed,
  Gem,
  Library,
  type LucideIcon,
  Package,
  Vault,
} from 'lucide-react';

export type StorageKind = 'bau' | 'armario' | 'barril' | 'estante' | 'cofre' | 'caixote' | 'saco' | 'relicario';

export interface KindInfo {
  label: string;
  icon: LucideIcon;
  /** Espaços sugeridos ao criar. */
  slots: number;
}

export const STORAGE_KINDS: Record<StorageKind, KindInfo> = {
  bau: { label: 'Baú', icon: Archive, slots: 12 },
  armario: { label: 'Armário', icon: DoorClosed, slots: 16 },
  barril: { label: 'Barril', icon: Beer, slots: 6 },
  estante: { label: 'Estante', icon: Library, slots: 10 },
  cofre: { label: 'Cofre', icon: Vault, slots: 8 },
  caixote: { label: 'Caixote', icon: Box, slots: 8 },
  saco: { label: 'Saco de carga', icon: Package, slots: 6 },
  relicario: { label: 'Relicário', icon: Gem, slots: 4 },
};

export const KIND_ORDER = Object.keys(STORAGE_KINDS) as StorageKind[];

export function kindInfo(kind: string | null | undefined): KindInfo {
  return STORAGE_KINDS[(kind as StorageKind) ?? 'bau'] ?? STORAGE_KINDS.bau;
}

/** "2o 3p 10b" a partir de bronze (1 ouro = 2500 bronze, 1 prata = 50), como na mochila. */
export function formatCoins(bronze: number): string {
  const total = Math.max(0, Math.floor(bronze || 0));
  const po = Math.floor(total / 2500);
  const pp = Math.floor((total % 2500) / 50);
  const pb = total % 50;
  const parts = [po && `${po}o`, pp && `${pp}p`, pb && `${pb}b`].filter(Boolean);
  return parts.length ? parts.join(' ') : 'grátis';
}
