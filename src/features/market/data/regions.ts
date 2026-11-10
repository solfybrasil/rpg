/**
 * Perfil comercial de cada região de Aldrenor.
 * - specialties: o que a região produz (mais barato e mais comum no estoque)
 * - scarce: o que falta lá (mais caro, raro no estoque e bem pago na venda)
 * - mult: custo de vida da região
 * - rarityBonus: mercados que chegam a raridades maiores
 * - blackMarket: aceita itens Malditos
 */
export type CatKey =
  | 'arma'
  | 'armadura'
  | 'escudo'
  | 'pocao'
  | 'alquimia'
  | 'comida'
  | 'prato'
  | 'parte'
  | 'lendaria'
  | 'trofeu'
  | 'ferramenta'
  | 'material'
  | 'tesouro'
  | 'outro';

export const CAT_LABEL: Record<CatKey, string> = {
  arma: 'Armas',
  armadura: 'Armaduras',
  escudo: 'Escudos',
  pocao: 'Poções',
  alquimia: 'Alquimia',
  comida: 'Comida',
  prato: 'Pratos',
  parte: 'Partes de criatura',
  lendaria: 'Partes lendárias',
  trofeu: 'Troféus',
  ferramenta: 'Ferramentas',
  material: 'Materiais',
  tesouro: 'Tesouros',
  outro: 'Outros',
};

/** Categoria do catálogo → chave do mercado. */
export function catKey(category: string | null | undefined): CatKey {
  const c = (category ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (c.includes('lendaria')) return 'lendaria';
  if (c.includes('armadura')) return 'armadura';
  if (c.includes('escudo')) return 'escudo';
  if (c.includes('arma')) return 'arma';
  if (c.includes('pocao')) return 'pocao';
  if (c.includes('alquim')) return 'alquimia';
  if (c.includes('prato')) return 'prato';
  if (c.includes('comida') || c.includes('aliment')) return 'comida';
  if (c.includes('criatura')) return 'parte';
  if (c.includes('trofeu')) return 'trofeu';
  if (c.includes('ferrament')) return 'ferramenta';
  if (c.includes('material')) return 'material';
  if (c.includes('tesouro') || c.includes('joia')) return 'tesouro';
  return 'outro';
}

export interface RegionProfile {
  id: string;
  name: string;
  specialties: CatKey[];
  scarce: CatKey[];
  mult: number;
  rarityBonus: number;
  blackMarket?: boolean;
  /** Frase curta mostrada ao jogador. */
  flavor: string;
}

export const REGION_PROFILES: Record<string, RegionProfile> = {
  brumas: {
    id: 'brumas',
    name: 'Costa das Brumas',
    specialties: ['alquimia', 'pocao', 'tesouro'],
    scarce: ['armadura', 'escudo'],
    mult: 1.1,
    rarityBonus: 0,
    flavor: 'Feéricos vendem essências e bugigangas encantadas; metal pesado quase não chega.',
  },
  ermos: {
    id: 'ermos',
    name: 'Ermos do Dragão',
    specialties: ['parte', 'trofeu', 'arma'],
    scarce: ['comida', 'alquimia'],
    mult: 1.15,
    rarityBonus: 0,
    flavor: 'Caçadores trocam escamas e lanças; comida fresca vale ouro no gelo.',
  },
  estepes: {
    id: 'estepes',
    name: 'Estepes Errantes',
    specialties: ['arma', 'comida', 'parte'],
    scarce: ['tesouro', 'alquimia'],
    mult: 0.95,
    rarityBonus: 0,
    flavor: 'Mercado de tendas: carne, couro e armas de guerra, tudo barato e barulhento.',
  },
  charnecas: {
    id: 'charnecas',
    name: 'Charnecas Esquecidas',
    specialties: ['alquimia', 'parte', 'pocao'],
    scarce: ['armadura', 'escudo', 'ferramenta'],
    mult: 0.9,
    rarityBonus: 0,
    blackMarket: true,
    flavor: 'Ervas do pântano e coisas que ninguém pergunta de onde vieram.',
  },
  silvarenna: {
    id: 'silvarenna',
    name: 'Silvarenna, a Floresta Oculta',
    specialties: ['arma', 'alquimia', 'pocao'],
    scarce: ['material', 'ferramenta'],
    mult: 1.2,
    rarityBonus: 1,
    flavor: 'Arcos élficos e remédios finos; metal e ferramentas são raros entre as árvores.',
  },
  aridas: {
    id: 'aridas',
    name: 'Terras Áridas',
    specialties: ['ferramenta', 'material', 'tesouro'],
    scarce: ['comida', 'pocao'],
    mult: 1,
    rarityBonus: 0,
    flavor: 'Rota das caravanas: de tudo um pouco, menos água e comida.',
  },
  fuligem: {
    id: 'fuligem',
    name: 'Vale da Fuligem',
    specialties: ['material', 'ferramenta', 'arma'],
    scarce: ['comida', 'prato'],
    mult: 1.05,
    rarityBonus: 0,
    flavor: 'Minério, carvão e lâminas recém-forjadas; o pão vem de longe e custa caro.',
  },
  bib: {
    id: 'bib',
    name: 'Montanhas Bib',
    specialties: ['armadura', 'escudo', 'arma', 'ferramenta'],
    scarce: ['alquimia', 'comida'],
    mult: 1.1,
    rarityBonus: 1,
    flavor: 'As melhores forjas do continente. Anão não vende barato, mas vende bem.',
  },
  valdoria: {
    id: 'valdoria',
    name: 'Reino de Valdoria',
    specialties: ['comida', 'prato', 'armadura'],
    scarce: ['parte'],
    mult: 1,
    rarityBonus: 0,
    flavor: 'O maior reino: mercados cheios, preços justos e guardas em cada esquina.',
  },
  cinzas: {
    id: 'cinzas',
    name: 'Cicatriz de Cinzas',
    specialties: ['arma', 'trofeu', 'parte'],
    scarce: ['comida', 'pocao', 'prato'],
    mult: 1.25,
    rarityBonus: 1,
    flavor: 'Draconatos negociam aço temperado em lava; tudo que é vivo custa caro aqui.',
  },
  ilhas: {
    id: 'ilhas',
    name: 'Ilhas Partidas',
    specialties: ['tesouro', 'arma'],
    scarce: ['armadura', 'material'],
    mult: 1.3,
    rarityBonus: 1,
    blackMarket: true,
    flavor: 'Contrabando de todo canto: raridades a preço de pirata.',
  },
};

export const REGION_IDS = Object.keys(REGION_PROFILES);

export function regionProfile(id: string | null | undefined): RegionProfile {
  return REGION_PROFILES[id ?? ''] ?? REGION_PROFILES.valdoria;
}
