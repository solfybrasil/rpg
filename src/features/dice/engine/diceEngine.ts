import type { RollCalculation, RollMode, RollTone } from '../types';

export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollDiceSet(mode: RollMode): number[] {
  const count = mode === 'normal' ? 2 : 3;
  return Array.from({ length: count }, () => rollD6());
}

export function evaluateRoll(params: {
  dice: number[];
  modifier: number;
  peso: number;
  mode: RollMode;
  label?: string;
}): RollCalculation {
  const { dice, modifier, peso, mode, label = 'Teste de Ação' } = params;

  let kept: number[] = [dice[0] || 1, dice[1] || 1];

  if (mode === 'vantagem' && dice.length >= 3) {
    const sorted = [...dice].sort((a, b) => b - a);
    kept = [sorted[0], sorted[1]];
  } else if (mode === 'desvantagem' && dice.length >= 3) {
    const sorted = [...dice].sort((a, b) => a - b);
    kept = [sorted[0], sorted[1]];
  }

  const diceSum = kept[0] + kept[1];
  const total = diceSum + modifier;

  let tone: RollTone = 'sucesso';
  let title = 'Sucesso';

  if (kept[0] === 6 && kept[1] === 6) {
    tone = 'critico';
    title = 'Crítico! (+1 Inspiração)';
  } else if (kept[0] === 1 && kept[1] === 1) {
    tone = 'desastre';
    title = 'Desastre Rúnico!';
  } else if (total >= peso + 3) {
    tone = 'brilhante';
    title = 'Sucesso Brilhante';
  } else if (total >= peso) {
    tone = 'sucesso';
    title = 'Sucesso';
  } else {
    tone = 'falha';
    title = 'Falha';
  }

  return {
    dice,
    kept,
    modifier,
    total,
    peso,
    mode,
    tone,
    label: title,
  };
}
