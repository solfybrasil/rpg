import {
  calcSkillBonus,
  calcSkillMastery,
  calcSkillNextMilestone,
  calculateOathTreeBonuses,
  getDefaultHeroTree,
  mergeEffectiveSkills,
  mergeTreeStates,
} from '../../services/oathTreeService';

export interface HeroAttributes {
  corpo: number;
  astucia: number;
  vontade: number;
  presenca: number;
}

export interface PlagueStage {
  id: 'limpo' | 'mancha' | 'corrupcao' | 'transformacao' | 'perdido';
  nome: string;
  cor: string;
  descricao: string;
}

export interface HeroRecord {
  id: string;
  name: string;
  title?: string | null;
  level: number;
  xp: number;
  hp_current: number;
  hp_max: number;
  focus_current: number;
  focus_max: number;
  plague: number;
  hunger?: number | null;
  exhaustion?: number | null;
  coins_bronze: number;
  attributes?: HeroAttributes;
  portraitUrl?: string | null;
  portrait_url?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  avatar_icon?: string | null;
  avatarIcon?: string | null;
  idle_mp4_url?: string | null;
  idle_webm_url?: string | null;
  poster_url?: string | null;
}

export const XP_THRESHOLDS: readonly number[] = [0, 0, 14, 24, 36, 50, 66, 84, 104, 126];

export function calcVidaMax(vidaBase = 10, corpo = 0, nivel = 1): number {
  return Number(vidaBase) + Number(corpo) * 2 + 4 * (Math.max(1, Number(nivel)) - 1);
}

export function calcFocoMax(focoBase = 3, vontade = 0, nivel = 1): number {
  const base = Math.max(2, Number(focoBase) + Number(vontade));
  const parBonus = Math.floor(Math.max(1, Number(nivel)) / 2);
  return base + parBonus;
}

export function calcDefesa(armadura = 0, escudo = 0): number {
  return 7 + Number(armadura || 0) + Number(escudo || 0);
}

export function getProximoXp(nivel = 1): number {
  const nextNivel = Math.min(10, Math.max(1, Number(nivel)) + 1);
  return XP_THRESHOLDS[nextNivel] || 126;
}

export function getPlagueStage(plague = 0): PlagueStage {
  const p = Number(plague);
  if (p <= 0) {
    return {
      id: 'limpo',
      nome: 'Limpo',
      cor: '#38bdf8',
      descricao: 'Alma serena, sem macula da peste.',
    };
  }
  if (p <= 3) {
    return {
      id: 'mancha',
      nome: 'Mancha',
      cor: '#60a5fa',
      descricao: 'Pequenos sinais e marcas de impureza.',
    };
  }
  if (p <= 7) {
    return {
      id: 'corrupcao',
      nome: 'Corrupção',
      cor: '#c084fc',
      descricao: 'A necrose do juramento se manifesta visivelmente.',
    };
  }
  if (p <= 9) {
    return {
      id: 'transformacao',
      nome: 'Transformação',
      cor: '#f87171',
      descricao: 'A carne se deforma em comunhão com o Abismo.',
    };
  }
  return {
    id: 'perdido',
    nome: 'Perdido',
    cor: '#ef4444',
    descricao: 'A promessa se desfez por completo. Condenado.',
  };
}

export function getHeroPortrait(char?: Partial<HeroRecord> | null): string | null {
  if (!char) return null;
  const isImgUrl = (val: unknown): val is string =>
    typeof val === 'string' &&
    (val.startsWith('http') ||
      val.startsWith('data:') ||
      val.startsWith('blob:') ||
      val.startsWith('/'));

  if (isImgUrl(char.portraitUrl)) return char.portraitUrl;
  if (isImgUrl(char.portrait_url)) return char.portrait_url;
  if (isImgUrl(char.imageUrl)) return char.imageUrl;
  if (isImgUrl(char.image_url)) return char.image_url;
  if (isImgUrl(char.avatar_icon)) return char.avatar_icon;
  if (isImgUrl(char.avatarIcon)) return char.avatarIcon;
  return null;
}

export {
  calcSkillBonus,
  calcSkillMastery,
  calcSkillNextMilestone,
  mergeTreeStates,
  getDefaultHeroTree,
  calculateOathTreeBonuses,
  mergeEffectiveSkills,
};
