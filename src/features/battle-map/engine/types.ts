export type TokenKind = 'heroi' | 'fera' | 'npc';
export type MediaType = 'video' | 'imagem';
export type ChromaMode = 'verde' | 'magenta' | 'nenhum';

export interface BattleMap {
  id: string;
  name: string;
  background_url: string | null;
  img_w: number | null;
  img_h: number | null;
  tile_size: number | null;
  origin_x: number | null;
  origin_y: number | null;
  show_grid: boolean | null;
  blocked: string[] | null;
  move_limit: number | null;
  status: 'rascunho' | 'ao_vivo' | string | null;
  round: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BattleToken {
  id: string;
  map_id: string;
  kind: TokenKind;
  hero_id?: string | null;
  beast_id?: string | null;
  name: string;
  media_url?: string | null;
  media_type?: MediaType | null;
  chroma?: ChromaMode | string | null;
  anchor_x?: number | null;
  anchor_y?: number | null;
  size?: number | null;
  facing?: number | null;
  c?: number | null;
  r?: number | null;
  path?: Array<[number, number]> | string[] | any;
  move_seq?: number | null;
  moves_left?: number | null;
  visible?: boolean | null;
  poster_url?: string | null;
  idle_mp4_url?: string | null;
  idle_webm_url?: string | null;
  updated_at?: string | null;
}

export interface CellCoord {
  c: number;
  r: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface CameraView {
  z: number;
  x: number;
  y: number;
}

export type BattleEngineMode = 'player' | 'tv' | 'dm';

export interface BattleEngineOptions {
  mode: BattleEngineMode;
  myHeroTokenId?: string | null;
  myHeroId?: string | null;
  onMoveToken?: (tokenId: string, c: number, r: number, path: Array<[number, number]>) => Promise<boolean | void> | void;
  onSelectToken?: (token: BattleToken | null) => void;
  onHoverCell?: (coord: CellCoord | null) => void;
  onFpsUpdate?: (fps: number, jsFrameMs: number) => void;
}
