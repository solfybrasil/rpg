import { useQuery } from '@tanstack/react-query';
import { type Tables, queryKeys, supabase } from '../../shared/supabase';

export type SpellRow = Tables<'magias'>;

const SPELL_COLUMNS =
  'id, nome, circulo, escola, custo_foco, peso, alcance, area, duracao, tipo_acao, descricao, efeito_sucesso, efeito_brilhante, efeito_falha, blocos, tags, em_combate, icone';

export async function fetchSpells(params?: {
  search?: string;
  circle?: number;
  affinity?: string;
  page?: number;
  pageSize?: number;
}): Promise<SpellRow[]> {
  const page = params?.page ?? 0;
  const pageSize = params?.pageSize ?? 50;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from('magias').select(SPELL_COLUMNS).range(from, to);

  if (params?.search?.trim()) {
    query = query.ilike('nome', `%${params.search.trim()}%`);
  }
  if (typeof params?.circle === 'number') {
    query = query.eq('circulo', params.circle);
  }
  if (params?.affinity) {
    query = query.eq('escola', params.affinity);
  }

  const { data, error } = await query
    .order('circulo', { ascending: true })
    .order('nome', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SpellRow[];
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
// [peste-v2 fundacao] component placeholder
// [peste-v2 fundacao] component placeholder
