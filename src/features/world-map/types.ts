export interface MapRegion {
  id: string;
  name: string;
  x: number;
  y: number;
  terrain: string;
  people: string;
}

export interface MapPlace {
  id: string;
  session_code: string;
  name: string;
  type: 'cap' | 'cid' | 'por' | 'vil' | 'for' | 'rui' | 'mas' | 'tem' | 'cov' | 'mar' | 'tor' | 'gui';
  region_id: string;
  region?: string;
  x: number;
  y: number;
  desc_public?: string | null;
  desc?: string | null;
  desc_secret?: string | null;
  discovered: boolean;
  visited: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MapPin {
  id: string;
  session_code: string;
  player_id: string;
  x: number;
  y: number;
  note: string;
  created_at?: string;
}

export interface MapState {
  session_code: string;
  party_place_id: string | null;
  party_x: number;
  party_y: number;
  route: [number, number][];
  ping?: { x: number; y: number; at: number } | null;
  updated_at?: string;
}

export interface CityDistrict {
  id: string;
  name: string;
  type: 'cidadela' | 'mercado' | 'cais' | 'artifices' | 'templo' | 'subterraneo' | 'guarda';
  tagline: string;
  description: string;
  dangerLevel: 'Baixo' | 'Médio' | 'Alto' | 'Extremo';
  pointsOfInterest: {
    name: string;
    kind: string;
    description: string;
    npc?: string;
  }[];
}

export interface CityMapData {
  id: string;
  name: string;
  typeLabel: string;
  regionName: string;
  population: string;
  ruler: string;
  defense: string;
  description: string;
  districts: CityDistrict[];
  localRumor: string;
}
