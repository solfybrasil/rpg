export interface ItemCatalog {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  rarity: string | null;
  quality: string | null;
  equippable_as: string | null;
  weapon_class: string | null;
  armor_class: string | null;
  damage_dice: string | null;
  attack_attr: string | null;
  two_handed: boolean | null;
  ranged: boolean | null;
  ammo_type: string | null;
  armor_bonus: number | null;
  attack_bonus: number | null;
  damage_bonus: number | null;
  focus_bonus: number | null;
  health_bonus: number | null;
  skill_bonus: any | null;
  wear_type: string | null;
  durability: number | null;
  max_durability: number | null;
  stackable: boolean | null;
  default_quantity: number | null;
  reagent_tier: string | null;
  material_tier: string | null;
  special: string | null;
  description: string | null;
  origin: string | null;
  price_bronze: number | null;
  icon: string | null;
  image_url: string | null;
  image_status?: 'pendente' | 'gerando' | 'pronta' | 'erro' | null;
  image_prompt_en?: string | null;
  image_family?: string | null;
  image_error?: string | null;
  tags: any[] | null;
  archived: boolean;
  plague_cost: number | null;
  saciedade: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ItemCatalogFilter {
  search?: string;
  category?: string;
  rarity?: string;
  equippableAs?: string;
  weaponClass?: string;
  armorClass?: string;
  origin?: string;
  onlyWithoutImage?: boolean;
  includeArchived?: boolean;
  sortBy?: 'name' | 'rarity' | 'price' | 'recent';
  page?: number;
  pageSize?: number;
}

export interface PaginatedItemsResult {
  data: ItemCatalog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface HeroTarget {
  id: string;
  name: string;
  title?: string | null;
  avatar_icon?: string | null;
}
