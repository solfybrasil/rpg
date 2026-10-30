export type RollMode = 'normal' | 'vantagem' | 'desvantagem';
export type RollResultType = 'desastre' | 'falha' | 'sucesso' | 'brilhante' | 'critico' | 'livre';

export interface RollResolutionInput {
  dice?: number[];
  kept?: number[];
  modifier: number;
  peso: number;
}

export interface RollResolution {
  total: number;
  result: RollResultType;
}

export const SKILL_ATTRIBUTE_MAP: Record<string, 'corpo' | 'astucia' | 'vontade' | 'presenca'> = {
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

export function calculateRollSuccessChance(
  modifier = 0,
  peso: number | null | undefined = 8,
  mode: RollMode = 'normal',
): number {
  if (peso === 0 || peso === null || peso === undefined) return 100;

  let totalOutcomes = 0;
  let successfulOutcomes = 0;

  if (mode === 'vantagem' || mode === 'desvantagem') {
    totalOutcomes = 216;
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        for (let d3 = 1; d3 <= 6; d3++) {
          let kept: [number, number];
          if (mode === 'vantagem') {
            if (d1 <= d2 && d1 <= d3) kept = [d2, d3];
            else if (d2 <= d1 && d2 <= d3) kept = [d1, d3];
            else kept = [d1, d2];
          } else {
            if (d1 >= d2 && d1 >= d3) kept = [d2, d3];
            else if (d2 >= d1 && d2 >= d3) kept = [d1, d3];
            else kept = [d1, d2];
          }

          const isCrit = kept[0] === 6 && kept[1] === 6;
          const isFumble = kept[0] === 1 && kept[1] === 1;

          if (isCrit) {
            successfulOutcomes++;
          } else if (!isFumble) {
            const sum = kept[0] + kept[1] + modifier;
            if (sum >= peso) {
              successfulOutcomes++;
            }
          }
        }
      }
    }
  } else {
    totalOutcomes = 36;
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        const isCrit = d1 === 6 && d2 === 6;
        const isFumble = d1 === 1 && d2 === 1;

        if (isCrit) {
          successfulOutcomes++;
        } else if (!isFumble) {
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

export function resolveRollRules({
  dice,
  kept,
  modifier,
  peso,
}: RollResolutionInput): RollResolution {
  const safeKept =
    Array.isArray(kept) && kept.length > 0
      ? kept
      : Array.isArray(dice) && dice.length > 0
        ? dice
        : [1];

  if (safeKept.length === 1) {
    const k1 = safeKept[0];
    const total = k1 + modifier;
    let result: RollResultType = 'livre';
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

  let result: RollResultType;
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
