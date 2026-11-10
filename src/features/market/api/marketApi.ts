import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { addCoins, refundCoins, spendCoins } from '../../../shared/lib/coins';
import { queryKeys, supabase as typedSupabase } from '../../../shared/supabase';
import { subscribeRealtime } from '../../../shared/supabase/realtime';
import { useWorldClock } from '../../world-clock/api/clock';
import {
  type CatalogLite,
  type MarketOverride,
  type MarketPlace,
  type StockEntry,
  generateStock,
  marketTitle,
  marketTier,
  minutesToRestock,
  nearestMarket,
  periodOf,
} from '../data/engine';
import { type RegionProfile, regionProfile } from '../data/regions';

// biome-ignore lint/suspicious/noExplicitAny: tabelas novas fora do schema gerado
const db = typedSupabase as any;

export const MARKET_SESSION = 'MESA';
/** Tipos de lugar do mapa que têm comércio. */
const MARKET_TYPES = ['cap', 'cid', 'por', 'vil', 'est', 'acp', 'gui', 'for'];
/** Além desta distância (unidades do mapa) do lugar mais perto, o grupo está na estrada. */
const ROAD_DISTANCE = 220;
const CATALOG_COLS =
  'id, name, category, rarity, price_bronze, image_url, icon, description, special, stackable, equippable_as, damage_dice, armor_bonus, wear_type, archived';

export interface MarketConfig {
  session_code: string;
  mode: 'auto' | 'fixed';
  place_id: string | null;
  restock_days: number;
  period_offset: number;
  price_mult: number;
}

export interface MarketSale {
  id: string;
  market_key: string;
  catalog_id: string;
  qty: number;
  price_bronze: number;
  character_id: string | null;
  kind: 'compra' | 'venda';
  created_at: string;
}

const DEFAULT_CONFIG: MarketConfig = {
  session_code: MARKET_SESSION,
  mode: 'auto',
  place_id: null,
  restock_days: 3,
  period_offset: 0,
  price_mult: 1,
};

export const MK = {
  catalog: ['market', 'catalog'] as const,
  places: ['market', 'places'] as const,
  party: ['market', 'party'] as const,
  config: ['market', 'config'] as const,
  overrides: ['market', 'overrides'] as const,
  sales: (key: string) => ['market', 'sales', key] as const,
};

function isMissing(err: unknown) {
  const e = err as { code?: string; message?: string } | null;
  return Boolean(
    e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|could not find the table|schema cache/i.test(e.message ?? '')),
  );
}

class MissingError extends Error {
  missing = true;
}

async function run<T>(q: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await q;
  if (error) {
    if (isMissing(error)) throw new MissingError('As tabelas do mercado ainda não existem.');
    throw new Error((error as { message?: string }).message || 'Erro no banco');
  }
  return data;
}

const noRetryMissing = (n: number, err: unknown) => !(err as MissingError)?.missing && n < 2;

/** Catálogo inteiro (só os campos do mercado), em páginas de 1000. */
export function useCatalogLite() {
  return useQuery({
    queryKey: MK.catalog,
    queryFn: async () => {
      const out: CatalogLite[] = [];
      for (let from = 0; from < 20000; from += 1000) {
        const page = (await run(
          db
            .from('item_catalog')
            .select(CATALOG_COLS)
            .order('id')
            .range(from, from + 999),
        )) as CatalogLite[];
        out.push(...page);
        if (page.length < 1000) break;
      }
      return out;
    },
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
}

/** Lugares com comércio: do banco do mapa; se o mapa ainda não foi importado, do mapa base. */
function useMarketPlaces() {
  return useQuery({
    queryKey: MK.places,
    queryFn: async (): Promise<Array<MarketPlace & { x: number; y: number }>> => {
      const { data, error } = await db
        .from('map_places')
        .select('id, name, type, region_id, x, y')
        .eq('session_code', MARKET_SESSION)
        .in('type', MARKET_TYPES)
        .limit(3000);
      if (!error && data?.length) {
        return data.map((r: { id: string; name: string; type: string; region_id: string; x: number; y: number }) => ({
          id: String(r.id),
          name: r.name,
          type: r.type,
          region: r.region_id,
          x: Number(r.x),
          y: Number(r.y),
        }));
      }
      const res = await fetch('/data/aldrenor.json');
      const json = (await res.json()) as { places: Array<{ id: number; name: string; type: string; region: string; x: number; y: number }> };
      return json.places
        .filter((p) => MARKET_TYPES.includes(p.type))
        .map((p) => ({ id: `base-${p.id}`, name: p.name, type: p.type, region: p.region, x: p.x, y: p.y }));
    },
    staleTime: 5 * 60_000,
  });
}

export interface MarketData {
  loading: boolean;
  missing: boolean;
  config: MarketConfig;
  place: (MarketPlace & { x?: number; y?: number }) | null;
  profile: RegionProfile;
  title: string;
  tierLabel: string;
  /** Lugar + período: chave das vendas deste estoque. */
  marketKey: string;
  stock: Array<StockEntry & { left: number; sold: number }>;
  minutesToRestock: number;
  catalog: CatalogLite[];
  places: Array<MarketPlace & { x: number; y: number }>;
  overrides: MarketOverride[];
  sales: MarketSale[];
  party: { x: number; y: number } | null;
}

/** Tudo do mercado de agora: onde é, o que tem, quanto custa e quanto sobrou. */
export function useMarket(): MarketData {
  const qc = useQueryClient();
  const { minutos } = useWorldClock();
  const catalogQ = useCatalogLite();
  const placesQ = useMarketPlaces();

  const configQ = useQuery({
    queryKey: MK.config,
    queryFn: async () =>
      ((await run(db.from('market_config').select('*').eq('session_code', MARKET_SESSION).maybeSingle())) as MarketConfig | null) ??
      DEFAULT_CONFIG,
    staleTime: 10_000,
    refetchInterval: 30_000,
    retry: noRetryMissing,
  });
  const overridesQ = useQuery({
    queryKey: MK.overrides,
    queryFn: async () =>
      ((await run(db.from('market_overrides').select('*').eq('session_code', MARKET_SESSION))) ?? []) as MarketOverride[],
    staleTime: 10_000,
    refetchInterval: 30_000,
    retry: noRetryMissing,
  });
  const partyQ = useQuery({
    queryKey: MK.party,
    queryFn: async () => {
      const { data } = await db.from('map_state').select('party_x, party_y').eq('session_code', MARKET_SESSION).maybeSingle();
      return data?.party_x != null && data?.party_y != null ? { x: Number(data.party_x), y: Number(data.party_y) } : null;
    },
    staleTime: 10_000,
    refetchInterval: 20_000,
  });

  const config = { ...DEFAULT_CONFIG, ...(configQ.data ?? {}) };
  const places = placesQ.data ?? [];
  const party = partyQ.data ?? null;

  const place = useMemo(() => {
    if (config.mode === 'fixed' && config.place_id) {
      const p = places.find((x) => x.id === config.place_id);
      if (p) return p;
    }
    if (party && places.length) {
      const n = nearestMarket(places, party.x, party.y);
      if (n && n.dist <= ROAD_DISTANCE) return n.place;
      if (n) return { id: `ambulante:${n.place.region}`, name: 'a estrada', type: 'ambulante', region: n.place.region };
    }
    return null;
  }, [config.mode, config.place_id, places, party]);

  const profile = regionProfile(place?.region);
  const period = periodOf(minutos, config.restock_days, config.period_offset);
  const marketKey = `${place?.id ?? `ambulante:${profile.id}`}#${period}`;

  const salesQ = useQuery({
    queryKey: MK.sales(marketKey),
    queryFn: async () =>
      ((await run(
        db.from('market_sales').select('*').eq('session_code', MARKET_SESSION).eq('market_key', marketKey).order('created_at', { ascending: false }),
      )) ?? []) as MarketSale[],
    staleTime: 5_000,
    refetchInterval: 15_000,
    retry: noRetryMissing,
  });

  useEffect(() => {
    const subs = [
      subscribeRealtime({ topic: 'market_config', table: 'market_config', handler: () => void qc.invalidateQueries({ queryKey: MK.config }) }),
      subscribeRealtime({ topic: 'market_overrides', table: 'market_overrides', handler: () => void qc.invalidateQueries({ queryKey: MK.overrides }) }),
      subscribeRealtime({ topic: 'market_sales', table: 'market_sales', handler: () => void qc.invalidateQueries({ queryKey: ['market', 'sales'] }) }),
      subscribeRealtime({ topic: 'market_party', table: 'map_state', handler: () => void qc.invalidateQueries({ queryKey: MK.party }) }),
    ];
    return () => {
      for (const u of subs) u();
    };
  }, [qc]);

  const catalog = catalogQ.data ?? [];
  const overrides = overridesQ.data ?? [];
  const sales = salesQ.data ?? [];

  const stock = useMemo(() => {
    if (!catalog.length) return [];
    const sold = new Map<string, number>();
    for (const s of sales) if (s.kind === 'compra') sold.set(s.catalog_id, (sold.get(s.catalog_id) ?? 0) + s.qty);
    return generateStock({ catalog, place, profile, period, overrides, priceMult: config.price_mult || 1 }).map((e) => {
      const n = sold.get(e.item.id) ?? 0;
      return { ...e, sold: n, left: Math.max(0, e.stock - n) };
    });
  }, [catalog, place, profile, period, overrides, config.price_mult, sales]);

  const missing = Boolean((configQ.error as MissingError | null)?.missing || (overridesQ.error as MissingError | null)?.missing);

  return {
    loading: catalogQ.isLoading || placesQ.isLoading || configQ.isLoading,
    missing,
    config,
    place,
    profile,
    title: marketTitle(place),
    tierLabel: marketTier(place?.type).label,
    marketKey,
    stock,
    minutesToRestock: minutesToRestock(minutos, config.restock_days),
    catalog,
    places,
    overrides,
    sales,
    party,
  };
}

// ─────────────────────────── ações ───────────────────────────

function report(prefix: string) {
  return (err: unknown) => toast.error(`${prefix}: ${err instanceof Error ? err.message : 'erro'}`);
}

/** Campos do catálogo que viram item na mochila. */
const COPY_FIELDS = [
  'name',
  'description',
  'image_url',
  'icon',
  'category',
  'rarity',
  'quality',
  'wear_type',
  'durability',
  'max_durability',
  'equippable_as',
  'weapon_class',
  'damage_dice',
  'attack_attr',
  'two_handed',
  'ranged',
  'ammo_type',
  'armor_bonus',
  'attack_bonus',
  'damage_bonus',
  'focus_bonus',
  'health_bonus',
  'skill_bonus',
  'special',
  'stackable',
  'reagent_tier',
  'material_tier',
  'origin',
  'plague_cost',
  'tags',
  'armor_class',
  'saciedade',
] as const;

/** Põe um item do catálogo na mochila (empilha quando dá). */
async function giveFromCatalog(catalogId: string, heroId: string, qty: number, pricePaid: number) {
  const cat = (await run(db.from('item_catalog').select('*').eq('id', catalogId).single())) as Record<string, unknown>;
  const inv = ((await run(
    db.from('inventory_items').select('id, slot_index, quantity, catalog_id, equip_slot, stackable').eq('character_id', heroId),
  )) ?? []) as Array<{ id: string; slot_index: number | null; quantity: number | null; catalog_id: string | null; equip_slot: string | null; stackable: boolean | null }>;

  const stackable = cat.stackable !== false && !cat.damage_dice && !(Number(cat.armor_bonus) > 0) && cat.wear_type !== 'durability';
  const same = stackable ? inv.find((i) => i.catalog_id === catalogId && !i.equip_slot) : undefined;
  if (same) {
    await run(db.from('inventory_items').update({ quantity: (Number(same.quantity) || 1) + qty }).eq('id', same.id));
    return;
  }
  const used = new Set(inv.filter((i) => !i.equip_slot).map((i) => i.slot_index));
  const free: number[] = [];
  for (let i = 0; i < 40 && free.length < qty; i++) if (!used.has(i)) free.push(i);
  const need = stackable ? 1 : qty;
  if (free.length < need) throw new Error(need > 1 ? `Faltam espaços na mochila (precisa de ${need}).` : 'Sua mochila está cheia.');
  const slot = free[0];
  const row: Record<string, unknown> = {
    session_code: MARKET_SESSION,
    character_id: heroId,
    player_id: heroId,
    catalog_id: catalogId,
    slot_index: slot,
    equip_slot: null,
    quantity: stackable ? qty : 1,
    price_bronze: pricePaid,
  };
  for (const f of COPY_FIELDS) if (cat[f] !== undefined) row[f] = cat[f];
  // Itens sem pilha: um registro por unidade.
  const rows = stackable ? [row] : free.slice(0, qty).map((sl) => ({ ...row, slot_index: sl }));
  await run(db.from('inventory_items').insert(rows));
}

export function useMarketActions() {
  const qc = useQueryClient();
  const refresh = (heroId?: string) => {
    void qc.invalidateQueries({ queryKey: ['market', 'sales'] });
    if (heroId) {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.byHero(heroId) });
      void qc.invalidateQueries({ queryKey: ['heroes'] });
    }
  };

  const buy = useMutation({
    mutationFn: async (v: { entry: StockEntry; qty: number; heroId: string; marketKey: string; title: string }) => {
      const { entry, heroId, marketKey } = v;
      const qty = Math.max(1, Math.round(v.qty));
      // Estoque de agora (outro jurado pode ter comprado).
      const fresh = ((await run(
        db.from('market_sales').select('qty').eq('session_code', MARKET_SESSION).eq('market_key', marketKey).eq('catalog_id', entry.item.id).eq('kind', 'compra'),
      )) ?? []) as Array<{ qty: number }>;
      const left = entry.stock - fresh.reduce((a, s) => a + (Number(s.qty) || 0), 0);
      if (left < qty) throw new Error(left > 0 ? `Só restam ${left}.` : 'Esgotado.');
      const total = entry.price * qty;
      if (total > 0) await spendCoins(heroId, total, `${v.title}: ${qty}× ${entry.item.name}`);
      try {
        await giveFromCatalog(entry.item.id, heroId, qty, entry.price);
      } catch (err) {
        if (total > 0) await refundCoins(heroId, total);
        throw err;
      }
      await db.from('market_sales').insert({
        session_code: MARKET_SESSION,
        market_key: marketKey,
        catalog_id: entry.item.id,
        qty,
        price_bronze: total,
        character_id: heroId,
        kind: 'compra',
      });
      return { name: entry.item.name, qty, heroId };
    },
    onSuccess: (r) => {
      toast.success(`${r.qty > 1 ? `${r.qty}× ` : ''}${r.name} foi para a mochila.`);
      refresh(r.heroId);
    },
    onError: (err, v) => {
      report('Compra não concluída')(err);
      refresh(v.heroId);
    },
  });

  const sell = useMutation({
    mutationFn: async (v: {
      row: { id: string; name: string; quantity: number | null; catalog_id?: string | null };
      qty: number;
      each: number;
      heroId: string;
      marketKey: string;
      title: string;
    }) => {
      const { row, heroId } = v;
      const have = Number(row.quantity) || 1;
      const qty = Math.min(have, Math.max(1, Math.round(v.qty)));
      const claimed =
        qty >= have
          ? await run(db.from('inventory_items').delete().eq('id', row.id).select('id'))
          : await run(db.from('inventory_items').update({ quantity: have - qty }).eq('id', row.id).eq('quantity', have).select('id'));
      if (!(claimed as unknown[])?.length) throw new Error('Esse item já saiu da mochila.');
      const total = v.each * qty;
      await addCoins(heroId, total, `${v.title}: venda de ${qty}× ${row.name}`);
      await db.from('market_sales').insert({
        session_code: MARKET_SESSION,
        market_key: v.marketKey,
        catalog_id: row.catalog_id || `item:${row.name}`,
        qty,
        price_bronze: total,
        character_id: heroId,
        kind: 'venda',
      });
      return { name: row.name, qty, total, heroId };
    },
    onSuccess: (r) => {
      toast.success(`Vendido: ${r.qty > 1 ? `${r.qty}× ` : ''}${r.name}.`);
      refresh(r.heroId);
    },
    onError: (err, v) => {
      report('Venda não concluída')(err);
      refresh(v.heroId);
    },
  });

  /** Item avulso da loja antiga (cadastrado à mão pelo Mestre). */
  const buyLegacy = useMutation({
    mutationFn: async (v: { item: { id: string; name: string; price_bronze: number; stock?: number | null }; heroId: string }) => {
      const { item, heroId } = v;
      const row = (await run(db.from('shop_items').select('*').eq('id', item.id).single())) as Record<string, unknown>;
      const stock = row.stock == null ? null : Number(row.stock);
      if (stock != null && stock < 1) throw new Error('Esgotado.');
      const price = Number(row.price_bronze) || 0;
      if (price > 0) await spendCoins(heroId, price, `Encomenda do Mestre: ${row.name}`);
      try {
        if (stock != null) {
          const ok = await run(db.from('shop_items').update({ stock: stock - 1 }).eq('id', item.id).eq('stock', stock).select('id'));
          if (!(ok as unknown[])?.length) throw new Error('Outro jurado levou agora mesmo.');
        }
        const inv = ((await run(db.from('inventory_items').select('slot_index, equip_slot').eq('character_id', heroId))) ?? []) as Array<{
          slot_index: number | null;
          equip_slot: string | null;
        }>;
        const used = new Set(inv.filter((i) => !i.equip_slot).map((i) => i.slot_index));
        let slot = 0;
        while (used.has(slot) && slot < 40) slot++;
        if (slot >= 40) throw new Error('Sua mochila está cheia.');
        const out: Record<string, unknown> = {
          session_code: MARKET_SESSION,
          character_id: heroId,
          player_id: heroId,
          slot_index: slot,
          equip_slot: null,
          quantity: 1,
          catalog_id: row.catalog_id ?? null,
          price_bronze: price,
        };
        for (const f of COPY_FIELDS) if (row[f] !== undefined) out[f] = row[f];
        await run(db.from('inventory_items').insert(out));
      } catch (err) {
        if (price > 0) await refundCoins(heroId, price);
        throw err;
      }
      return { name: String(row.name), heroId };
    },
    onSuccess: (r) => {
      toast.success(`${r.name} foi para a mochila.`);
      refresh(r.heroId);
      void qc.invalidateQueries({ queryKey: ['market', 'legacy-shop'] });
    },
    onError: (err, v) => {
      report('Compra não concluída')(err);
      refresh(v.heroId);
      void qc.invalidateQueries({ queryKey: ['market', 'legacy-shop'] });
    },
  });

  // ── Mestre ──

  const saveConfig = useMutation({
    mutationFn: async (patch: Partial<MarketConfig>) => {
      await run(
        db
          .from('market_config')
          .upsert({ session_code: MARKET_SESSION, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'session_code' }),
      );
    },
    onMutate: (patch) => {
      const prev = qc.getQueryData<MarketConfig>(MK.config);
      qc.setQueryData<MarketConfig>(MK.config, (c) => ({ ...DEFAULT_CONFIG, ...(c ?? {}), ...patch }));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(MK.config, ctx.prev);
      report('Não foi possível salvar o mercado')(err);
    },
  });

  /** Fixa, tira ou ajusta um item num escopo (todos, região ou lugar). */
  const setOverride = useMutation({
    mutationFn: async (o: { scope: string; catalog_id: string; mode: 'sempre' | 'nunca'; price_bronze?: number | null; stock?: number | null }) => {
      await run(
        db.from('market_overrides').delete().eq('session_code', MARKET_SESSION).eq('scope', o.scope).eq('catalog_id', o.catalog_id),
      );
      await run(
        db.from('market_overrides').insert({
          session_code: MARKET_SESSION,
          scope: o.scope,
          catalog_id: o.catalog_id,
          mode: o.mode,
          price_bronze: o.price_bronze ?? null,
          stock: o.stock ?? null,
        }),
      );
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: MK.overrides }),
    onError: report('Não foi possível ajustar o item'),
  });

  const removeOverride = useMutation({
    mutationFn: async (id: string) => {
      await run(db.from('market_overrides').delete().eq('id', id));
    },
    onMutate: (id) => {
      const prev = qc.getQueryData<MarketOverride[]>(MK.overrides);
      qc.setQueryData<MarketOverride[]>(MK.overrides, (rows) => rows?.filter((r) => r.id !== id));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(MK.overrides, ctx.prev);
      report('Não foi possível desfazer')(err);
    },
  });

  return { buy, sell, buyLegacy, saveConfig, setOverride, removeOverride };
}
