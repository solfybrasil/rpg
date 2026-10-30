// Definição e Grafo Canônico da Árvore do Juramento (200 Nós, 13 Perícias e 8 Regiões)

export const ALL_13_SKILLS = [
  {
    name: 'Atletismo',
    region: 'Guerra',
    color: '#c8382c',
    skillNodeId: 'r0t0p0',
    specNodeId: 'r0t0p4',
  },
  {
    name: 'Furtividade',
    region: 'Sombras',
    color: '#824eb0',
    skillNodeId: 'r2t0p0',
    specNodeId: 'r2t0p4',
  },
  {
    name: 'Enganação',
    region: 'Sombras',
    color: '#824eb0',
    skillNodeId: 'r2t1p0',
    specNodeId: 'r2t1p4',
  },
  {
    name: 'Sobrevivência',
    region: 'Ermos',
    color: '#4e8a3c',
    skillNodeId: 'r3t0p0',
    specNodeId: 'r3t0p4',
  },
  {
    name: 'Percepção',
    region: 'Ermos',
    color: '#4e8a3c',
    skillNodeId: 'r3t1p0',
    specNodeId: 'r3t1p4',
  },
  {
    name: 'Forja',
    region: 'Ofícios',
    color: '#d47426',
    skillNodeId: 'r4t0p0',
    specNodeId: 'r4t0p4',
  },
  {
    name: 'Alquimia',
    region: 'Ofícios',
    color: '#d47426',
    skillNodeId: 'r4t1p0',
    specNodeId: 'r4t1p4',
  },
  {
    name: 'Medicina',
    region: 'Ofícios',
    color: '#d47426',
    skillNodeId: 'r4t2p0',
    specNodeId: 'r4t2p4',
  },
  {
    name: 'Arcanismo',
    region: 'Arcano',
    color: '#2a96a3',
    skillNodeId: 'r5t0p0',
    specNodeId: 'r5t0p4',
  },
  {
    name: 'História',
    region: 'Arcano',
    color: '#2a96a3',
    skillNodeId: 'r5t1p0',
    specNodeId: 'r5t1p4',
  },
  {
    name: 'Persuasão',
    region: 'Voz',
    color: '#b53b74',
    skillNodeId: 'r7t0p0',
    specNodeId: 'r7t0p4',
  },
  {
    name: 'Intimidação',
    region: 'Voz',
    color: '#b53b74',
    skillNodeId: 'r7t1p0',
    specNodeId: 'r7t1p4',
  },
  { name: 'Música', region: 'Voz', color: '#b53b74', skillNodeId: 'r7t2p0', specNodeId: 'r7t2p4' },
];

const per = (n, m1, n2, m3, m5, n6) => ({
  nome: n,
  pericia: n,
  nos: [
    [n, 'Treinada: +1 nos testes de ' + n + '.'],
    m1,
    n2,
    m3,
    ['Especialista em ' + n, '+2 nos testes de ' + n + ' (substitui o +1).'],
    m5,
    n6,
  ],
});
const tri = (nome, nos) => ({ nome, nos });

export const REG = [
  {
    nome: 'Guerra',
    attr: 'Corpo',
    cor: '#c8382c',
    entry: ['Sangue Quente', '+1 Vida máxima.'],
    trilhas: [
      per(
        'Atletismo',
        ['Passo Largo', 'Pula o dobro da distância normal.'],
        ['Escalador', 'Escala superfícies comuns sem teste; vantagem nas difíceis.'],
        ['Fôlego Longo', 'Corre e nada por horas sem cansar.'],
        ['Ombro de Aríete', 'Vantagem para derrubar portas e empurrar.'],
        [
          'Força de Gigante',
          'Ergue e arremessa o que dois homens fortes fariam; quem você agarra rola com desvantagem para escapar.',
        ],
      ),
      tri('Lâmina Pesada', [
        ['Empunhadura Firme', '+1 no ataque com armas de duas mãos.'],
        ['Gume Cuidado', 'Arma pesada causa +1 de dano.'],
        ['Varredura', 'Quando derruba um inimigo, ataca outro ao lado (1x por turno).'],
        ['Pulso Firme', 'Você não pode ser desarmado.'],
        ['Golpe Esmagador', 'No crítico com arma pesada, o alvo cai no chão.'],
        ['Peso da Lâmina', 'Arma pesada causa mais +1 de dano.'],
        ['Ceifador', '2 Foco: ataca todos os inimigos ao seu redor.'],
      ]),
      tri('Fúria', [
        ['Grito de Guerra', '1 Foco: +1 de dano em todos os ataques nesta rodada.'],
        ['Pele Grossa', '+1 Vida máxima.'],
        ['Sede de Sangue', 'Ao derrubar um inimigo, cura 1d4.'],
        ['Rugido', 'Vantagem contra medo.'],
        [
          'Fúria',
          '2 Foco: +1d4 de dano corpo a corpo e vantagem em Atletismo por uma cena, mas −1 Defesa.',
        ],
        ['Dor é Combustível', 'À Beira, seus ataques causam +2 de dano.'],
        ['Ira Dracônica', '3 Foco: nesta rodada, todos os seus ataques causam dano máximo.'],
      ]),
    ],
    keys: [
      [
        'Berserker',
        'Seus ataques causam +2 de dano sempre. Em troca, você não usa escudo e não recua de um combate começado.',
      ],
      [
        'Mestre de Armas',
        'Escolha 3 armas. Com elas, +1 no ataque e o duplo 1 vira só uma falha comum. Em troca, outras armas têm −1.',
      ],
    ],
  },
  {
    nome: 'Fortaleza',
    attr: 'Corpo',
    cor: '#3b6ea8',
    entry: ['Postura Sólida', '+1 Vida máxima.'],
    trilhas: [
      tri('Escudo', [
        ['Treino de Escudo', '+1 Defesa usando escudo.'],
        ['Braço Firme', '+1 para não ser derrubado.'],
        ['Bloqueio', 'Reação, 1 Foco: aliado ao lado ganha +2 Defesa contra um ataque.'],
        ['Escudo Pesado', '+1 Defesa contra flechas e virotes.'],
        ['Muro de Escudos', 'Aliados ao seu lado ganham +1 Defesa.'],
        ['Empurrão de Escudo', 'Ao bloquear, empurra o atacante 2 metros.'],
        ['Bastião', '2 Foco: por uma cena, nenhum inimigo passa por você sem levar um ataque.'],
      ]),
      tri('Vigor', [
        ['Constituição', '+2 Vida máxima.'],
        ['Sono Pesado', 'Descanso curto cura +2.'],
        ['Segundo Vento', '1x por descanso, cura 1d6 sem gastar Foco.'],
        ['Estômago de Anão', 'Vantagem contra veneno e comida estragada.'],
        ['Corpo de Carvalho', '+4 Vida máxima.'],
        ['Resistente', '+2 Vida máxima.'],
        ['Recusa em Cair', '1x por sessão, quando chegaria a 0, fica com 1 de Vida.'],
      ]),
      tri('Armadura', [
        ['Treino de Armadura', 'Usa armadura média sem penalidade.'],
        ['Correias Ajustadas', 'Veste ou tira armadura na metade do tempo.'],
        ['Armadura Pesada', 'Pode usar armadura pesada.'],
        ['Couro Duro', 'Armadura vale +1 contra garras e mordidas de fera.'],
        ['Pele de Ferro', 'Reduz em 1 todo dano físico que recebe.'],
        ['Passo Blindado', 'Armadura pesada não atrapalha correr nem nadar.'],
        ['Inquebrável', 'Reduz em 2 todo dano físico (substitui Pele de Ferro).'],
      ]),
    ],
    keys: [
      [
        'Guardião Eterno',
        'Quando um aliado ao lado é atingido, você pode receber o dano no lugar dele. Em troca, não ataca à distância.',
      ],
      [
        'Montanha',
        '+6 Vida máxima e ninguém te derruba. Em troca, −1 em Furtividade e para correr.',
      ],
    ],
  },
  {
    nome: 'Sombras',
    attr: 'Astúcia',
    cor: '#824eb0',
    entry: ['Pés Leves', 'Seus passos não fazem barulho em chão comum.'],
    trilhas: [
      per(
        'Furtividade',
        ['Capuz Escuro', 'Vantagem para se esconder à noite.'],
        [
          'Sumir na Multidão',
          'Na cidade, escapa de perseguição sem teste se houver gente em volta.',
        ],
        ['Respiração Contida', 'Fica imóvel e escondido por horas.'],
        ['Passo de Gato', 'Cai de até 6 metros sem dano.'],
        ['Sombra Viva', 'Se não foi visto, age antes de todos os inimigos no 1º turno.'],
      ),
      per(
        'Enganação',
        ['Cara de Paisagem', 'Vantagem para esconder o que sente.'],
        ['Disfarce Rápido', 'Monta um disfarce simples em 1 minuto.'],
        ['Mão Leve', 'Vantagem para furtar bolsos.'],
        ['Voz Imitada', 'Imita por 1 minuto a voz de quem ouviu.'],
        ['Mil Mentiras', 'Quem tenta perceber sua mentira rola com desvantagem.'],
      ),
      tri('Lâminas Ocultas', [
        ['Adaga na Manga', 'Saca arma leve sem gastar ação; ela passa por qualquer revista.'],
        ['Ponta Envenenada', 'Veneno na arma dura 2 ataques em vez de 1.'],
        ['Golpe Baixo', '+1d4 de dano contra quem não te viu.'],
        ['Lâmina Leve', '+1 no ataque com adagas.'],
        ['Ponto Vital', 'No crítico com arma leve, dano dobrado.'],
        ['Arremesso', 'Adaga arremessada não sofre desvantagem a média distância.'],
        [
          'Execução',
          '3 Foco: inimigo com 5 de Vida ou menos morre na hora. Não vale contra chefes.',
        ],
      ]),
    ],
    keys: [
      ['Fantasma', 'Escondido, ninguém te mira com ataques à distância. Em troca, −2 Vida máxima.'],
      [
        'Mãos Sujas',
        'Todo saque que você revista primeiro rende +1 item comum. Em troca, −1 de Renome com nobres e guardas.',
      ],
    ],
  },
  {
    nome: 'Ermos',
    attr: 'Astúcia',
    cor: '#4e8a3c',
    entry: ['Faro', 'Sente cheiro de fumaça, sangue e Peste de longe.'],
    trilhas: [
      per(
        'Sobrevivência',
        ['Fogueira Rápida', 'Acende fogo até debaixo de chuva.'],
        ['Batedor', 'O grupo nunca se perde em viagem.'],
        ['Abrigo', 'Monta abrigo que protege do frio extremo.'],
        ['Água Limpa', 'Sempre acha água boa para beber.'],
        [
          'Filho dos Ermos',
          'Viagens gastam metade das rações e você tira 1 ingrediente extra ao caçar.',
        ],
      ),
      per(
        'Percepção',
        ['Ouvido Atento', 'Vantagem para ouvir através de portas e paredes.'],
        ['Vigia', 'Nunca é pego de surpresa dormindo.'],
        ['Olho para Detalhes', 'Ao entrar num lugar, o Mestre avisa se há algo escondido.'],
        ['Visão Longa', 'Enxerga detalhes a grande distância.'],
        [
          'Olho de Falcão',
          'Nunca é pego de surpresa; 1x por cena pergunta "o que aqui é perigoso?" e ouve a verdade.',
        ],
      ),
      tri('Caçador de Feras', [
        ['Conhecer a Presa', 'Vantagem para saber a fraqueza de uma fera.'],
        ['Esfolar', 'Tira couro e partes de feras sem estragar nada.'],
        ['Cozinheiro de Campo', 'Pratos de fera feitos por você duram o dobro.'],
        ['Isca', 'Atrai feras pequenas com comida.'],
        ['Marca da Presa', '+1d4 de dano contra feras.'],
        ['Paladar Treinado', 'Reconhece qualquer ingrediente pelo gosto, inclusive veneno.'],
        [
          'Banquete Lendário',
          '1x por sessão, a refeição que você cozinhar dá um efeito extra a todos que comerem.',
        ],
      ]),
    ],
    keys: [
      [
        'Domador',
        'Ganha um companheiro animal (lobo, falcão ou fera do pântano); se já tem, ele ganha +4 Vida e +1 no ataque. Em troca, se ele cair, você tem desvantagem até o fim da cena.',
      ],
      [
        'Predador Ápice',
        'Dano dobrado contra uma espécie de fera escolhida. Em troca, ao ver essa presa, testa Vontade para não persegui-la.',
      ],
    ],
  },
  {
    nome: 'Ofícios',
    attr: 'Astúcia',
    cor: '#d47426',
    entry: ['Mãos Calejadas', 'Suas ferramentas nunca quebram por uso normal.'],
    trilhas: [
      per(
        'Forja',
        ['Olho para Metal', 'Sabe a qualidade de um metal só de tocar.'],
        ['Têmpera', 'Armas que você forjar causam +1 de dano.'],
        ['Fole Forte', 'Forja na metade do tempo.'],
        [
          'Afiação',
          '1x por descanso, afia a arma de um aliado: +1 de dano até o próximo descanso.',
        ],
        [
          'Martelo Mestre',
          'Consertos não gastam material; 1x por sessão sobe a qualidade de um item que forjar.',
        ],
      ),
      per(
        'Alquimia',
        ['Frascos Extras', 'Carrega 2 poções a mais sem peso.'],
        ['Destilar', 'Transforma 2 reagentes comuns em 1 incomum.'],
        ['Nariz Químico', 'Reconhece poções pelo cheiro.'],
        ['Dose Dupla', 'Poções que você prepara curam +2.'],
        ['Mistura Instável', '1x por descanso, faz uma poção sem gastar reagente.'],
      ),
      per(
        'Medicina',
        ['Bandagens', 'Curativos curam +1 de Vida.'],
        ['Mão Firme', 'Estabiliza aliado À Beira sem teste.'],
        ['Chá Calmante', 'Aliados recuperam +1 Foco no descanso longo.'],
        ['Antídoto', 'Vantagem para curar veneno e doença.'],
        ['Mãos de Curandeiro', 'Toda cura fora de combate que você faz soma +1d6.'],
      ),
    ],
    keys: [
      [
        'Inventor',
        '1x por sessão, monta uma engenhoca improvisada (o Mestre aprova) que funciona uma vez. Em troca, suas ferramentas pesam o dobro.',
      ],
      [
        'Mestre de Guilda',
        'Faz itens Raros usando material Incomum. Em troca, cada item Raro leva um dia inteiro de oficina.',
      ],
    ],
  },
  {
    nome: 'Arcano',
    attr: 'Vontade',
    cor: '#2a96a3',
    entry: ['Sentir Magia', 'Percebe se há magia ativa por perto.'],
    trilhas: [
      per(
        'Arcanismo',
        ['Foco Arcano', '+1 Foco máximo.'],
        ['Contrafeitiço', 'Reação, 2 Foco: anula uma magia do Círculo 1 lançada perto de você.'],
        ['Leitura Rápida', 'Lê pergaminhos mágicos sem teste.'],
        ['Mente Afiada', '+1 Foco máximo.'],
        [
          'Leitor de Runas',
          'Identifica magia ou maldição só tocando; vantagem para resistir a magia.',
        ],
      ),
      per(
        'História',
        ['Línguas Antigas', 'Lê uma língua morta à sua escolha.'],
        ['Já Li Sobre Isso', '1x por cena, pergunta ao Mestre um fato sobre o lugar.'],
        ['Genealogia', 'Reconhece brasões e casas nobres.'],
        ['Mapas Velhos', 'Acha atalhos em terras que já estudou.'],
        [
          'Memória dos Antigos',
          '1x por sessão, afirma um fato sobre lugar, pessoa ou fera e o Mestre torna verdade, se for razoável.',
        ],
      ),
      tri('Runas', [
        ['Runa Simples', 'Grava uma runa de luz que dura uma noite.'],
        ['Tinta de Prata', 'Runas custam metade do material.'],
        ['Runa de Alarme', 'Grava uma runa que avisa quando alguém passa.'],
        ['Traço Firme', '+1 nos testes para gravar runas.'],
        ['Runa de Proteção', '1 Foco: um aliado ganha +1 Defesa por uma cena.'],
        ['Runa Oculta', 'Suas runas só aparecem para quem você quiser.'],
        [
          'Círculo Rúnico',
          '3 Foco: círculo de 3 metros onde criaturas da Peste não entram por uma cena.',
        ],
      ]),
    ],
    keys: [
      [
        'Sangue Arcano',
        'Pode pagar Foco com Vida (2 Vida = 1 Foco). Em troca, poções curam metade em você.',
      ],
      [
        'Arquimago Errante',
        'Aprende 2 magias do Círculo 1, mesmo sem ser Arcanista. Em troca, conjurar de armadura média ou pesada custa +1 Foco.',
      ],
    ],
  },
  {
    nome: 'Voto',
    attr: 'Vontade',
    cor: '#bfa022',
    entry: ['Fé no Voto', 'Vantagem para resistir a medo sobrenatural.'],
    trilhas: [
      tri('Cura', [
        ['Mãos que Aliviam', '1 Foco: cura 1d4 com um toque.'],
        ['Calma', 'Aliados perto de você curam +1 no descanso curto.'],
        ['Bênção Menor', '1 Foco: um aliado ganha +1d4 num teste.'],
        ['Prece Curta', '1x por sessão, recupera 1 Foco rezando.'],
        ['Toque Restaurador', 'Mãos que Aliviam passa a curar 2d4 e tira uma condição.'],
        ['Vela Acesa', 'A luz da sua prece afasta animais comuns.'],
        ['Milagre Menor', '1x por sessão, cura 3d8 num aliado.'],
      ]),
      tri('Contra a Peste', [
        ['Pele Abençoada', 'Vantagem contra doenças.'],
        ['Sal e Ferro', 'Olhando, sabe se alguém foi tocado pela Peste.'],
        ['Coração Firme', '1x por sessão, vantagem para resistir à Peste.'],
        ['Jejum', 'Passa 3 dias sem comer sem penalidade.'],
        ['Voto Inquebrável', 'Se fosse quebrar o Juramento por magia ou controle, rola de novo.'],
        ['Cinzas Benditas', '1x por sessão, limpa uma ferida da Peste com cinzas sagradas.'],
        ['Purificar a Marca', '1x por campanha, reduz 1 ponto de Peste com uma cena de reparação.'],
      ]),
      tri('Luz', [
        ['Chama do Voto', 'Sua arma brilha como tocha quando quiser.'],
        ['Olhar Puro', 'Vantagem para ver através de ilusões.'],
        ['Golpe Sagrado', '1 Foco: +1d6 de dano contra criaturas da Peste.'],
        ['Aura Quente', 'Aliados ao seu lado não sofrem com o frio.'],
        ['Luz Cegante', '1 Foco: inimigos próximos rolam com desvantagem na próxima rodada.'],
        ['Brasa Interior', '+1 Foco máximo.'],
        [
          'Sol de Aldrenor',
          '3 Foco: explosão de luz de 3d8 contra criaturas da Peste numa área grande.',
        ],
      ]),
    ],
    keys: [
      [
        'Mártir',
        'Pode receber no seu lugar o dano de qualquer aliado à vista. Em troca, curas em você valem metade.',
      ],
      [
        'Fanático do Voto',
        '+2 em testes quando age a favor do seu Juramento. Em troca, quebrar o Juramento custa o dobro de Peste.',
      ],
    ],
  },
  {
    nome: 'Voz',
    attr: 'Presença',
    cor: '#b53b74',
    entry: ['Boa Lábia', 'Estranhos nunca começam hostis com você sem motivo.'],
    trilhas: [
      per(
        'Persuasão',
        ['Sorriso Fácil', 'Vantagem para tirar informação em tavernas.'],
        ['Regatear', 'Compra 20% mais barato e vende 20% mais caro.'],
        ['Contatos', 'Em toda cidade conhece alguém útil.'],
        ['Diplomata', 'Pode parar uma briga antes de começar com um teste.'],
        ['Voz do Conselho', '1x por sessão, um NPC neutro aceita um pedido razoável sem rolagem.'],
      ),
      per(
        'Intimidação',
        ['Olhar Frio', 'Vantagem para interrogar.'],
        ['Presença Ameaçadora', 'Capangas rolam com desvantagem para te atacar primeiro.'],
        ['Voz de Trovão', 'Seu grito é ouvido em toda a batalha; aliados +1 no próximo teste.'],
        ['Cicatrizes', 'Suas cicatrizes dão +1 em Intimidação.'],
        [
          'Olhar de Dragão',
          'Capangas fogem quando você vence a intimidação; 1 Foco faz um inimigo perder o turno se falhar.',
        ],
      ),
      per(
        'Música',
        ['Repertório', 'Conhece canções de todas as regiões de Aldrenor.'],
        ['Plateia', 'Tocar numa taverna rende 1d6 de prata e um boato.'],
        ['Ritmo de Marcha', 'Aliados ganham +1 em Atletismo para marchar.'],
        ['Ouvido Absoluto', 'Vantagem para perceber mentiras pelo tom de voz.'],
        [
          'Canção Lembrada',
          '1x por descanso, tocar por alguns minutos devolve 1 Foco a cada aliado.',
        ],
      ),
    ],
    keys: [
      [
        'Lenda Viva',
        '+2 em Persuasão e Intimidação. Em troca, todos te reconhecem e você nunca passa despercebido numa cidade.',
      ],
      [
        'Líder Nato',
        '1x por rodada, uma ordem sua dá a um aliado +2 num teste ou um movimento extra. Em troca, você não ataca nesse turno.',
      ],
    ],
  },
];

export const RING = [
  ['Sorte do Jurado', '1x por sessão, transforma um duplo 1 em falha comum.', 2],
  ['Vontade de Ferro', '+1 Foco máximo.', 2],
  ['Laço de Grupo', 'Sua Ajuda a um aliado vale +1 a mais.', 2],
  ['Brasa Partilhada', 'Pode entregar 1 Inspiração sua para um aliado usar.', 3],
  ['Último Suspiro', 'À Beira, ainda age por um turno antes de cair.', 3],
  ['Memória do Voto', '+1 XP na sessão em que cumprir o Juramento com custo.', 2],
  ['Terceira Chama', 'Passa a guardar até 3 Inspirações em vez de 2.', 5],
];

export const P = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
export const rad = (d) => ((d - 90) * Math.PI) / 180;

export function buildGraph() {
  const N = {};
  const E = [];
  const add = (id, o) => {
    N[id] = Object.assign({ id, adj: new Set() }, o);
  };
  const link = (a, b) => {
    E.push([a, b]);
    N[a].adj.add(b);
    N[b].adj.add(a);
  };

  add('hub', {
    nm: 'Juramento',
    ds: 'O voto que todo Jurado carrega. Ponto de partida de todos.',
    tipo: 'hub',
    custo: 0,
    lv: 1,
    x: 0,
    y: 0,
    cor: '#c9a961',
    reg: 'Centro',
  });

  RING.forEach((r, i) => {
    const a = rad(i * 45 + 22.5);
    const [x, y] = P(150, a);
    add('j' + i, {
      nm: r[0],
      ds: r[1],
      tipo: r[2] >= 5 ? 'key' : 'notable',
      custo: r[2],
      lv: r[2] >= 5 ? 6 : 1,
      x,
      y,
      cor: '#c9a961',
      reg: 'Juramento',
    });
    link('hub', 'j' + i);
  });

  const POS_T = ['notable', 'minor', 'notable', 'minor', 'notable', 'minor', 'notable'];
  const POS_C = [2, 1, 2, 1, 3, 1, 4];
  const POS_L = [1, 1, 1, 3, 3, 5, 5];

  REG.forEach((R, k) => {
    const th = k * 45;
    const eid = 'r' + k + 'e';
    const [ex, ey] = P(255, rad(th));
    add(eid, {
      nm: R.entry[0],
      ds: R.entry[1],
      tipo: 'entry',
      custo: 1,
      lv: 1,
      x: ex,
      y: ey,
      cor: R.cor,
      reg: R.nome,
    });
    link('hub', eid);

    R.trilhas.forEach((T, t) => {
      const ang = th + (t - 1) * 14.5;
      T.nos.forEach((no, p) => {
        const id = 'r' + k + 't' + t + 'p' + p;
        const r = 330 + p * 82;
        const a = rad(ang + (p % 2 ? (t - 1) * 1.2 : 0));
        const [x, y] = P(r, a);
        add(id, {
          nm: no[0],
          ds: no[1],
          tipo: T.pericia && p === 0 ? 'skill' : POS_T[p],
          custo: POS_C[p],
          lv: POS_L[p],
          x,
          y,
          cor: R.cor,
          reg: R.nome,
          trilha: T.nome,
          pericia: T.pericia && (p === 0 || p === 4) ? T.pericia : null,
          isSpec: T.pericia && p === 4,
        });
        link(p === 0 ? eid : 'r' + k + 't' + t + 'p' + (p - 1), id);
      });
    });

    // pontes internas
    link('r' + k + 't0p2', 'r' + k + 't1p2');
    link('r' + k + 't1p5', 'r' + k + 't2p5');

    R.keys.forEach((K, i) => {
      const [x, y] = P(930, rad(th + (i ? 7.5 : -7.5)));
      const id = 'r' + k + 'k' + i;
      add(id, { nm: K[0], ds: K[1], tipo: 'key', custo: 5, lv: 6, x, y, cor: R.cor, reg: R.nome });
      link('r' + k + 't' + i + 'p6', id);
      link('r' + k + 't' + (i + 1) + 'p6', id);
    });
  });

  // pontes entre regiões vizinhas
  REG.forEach((R, k) => {
    const k2 = (k + 1) % 8;
    link('r' + k + 't2p4', 'r' + k2 + 't0p4');
  });

  return { N, E, IDS: Object.keys(N) };
}

export const GRAPH = buildGraph();
