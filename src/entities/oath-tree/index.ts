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

export function getNodeState(
  nodeId: string,
  treeState: OathTreeState,
  heroLevel: number,
  nodesMap: Record<string, OathTreeNode>,
): 'done' | 'avail' | 'lvlock' | 'locked' {
  const node = nodesMap[nodeId];
  if (!node) return 'locked';
  const marks = treeState.m?.[nodeId] || 0;
  const isDone = nodeId === 'hub' || marks >= (node.custo ?? 999) || Boolean(treeState.g?.[nodeId]);
  if (isDone) return 'done';

  let connected = false;
  if (node.adj) {
    for (const a of node.adj) {
      const aNode = nodesMap[a];
      const aDone =
        a === 'hub' ||
        (treeState.m?.[a] || 0) >= (aNode?.custo ?? 999) ||
        Boolean(treeState.g?.[a]);
      if (aDone) {
        connected = true;
        break;
      }
    }
  }
  if (!connected && marks === 0) return 'locked';
  if (heroLevel < (node.lv ?? 1)) return 'lvlock';
  return 'avail';
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
