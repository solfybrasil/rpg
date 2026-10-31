import { supabase } from '../../../shared/supabase';
import type { DiceRollRecord, RollCalculation } from '../types';
import {
  insertDiceRollInDB,
  fetchDiceRollsFromDB,
  subscribeToDiceRollsRealtime,
  fetchSessionPeso,
  setSessionPesoInDB,
} from './db';

export {
  insertDiceRollInDB,
  fetchDiceRollsFromDB,
  subscribeToDiceRollsRealtime,
  fetchSessionPeso,
  setSessionPesoInDB,
};

let broadcastChannel: any = null;

export function getDiceBroadcastChannel() {
  if (!broadcastChannel) {
    broadcastChannel = supabase.channel('dice_rolls_broadcast', {
      config: {
        broadcast: { ack: false, self: true },
      },
    });
    broadcastChannel.subscribe();
  }
  return broadcastChannel;
}

export function broadcastDiceRoll(roll: DiceRollRecord) {
  try {
    const channel = getDiceBroadcastChannel();
    channel.send({
      type: 'broadcast',
      event: 'dice_roll',
      payload: roll,
    });
  } catch (err) {
    console.warn('[DICE BROADCAST WARN]', err);
  }
}

export async function recordAndBroadcastRoll(params: {
  sessionCode?: string;
  playerId?: string | null;
  playerName?: string | null;
  label: string;
  calc: RollCalculation;
}): Promise<DiceRollRecord> {
  const { sessionCode = 'MESA', playerId, playerName, label, calc } = params;

  const record: DiceRollRecord = {
    id: `roll_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    session_code: sessionCode,
    player_id: playerId,
    player_name: playerName || 'Jurado',
    label,
    dice: calc.dice,
    kept: calc.kept,
    modifier: calc.modifier,
    total: calc.total,
    peso: calc.peso,
    mode: calc.mode,
    result: calc.tone,
    created_at: new Date().toISOString(),
  };

  // 1. Emite broadcast instantâneo para /mesa
  broadcastDiceRoll(record);

  // 2. Persiste na tabela dice_rolls
  try {
    const dbRecord = await insertDiceRollInDB({
      sessionCode,
      playerId,
      playerName: record.player_name,
      label,
      dice: calc.dice,
      kept: calc.kept,
      modifier: calc.modifier,
      total: calc.total,
      peso: calc.peso,
      mode: calc.mode,
      result: calc.tone,
    });
    if (dbRecord && dbRecord.id) {
      record.id = dbRecord.id;
    }
  } catch (err) {
    console.warn('[DICE DB WARN]', err);
  }

  return record;
}
