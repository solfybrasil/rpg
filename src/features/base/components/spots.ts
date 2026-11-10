import type { BasePart, BaseStorage } from '../api/baseApi';
import { formatCoins, kindInfo } from '../data/kinds';
import { conditionLabel, currentCondition, partKind } from '../data/parts';
import type { SceneSpot } from './BaseScene';

export function storageSpots(storages: BaseStorage[], used: Map<string, number>, dm: boolean): SceneSpot[] {
  return storages
    .filter((s) => dm || !s.hidden)
    .map((s) => {
      const n = used.get(s.id) ?? 0;
      return {
        id: s.id,
        x: s.x,
        y: s.y,
        icon: kindInfo(s.kind).icon,
        label: s.name,
        sub: s.owned ? `${n}/${s.slots}` : formatCoins(s.price_bronze),
        subTone: s.owned && n >= s.slots ? 'danger' : 'muted',
        variant: s.owned ? 'owned' : 'locked',
        hidden: s.hidden,
        ariaLabel: `${s.name}${s.owned ? `, ${n} de ${s.slots} espaços` : `, à venda por ${formatCoins(s.price_bronze)}`}`,
        testid: `storage-${s.id}`,
      };
    });
}

export function partSpots(parts: BasePart[], minutes: number, dm: boolean): SceneSpot[] {
  return parts
    .filter((p) => dm || !p.hidden)
    .map((p) => {
      const max = Math.max(1, p.max_condition || 100);
      const h = currentCondition(p, minutes) / max;
      const pct = Math.round(h * 100);
      return {
        id: p.id,
        x: p.x,
        y: p.y,
        icon: partKind(p.kind).icon,
        label: p.name,
        sub: `${pct}%`,
        subTone: h <= 0 || h < 0.4 ? 'danger' : h < 0.75 ? 'warn' : 'ok',
        variant: 'part',
        health: h,
        hidden: p.hidden,
        ariaLabel: `${p.name}: ${conditionLabel(h).toLowerCase()}, ${pct}%`,
        testid: `part-${p.id}`,
      };
    });
}
