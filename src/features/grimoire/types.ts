export interface Spell {
  id: string | number;
  nome: string;
  circulo: number;
  escola?: string;
  fonte?: string;
  custo_foco?: number;
  custo_inspiracao?: number;
  nivel_min?: number;
  peso?: number;
  alcance?: string;
  area?: string;
  duracao?: string;
  tipo_acao?: string;
  descricao?: string;
  resumo?: string;
  efeito_sucesso?: string;
  efeito_brilhante?: string;
  efeito_falha?: string;
  ampliar?: string;
  raridade?: string;
  em_combate?: boolean;
  icone?: string;
  risco?: {
    peste?: boolean;
    texto?: string;
    [key: string]: unknown;
  };
  hm?: {
    marcas?: number;
    aprendida?: boolean;
    liberada_pelo_mestre?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface HeroMagicRelation {
  character_id: string;
  magia_id: string | number;
  aprendida?: boolean;
  marcas?: number;
  liberada_pelo_mestre?: boolean;
  magias?: Spell;
  [key: string]: unknown;
}

export interface MagicSurgeResult {
  dado: number;
  nome: string;
  descricao: string;
  efeito: string;
  danoExtra?: number;
  textoLog: string;
}

export interface SpellCheckStatus {
  pode: boolean;
  statusText: string;
  custo?: number;
  jaAprendida?: boolean;
  hm?: Record<string, unknown>;
}

export interface CastDiceResult {
  d1: number;
  d2: number;
  somaDados: number;
  mod: number;
  total: number;
  isCritico: boolean;
  isDesastre: boolean;
  surto?: MagicSurgeResult | null;
}
