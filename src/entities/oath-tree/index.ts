import { ALL_13_SKILLS, GRAPH, P, REG, RING, buildGraph, rad } from '../../data/oathTreeGraph';
import {
  calcSkillBonus,
  calcSkillMastery,
  calcSkillNextMilestone,
  calculateOathTreeBonuses,
  fetchHeroSkills,
  fetchHeroTree,
  getDefaultHeroTree,
  getHeroTreeFromStorage,
  investInspiration,
  investSkillInspiration,
  masterUndoMark,
  masterUndoSkillMark,
  masterUnlockFree,
  mergeEffectiveSkills,
  mergeTreeStates,
  saveHeroTreeToStorage,
  subscribeHeroSkills,
  subscribeHeroTree,
} from '../../services/oathTreeService';

export interface OathTreeNode {
  id: string;
  nm: string;
  ds: string;
  tipo: 'hub' | 'entry' | 'minor' | 'notable' | 'skill' | 'key';
  custo: number;
  lv: number;
  x: number;
  y: number;
  cor: string;
  reg: string;
  trilha?: string;
  pericia?: string | null;
  isSpec?: boolean;
  adj: Set<string>;
  [key: string]: unknown;
}

export interface OathTreeState {
  m: Record<string, number>;
  g: Record<string, boolean>;
}

export {
  ALL_13_SKILLS,
  REG,
  RING,
  GRAPH,
  buildGraph,
  P,
  rad,
  calcSkillBonus,
  calcSkillMastery,
  calcSkillNextMilestone,
  calculateOathTreeBonuses,
  getDefaultHeroTree,
  getHeroTreeFromStorage,
  saveHeroTreeToStorage,
  mergeTreeStates,
  mergeEffectiveSkills,
  investInspiration,
  masterUnlockFree,
  masterUndoMark,
  fetchHeroTree,
  subscribeHeroTree,
  fetchHeroSkills,
  investSkillInspiration,
  masterUndoSkillMark,
  subscribeHeroSkills,
};
