export interface CreatureAttackEffect {
  condicao: string;
  chance: number;
  pilhas?: number;
  resistencia?: {
    atributo: string;
    peso: number;
  };
}

export interface CreatureAttack {
  nome: string;
  dano: string;
  tipo?: string;
  acerto?: number;
  desc?: string;
  efeitos?: CreatureAttackEffect[];
  recarga?: string | null;
  peso_chance?: number;
}

export interface CreatureLootItem {
  id?: string;
  item_id?: string;
  name: string;
  qty?: number;
  chance?: number;
  roll?: number | null;
  success?: boolean;
  selected?: boolean;
}

export interface Creature {
  id: string;
  name: string;
  species: string | null;
  category: string | null;
  size: string | null;
  region: string | null;
  region_key: string | null;
  stage: string | null;
  tier: string | null;
  threat: number;
  max_hp: number;
  defense: number;
  attack_bonus: number;
  damage_dice: string;
  attacks_per_turn: number;
  abilities: string[] | any[] | null;
  weakness: string | null;
  loot: CreatureLootItem[] | any[] | null;
  harvest_skill: string | null;
  harvest_peso: number | null;
  edible: boolean | null;
  cooking: string | null;
  eat_effect: string | null;
  plague: boolean | null;
  unique: boolean | null;
  lair: string | null;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  tags: string[] | any[] | null;
  archived: boolean;
  created_at?: string | null;
  updated_at?: string | null;

  // Battle media (Chroma & Video Idle)
  idle_mp4_url?: string | null;
  idle_webm_url?: string | null;
  poster_url?: string | null;
  media_chroma?: string | null;
  media_anchor_x?: number | null;
  media_anchor_y?: number | null;
  media_size?: number | null;
  media_facing?: number | null;

  // Derived / calculated
  ataques?: CreatureAttack[];
  drops?: CreatureLootItem[];
  efeitos_auto?: boolean;
}

export interface CreatureFilter {
  search?: string;
  region?: string;
  category?: string;
  tier?: string;
  threatMin?: number;
  threatMax?: number;
  edible?: boolean | null;
  plague?: boolean | null;
  unique?: boolean | null;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PaginatedCreaturesResult {
  data: Creature[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
