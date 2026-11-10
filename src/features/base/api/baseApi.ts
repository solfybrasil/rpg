import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { type InventoryItemRecord, canStackTogether } from '../../../entities/item';
import { queryKeys, supabase as typedSupabase } from '../../../shared/supabase';
import { readCoins, refundCoins, spendCoins } from '../../../shared/lib/coins';
import { subscribeRealtime } from '../../../shared/supabase/realtime';
import { type RepairNeed, currentCondition, needsKey, parseNeeds } from '../data/parts';

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
  exterior_url?: string | null;
  ext_w?: number | null;
  ext_h?: number | null;
}

export interface BasePart {
  id: string;
  session_code: string;
  name: string;
  kind: string;
  description: string | null;
  x: number;
  y: number;
  condition: number;
  max_condition: number;
  wear_per_day: number;
  cond_minutes: number;
  repair_items: RepairNeed[];
  repair_amount: number;
  hidden: boolean;
  last_repaired_by: string | null;
  updated_at?: string;
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
  parts: ['base', 'parts'] as const,
};

/** A tabela não existe ainda (SQL da base não foi rodado). */
export function isMissingTable(err: unknown) {
  const e = err as { code?: string; message?: string } | null;
  if (!e) return false;
  return (
    e.code === '42P01' ||
    e.code === 'PGRST205' ||
    /does not exist|could not find the table|could not find the '.*' column|schema cache/i.test(e.message ?? '')
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

  const partsQ = useQuery({
    queryKey: K.parts,
    queryFn: async () =>
      ((await run(
        db.from('base_parts').select('*').eq('session_code', BASE_SESSION).order('created_at'),
      )) ?? []) as BasePart[],
    staleTime: 5_000,
    refetchInterval: 20_000,
    retry: (n, err) => !(err as MissingTablesError)?.missing && n < 2,
  });

  useEffect(() => {
    const subs = [
      subscribeRealtime({ topic: 'base_parts', table: 'base_parts', handler: () => void qc.invalidateQueries({ queryKey: K.parts }) }),
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
    parts: partsQ.data ?? [],
    /** O SQL do lado de fora ainda não foi rodado. */
    partsMissing: Boolean((partsQ.error as MissingTablesError | null)?.missing),
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

  // ── Lado de fora: partes com manutenção ──

  const createPart = useMutation({
    mutationFn: async (p: Partial<BasePart>) =>
      (await run(db.from('base_parts').insert({ session_code: BASE_SESSION, ...p }).select('*').single())) as BasePart,
    onSuccess: (row) => qc.setQueryData<BasePart[]>(K.parts, (rows) => [...(rows ?? []), row]),
    onError: report('Não foi possível criar a parte'),
  });

  const updatePart = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<BasePart> }) => {
      await run(db.from('base_parts').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id));
    },
    onMutate: ({ id, patch }) => {
      const prev = qc.getQueryData<BasePart[]>(K.parts);
      qc.setQueryData<BasePart[]>(K.parts, (rows) => rows?.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(K.parts, ctx.prev);
      report('Não foi possível salvar a parte')(err);
    },
  });

  const deletePart = useMutation({
    mutationFn: async (id: string) => {
      await run(db.from('base_parts').delete().eq('id', id));
    },
    onMutate: (id) => {
      const prev = qc.getQueryData<BasePart[]>(K.parts);
      qc.setQueryData<BasePart[]>(K.parts, (rows) => rows?.filter((r) => r.id !== id));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(K.parts, ctx.prev);
      report('Não foi possível apagar')(err);
    },
  });

  /**
   * Conserto: gasta os materiais (primeiro da mochila, depois dos baús da base)
   * e devolve o estado da parte. O desgaste recomeça a contar de agora.
   */
  const repairPart = useMutation({
    mutationFn: async (v: {
      part: BasePart;
      minutes: number;
      heroId: string;
      heroName: string;
      backpack: InventoryItemRecord[];
      stored: BaseItem[];
    }) => {
      const { part, minutes, heroId, heroName, backpack, stored } = v;
      const needs = parseNeeds(part.repair_items);
      type Src = { table: 'inventory_items' | 'base_items'; id: string; qty: number; key: string };
      const sources: Src[] = [
        ...backpack
          .filter((i) => !i.equip_slot)
          .map((i) => ({ table: 'inventory_items' as const, id: i.id, qty: Number(i.quantity) || 1, key: needsKey(i.name) })),
        ...stored.map((b) => ({ table: 'base_items' as const, id: b.id, qty: b.quantity, key: needsKey(String(b.item.name ?? '')) })),
      ];
      // 1) confere tudo antes de gastar qualquer coisa
      for (const n of needs) {
        const have = sources.filter((s) => s.key === needsKey(n.name)).reduce((a, s) => a + s.qty, 0);
        if (have < n.qty) throw new Error(`Falta ${n.qty - have}× ${n.name}.`);
      }
      // 2) gasta (cada passo só grava se a quantidade ainda for a lida)
      for (const n of needs) {
        let left = n.qty;
        for (const src of sources) {
          if (!left) break;
          if (src.key !== needsKey(n.name) || src.qty <= 0) continue;
          const take = Math.min(left, src.qty);
          const q =
            take >= src.qty
              ? db.from(src.table).delete().eq('id', src.id).select('id')
              : db.from(src.table).update({ quantity: src.qty - take }).eq('id', src.id).eq('quantity', src.qty).select('id');
          const done = await run(q);
          if (!(done as unknown[])?.length) throw new Error(`${n.name} mudou de lugar agora mesmo. Tente de novo.`);
          src.qty -= take;
          left -= take;
        }
      }
      // 3) devolve o estado
      const max = Math.max(1, part.max_condition || 100);
      const now = currentCondition(part, minutes);
      const next = part.repair_amount > 0 ? Math.min(max, now + part.repair_amount) : max;
      await run(
        db
          .from('base_parts')
          .update({ condition: next, cond_minutes: Math.floor(minutes), last_repaired_by: heroName, updated_at: new Date().toISOString() })
          .eq('id', part.id),
      );
      return { name: part.name, pct: Math.round((next / max) * 100), heroId };
    },
    onSuccess: (r) => {
      toast.success(`${r.name} consertado: ${r.pct}%.`);
      void qc.invalidateQueries({ queryKey: K.parts });
      invalidateAll(r.heroId);
    },
    onError: (err, v) => {
      report('Conserto não concluído')(err);
      void qc.invalidateQueries({ queryKey: K.parts });
      invalidateAll(v.heroId);
    },
  });

  return {
    deposit,
    withdraw,
    buy,
    upgrade,
    saveState,
    createStorage,
    updateStorage,
    deleteStorage,
    removeItem,
    createPart,
    updatePart,
    deletePart,
    repairPart,
  };
}
