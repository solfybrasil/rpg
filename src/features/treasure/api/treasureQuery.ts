// Leitura dos baús (leve: o layout do Jogador usa isto em toda tela).
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase as typedSupabase } from '../../../shared/supabase';
import { subscribeRealtime } from '../../../shared/supabase/realtime';
import type { ChestItem, ChestTier } from '../data/loot';

// biome-ignore lint/suspicious/noExplicitAny: tabela nova fora do schema gerado
const db = typedSupabase as any;

export const CHEST_SESSION = 'MESA';

export interface TreasureChest {
  id: string;
  session_code: string;
  name: string;
  tier: ChestTier;
  status: 'rascunho' | 'liberado' | 'vazio';
  for_heroes: string[] | null;
  items: ChestItem[];
  coins: number;
  coins_taken_by: string | null;
  map_id: string | null;
  map_token_id: string | null;
  version: number;
  released_at: string | null;
  created_at: string;
  updated_at: string;
}

export const CHESTS_KEY = ['treasure', 'chests'] as const;

function isMissing(err: unknown) {
  const e = err as { code?: string; message?: string } | null;
  return Boolean(
    e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|could not find the table|schema cache/i.test(e.message ?? '')),
  );
}

class MissingError extends Error {
  missing = true;
}

export async function run<T>(q: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await q;
  if (error) {
    if (isMissing(error)) throw new MissingError('A tabela de baús ainda não existe.');
    throw new Error((error as { message?: string }).message || 'Erro no banco');
  }
  return data;
}

function normalize(row: TreasureChest): TreasureChest {
  return { ...row, items: Array.isArray(row.items) ? row.items : [], coins: Number(row.coins) || 0, version: Number(row.version) || 0 };
}

/** Itens que este herói ainda pode pegar. */
export function availableFor(chest: TreasureChest, heroId: string) {
  if (chest.status !== 'liberado') return { items: [] as ChestItem[], coins: 0 };
  if (chest.for_heroes?.length && !chest.for_heroes.includes(heroId)) return { items: [], coins: 0 };
  return {
    items: chest.items.filter((i) => !i.taken_by && (!i.for || i.for === heroId)),
    coins: chest.coins_taken_by ? 0 : chest.coins,
  };
}

/** Baús da sessão, com tempo real. O Jogador só recebe os liberados. */
export function useChests(role: 'dm' | 'player') {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: [...CHESTS_KEY, role],
    queryFn: async () => {
      let req = db.from('treasure_chests').select('*').eq('session_code', CHEST_SESSION).order('created_at', { ascending: false }).limit(200);
      if (role === 'player') req = req.eq('status', 'liberado');
      return ((await run(req)) as TreasureChest[]).map(normalize);
    },
    staleTime: 5_000,
    refetchInterval: role === 'player' ? 20_000 : 30_000,
    retry: (n, err) => !(err as MissingError)?.missing && n < 2,
  });

  useEffect(
    () =>
      subscribeRealtime({
        topic: 'treasure_chests',
        table: 'treasure_chests',
        handler: () => void qc.invalidateQueries({ queryKey: CHESTS_KEY }),
      }),
    [qc],
  );

  return {
    chests: q.data ?? [],
    loading: q.isLoading,
    missing: Boolean((q.error as MissingError | null)?.missing),
    error: q.error && !(q.error as MissingError).missing ? (q.error as Error) : null,
  };
}

/** Um baú (ex.: o que o jogador tocou no mapa). */
export async function fetchChest(id: string) {
  return normalize((await run(db.from('treasure_chests').select('*').eq('id', id).single())) as TreasureChest);
}

