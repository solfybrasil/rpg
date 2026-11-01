import type { MapPlace } from '../types';

export const DEFAULT_PLACES: MapPlace[] = [
  // Brumas
  { id: 'p-lyssandre', session_code: 'MESA', name: 'Lyssandre', type: 'cap', region_id: 'brumas', x: 430, y: 410, desc_public: 'Capital feérica erguida sobre penhascos envoltos em névoa eterna. Ninguém lembra quando foi fundada.', discovered: false, visited: false },
  { id: 'p-porto-veu', session_code: 'MESA', name: 'Porto Véu', type: 'por', region_id: 'brumas', x: 641.5, y: 593.1, desc_public: 'Porto onde os navios só atracam na maré de névoa. Ali se contrabandeiam memórias roubadas.', discovered: false, visited: false },
  { id: 'p-aldrath', session_code: 'MESA', name: 'Aldrath', type: 'cid', region_id: 'brumas', x: 375.2, y: 459.7, desc_public: 'Cidade de torres brancas onde os feéricos fazem seus votos eternos diante do conselho.', discovered: false, visited: false },
  { id: 'p-sombrarco', session_code: 'MESA', name: 'Sombrarco', type: 'cid', region_id: 'brumas', x: 484.1, y: 360.3, desc_public: 'Cidade construída sob um arco de pedra natural. Sede de clãs feéricos rivais.', discovered: false, visited: false },
  { id: 'p-cais-lamurias', session_code: 'MESA', name: 'Cais das Lamúrias', type: 'por', region_id: 'brumas', x: 371, y: 537.5, desc_public: 'Porto de pescadores humanos que pagam tributo aos feéricos.', discovered: false, visited: false },

  // Ermos
  { id: 'p-gelvar', session_code: 'MESA', name: 'Gelvar', type: 'cid', region_id: 'ermos', x: 1048.8, y: 152.9, desc_public: 'Cidade-muralha dos caçadores de dragão. Hidromel, peles e cabeças de dragão nas paredes.', discovered: false, visited: false },
  { id: 'p-hvitmark', session_code: 'MESA', name: 'Hvitmark', type: 'cid', region_id: 'ermos', x: 1136.6, y: 341.3, desc_public: 'Cidade de mineiros de gelo azul, um cristal que conserva qualquer coisa para sempre.', discovered: false, visited: false },
  { id: 'p-porto-geada', session_code: 'MESA', name: 'Porto Geada', type: 'por', region_id: 'ermos', x: 1218.9, y: 215.1, desc_public: 'Porto que congela metade do ano. Baleeiros e piratas do gelo dividem as tavernas.', discovered: false, visited: false },

  // Estepes
  { id: 'p-kharum', session_code: 'MESA', name: 'Kharum', type: 'cid', region_id: 'estepes', x: 1463.9, y: 537, desc_public: 'Cidade de tendas que muda de lugar a cada estação. Capital dos Errantes.', discovered: false, visited: false },
  { id: 'p-pedra-marco', session_code: 'MESA', name: 'Pedra-Marco', type: 'cid', region_id: 'estepes', x: 1787, y: 399, desc_public: 'Cidade erguida em volta de um monólito coberto de votos gravados por mil povos.', discovered: false, visited: false },
  { id: 'p-uivo', session_code: 'MESA', name: 'Uivo', type: 'cid', region_id: 'estepes', x: 1573.8, y: 566.2, desc_public: 'Cidade dos meio-orcs, famosa pelos ringues de luta e pelos votos de sangue.', discovered: false, visited: false },

  // Charnecas
  { id: 'p-navio-apodrecido', session_code: 'MESA', name: 'O Navio Apodrecido', type: 'rui', region_id: 'charnecas', x: 975, y: 515, desc_public: 'Carcaça de navio encalhada no meio do pântano, ninho de Rachados. A campanha começou aqui.', discovered: true, visited: true },
  { id: 'p-tuneis-raizes', session_code: 'MESA', name: 'Túneis de Raízes', type: 'mas', region_id: 'charnecas', x: 995, y: 548, desc_public: 'Canais alagados sob o navio, onde o grupo quase se afogou fugindo da horda.', discovered: true, visited: true },
  { id: 'p-sant-contrabandistas', session_code: 'MESA', name: 'Santuário dos Contrabandistas', type: 'rui', region_id: 'charnecas', x: 1018, y: 585, desc_public: 'Refúgio selado com porta de ferro e forja velha. Ali nasceu a Foice Rúnica Bibgard.', discovered: true, visited: true },
  { id: 'p-aqueduto-elfico', session_code: 'MESA', name: 'Aqueduto Élfico', type: 'rui', region_id: 'charnecas', x: 1040, y: 655, desc_public: 'Arcos antigos cobertos de musgo luminoso, na saída das Charnecas.', discovered: true, visited: true },
  { id: 'p-lodacal', session_code: 'MESA', name: 'Lodaçal', type: 'cid', region_id: 'charnecas', x: 827.3, y: 537.9, desc_public: 'Cidade de palafitas, maior assentamento dos Filhos do Pântano.', discovered: true, visited: false },
  { id: 'p-brejo-velho', session_code: 'MESA', name: 'Brejo-Velho', type: 'cid', region_id: 'charnecas', x: 948.7, y: 672.9, desc_public: 'Cidade humana meio afundada, cheia de caçadores de recompensa.', discovered: true, visited: false },

  // Silvarenna
  { id: 'p-aelindor', session_code: 'MESA', name: 'Aelindor', type: 'cap', region_id: 'silvarenna', x: 420, y: 870, desc_public: 'Capital escondida dos elfos, só se entra guiado. A Balança quer descobrir o caminho.', discovered: false, visited: false },
  { id: 'p-lua-folha', session_code: 'MESA', name: 'Lua-de-Folha', type: 'cid', region_id: 'silvarenna', x: 315.5, y: 943.1, desc_public: 'Cidade nas copas das árvores, ligada por pontes de cipó.', discovered: false, visited: false },
  { id: 'p-porto-sereno', session_code: 'MESA', name: 'Porto Sereno', type: 'por', region_id: 'silvarenna', x: 604.7, y: 783.1, desc_public: 'Único porto élfico aberto a estrangeiros, com regras rígidas.', discovered: false, visited: false },

  // Áridas
  { id: 'p-poeirana', session_code: 'MESA', name: 'Poeirana', type: 'cid', region_id: 'aridas', x: 913, y: 888, desc_public: 'Cidade de caravanas e mercenários, onde tudo tem preço.', discovered: true, visited: false },
  { id: 'p-sol-rachado', session_code: 'MESA', name: 'Sol-Rachado', type: 'cid', region_id: 'aridas', x: 977, y: 817.3, desc_public: 'Cidade de adobe onde a água vale mais que ouro.', discovered: true, visited: false },
  { id: 'p-estrada-corvo', session_code: 'MESA', name: 'Estrada do Corvo', type: 'mar', region_id: 'aridas', x: 1070, y: 885, desc_public: 'Trecho da estrada para o sul onde o grupo encontrou O Corvo.', discovered: true, visited: true },
  { id: 'p-encruzilhada', session_code: 'MESA', name: 'Encruzilhada', type: 'cid', region_id: 'aridas', x: 1126.3, y: 899.6, desc_public: 'Todas as grandes estradas se cruzam aqui. Tem a maior Guilda dos Aventureiros.', discovered: true, visited: false },

  // Fuligem
  { id: 'p-fosso-negro', session_code: 'MESA', name: 'Fosso Negro', type: 'cid', region_id: 'fuligem', x: 1090, y: 1045, desc_public: 'Metrópole mineradora em volta de um poço gigante, com dragões de carga acorrentados. O grupo está aqui.', discovered: true, visited: true },
  { id: 'p-carvoeira', session_code: 'MESA', name: 'Carvoeira', type: 'cid', region_id: 'fuligem', x: 851.6, y: 1046.6, desc_public: 'Cidade de carvoarias onde o céu é sempre cinza.', discovered: true, visited: false },
  { id: 'p-ferrugem', session_code: 'MESA', name: 'Ferrugem', type: 'cid', region_id: 'fuligem', x: 1073.9, y: 1426.4, desc_public: 'Cidade de ferreiros e fundições. Boa para comprar e vender armas.', discovered: true, visited: false },
  { id: 'p-ponte-forja', session_code: 'MESA', name: 'Ponte-Forja', type: 'cid', region_id: 'fuligem', x: 957.8, y: 1074.9, desc_public: 'Cidade inteira construída sobre uma ponte de ferro gigante.', discovered: true, visited: false },

  // Bib
  { id: 'p-bibgard', session_code: 'MESA', name: 'Bibgard', type: 'cap', region_id: 'bib', x: 1640, y: 770, desc_public: 'Cidadela dos Guardas da Montanha Bib. O Clã Bibgard procura o machado perdido.', discovered: false, visited: false },
  { id: 'p-kar-dum', session_code: 'MESA', name: 'Kar-Dum', type: 'cid', region_id: 'bib', x: 1877.4, y: 648.7, desc_public: 'Cidade-forja dos Anões da Rocha, escavada dentro da montanha.', discovered: false, visited: false },

  // Valdória
  { id: 'p-valdoria-real', session_code: 'MESA', name: 'Valdória Real', type: 'cap', region_id: 'valdoria', x: 680, y: 1230, desc_public: 'Capital do maior reino humano, governada pela Rainha Elenor IV.', discovered: true, visited: false },
  { id: 'p-porto-abismo', session_code: 'MESA', name: 'Porto do Abismo', type: 'por', region_id: 'valdoria', x: 520, y: 1350, desc_public: 'Cidade portuária construída em terraços de granito íngreme.', discovered: true, visited: false },

  // Cinzas
  { id: 'p-chama-negra', session_code: 'MESA', name: 'Cidadela da Chama Negra', type: 'cap', region_id: 'cinzas', x: 1560, y: 1190, desc_public: 'Bastião dos draconatos, erguido em rocha vulcânica e enxofre.', discovered: false, visited: false },

  // Ilhas
  { id: 'p-porto-corsario', session_code: 'MESA', name: 'Porto dos Corsários', type: 'por', region_id: 'ilhas', x: 2200, y: 800, desc_public: 'Refúgio de contrabandistas, piratas e navegadores destemidos.', discovered: false, visited: false },
];
