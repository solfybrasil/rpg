const STORAGE_BASE =
  'https://ermkaldfvvjgnhgnvcqo.supabase.co/storage/v1/object/public/items/avatars';

export interface SanctuaryHero {
  id: string;
  name: string;
  epithet: string;
  caminho: string;
  race: string;
  icon: string;
  portrait: string;
  oath: string;
  btnLabel: string;
}

export const HEROES_SANCTUARY_DATA: SanctuaryHero[] = [
  {
    id: 'tor_bjorn',
    name: 'Tor Bjorn',
    epithet: 'O Guardião Ancestral',
    caminho: 'Artífice Rúnico',
    race: 'Anão da Rocha',
    icon: '⚒️',
    portrait: `${STORAGE_BASE}/avatar_tor_bjorn_1791420808931_9akpn.jpg`,
    oath: 'Nunca me negarei a forjar uma arma, independentemente de para quem seja.',
    btnLabel: 'Jogar com Tor',
  },
  {
    id: 'malenia',
    name: 'Malenia',
    epithet: 'A Lâmina Rubra',
    caminho: 'Alquimista Fria',
    race: 'Feérica da Névoa',
    icon: '❄️',
    portrait: `${STORAGE_BASE}/avatar_malenia_1791420789716_i428x.jpg`,
    oath: 'Nunca poderei mentir, independente de qualquer circunstância, e serei sempre leal ao clã.',
    btnLabel: 'Jogar com Malenia',
  },
  {
    id: 'kaelis_moonfire',
    name: 'Kaelis Moonfire',
    epithet: 'O Tecelão da Névoa',
    caminho: 'Bardo & Músico Tático',
    race: 'Filho do Pântano',
    icon: '🌙',
    portrait: `${STORAGE_BASE}/avatar_kaelis_moonfire_1791420794353_ev6he.jpg`,
    oath: 'Nunca poderei voltar a um lugar ou a algo que repita o meu passado, e nunca abandonarei meus companheiros.',
    btnLabel: 'Jogar com Kaelis',
  },
];
