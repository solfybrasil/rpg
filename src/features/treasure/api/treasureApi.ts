import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { addCoins } from '../../../shared/lib/coins';
import { queryKeys, supabase as typedSupabase } from '../../../shared/supabase';
import { giveFromCatalog } from '../../market/api/marketApi';
import type { ChestItem } from '../data/loot';
import { CHESTS_KEY, CHEST_SESSION, type TreasureChest, availableFor, fetchChest, run } from './treasureQuery';

export * from './treasureQuery';

// biome-ignore lint/suspicious/noExplicitAny: tabela nova fora do schema gerado
const db = typedSupabase as any;

function normalize(row: TreasureChest): TreasureChest {
  return { ...row, items: Array.isArray(row.items) ? row.items : [], coins: Number(row.coins) || 0, version: Number(row.version) || 0 };
}

function report(prefix: string) {
  return (err: unknown) => toast.error(`${prefix}: ${err instanceof Error ? err.message : 'erro'}`);
}

export function useChestActions() {
  const qc = useQueryClient();
  const setCache = (fn: (rows: TreasureChest[]) => TreasureChest[]) => {
    for (const role of ['dm', 'player'] as const) {
      qc.setQueryData<TreasureChest[]>([...CHESTS_KEY, role], (rows) => (rows ? fn(rows) : rows));
    }
  };
  const refresh = () => void qc.invalidateQueries({ queryKey: CHESTS_KEY });

  const create = useMutation({
    mutationFn: async (c: Partial<TreasureChest>) =>
      normalize((await run(db.from('treasure_chests').insert({ session_code: CHEST_SESSION, ...c }).select('*').single())) as TreasureChest),
    onSuccess: (row) => setCache((rows) => [row, ...rows.filter((r) => r.id !== row.id)]),
    onError: report('Não foi possível criar o baú'),
  });

  /** Vários de uma vez (espalhar no mapa). */
  const createMany = async (list: Array<Partial<TreasureChest>>) => {
    const rows = ((await run(
      db
        .from('treasure_chests')
        .insert(list.map((c) => ({ session_code: CHEST_SESSION, ...c })))
        .select('*'),
    )) as TreasureChest[]).map(normalize);
    setCache((cur) => [...rows, ...cur]);
    return rows;
  };

  const update = useMutation({
    mutationFn: async ({ chest, patch }: { chest: TreasureChest; patch: Partial<TreasureChest> }) => {
      await run(
        db
          .from('treasure_chests')
          .update({ ...patch, version: chest.version + 1, updated_at: new Date().toISOString() })
          .eq('id', chest.id),
      );
    },
    onMutate: ({ chest, patch }) => setCache((rows) => rows.map((r) => (r.id === chest.id ? { ...r, ...patch, version: r.version + 1 } : r))),
    onError: (err) => {
      report('Não foi possível salvar o baú')(err);
      refresh();
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await run(db.from('treasure_chests').delete().eq('id', id));
    },
    onMutate: (id) => setCache((rows) => rows.filter((r) => r.id !== id)),
    onError: (err) => {
      report('Não foi possível apagar')(err);
      refresh();
    },
  });

  /**
   * Jogador pega itens (e/ou as moedas). Primeiro reserva no baú (só grava se
   * ninguém mexeu antes), depois põe na mochila; o que falhar volta para o baú.
   */
  const take = useMutation({
    mutationFn: async (v: { chestId: string; keys: string[]; coins: boolean; heroId: string; heroName: string }) => {
      const { chestId, heroId } = v;
      let claimed: ChestItem[] = [];
      let coins = 0;
      let chest: TreasureChest | null = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        chest = await fetchChest(chestId);
        const can = availableFor(chest, heroId);
        claimed = can.items.filter((i) => v.keys.includes(i.key));
        coins = v.coins ? can.coins : 0;
        if (!claimed.length && !coins) throw new Error('Isso já foi pego.');
        const keys = new Set(claimed.map((i) => i.key));
        const items = chest.items.map((i) => (keys.has(i.key) ? { ...i, taken_by: heroId } : i));
        const coinsTaken = coins ? heroId : chest.coins_taken_by;
        const empty = items.every((i) => i.taken_by) && (!chest.coins || coinsTaken);
        const ok = await run(
          db
            .from('treasure_chests')
            .update({
              items,
              coins_taken_by: coinsTaken,
              status: empty ? 'vazio' : chest.status,
              version: chest.version + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', chestId)
            .eq('version', chest.version)
            .select('id'),
        );
        if ((ok as unknown[])?.length) break;
        claimed = [];
        coins = 0;
        chest = null;
      }
      if (!chest) throw new Error('O baú mudou agora mesmo. Tente de novo.');

      // Entrega
      const failed: ChestItem[] = [];
      for (const it of claimed) {
        try {
          await giveFromCatalog(it.catalog_id, heroId, Math.max(1, it.qty), 0);
        } catch {
          failed.push(it);
        }
      }
      if (coins) await addCoins(heroId, coins, `Baú: ${chest.name}`, 'saque');
      if (failed.length) {
        // Devolve ao baú o que não coube na mochila.
        for (let attempt = 0; attempt < 4; attempt++) {
          const cur = await fetchChest(chestId);
          const back = new Set(failed.map((i) => i.key));
          const items = cur.items.map((i) => (back.has(i.key) ? { ...i, taken_by: null } : i));
          const ok = await run(
            db
              .from('treasure_chests')
              .update({ items, status: 'liberado', version: cur.version + 1 })
              .eq('id', chestId)
              .eq('version', cur.version)
              .select('id'),
          );
          if ((ok as unknown[])?.length) break;
        }
      }
      return { got: claimed.length - failed.length, failed: failed.length, coins, heroId, name: chest.name };
    },
    onSuccess: (r) => {
      const parts = [r.got ? `${r.got} ${r.got === 1 ? 'item' : 'itens'}` : '', r.coins ? 'as moedas' : ''].filter(Boolean);
      if (parts.length) toast.success(`Você pegou ${parts.join(' e ')} do ${r.name}.`);
      if (r.failed) toast.error(`${r.failed} não couberam na mochila e ficaram no baú.`);
      refresh();
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.byHero(r.heroId) });
      void qc.invalidateQueries({ queryKey: ['heroes'] });
    },
    onError: (err) => {
      report('Não deu para pegar')(err);
      refresh();
    },
  });

  return { create, createMany, update, remove, take };
}
