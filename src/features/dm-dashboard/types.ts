import type { Database } from '../../shared/supabase/types';

export type CharacterRow = Database['public']['Tables']['characters']['Row'];
export type InventoryRow = Database['public']['Tables']['inventory_items']['Row'];
export type ItemCatalogRow = Database['public']['Tables']['item_catalog']['Row'];
export type HeroEfeitoRow = Database['public']['Tables']['heroi_efeitos']['Row'];

export interface HeroDashboardItem {
  id: string;
  name: string;
  race: string;
  caminho: string;
  epithet?: string;
  avatarIcon?: string | null;
  portraitUrl?: string | null;
  health: number;
  maxHealth: number;
  plague: number;
  focus: number;
  maxFocus: number;
  inspiration: number;
  saciedade: number;
  coinsBronze: number;
  defense: number;
  exausto: boolean;
  conditions: string[];
  isOnline: boolean;
  attributes: {
    corpo: number;
    astucia: number;
    vontade: number;
    presenca: number;
  };
  skills: Array<{ name: string; bonus: number; nivel?: number }>;
  oath?: string;
  oathType?: string;
  oathPower?: string;
  oathItem?: string;
  gift?: string;
  racialTrait?: string;
  backstory?: string;
  connection?: string;
  raw: CharacterRow;
}
