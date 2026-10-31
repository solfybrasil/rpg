export type DiceResultTone = 'critico' | 'brilhante' | 'sucesso' | 'falha' | 'desastre';

export interface DiceBroadcastPayload {
  id: string;
  roller_name: string;
  character_id?: string | null;
  label?: string;
  dice: number[];
  kept: number[];
  modifier: number;
  total: number;
  peso: number;
  result: DiceResultTone;
  created_at: string;
}

export interface MesaSceneState {
  activeRoll: DiceBroadcastPayload | null;
  isRolling: boolean;
  history: DiceBroadcastPayload[];
}
