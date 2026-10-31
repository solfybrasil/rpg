import { useQuery } from '@tanstack/react-query';
import { type Tables, queryKeys } from '../../shared/supabase';
import { getGrimorioMotor, normalizeSpell } from './api';

export type SpellRow = Tables<'magias'>;

export async function fetchSpells(params?: {
  search?: string;
  circle?: number;
  affinity?: string;
  page?: number;
  pageSize?: number;
}): Promise<SpellRow[]> {
  const motor = await getGrimorioMotor();
  let list = (motor.magias || []).map(normalizeSpell) as unknown as SpellRow[];

  if (params?.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    list = list.filter((m) => m.nome?.toLowerCase().includes(q));
  }
  if (typeof params?.circle === 'number') {
    list = list.filter((m) => Number(m.circulo) === params.circle);
  }
  if (params?.affinity) {
    list = list.filter(
      (m) =>
        m.escola === params.affinity || (m as any).fonte === params.affinity,
    );
  }

  const page = params?.page ?? 0;
  const pageSize = params?.pageSize ?? 50;
  const from = page * pageSize;
  return list.slice(from, from + pageSize);
}

export function useSpells(params?: {
  search?: string;
  circle?: number;
  affinity?: string;
  page?: number;
}) {
  return useQuery<SpellRow[]>({
    queryKey: queryKeys.catalogs.spells(params),
    queryFn: () => fetchSpells(params),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export * from './api';
export * from './types';
export * from './components/PlayerGrimoireView';
export * from './components/SpellCard';
export * from './components/SpellInspectModal';
export * from './components/SpellCastModal';

