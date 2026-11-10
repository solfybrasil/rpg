import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { type InventoryItemRecord, canStackTogether } from '../../../entities/item';
import { queryKeys, supabase as typedSupabase } from '../../../shared/supabase';
import { subscribeRealtime } from '../../../shared/supabase/realtime';

// As tabelas da base são novas e ainda não estão nos tipos gerados.
// biome-ignore lint/suspicious/noExplicitAny: tabelas fora do schema gerado
const db = typedSupabase as any;

export const BASE_SESSION = 'MESA';
/** Espaços da mochila (igual à grade do Jogador). */
const BACKPACK_SLOTS = 40;

export interface BaseState {
  session_code: string;
  name: string;
  background_url: string | null;
  img_w: number | null;
  img_h: number | null;
}

export interface BaseStorage {
  id: string;
  session_code: string;
  name: string;
  kind: string;
  x: number;
  y: number;
  slots: number;
  owned: boolean;
  price_bronze: number;
  level: number;
  max_level: number;
  upgrade_price: number;
  upgrade_slots: number;
  hidden: boolean;
  bought_by: string | null;
  description: string | null;
}

export interface BaseItem {
  id: string;
  storage_id: string;
  slot_index: number;
  quantity: number;
  item: Record<string, unknown>;
  deposited_by: string | null;
  updated_at?: string;
}

const K = {
  state: ['base', 'state'] as const,
  storages: ['base', 'storages'] as const,
  items: ['base', 'items'] as const,
};

/** A tabela não existe ainda (SQL da base não foi rodado). */
export function isMissingTable(err: unknown) {
  const e = err as { code?: string; message?: string } | null;
  if (!e) return false;
  return (
    e.code === '42P01' ||
    e.code === 'PGRST205' ||
    /does not exist|could not find the table|schema cache/i.test(e.message ?? '')
  );
}

class MissingTablesError extends Error {
  missing = true;
}

async function run<T>(q: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await q;
  if (error) {
    if (isMissingTable(error)) throw new MissingTablesError('As tabelas da base ainda não existem.');
    throw new Error((error as { message?: string }).message || 'Erro no banco');
  }
  return data;
}

/** Cenário, armazenamentos e itens guardados, com tempo real e verificação periódica. */
export function useBase() {
  const qc = useQueryClient();

  const stateQ = useQuery({
    queryKey: K.state,
    queryFn: async () =>
      (await run(db.from('base_state').select('*').eq('session_code', BASE_SESSION).maybeSingle())) as BaseState | null,
    staleTime: 10_000,
    refetchInterval: 30_000,
    retry: (n, err) => !(err as MissingTablesError)?.missing && n < 2,
  });

  const storagesQ = useQuery({
    queryKey: K.storages,
    queryFn: async () =>
      ((await run(
        db.from('base_storages').select('*').eq('session_code', BASE_SESSION).order('created_at'),
      )) ?? []) as BaseStorage[],
    staleTime: 5_000,
    refetchInterval: 15_000,
    retry: (n, err) => !(err as MissingTablesError)?.missing && n < 2,
  });

  const itemsQ = useQuery({
    queryKey: K.items,
    queryFn: async () =>
      ((await run(
        db.from('base_items').select('*').eq('session_code', BASE_SESSION).order('slot_index'),
      )) ?? []) as BaseItem[],
    staleTime: 3_000,
    refetchInterval: 10_000,
    retry: (n, err) => !(err as MissingTablesError)?.missing && n < 2,
  });

  useEffect(() => {
    const subs = [
      subscribeRealtime({ topic: 'base_state', table: 'base_state', handler: () => void qc.invalidateQueries({ queryKey: K.state }) }),
      subscribeRealtime({ topic: 'base_storages', table: 'base_storages', handler: () => void qc.invalidateQueries({ queryKey: K.storages }) }),
      subscribeRealtime({ topic: 'base_items', table: 'base_items', handler: () => void qc.invalidateQueries({ queryKey: K.items }) }),
    ];
    return () => {
      for (const u of subs) u();
    };
  }, [qc]);

  const err = stateQ.error || storagesQ.error || itemsQ.error;
  return {
    state: stateQ.data ?? null,
    storages: storagesQ.data ?? [],
    items: itemsQ.data ?? [],
    loading: stateQ.isLoading || storagesQ.isLoading || itemsQ.isLoading,
    missingTables: Boolean((err as MissingTablesError | null)?.missing),
    error: err && !(err as MissingTablesError).missing ? (err as Error) : null,
  };
}

// ─────────────────────────── utilidades ───────────────────────────

/** Campos do item que viajam entre mochila e baú (sem dono, posição ou id). */
const OWNER_FIELDS = ['id', 'character_id', 'player_id', 'slot_index', 'equip_slot', 'created_at', 'updated_at', 'quantity'];

export function itemSnapshot(row: InventoryItemRecord): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (!OWNER_FIELDS.includes(k)) out[k] = v;
  return out;
}

/** Item guardado no formato que a grade da mochila entende. */
export function asRecord(b: BaseItem): InventoryItemRecord {
  return { ...(b.item as object), id: b.id, quantity: b.quantity, slot_index: b.slot_index } as InventoryItemRecord;
}

function firstFree(used: Iterable<number>, max: number) {
  const set = new Set(used);
  for (let i = 0; i < max; i++) if (!set.has(i)) return i;
  return -1;
}

function report(prefix: string) {
  return (err: unknown) => toast.error(`${prefix}: ${err instanceof Error ? err.message : 'erro'}`);
}

/** Lê o herói direto do banco (moedas atuais). */
async function readCoins(heroId: string) {
  const row = await run(db.from('characters').select('id, name, coins_bronze').eq('id', heroId).single());
  return row as { id: string; name: string; coins_bronze: number | null };
}

/** Desconta moedas sem perder corrida: só grava se o saldo ainda for o lido. */
async function spendCoins(heroId: string, amount: number, reason: string) {
  const hero = await readCoins(heroId);
  const before = Number(hero.coins_bronze) || 0;
  if (before < amount) throw new Error('Moedas insuficientes.');
  const rows = await run(
    db
      .from('characters')
      .update({ coins_bronze: before - amount, updated_at: new Date().toISOString() })
      .eq('id', heroId)
      .eq('coins_bronze', before)
      .select('id'),
  );
  if (!(rows as unknown[])?.length) throw new Error('As moedas mudaram agora mesmo. Tente de novo.');
  try {
    await db.from('coin_ledger').insert({
      character_id: heroId,
      delta: -amount,
      amount: -amount,
      balance_after: before - amount,
      reason: 'compra',
      description: reason,
    });
  } catch {
    /* registro opcional */
  }
  return { before, after: before - amount };
}

async function refundCoins(heroId: string, amount: number) {
  const hero = await readCoins(heroId);
  await db
    .from('characters')
    .update({ coins_bronze: (Number(hero.coins_bronze) || 0) + amount })
    .eq('id', heroId);
}

// ─────────────────────────── ações ───────────────────────────

export function useBaseActions() {
  const qc = useQueryClient();
  const invalidateAll = (heroId?: string) => {
    void qc.invalidateQueries({ queryKey: K.items });
    void qc.invalidateQueries({ queryKey: K.storages });
    if (heroId) void qc.invalidateQueries({ queryKey: queryKeys.inventory.byHero(heroId) });
  };

  /** Mochila → armazenamento. */
  const deposit = useMutation({
    mutationFn: async (v: {
      row: InventoryItemRecord;
      qty: number;
      storage: BaseStorage;
      stored: BaseItem[];
      heroId: string;
      heroName: string;
    }) => {
      const { row, storage, stored, heroId, heroName } = v;
      if (row.equip_slot) throw new Error('Desequipe o item antes de guardar.');
      const have = Number(row.quantity) || 1;
      const qty = Math.min(Math.max(1, v.qty), have);
      const mine = stored.filter((s) => s.storage_id === storage.id);
      const stackWith = mine.find((s) => canStackTogether(asRecord(s), row));
      const slot = stackWith ? stackWith.slot_index : firstFree(mine.map((s) => s.slot_index), storage.slots);
      if (slot < 0) throw new Error(`${storage.name} está cheio.`);

      // 1) tira da mochila (só se ainda estiver como lemos)
      const taken =
        qty >= have
          ? await run(db.from('inventory_items').delete().eq('id', row.id).select('*'))
          : await run(
              db.from('inventory_items').update({ quantity: have - qty }).eq('id', row.id).eq('quantity', have).select('id'),
            );
      if (!(taken as unknown[])?.length) throw new Error('Esse item já saiu da mochila.');

      // 2) põe no armazenamento; se falhar, devolve
      try {
        if (stackWith) {
          const ok = await run(
            db
              .from('base_items')
              .update({ quantity: stackWith.quantity + qty, updated_at: new Date().toISOString() })
              .eq('id', stackWith.id)
              .eq('quantity', stackWith.quantity)
              .select('id'),
          );
          if (!(ok as unknown[])?.length) throw new Error('O baú mudou agora mesmo. Tente de novo.');
        } else {
          await run(
            db.from('base_items').insert({
              session_code: BASE_SESSION,
              storage_id: storage.id,
              slot_index: slot,
              quantity: qty,
              item: itemSnapshot(row),
              deposited_by: heroName,
            }),
          );
        }
      } catch (err) {
        if (qty >= have) {
          const { id: _id, ...rest } = row as InventoryItemRecord & { id: string };
          await db.from('inventory_items').insert({ ...rest, id: row.id });
        } else {
          await db.from('inventory_items').update({ quantity: have }).eq('id', row.id);
        }
        throw err;
      }
      return { name: row.name, qty, storage: storage.name, heroId };
    },
    onSuccess: (r) => {
      toast.success(`${r.qty > 1 ? `${r.qty}× ` : ''}${r.name} guardado em ${r.storage}.`);
      invalidateAll(r.heroId);
    },
    onError: (err, v) => {
      report('Não foi possível guardar')(err);
      invalidateAll(v.heroId);
    },
  });

  /** Armazenamento → mochila. */
  const withdraw = useMutation({
    mutationFn: async (v: { stored: BaseItem; qty: number; heroId: string; backpack: InventoryItemRecord[] }) => {
      const { stored, heroId, backpack } = v;
      const qty = Math.min(Math.max(1, v.qty), stored.quantity);
      const rec = asRecord(stored);
      const loose = backpack.filter((i) => !i.equip_slot);
      const stackWith = loose.find((i) => canStackTogether(i, rec));
      const slot = stackWith
        ? stackWith.slot_index
        : firstFree(
            loose.map((i) => i.slot_index).filter((s): s is number => typeof s === 'number'),
            BACKPACK_SLOTS,
          );
      if (!stackWith && (slot ?? -1) < 0) throw new Error('Sua mochila está cheia.');

      // 1) tira do baú (só se ninguém pegou antes)
      const claimed =
        qty >= stored.quantity
          ? await run(db.from('base_items').delete().eq('id', stored.id).select('*'))
          : await run(
              db
                .from('base_items')
                .update({ quantity: stored.quantity - qty, updated_at: new Date().toISOString() })
                .eq('id', stored.id)
                .eq('quantity', stored.quantity)
                .select('id'),
            );
      if (!(claimed as unknown[])?.length) throw new Error('Alguém mexeu nesse item agora mesmo.');

      // 2) põe na mochila; se falhar, devolve ao baú
      try {
        if (stackWith) {
          await run(
            db
              .from('inventory_items')
              .update({ quantity: (Number(stackWith.quantity) || 1) + qty })
              .eq('id', stackWith.id),
          );
        } else {
          await run(
            db.from('inventory_items').insert({
              ...stored.item,
              session_code: BASE_SESSION,
              character_id: heroId,
              player_id: heroId,
              slot_index: slot,
              equip_slot: null,
              quantity: qty,
            }),
          );
        }
      } catch (err) {
        if (qty >= stored.quantity) {
          await db.from('base_items').insert({ ...stored, updated_at: new Date().toISOString() });
        } else {
          await db.from('base_items').update({ quantity: stored.quantity }).eq('id', stored.id);
        }
        throw err;
      }
      return { name: String(stored.item.name ?? 'Item'), qty, heroId };
    },
    onSuccess: (r) => {
      toast.success(`${r.qty > 1 ? `${r.qty}× ` : ''}${r.name} foi para a mochila.`);
      invalidateAll(r.heroId);
    },
    onError: (err, v) => {
      report('Não foi possível pegar')(err);
      invalidateAll(v.heroId);
    },
  });

  /** Jogador compra um armazenamento à venda. */
  const buy = useMutation({
    mutationFn: async (v: { storage: BaseStorage; heroId: string }) => {
      const { storage, heroId } = v;
      const price = Math.max(0, storage.price_bronze || 0);
      if (price > 0) await spendCoins(heroId, price, `Base: ${storage.name}`);
      const hero = await readCoins(heroId);
      const ok = await run(
        db
          .from('base_storages')
          .update({ owned: true, bought_by: hero.name, updated_at: new Date().toISOString() })
          .eq('id', storage.id)
          .eq('owned', false)
          .select('id'),
      ).catch(async (err) => {
        if (price > 0) await refundCoins(heroId, price);
        throw err;
      });
      if (!(ok as unknown[])?.length) {
        if (price > 0) await refundCoins(heroId, price);
        throw new Error('Outro jurado comprou primeiro.');
      }
      return storage.name;
    },
    onSuccess: (name) => {
      toast.success(`${name} agora é do grupo.`);
      void qc.invalidateQueries({ queryKey: K.storages });
      void qc.invalidateQueries({ queryKey: ['heroes'] });
    },
    onError: report('Compra não concluída'),
  });

  /** Jogador melhora um armazenamento (mais espaços). */
  const upgrade = useMutation({
    mutationFn: async (v: { storage: BaseStorage; heroId: string }) => {
      const { storage, heroId } = v;
      if (storage.level >= storage.max_level) throw new Error('Já está no nível máximo.');
      const price = Math.max(0, storage.upgrade_price || 0);
      if (price > 0) await spendCoins(heroId, price, `Base: melhoria de ${storage.name}`);
      const ok = await run(
        db
          .from('base_storages')
          .update({
            level: storage.level + 1,
            slots: storage.slots + Math.max(1, storage.upgrade_slots || 0),
            updated_at: new Date().toISOString(),
          })
          .eq('id', storage.id)
          .eq('level', storage.level)
          .select('id'),
      ).catch(async (err) => {
        if (price > 0) await refundCoins(heroId, price);
        throw err;
      });
      if (!(ok as unknown[])?.length) {
        if (price > 0) await refundCoins(heroId, price);
        throw new Error('Já foi melhorado por outro jurado.');
      }
      return storage.name;
    },
    onSuccess: (name) => {
      toast.success(`${name} melhorado: mais espaço.`);
      void qc.invalidateQueries({ queryKey: K.storages });
      void qc.invalidateQueries({ queryKey: ['heroes'] });
    },
    onError: report('Melhoria não concluída'),
  });

  // ── Mestre ──

  const saveState = useMutation({
    mutationFn: async (patch: Partial<BaseState>) => {
      await run(
        db
          .from('base_state')
          .upsert({ session_code: BASE_SESSION, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'session_code' }),
      );
    },
    onMutate: (patch) => {
      const prev = qc.getQueryData<BaseState | null>(K.state);
      qc.setQueryData<BaseState | null>(K.state, (s) => ({
        session_code: BASE_SESSION,
        name: 'A Base',
        background_url: null,
        img_w: null,
        img_h: null,
        ...(s ?? {}),
        ...patch,
      }));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      qc.setQueryData(K.state, ctx?.prev ?? null);
      report('Não foi possível salvar a base')(err);
    },
  });

  const createStorage = useMutation({
    mutationFn: async (s: Partial<BaseStorage>) =>
      (await run(
        db
          .from('base_storages')
          .insert({ session_code: BASE_SESSION, ...s })
          .select('*')
          .single(),
      )) as BaseStorage,
    onSuccess: (row) => qc.setQueryData<BaseStorage[]>(K.storages, (rows) => [...(rows ?? []), row]),
    onError: report('Não foi possível criar'),
  });

  const updateStorage = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<BaseStorage> }) => {
      await run(db.from('base_storages').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id));
    },
    onMutate: ({ id, patch }) => {
      const prev = qc.getQueryData<BaseStorage[]>(K.storages);
      qc.setQueryData<BaseStorage[]>(K.storages, (rows) => rows?.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(K.storages, ctx.prev);
      report('Não foi possível salvar')(err);
    },
  });

  const deleteStorage = useMutation({
    mutationFn: async (id: string) => {
      await run(db.from('base_storages').delete().eq('id', id));
    },
    onMutate: (id) => {
      const prev = qc.getQueryData<BaseStorage[]>(K.storages);
      qc.setQueryData<BaseStorage[]>(K.storages, (rows) => rows?.filter((r) => r.id !== id));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(K.storages, ctx.prev);
      report('Não foi possível apagar')(err);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: K.items }),
  });

  /** Mestre tira um item do armazenamento (some da base). */
  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      await run(db.from('base_items').delete().eq('id', id));
    },
    onMutate: (id) => {
      const prev = qc.getQueryData<BaseItem[]>(K.items);
      qc.setQueryData<BaseItem[]>(K.items, (rows) => rows?.filter((r) => r.id !== id));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(K.items, ctx.prev);
      report('Não foi possível remover')(err);
    },
  });

  return { deposit, withdraw, buy, upgrade, saveState, createStorage, updateStorage, deleteStorage, removeItem };
}
