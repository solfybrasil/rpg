import { supabase } from '../shared/supabase';

// Canal Realtime persistente compartilhado para transmissão instantânea ponto-a-ponto via WebSocket
let broadcastChannel = null;
const listeners = new Set();
const updateListeners = new Set();
const seenRollIds = new Set();

/**
 * Obtém ou inicializa o canal broadcast de baixa latência
 */
export function getDiceBroadcastChannel() {
  if (!broadcastChannel) {
    broadcastChannel = supabase.channel('dice_rolls_broadcast', {
      config: {
        broadcast: { ack: false, self: true }, // self: true para disparar localmente no mesmo frame sem delay
      },
    });

    // Escuta mensagens instantâneas via WebSocket Broadcast (< 50ms)
    broadcastChannel.on('broadcast', { event: 'dice_roll' }, (payload) => {
      const roll = payload?.payload;
      if (!roll || !roll.id) return;
      if (seenRollIds.has(roll.id)) return;
      seenRollIds.add(roll.id);
      // Limita memória de IDs
      if (seenRollIds.size > 200) {
        const first = seenRollIds.values().next().value;
        seenRollIds.delete(first);
      }
      listeners.forEach((fn) => {
        try {
          fn(roll);
        } catch (_) {}
      });
    });

    // Escuta atualizações instantâneas via WebSocket Broadcast
    broadcastChannel.on('broadcast', { event: 'dice_update' }, (payload) => {
      const updated = payload?.payload;
      if (!updated || !updated.id) return;
      updateListeners.forEach((fn) => {
        try {
          fn(updated);
        } catch (_) {}
      });
    });

    // Escuta também INSERT tradicional no postgres_changes caso algum cliente perca o socket
    broadcastChannel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'dice_rolls' },
      (payload) => {
        const newRoll = payload.new;
        if (!newRoll || !newRoll.id) return;
        if (seenRollIds.has(newRoll.id)) return;
        seenRollIds.add(newRoll.id);
        if (seenRollIds.size > 200) {
          const first = seenRollIds.values().next().value;
          seenRollIds.delete(first);
        }
        listeners.forEach((fn) => {
          try {
            fn(newRoll);
          } catch (_) {}
        });
      },
    );

    // Escuta UPDATE tradicional no postgres_changes
    broadcastChannel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'dice_rolls' },
      (payload) => {
        const updated = payload.new;
        if (!updated || !updated.id) return;
        updateListeners.forEach((fn) => {
          try {
            fn(updated);
          } catch (_) {}
        });
      },
    );

    broadcastChannel.subscribe();
  }
  return broadcastChannel;
}

/**
 * Emite a rolagem imediatamente via WebSocket broadcast (< 50ms) para todas as telas conectadas
 */
export function emitDiceRollInstant(roll) {
  if (!roll || !roll.id) return;
  const channel = getDiceBroadcastChannel();
  try {
    channel.send({
      type: 'broadcast',
      event: 'dice_roll',
      payload: roll,
    });
  } catch (err) {
    console.warn('[DICE] Erro ao enviar broadcast instantâneo:', err);
  }
}

/**
 * Registra um callback para receber rolagens instantâneas
 */
export function onInstantDiceRoll(callback) {
  listeners.add(callback);
  getDiceBroadcastChannel(); // garante conexão ativa
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Emite a atualização de uma rolagem via WebSocket broadcast
 */
export function emitDiceRollUpdate(updatedRoll) {
  if (!updatedRoll || !updatedRoll.id) return;
  const channel = getDiceBroadcastChannel();
  try {
    channel.send({
      type: 'broadcast',
      event: 'dice_update',
      payload: updatedRoll,
    });
  } catch (err) {
    console.warn('[DICE] Erro ao enviar broadcast de atualização:', err);
  }
}

/**
 * Registra um callback para receber atualizações de rolagens
 */
export function onDiceRollUpdate(callback) {
  updateListeners.add(callback);
  getDiceBroadcastChannel();
  return () => {
    updateListeners.delete(callback);
  };
}
