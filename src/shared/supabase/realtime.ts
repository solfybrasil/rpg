import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { QueryKey } from '@tanstack/react-query';
import { supabase } from './client';
import { queryClient } from './queryClient';

export type RealtimeEventType = '*' | 'INSERT' | 'UPDATE' | 'DELETE';

export interface SubscribeRealtimeOptions<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
> {
  topic: string;
  table: string;
  schema?: string;
  event?: RealtimeEventType;
  filter?: string | null;
  handler?: (payload: RealtimePostgresChangesPayload<TRecord>) => void;
  queryKeyToUpdate?: QueryKey | null;
  cacheUpdater?: (oldData: unknown, payload: RealtimePostgresChangesPayload<TRecord>) => unknown;
}

interface ChannelRegistryEntry {
  channel: RealtimeChannel;
  refCount: number;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
  handlers: Set<(payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void>;
  queryKeyUpdaters: Map<
    string,
    {
      queryKey: QueryKey;
      updater?: (
        oldData: unknown,
        payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
      ) => unknown;
    }
  >;
}

const channelRegistry = new Map<string, ChannelRegistryEntry>();

function applyDefaultCachePatch(
  oldData: unknown,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
): unknown {
  if (!oldData) return oldData;
  const newRecord = (payload.new || {}) as Record<string, unknown>;
  const oldRecord = (payload.old || {}) as Record<string, unknown>;

  if (Array.isArray(oldData)) {
    if (payload.eventType === 'INSERT') {
      const exists = oldData.some(
        (item) =>
          item &&
          typeof item === 'object' &&
          'id' in item &&
          (item as Record<string, unknown>).id === newRecord.id,
      );
      return exists
        ? oldData.map((item) =>
            (item as Record<string, unknown>).id === newRecord.id
              ? { ...item, ...newRecord }
              : item,
          )
        : [newRecord, ...oldData];
    }
    if (payload.eventType === 'UPDATE') {
      return oldData.map((item) =>
        item &&
        typeof item === 'object' &&
        'id' in item &&
        (item as Record<string, unknown>).id === newRecord.id
          ? { ...item, ...newRecord }
          : item,
      );
    }
    if (payload.eventType === 'DELETE') {
      const deletedId = oldRecord.id;
      return oldData.filter(
        (item) =>
          !(
            item &&
            typeof item === 'object' &&
            'id' in item &&
            (item as Record<string, unknown>).id === deletedId
          ),
      );
    }
  } else if (typeof oldData === 'object') {
    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
      return { ...(oldData as Record<string, unknown>), ...newRecord };
    }
  }
  return oldData;
}

/**
 * Gerenciador Único de Realtime com Contagem de Referência (Ref-Counting):
 * - Um canal por assunto (`topic`), com suporte a `filter`;
 * - Contagem de referência (`refCount`) com janela de graça de 250ms contra re-mounts de StrictMode / troca de aba;
 * - Atualiza o cache do TanStack Query via `setQueryData`, sem refetch completo.
 */
export function subscribeRealtime<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
>({
  topic,
  table,
  schema = 'public',
  event = '*',
  filter = null,
  handler,
  queryKeyToUpdate = null,
  cacheUpdater,
}: SubscribeRealtimeOptions<TRecord>): () => void {
  if (!topic) return () => {};

  const registryKey = filter ? `${topic}_${table}_${event}_${filter}` : topic;
  let entry = channelRegistry.get(registryKey);

  if (entry?.cleanupTimer) {
    clearTimeout(entry.cleanupTimer);
    entry.cleanupTimer = null;
  }

  if (!entry) {
    const safeChannelName = registryKey.replace(/[^a-zA-Z0-9_-]/g, '_');
    const channel = supabase.channel(safeChannelName);
    const handlers = new Set<
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
    >();
    const queryKeyUpdaters = new Map<
      string,
      {
        queryKey: QueryKey;
        updater?: (
          oldData: unknown,
          payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
        ) => unknown;
      }
    >();

    const changeConfig: {
      event: RealtimeEventType;
      schema: string;
      table: string;
      filter?: string;
    } = { event, schema, table };

    if (filter) {
      changeConfig.filter = filter;
    }

    channel.on(
      'postgres_changes' as never,
      changeConfig as never,
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        for (const [, { queryKey, updater }] of queryKeyUpdaters) {
          queryClient.setQueryData(queryKey, (oldData: unknown) =>
            updater ? updater(oldData, payload) : applyDefaultCachePatch(oldData, payload),
          );
        }

        for (const h of handlers) {
          try {
            h(payload);
          } catch (e) {
            console.error(`[REALTIME ERROR: ${registryKey}]`, e);
          }
        }
      },
    );

    channel.subscribe();

    entry = { channel, refCount: 0, cleanupTimer: null, handlers, queryKeyUpdaters };
    channelRegistry.set(registryKey, entry);
  }

  const typedHandler = handler as
    | ((payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void)
    | undefined;

  if (typedHandler) {
    entry.handlers.add(typedHandler);
  }

  const queryKeyString = queryKeyToUpdate ? JSON.stringify(queryKeyToUpdate) : null;
  if (queryKeyToUpdate && queryKeyString) {
    entry.queryKeyUpdaters.set(queryKeyString, {
      queryKey: queryKeyToUpdate,
      updater: cacheUpdater as
        | ((
            oldData: unknown,
            payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
          ) => unknown)
        | undefined,
    });
  }

  entry.refCount += 1;

  let unsubscribed = false;
  return () => {
    if (unsubscribed) return;
    unsubscribed = true;

    const current = channelRegistry.get(registryKey);
    if (!current) return;

    if (typedHandler) {
      current.handlers.delete(typedHandler);
    }

    current.refCount -= 1;

    if (current.refCount <= 0) {
      current.cleanupTimer = setTimeout(() => {
        const latest = channelRegistry.get(registryKey);
        if (latest && latest.refCount <= 0) {
          channelRegistry.delete(registryKey);
          try {
            supabase.removeChannel(latest.channel);
          } catch (e) {
            console.warn(`[REALTIME CLEANUP: ${registryKey}]`, e);
          }
        }
      }, 250);
    }
  };
}

export function getActiveChannelsCount(): number {
  return channelRegistry.size;
}

export function subscribeTable<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
>(opts: {
  table: string;
  filter?: string;
  event?: RealtimeEventType;
  queryKey?: QueryKey;
  onEvent?: (payload: RealtimePostgresChangesPayload<TRecord>) => void;
}): () => void {
  return subscribeRealtime<TRecord>({
    topic: `table_${opts.table}`,
    table: opts.table,
    filter: opts.filter ?? null,
    event: opts.event ?? '*',
    queryKeyToUpdate: opts.queryKey ?? null,
    handler: opts.onEvent,
  });
}

export function getSafeRealtimeChannel(channelName: string): RealtimeChannel {
  const existing = supabase
    .getChannels()
    .find((c) => c.topic === `realtime:${channelName}` || c.topic === channelName);
  if (existing) {
    try {
      supabase.removeChannel(existing);
    } catch {
      // ignore cleanup error
    }
  }
  return supabase.channel(channelName);
}
