import { supabase as typedSupabase } from '../supabase/client';

// biome-ignore lint/suspicious/noExplicitAny: colunas fora do schema gerado (coin_ledger varia)
const db = typedSupabase as any;

/** Lê o herói direto do banco (moedas atuais). */
export async function readCoins(heroId: string) {
  const { data, error } = await db.from('characters').select('id, name, coins_bronze').eq('id', heroId).single();
  if (error) throw new Error(error.message || 'Herói não encontrado.');
  return data as { id: string; name: string; coins_bronze: number | null };
}

async function ledger(heroId: string, delta: number, after: number, reason: string, description: string) {
  try {
    await db.from('coin_ledger').insert({
      character_id: heroId,
      delta,
      amount: delta,
      balance_after: after,
      reason,
      description,
    });
  } catch {
    /* registro opcional */
  }
}

/**
 * Muda o saldo sem perder corrida: só grava se o saldo ainda for o lido.
 * Tenta de novo algumas vezes se outra ação mexeu nas moedas no meio.
 */
async function changeCoins(heroId: string, delta: number, reason: string, description: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const hero = await readCoins(heroId);
    const before = Number(hero.coins_bronze) || 0;
    const after = before + delta;
    if (after < 0) throw new Error('Moedas insuficientes.');
    const { data, error } = await db
      .from('characters')
      .update({ coins_bronze: after, updated_at: new Date().toISOString() })
      .eq('id', heroId)
      .eq('coins_bronze', before)
      .select('id');
    if (error) throw new Error(error.message);
    if (data?.length) {
      await ledger(heroId, delta, after, reason, description);
      return { before, after };
    }
  }
  throw new Error('As moedas mudaram agora mesmo. Tente de novo.');
}

/** Desconta moedas (erro se não houver saldo). */
export function spendCoins(heroId: string, amount: number, description: string) {
  return changeCoins(heroId, -Math.max(0, Math.round(amount)), 'compra', description);
}

/** Soma moedas (venda, devolução). */
export function addCoins(heroId: string, amount: number, description: string, reason = 'venda') {
  return changeCoins(heroId, Math.max(0, Math.round(amount)), reason, description);
}

/** Devolve moedas após uma compra que falhou no meio. */
export function refundCoins(heroId: string, amount: number) {
  return addCoins(heroId, amount, 'Devolução', 'ajuste');
}
