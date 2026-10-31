import { supabase, getSafeRealtimeChannel } from '../../../shared/supabase';
import type { Missive, SendMissiveParams } from '../types';

const MSG_COLS = 'id, session_code, from_id, to_id, from_name, text, priority, created_at';

export async function fetchSessionMessages(
  sessionCode: string = 'MESA',
): Promise<Missive[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(MSG_COLS)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[MISSIVES] Erro ao buscar missivas:', error);
      return [];
    }
    return (data as unknown as Missive[]) || [];
  } catch (err) {
    console.warn('[MISSIVES] Falha de rede ao buscar missivas:', err);
    return [];
  }
}

export async function sendMessageToDB({
  sessionCode = 'MESA',
  fromId,
  toId = 'dm',
  fromName,
  text,
  priority = 'SAGRADA',
}: SendMissiveParams): Promise<Missive> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      session_code: (sessionCode || 'MESA').toUpperCase(),
      from_id: fromId,
      to_id: toId,
      from_name: fromName,
      text,
      priority,
    })
    .select(MSG_COLS)
    .single();

  if (error) throw error;
  return data as unknown as Missive;
}

export function subscribeToMessagesRealtime(
  sessionCode: string = 'MESA',
  onNewMessage: (msg: Missive) => void,
) {
  const channel = getSafeRealtimeChannel('messages_realtime');
  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
    },
    (payload) => {
      const msg = payload.new as Missive;
      if (msg) onNewMessage(msg);
    },
  );
  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
