export interface ShopItem {
  id: string;
  session_code?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  rarity?: string | null;
  icon?: string | null;
  image_url?: string | null;
  price_bronze: number;
  stock?: number | null;
  equippable_as?: string | null;
  damage_dice?: string | null;
  damage_bonus?: number | null;
  armor_bonus?: number | null;
  attack_bonus?: number | null;
  skill_bonus?: string | null;
  two_handed?: boolean | null;
  ranged?: boolean | null;
  ammo_type?: string | null;
  wear_type?: string | null;
  max_durability?: number | null;
  special?: string | null;
  active?: boolean | null;
  catalog_id?: string | null;
}
