export type RollMode = 'normal' | 'vantagem' | 'desvantagem';
export type RollTone = 'critico' | 'brilhante' | 'sucesso' | 'falha' | 'desastre';

export interface DiceRollRecord {
  id: string;
  session_code: string;
  player_id?: string | null;
  player_name?: string | null;
  label?: string | null;
  dice: number[];
  kept: number[];
  modifier: number;
  total: number;
  peso: number;
  mode: RollMode;
  result: RollTone;
  rerolled?: boolean | null;
  oath_broken?: boolean | null;
  created_at?: string;
}

export interface RollCalculation {
  dice: number[];
  kept: number[];
  modifier: number;
  total: number;
  peso: number;
  mode: RollMode;
  tone: RollTone;
  label: string;
}
