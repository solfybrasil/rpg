import { supabase } from '../../../shared/supabase';
import { DiceBroadcastPayload, DiceResultTone } from '../types';

let broadcastChannel: ReturnType<typeof supabase.channel> | null = null;
const rollListeners = new Set<(roll: DiceBroadcastPayload) => void>();
const clearListeners = new Set<() => void>();
const seenRollIds = new Set<string>();

/**
 * Calcula o resultado da regra canônica do sistema 2d6 Peste do Juramento:
 * - 12 natural ou total >= peso + 4: 'critico' ou 'brilhante'
 * - Duplo 1 (2): 'desastre'
 * - total >= peso: 'sucesso'
 * - total < peso: 'falha'
 */
export function calculateDiceOutcome(dice: number[], modifier: number, peso: number = 8): {
  total: number;
  result: DiceResultTone;
} {
  const sumDice = dice.reduce((a, b) => a + b, 0);
  const total = sumDice + modifier;

  // Duplo 1 é desastre rúnico
  if (dice.length >= 2 && dice[0] === 1 && dice[1] === 1) {
    return { total, result: 'desastre' };
  }

  // Duplo 6 ou 12 natural é crítico
  if (dice.length >= 2 && dice[0] === 6 && dice[1] === 6) {
    return { total, result: 'critico' };
  }

  if (total >= peso + 4) {
    return { total, result: 'brilhante' };
  }

  if (total >= peso) {
    return { total, result: 'sucesso' };
  }

  return { total, result: 'falha' };
}

/**
 * Cria ou recupera o canal de broadcast da mesa
 */
export function getMesaBroadcastChannel() {
  if (!broadcastChannel) {
    broadcastChannel = supabase.channel('dice_rolls_broadcast', {
      config: {
        broadcast: { ack: false, self: true },
      },
    });

    // Escuta evento 'dice_roll'
    broadcastChannel.on('broadcast', { event: 'dice_roll' }, (payload) => {
      const roll = payload?.payload as DiceBroadcastPayload;
      if (!roll || !roll.id) return;
      if (seenRollIds.has(roll.id)) return;
      seenRollIds.add(roll.id);
      if (seenRollIds.size > 200) {
        const first = seenRollIds.values().next().value;
        if (first) seenRollIds.delete(first);
      }
      rollListeners.forEach((fn) => {
        try { fn(roll); } catch {}
      });
    });

    // Escuta evento 'dice_clear'
    broadcastChannel.on('broadcast', { event: 'dice_clear' }, () => {
      clearListeners.forEach((fn) => {
        try { fn(); } catch {}
      });
    });

    // Escuta fallback via banco de dados postgres_changes
    broadcastChannel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'dice_rolls' },
      (payload) => {
        const newRoll = payload.new as any;
        if (!newRoll || !newRoll.id) return;
        if (seenRollIds.has(newRoll.id)) return;
        seenRollIds.add(newRoll.id);

        const dice = Array.isArray(newRoll.dice) ? newRoll.dice : [newRoll.d1 || 1, newRoll.d2 || 1];
        const modifier = Number(newRoll.modifier || 0);
        const peso = Number(newRoll.peso || 8);
        const calc = calculateDiceOutcome(dice, modifier, peso);

        const formatted: DiceBroadcastPayload = {
          id: String(newRoll.id),
          roller_name: newRoll.roller_name || newRoll.player_name || 'Jurado',
          character_id: newRoll.character_id,
          label: newRoll.label || 'Rolagem de Teste',
          dice,
          kept: Array.isArray(newRoll.kept) ? newRoll.kept : dice,
          modifier,
          total: Number(newRoll.total ?? calc.total),
          peso,
          result: (newRoll.result as DiceResultTone) || calc.result,
          created_at: newRoll.created_at || new Date().toISOString(),
        };

        rollListeners.forEach((fn) => {
          try { fn(formatted); } catch {}
        });
      },
    );

    broadcastChannel.subscribe();
  }
  return broadcastChannel;
}

/**
 * Emite uma rolagem via WebSocket broadcast para todas as telas conectadas
 */
export function emitMesaDiceRoll(roll: DiceBroadcastPayload) {
  const channel = getMesaBroadcastChannel();
  try {
    channel.send({
      type: 'broadcast',
      event: 'dice_roll',
      payload: roll,
    });
  } catch (err) {
    console.warn('[MESA] Falha ao enviar broadcast de dados:', err);
  }
}

/**
 * Emite a ordem para limpar a mesa de dados
 */
export function emitMesaClearTable() {
  const channel = getMesaBroadcastChannel();
  try {
    channel.send({
      type: 'broadcast',
      event: 'dice_clear',
      payload: {},
    });
  } catch (err) {
    console.warn('[MESA] Falha ao enviar broadcast de limpeza:', err);
  }
}

/**
 * Inscreve callbacks para eventos de rolagem e limpeza da mesa
 */
export function subscribeToMesa(
  onRoll: (roll: DiceBroadcastPayload) => void,
  onClear: () => void,
) {
  rollListeners.add(onRoll);
  clearListeners.add(onClear);
  getMesaBroadcastChannel();

  return () => {
    rollListeners.delete(onRoll);
    clearListeners.delete(onClear);
  };
}
