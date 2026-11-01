import type { CityDistrict, CityMapData, MapPlace } from '../types';

export const KNOWN_CITIES: Record<string, Partial<CityMapData>> = {
  'Fosso Negro': {
    population: '~42.000 habitantes',
    ruler: 'Barão Roderic von Fuligem e o Conselho dos Fornos',
    defense: 'Muralha de Ferro Negro e Guardas da Pólvora',
    description:
      'Uma metrópole fumegante cravada no desfiladeiro de basalto. Fumaça de forjas perpétuas tinge o céu de ocre, e guindastes a vapor içam minério das profundezas.',
    localRumor: 'Dizem que mineiros nos níveis mais baixos das galerias de carvão perfuraram um túmulo esquecido da Era dos Deuses Caídos.',
    districts: [
      {
        id: 'dist-cidadela',
        name: 'Cidadela das Chaminés',
        type: 'cidadela',
        tagline: 'Assento da nobreza metalúrgica e dos sindicatos de fundição',
        description: 'Construída sobre pontes suspensas acima da névoa de fuligem, abriga os palácios dos barões e a sede da Guarda Real.',
        dangerLevel: 'Baixo',
        pointsOfInterest: [
          { name: 'Palácio de Bronze Negro', kind: 'Sede de Poder', description: 'Gabinete do Barão Roderic, protegido por autômatos a vapor.', npc: 'Barão Roderic' },
          { name: 'Arquivo dos Fornos', kind: 'Biblioteca Oculta', description: 'Registros genealógicos e patentes de forja alquímica.', npc: 'Mestre Cartógrafo Eron' },
        ],
      },
      {
        id: 'dist-mercado',
        name: 'Mercado das Brasas',
        type: 'mercado',
        tagline: 'Comércio ininterrupto de armas, minérios raros e especiarias',
        description: 'Tendas sob toldos de couro curtido onde mercadores de Valdória e das Terras Áridas trocam aço temperado por ouro e bálsamo.',
        dangerLevel: 'Médio',
        pointsOfInterest: [
          { name: 'Taverna "O Fole Rachado"', kind: 'Taverna', description: 'A melhor cerveja negra e refúgio de mercenários em busca de contratos.', npc: 'Gisela, a Estalajadeira' },
          { name: 'Armaria do Martelo Rubro', kind: 'Ferreiro', description: 'Aço temperado com sangue de dragão e escamas de basilisco.', npc: 'Ferreiro-Mestre Torvald' },
          { name: 'Boticário do Vapor', kind: 'Alquimia', description: 'Extratos tônicos para suportar os gases das minas.', npc: 'Alquimista Salina' },
        ],
      },
      {
        id: 'dist-fundicao',
        name: 'Distrito dos Altos Fornos',
        type: 'artifices',
        tagline: 'Oficinas barulhentas onde o metal aldrenoriano é fundido dia e noite',
        description: 'Caldeiras titânicas vazam faíscas incandescentes. O chão treme a cada golpe dos martelos mecânicos hidráulicos.',
        dangerLevel: 'Alto',
        pointsOfInterest: [
          { name: 'A Grande Fundição', kind: 'Complexo Industrial', description: 'Onde o ferro negro é purificado com alquimia antiga.' },
          { name: 'Santuário da Bigorna Fria', kind: 'Templo Menor', description: 'Local onde ferreiros oram aos patronos da terra antes do primeiro aço.' },
        ],
      },
      {
        id: 'dist-subsolo',
        name: 'Fosso Inferior (Goteira)',
        type: 'subterraneo',
        tagline: 'Labirinto de barracos úmidos sob os canos de esgoto e escória',
        description: 'Ladrões, mineradores doentes pela Peste Cinzenta e foragidos encontram abrigo nas sombras dos pilares da cidade alta.',
        dangerLevel: 'Extremo',
        pointsOfInterest: [
          { name: 'Covil dos Ratos Cegos', kind: 'Guilda dos Ladrões', description: 'Túnel secreto que contorna os portões da muralha com contrabando.', npc: 'O Corretor Olho-de-Cinza' },
          { name: 'Capela da Peste Silenciosa', kind: 'Santuário Proibido', description: 'Pessoas infectadas recebem conforto ritual antes do fim inevitável.' },
        ],
      },
    ],
  },
  'Porto do Abismo': {
    population: '~28.000 habitantes',
    ruler: 'Grande Almirante Vane e o Sindicato das Âncoras',
    defense: 'Bateria de Canhões Costeiros e Galeões de Guerra',
    description:
      'Cidade portuária construída em terraços de granito íngreme. O mar violento bate contra os quebra-mares de pedra negra encharcados de salmoura.',
    localRumor: 'Um navio fantasma à deriva foi avistado cruzando o nevoeiro sem tripulação viva nos conveses.',
    districts: [
      {
        id: 'dist-cais',
        name: 'Cais das Gaivotas Pardas',
        type: 'cais',
        tagline: 'Onde ancoram caravelas mercantes e contrabandistas das Ilhas Partidas',
        description: 'Velas recolhidas, cheiro de peixe seco, piche e rum barato. Estivadores carregam caixotes lacrados sob o olhar atento dos guardas.',
        dangerLevel: 'Médio',
        pointsOfInterest: [
          { name: 'Estalagem do Velho Timão', kind: 'Taverna do Cais', description: 'Jogatina com dados viciados e marinheiros contando histórias de leviatãs.', npc: 'Capitão Perneta Jon' },
          { name: 'Armazém das Especiarias Proibidas', kind: 'Entreposto', description: 'Venda secreta de pós feéricos da Costa das Brumas.' },
        ],
      },
      {
        id: 'dist-fortaleza',
        name: 'Fortaleza do Farol Cinzento',
        type: 'guarda',
        tagline: 'O farol que guia navios e dispara óleo ardente em frotas invasoras',
        description: 'Torre octogonal de 90 côvados com chamas alquímicas verdes que nunca se extinguem, mesmo nos tufões mais cruéis.',
        dangerLevel: 'Baixo',
        pointsOfInterest: [
          { name: 'Baluarte dos Corsários', kind: 'Quartel da Guarda', description: 'Centro de comando das patrulhas marítimas.' },
        ],
      },
    ],
  },
  'Valdória Real': {
    population: '~65.000 habitantes',
    ruler: 'Rainha Elenor IV de Valdória',
    defense: 'Muralha Solar de Mármore Branco e os Cavaleiros do Grifo',
    description:
      'A mais gloriosa das capitais humanas. Torres com cúpulas douradas erguem-se sobre campos férteis, embora a paranoia da peste ameace as cortes.',
    localRumor: 'Membros da corte dizem ter ouvido cantos fúnebres ecoando dos canos do palácio durante a lua nova.',
    districts: [
      {
        id: 'dist-nobre',
        name: 'Alto Bastião Real',
        type: 'cidadela',
        tagline: 'Palácios dos nobres valdorianos e jardins suspensos de lírios',
        description: 'Ruas pavimentadas com mosaicos dourados. Guarda de honra em armaduras prateadas desfila ao toque das trombetas.',
        dangerLevel: 'Baixo',
        pointsOfInterest: [
          { name: 'Trono do Sol Dourado', kind: 'Corte Real', description: 'Onde a Rainha recebe embaixadores e profere éditos de guerra.', npc: 'Rainha Elenor IV' },
          { name: 'Catedral da Luz Perpétua', kind: 'Templo Supremo', description: 'Sacerdotes realizam rituais de purificação e bênção contra a peste.' },
        ],
      },
      {
        id: 'dist-praca',
        name: 'Praça das Sete Guildas',
        type: 'mercado',
        tagline: 'O coração comercial de todo o sul de Aldrenor',
        description: 'Onde tudo tem preço: tapeçarias, livros arcanos, elixires celestes e montarias de raça.',
        dangerLevel: 'Baixo',
        pointsOfInterest: [
          { name: 'Bazar dos Ourives', kind: 'Mercado de Luxo', description: 'Joias encantadas e moedas de todas as eras.' },
          { name: 'Hospedaria "O Grifo Dourado"', kind: 'Hospedaria Real', description: 'Aposentos com banheiras de água perfumada e vinhos de safra real.' },
        ],
      },
    ],
  },
};

/**
 * Retorna dados detalhados da cidade ao ser clicada no mapa.
 * Se a cidade não estiver no dicionário estático, gera dados procedurais consistentes
 * baseados no tipo do lugar e na região correspondente.
 */
export function getCityMapData(place: MapPlace, regionName = 'Aldrenor'): CityMapData {
  const existing = KNOWN_CITIES[place.name];
  if (existing) {
    return {
      id: place.id,
      name: place.name,
      typeLabel: place.type === 'cap' ? 'Capital Imperial' : place.type === 'por' ? 'Cidade Portuária' : 'Cidade Amuralhada',
      regionName: place.region || regionName,
      population: existing.population || '~15.000 habitantes',
      ruler: existing.ruler || 'Lorde Regente e o Conselho dos Anciãos',
      defense: existing.defense || 'Guarnições amuralhadas e vigias em sete torres',
      description: existing.description || place.desc_public || place.desc || 'Um grande polo urbano amuralhado em Aldrenor.',
      districts: existing.districts || [
        {
          id: `${place.id}-d1`,
          name: 'Distrito da Cidadela',
          type: 'cidadela',
          tagline: 'Sede administrativa e quartel da guarnição local',
          description: 'Muralhas sólidas e torres de sentinela protegendo o palacete de comando.',
          dangerLevel: 'Baixo',
          pointsOfInterest: [
            { name: `Bastião de ${place.name}`, kind: 'Sede de Poder', description: 'Gabinete dos regentes locais e arquivo das ordens da comarca.' },
            { name: 'Quartel dos Vigias', kind: 'Guarnição', description: 'Treinamento de soldados e arsenal de bestas.' },
          ],
        },
        {
          id: `${place.id}-d2`,
          name: 'Mercado e Praça Maior',
          type: 'mercado',
          tagline: 'Feira agitada de caravanas e artífices locais',
          description: 'Tendas de tecidos, carne defumada, poções de cura e ferraria pesada.',
          dangerLevel: 'Médio',
          pointsOfInterest: [
            { name: 'Taverna da Tocha de Ferro', kind: 'Taverna', description: 'Onde viajantes descansam suas botas e trocam notícias sobre perigos nas estradas.' },
            { name: 'Forja da Comarca', kind: 'Ferreiro', description: 'Conserto de armaduras, afiação de lâminas e compra de pregos e correntes.' },
          ],
        },
      ],
      localRumor: existing.localRumor || 'Viajantes juram ter visto vultos nas colinas próximas após o pôr do sol.',
    };
  }

  // Geração procedural para vilas, portos e cidades menores
  const isPort = place.type === 'por';
  const isCap = place.type === 'cap';

  return {
    id: place.id,
    name: place.name,
    typeLabel: isCap ? 'Capital Soberana' : isPort ? 'Entreposto Portuário' : 'Cidade Fortificada',
    regionName: place.region || regionName,
    population: isCap ? '~35.000 habitantes' : isPort ? '~18.000 habitantes' : '~12.000 habitantes',
    ruler: isCap ? 'Alteza Regente e Chanceler' : 'Conselho de Oficiais e Guilda dos Anciãos',
    defense: 'Paliçadas de pedra reforçadas, fosso seco e arqueiros nas guaritas',
    description:
      place.desc_public ||
      place.desc ||
      `Um núcleo civilizado em meio às charnecas e ermos de ${regionName}. Ponto vital de reabastecimento para caravaneiros e andarilhos.`,
    districts: [
      {
        id: `${place.id}-d1`,
        name: isCap ? 'Pátio dos Palácios' : isPort ? 'Cais dos Galeões' : 'Bairro Alto',
        type: isCap ? 'cidadela' : isPort ? 'cais' : 'cidadela',
        tagline: isCap ? 'Governo e alta guarda' : isPort ? 'Ancoradouro e guindastes' : 'Residências e salão comunal',
        description: 'Área principal fortificada com maior patrulha dos sentinelas da cidade.',
        dangerLevel: 'Baixo',
        pointsOfInterest: [
          { name: `Casa Comunal de ${place.name}`, kind: 'Governo', description: 'Onde o prefeito ou lorde assina decretos e autoriza caravanas.' },
          { name: 'Santuário da Esperança', kind: 'Templo', description: 'Espaço sagrado de oração e bálsamo aos feridos.' },
        ],
      },
      {
        id: `${place.id}-d2`,
        name: 'Distrito Comercial e Estalagens',
        type: 'mercado',
        tagline: 'Bazar, estalagens, cavalariças e oficinas',
        description: 'Vozes negociando em várias línguas, forjas crepitando e cheiro de comida cozida em caldeirões de ferro.',
        dangerLevel: 'Médio',
        pointsOfInterest: [
          { name: `Estalagem "O Corvo de ${place.name}"`, kind: 'Taverna', description: 'Refeições quentes, cerveja de cevada escura e quartos de aluguel por moedas de bronze.' },
          { name: 'Oficina do Ferrador', kind: 'Ferreiro', description: 'Reparos em escudos, cota de malha e ferraduras.' },
          { name: 'Bazar dos Caçadores', kind: 'Boticário e Caça', description: 'Peles curtidas, ervas secas e venenos para armadilhas.' },
        ],
      },
    ],
    localRumor: 'Aconselha-se não circular pelas vielas externas após o toque das badaladas da meia-noite.',
  };
}
