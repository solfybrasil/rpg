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
  /** Vida opcional (peças sem herói vinculado). Heróis usam `heroVitals`. */
  hp?: number | null;
  max_hp?: number | null;
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
export type BattleEditorTool = 'select' | 'paint_block' | 'erase_block' | 'pan' | 'measure';

/** Vida atual/máxima de um herói, indexada pelo `hero_id` da peça. */
export interface HeroVital {
  hp: number;
  maxHp: number;
}

export interface BattlePing {
  c: number;
  r: number;
  /** Cor do anel (padrão: ouro). */
  color?: string;
}

export interface BattleEngineOptions {
  mode: BattleEngineMode;
  tool?: BattleEditorTool;
  selectedTokenId?: string | null;
  myHeroTokenId?: string | null;
  myHeroId?: string | null;
  onMoveToken?: (tokenId: string, c: number, r: number, path: Array<[number, number]>) => Promise<boolean | void> | void;
  onMoveTokenDirect?: (tokenId: string, c: number, r: number) => void;
  onSelectToken?: (token: BattleToken | null) => void;
  onSelectTokenId?: (tokenId: string | null) => void;
  onUpdateBlocked?: (blocked: string[]) => void;
  onHoverCell?: (coord: CellCoord | null) => void;
  onFpsUpdate?: (fps: number, jsFrameMs: number) => void;
  /** Peça solta pelo Mestre ao fim de um arrasto (grava uma vez só). */
  onDropToken?: (tokenId: string, c: number, r: number) => void;
  /** Ping disparado localmente (toque longo ou duplo clique). */
  onPing?: (ping: BattlePing) => void;
  /** Resultado da régua: distância em quadrados (null ao limpar). */
  onMeasure?: (cells: number | null) => void;
  /** Peça cujo turno está ativo (anel dourado pulsante). */
  activeTokenId?: string | null;
  /** Vida dos heróis por hero_id, para a barra sobre a peça. */
  heroVitals?: Record<string, HeroVital>;
  /** Jogador tocou num baú do mapa (`near`: o herói está numa casa vizinha). */
  onTapChest?: (token: BattleToken, near: boolean) => void;
  /** Mestre tocou numa casa (usado para pôr efeitos e baús). */
  onCellClick?: (cell: CellCoord) => void;
}
