import { supabase } from '../shared/supabase';
import { emitDiceRollInstant, emitDiceRollUpdate } from './diceRealtime';

/**
 * Mapeamento padrão de atributos e perícias
 * Furtividade e Percepção → Astúcia
 * Atletismo → Corpo
 * Persuasão, Enganação, Intimidação e Música → Presença
 * Forja, Alquimia, Medicina, Sobrevivência, Arcanismo e História → Astúcia
 */
export const SKILL_ATTRIBUTE_MAP = {
  furtividade: 'astucia',
  percepcao: 'astucia',
  percepção: 'astucia',
  atletismo: 'corpo',
  persuasao: 'presenca',
  persuasão: 'presenca',
  enganacao: 'presenca',
  enganação: 'presenca',
  intimidacao: 'presenca',
  intimidação: 'presenca',
  musica: 'presenca',
  música: 'presenca',
  forja: 'astucia',
  alquimia: 'astucia',
  medicina: 'astucia',
  sobrevivencia: 'astucia',
  sobrevivência: 'astucia',
  arcanismo: 'astucia',
  historia: 'astucia',
  história: 'astucia',
};

/**
 * Calcula a chance exata de sucesso (%) segundo as Regras 2.0:
 * 2d6 (ou 3d6 com vantagem/desvantagem) + modificador contra Peso.
 * - Duplo 6 = Crítico (sucesso sempre)
 * - Duplo 1 = Desastre (falha sempre)
 * - Se Peso == 0: rolagem livre (100%)
 * - Caso contrário: soma >= Peso (exceto duplo 1, inclui duplo 6)
 */
export function calculateRollSuccessChance(modifier = 0, peso = 8, mode = 'normal') {
  if (peso === 0 || peso === null || peso === undefined) return 100;

  let totalOutcomes = 0;
  let successfulOutcomes = 0;

  if (mode === 'vantagem' || mode === 'desvantagem') {
    totalOutcomes = 216; // 6^3
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        for (let d3 = 1; d3 <= 6; d3++) {
          let kept;
          if (mode === 'vantagem') {
            if (d1 <= d2 && d1 <= d3) kept = [d2, d3];
            else if (d2 <= d1 && d2 <= d3) kept = [d1, d3];
            else kept = [d1, d2];
          } else {
            // desvantagem
            if (d1 >= d2 && d1 >= d3) kept = [d2, d3];
            else if (d2 >= d1 && d2 >= d3) kept = [d1, d3];
            else kept = [d1, d2];
          }

          const isCrit = kept[0] === 6 && kept[1] === 6;
          const isFumble = kept[0] === 1 && kept[1] === 1;

          if (isCrit) {
            successfulOutcomes++;
          } else if (isFumble) {
            // falha
          } else {
            const sum = kept[0] + kept[1] + modifier;
            if (sum >= peso) {
              successfulOutcomes++;
            }
          }
        }
      }
    }
  } else {
    // normal 2d6
    totalOutcomes = 36;
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        const isCrit = d1 === 6 && d2 === 6;
        const isFumble = d1 === 1 && d2 === 1;

        if (isCrit) {
          successfulOutcomes++;
        } else if (isFumble) {
          // falha
        } else {
          const sum = d1 + d2 + modifier;
          if (sum >= peso) {
            successfulOutcomes++;
          }
        }
      }
    }
  }

  const chance = Math.round((successfulOutcomes / totalOutcomes) * 100);
  return Math.max(0, Math.min(100, chance));
}

/**
 * Resolução pura das regras de rolagem
 */
export function resolveRollRules({ dice, kept, modifier, peso }) {
  const safeKept =
    Array.isArray(kept) && kept.length > 0
      ? kept
      : Array.isArray(dice) && dice.length > 0
        ? dice
        : [1];

  if (safeKept.length === 1) {
    const k1 = safeKept[0];
    const total = k1 + modifier;
    let result = 'livre';
    if (peso > 0) {
      if (total >= peso + 3) result = 'brilhante';
      else if (total >= peso) result = 'sucesso';
      else result = 'falha';
    }
    return { total, result };
  }

  const k1 = safeKept[0];
  const k2 = safeKept[1];
  const diceSum =
    safeKept.length === 2 ? k1 + k2 : safeKept.reduce((a, b) => a + Number(b || 0), 0);
  const total = diceSum + modifier;

  let result;
  if (safeKept.length === 2 && k1 === 1 && k2 === 1) {
    result = 'desastre';
  } else if (safeKept.length === 2 && k1 === 6 && k2 === 6) {
    result = 'critico';
  } else if (peso === 0) {
    result = 'livre';
  } else if (total >= peso + 3) {
    result = 'brilhante';
  } else if (total >= peso) {
    result = 'sucesso';
  } else {
    result = 'falha';
  }

  return { total, result };
}

/**
 * Executa a rolagem chamando RPC roll_dice no banco
 * Com fallback idempotente completo caso a migração do banco esteja pendente
 */
export async function rollDiceRPC({
  character_id = null,
  attribute = 'corpo',
  skill = null,
  mode = 'normal',
  label = null,
  physical_dice = null,
  secret = false,
  heroData = null,
  current_peso = 8,
  damage = null,
  die_type = null,
}) {
  try {
    const isDM = !character_id;
    const actualSecret = isDM ? Boolean(secret) : false;

    // 1. Calcula os dados e atributos no cliente instantaneamente (0ms)
    const rollerName = isDM ? 'Mestre' : heroData?.name || 'Herói';
    const rollerAvatar = isDM
      ? null
      : heroData?.avatar_icon || heroData?.portraitUrl || heroData?.portrait_url || null;
    let modifier = 0;

    if (isDM) {
      if (label && /^[+-]?\d+$/.test(label.trim())) {
        modifier = Number.parseInt(label.trim(), 10);
      } else if (label && /[+-]\d+/.test(label)) {
        const match = label.match(/([+-]\d+)/);
        modifier = match ? Number.parseInt(match[1], 10) : 0;
      }
    } else if (heroData) {
      const attrKey = (attribute || 'corpo').toLowerCase().trim();
      const attrs = heroData.attributes || {};
      let attrVal = 0;
      if (attrKey === 'corpo') attrVal = Number(attrs.corpo ?? 0);
      else if (attrKey === 'vontade' || attrKey === 'mente')
        attrVal = Number(attrs.vontade ?? attrs.mente ?? 0);
      else if (attrKey === 'astucia' || attrKey === 'destreza')
        attrVal = Number(attrs.astucia ?? attrs.destreza ?? 0);
      else if (attrKey === 'presenca') attrVal = Number(attrs.presenca ?? 0);

      let skillVal = 0;
      if (skill && Array.isArray(heroData.skills)) {
        const sk = heroData.skills.find(
          (s) => (s.name || s).toLowerCase().trim() === skill.toLowerCase().trim(),
        );
        if (sk) skillVal = Number(sk.bonus ?? 1);
      }

      let equipBonus = 0;
      if (heroData.equipmentSkillBonuses && skill) {
        equipBonus = Number(heroData.equipmentSkillBonuses[skill.toLowerCase().trim()] || 0);
      }

      modifier = attrVal + skillVal + equipBonus;
    }

    // Sorteio dos dados
    let dice = [];
    let kept = [];
    const isPhysical = Array.isArray(physical_dice) && physical_dice.length >= 1;

    if (isPhysical) {
      dice = [...physical_dice];
      if (dice.length === 1 || dice.length === 2) {
        kept = [...dice];
      } else if (dice.length === 3 && (mode === 'vantagem' || mode === 'desvantagem')) {
        const [d1, d2, d3] = dice;
        if (mode === 'vantagem') {
          if (d1 <= d2 && d1 <= d3) kept = [d2, d3];
          else if (d2 <= d1 && d2 <= d3) kept = [d1, d3];
          else kept = [d1, d2];
        } else {
          if (d1 >= d2 && d1 >= d3) kept = [d2, d3];
          else if (d2 >= d1 && d2 >= d3) kept = [d1, d3];
          else kept = [d1, d2];
        }
      } else {
        kept = [...dice];
      }
    } else {
      const rD6 = () => Math.floor(Math.random() * 6) + 1;
      if (mode === 'vantagem' || mode === 'desvantagem') {
        const d1 = rD6();
        const d2 = rD6();
        const d3 = rD6();
        dice = [d1, d2, d3];
        if (mode === 'vantagem') {
          if (d1 <= d2 && d1 <= d3) kept = [d2, d3];
          else if (d2 <= d1 && d2 <= d3) kept = [d1, d3];
          else kept = [d1, d2];
        } else {
          if (d1 >= d2 && d1 >= d3) kept = [d2, d3];
          else if (d2 >= d1 && d2 >= d3) kept = [d1, d3];
          else kept = [d1, d2];
        }
      } else {
        const d1 = rD6();
        const d2 = rD6();
        dice = [d1, d2];
        kept = [d1, d2];
      }
    }

    const peso = Number(current_peso ?? 8);
    const { total, result } = resolveRollRules({ dice, kept, modifier, peso });
    const finalLabel = label || skill || attribute || 'Rolagem';

    const rollId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `roll_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const rollRecord = {
      id: rollId,
      session_code: 'MESA',
      character_id,
      player_id: character_id,
      player_name: rollerName,
      roller_name: rollerName,
      roller_avatar: rollerAvatar,
      label: finalLabel,
      attribute,
      skill,
      mode,
      dice,
      kept,
      modifier,
      total,
      peso,
      result,
      physical: isPhysical,
      secret: actualSecret,
      broke_oath: false,
      used_inspiration: false,
      damage: damage !== null && damage !== undefined ? Number(damage) : null,
      die_type: die_type || null,
      created_at: new Date().toISOString(),
    };

    // 2. DISPARO INSTANTÂNEO (< 1ms): envia via canal WebSocket broadcast para todas as telas
    emitDiceRollInstant(rollRecord);

    // 3. Persistência assíncrona no Supabase em segundo plano
    const persistPromise = (async () => {
      try {
        const { data: inserted, error: insErr } = await supabase
          .from('dice_rolls')
          .insert(rollRecord)
          .select()
          .single();

        if (insErr) {
          // Fallback compatibilidade de colunas
          const legacyPayload = {
            id: rollId,
            session_code: 'MESA',
            player_id: character_id,
            player_name: rollerName,
            character_id,
            label: finalLabel,
            dice,
            kept,
            modifier,
            total,
            peso,
            mode,
            result,
            broke_oath: false,
            used_inspiration: false,
          };
          await supabase.from('dice_rolls').insert(legacyPayload);
        }

        // Se crítico, incrementa inspiração
        if (result === 'critico' && character_id) {
          const curInsp = heroData?.inspiration || 0;
          if (curInsp < 2) {
            await supabase
              .from('characters')
              .update({ inspiration: curInsp + 1 })
              .eq('id', character_id);
          }
        }
      } catch (err) {
        console.warn('[DICE] Erro na persistência assíncrona:', err);
      }
    })();

    return { success: true, data: rollRecord };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Re-rolar usando Inspiração
 */
export async function rerollWithInspirationRPC(rollId, heroData) {
  try {
    const { data, error } = await supabase.rpc('reroll_with_inspiration', {
      p_roll_id: rollId,
    });
    if (!error && data) return { success: true, data };
    if (error && error.message?.includes('Sem Inspiração')) {
      throw new Error('Sem Inspiração.');
    }
  } catch (e) {
    if (e.message?.includes('Sem Inspiração')) throw e;
  }

  // Fallback
  const { data: origRoll } = await supabase
    .from('dice_rolls')
    .select('*')
    .eq('id', rollId)
    .single();
  if (!origRoll) throw new Error('Rolagem não encontrada.');

  const charId = origRoll.character_id || heroData?.id;
  const curInsp = heroData?.inspiration ?? 0;
  if (curInsp < 1) {
    throw new Error('Sem Inspiração.');
  }

  // Desconta inspiração
  await supabase
    .from('characters')
    .update({ inspiration: Math.max(0, curInsp - 1) })
    .eq('id', charId);

  // Rola novamente
  const res = await rollDiceRPC({
    character_id: charId,
    attribute: origRoll.attribute || 'corpo',
    skill: origRoll.skill || null,
    mode: origRoll.mode || 'normal',
    label: origRoll.label,
    heroData,
    current_peso: origRoll.peso,
  });

  if (res.data?.id) {
    emitDiceRollUpdate({ id: rollId, used_inspiration: true });
    await supabase
      .from('dice_rolls')
      .update({ rerolled_from: rollId, used_inspiration: true })
      .eq('id', res.data.id);
  }
  await supabase.from('dice_rolls').update({ used_inspiration: true }).eq('id', rollId);

  return res;
}

/**
 * Quebrar o juramento em falha ou desastre
 */
export async function breakOathOnRollRPC(rollId, characterId, curPlague = 0) {
  emitDiceRollUpdate({ id: rollId, broke_oath: true, result: 'sucesso' });

  try {
    const { data, error } = await supabase.rpc('break_oath_on_roll', {
      p_roll_id: rollId,
    });
    if (!error && data) return { success: true, data };
  } catch (_) {}

  // Fallback
  const { data: updatedRoll } = await supabase
    .from('dice_rolls')
    .update({ broke_oath: true, result: 'sucesso' })
    .eq('id', rollId)
    .select()
    .single();

  if (characterId) {
    await supabase
      .from('characters')
      .update({ plague: Math.min(10, curPlague + 1) })
      .eq('id', characterId);
  }

  return {
    success: true,
    data: updatedRoll || { id: rollId, broke_oath: true, result: 'sucesso' },
  };
}
