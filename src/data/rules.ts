// Livro de Regras Oficial — Peste do Juramento v1.0
export interface RuleChapter {
  id: string;
  number: number;
  title: string;
  subtitle?: string;
  content: string;
}

export interface Rulebook {
  title: string;
  subtitle: string;
  version: string;
  epigraph: string;
  chapters: RuleChapter[];
}

export const rulebook: Rulebook = {
  title: 'Peste do Juramento',
  subtitle: 'Um jogo de RPG de mesa sobre palavras que custam caro',
  version: '1.0',
  epigraph: 'Toda palavra jurada é uma dívida com o próprio corpo.',
  chapters: [
    {
      id: 'mundo',
      number: 1,
      title: '1. O Mundo',
      subtitle: 'O peso da palavra e os Jurados',
      content: `Peste do Juramento se passa em um reino medieval sem nome fixo — cada mesa pode batizá-lo como quiser — onde a magia não vem de mana, runas ou pactos com deuses distantes. Ela nasce da palavra empenhada. Quando alguém jura algo com peso suficiente — um voto de vingança, de lealdade, de silêncio, de amor — o corpo e a alma daquela pessoa mudam para sustentar a promessa. Cavaleiros, monges, ferreiros e camponeses comuns podem se tornar figuras quase sobrenaturais se o juramento que fizerem for grande o bastante para a vida pequena que levavam.

Mas toda promessa tem um preço. Quebrar a palavra jurada não é apenas uma falha moral — é uma ferida física. A pele racha, escurece, ganha veios estranhos. Isso é chamado, no reino, de Peste do Juramento: uma doença que não se pega por contágio, mas por covardia, traição ou desespero.

### O Tom do Jogo
Este é um jogo sobre pessoas comuns carregando promessas grandes demais para suas vidas. Não existem heróis nascidos para salvar o mundo — existem pessoas que juraram algo impossível e agora tentam não apodrecer por dentro enquanto tentam cumprir. O tom ideal de mesa é dramático, pessoal e um pouco trágico, com espaço para humor sombrio.

### Os Jurados
Os personagens jogáveis são chamados coletivamente de Jurados: pessoas comuns que fizeram um voto grande demais e agora vivem correndo contra o próprio corpo para cumpri-lo antes que a Peste os consuma ou os transforme em algo que já não reconhecem.`,
    },
    {
      id: 'como-jogar',
      number: 2,
      title: '2. Como Jogar',
      subtitle: 'Estrutura da mesa e dados 2d6',
      content: `Peste do Juramento é jogado por um grupo de 3 a 6 pessoas: uma delas assume o papel de Mestre (também chamado de Confessor da Mesa) e conduz o mundo, interpreta NPCs e apresenta desafios; as demais criam e interpretam os Jurados.

### O que você precisa
- Este livro de regras (ou um resumo dele).
- Uma ficha de personagem por jogador (modelo no Apêndice).
- Dois dados de seis lados (2d6) por pessoa — o sistema inteiro roda sobre 2d6.
- Lápis, borracha e vontade de fazer promessas que vão doer.

### Estrutura de uma sessão
Uma sessão típica começa com o Mestre recapitulando o estado do mundo e da Peste de cada personagem, segue com cenas de exploração, diálogo e conflito, e termina em um momento de escolha — geralmente ligado direta ou indiretamente ao Juramento de alguém na mesa.`,
    },
    {
      id: 'racas',
      number: 3,
      title: '3. Raças',
      subtitle: 'Como o corpo reage à palavra jurada',
      content: `A raça de um personagem define como o corpo dele reage ao Juramento e à Peste — não define poderes de combate. Escolha uma raça na criação de personagem.

### Humanos
Vivem pouco, e por isso um juramento costuma ser o ato mais importante de suas vidas curtas. A Peste avança rápido e de forma visível neles: pele rachando, veias escurecendo, olhos perdendo a cor.
- **Traço racial — Ambição Curta**: Uma vez por sessão, um Humano pode gastar 1 ponto de Peste (avançar a barra em 1) para agir com sucesso automático em um teste ligado diretamente ao próprio Juramento.

### Anões da Rocha
Não falam o juramento — entalham-no na própria pele, a ferro em brasa, quase sempre com ajuda de um parente. É um texto ritual, ilegível para quem não é do clã. Quebrar o voto não apodrece a carne do Anão, mas racha o Fragmento de Pedra que cada um carrega, ligado à montanha natal.
- **Traço racial — Sangue de Pedra**: Anões não sofrem a penalidade de Corrupção (estágio 2 da Peste) em testes de Corpo. Em vez disso, ao atingir Transformação, o Anão perde toda ajuda e recurso do próprio clã pelo resto da campanha.

### Feéricos da Névoa
Vivem séculos e por isso juram raramente — e quando juram, é para sempre, sem meio-termo algum. Não existe 'juramento pequeno' feérico. A Peste neles não apodrece a carne: apodrece a memória que os outros têm deles.
- **Traço racial — Promessa Eterna**: Um Feérico só pode ter um único Juramento durante toda a vida do personagem — ele nunca pode ser trocado, mesmo entre campanhas. Em compensação, o Feérico começa o jogo com 2 pontos a menos na barra de Peste (começa em -2) e ganha vantagem em testes de Presença ligados a manipulação e sedução.

### Filhos do Pântano
Povo semi-anfíbio, malvisto pelas outras culturas do reino. Juram sempre em grupo, nunca sozinhos: todo voto de um Filho do Pântano é automaticamente compartilhado com quem estava presente no ritual.
- **Traço racial — Voto Partilhado**: Quando um Filho do Pântano define seu Juramento, ele escolhe outro personagem da mesa para dividir o peso — os dois avançam a Peste juntos quando qualquer um quebra o voto, mas também dividem os pontos de vantagem quando um age a favor dele.

### Errantes
Nômades sem terra fixa, de origem nunca totalmente explicada — nem por eles mesmos. Não têm ritual fixo de juramento: cada Errante inventa o próprio jeito de jurar.
- **Traço racial — Voto Sem Nome**: Na criação, o jogador de um Errante escolhe uma manifestação própria e incomum de Peste em vez das manifestações padrão de sua raça — o Errante é a peça coringa da mesa.`,
    },
    {
      id: 'juramento',
      number: 4,
      title: '4. O Juramento',
      subtitle: 'O centro do personagem e seus tipos',
      content: `O Juramento é o centro de cada personagem. Ele substitui completamente o conceito de 'classe'. O que um Jurado é definido não é sua profissão — é a promessa que fez.

### Escrevendo seu Juramento
Na criação de personagem, escolha um Tipo de Juramento e escreva a frase exata do voto, em primeira pessoa, como se fosse dita em voz alta. Exemplos: *"Nunca vou recuar de uma luta"*, *"Vou proteger meu irmão mesmo que ele não mereça"*, *"Nunca mais vou mentir, nem para me salvar"*.

### Tipos de Juramento Oficiais
- **Vingança**: Nunca perdoar / nunca desistir de uma retribuição. *Poder*: Vantagem em ataques contra o alvo do voto.
- **Lealdade**: Nunca abandonar uma pessoa ou causa. *Poder*: Pode absorver 1x por cena o dano sofrido por quem protege.
- **Silêncio**: Nunca revelar algo específico. *Poder*: Vantagem em testes para resistir a interrogatório, tortura ou manipulação.
- **Amor**: Nunca deixar de agir em nome de alguém amado. *Poder*: Vantagem em testes feitos na presença dessa pessoa.
- **Verdade**: Nunca mentir, mesmo por omissão relevante. *Poder*: Pode gastar 1 ação para saber com certeza se alguém acabou de mentir.
- **Proteção**: Nunca deixar uma pessoa específica sofrer dano evitável. *Poder*: Pode se colocar entre o perigo e o protegido.
- **Memória**: Nunca esquecer um crime, nome ou promessa alheia. *Poder*: Pode lembrar informações esquecidas do mundo.
- **Sacrifício**: Abriu mão de algo concreto para sempre. *Poder*: Aumenta conforme a grandeza do sacrifício.
- **Isolamento**: Nunca pertencer de verdade a um grupo ou lugar. *Poder*: Pode atravessar fronteiras sociais ou físicas sem ser notado.`,
    },
    {
      id: 'atributos',
      number: 5,
      title: '5. Atributos e Ficha',
      subtitle: 'Corpo, Vontade, Astúcia e Presença',
      content: `Cada personagem tem quatro atributos, com valores entre -1 e +3. Eles são usados em todo teste do jogo:
- **Corpo**: Força física, resistência, combate direto, trabalho braçal.
- **Vontade**: Força de propósito, resistência mental, fé no próprio Juramento.
- **Astúcia**: Esperteza, manha, percepção de detalhes, conhecimento prático.
- **Presença**: Carisma, intimidação, leitura social, capacidade de convencer ou enganar.

### Distribuição Inicial
Distribua os valores **+2, +1, +1, -1** entre os quatro atributos, na ordem que preferir. Nenhum outro valor inicial é permitido sem acordo do Mestre.

### Elementos da Ficha de Jurado:
- Nome, raça, aparência e uma linha de história pessoal.
- Os quatro atributos (Corpo, Vontade, Astúcia, Presença).
- O Juramento, escrito por completo, em primeira pessoa.
- A Barra de Peste (0 a 10 caixas).
- Vida (6 + Corpo) e equipamento inicial.`,
    },
    {
      id: 'resolucao',
      number: 6,
      title: '6. Resolução de Ações',
      subtitle: 'Tabela 2d6, Invocar e Quebrar Voto',
      content: `Sempre que um Jurado tenta algo com risco real de falha, o jogador rola **2d6** e soma o atributo mais adequado à ação.

### Tabela de Resolução
- **10 ou mais (Sucesso Total)**: A ação funciona como o jogador descreveu, sem complicação.
- **7 a 9 (Sucesso Parcial)**: A ação funciona, mas com um custo, atraso ou complicação definida pelo Mestre.
- **6 ou menos (Falha)**: A ação não funciona, e o Mestre introduz uma complicação real na cena.

### Invocar o Juramento (Vantagem)
Antes de rolar, o jogador pode declarar que está agindo **A FAVOR** do próprio Juramento. Se a ação for coerente com o voto, o jogador rola **3d6 e usa os dois melhores resultados** (+ atributo).

### Quebrar o Voto / Ceder à Tentação
Depois de uma falha (6 ou menos), o jogador pode transformar a falha em **sucesso automático AGINDO CONTRA** o próprio Juramento. Isso funciona sempre, mas avança **1 ponto na Barra de Peste** e o corpo ou alma reage. O Confessor nunca força — é sempre uma tentação voluntária.

### Ajuda
Um segundo Jurado pode ajudar: concede **+1 na rolagem** de quem age, mas o ajudante se expõe ao mesmo risco de complicação.`,
    },
    {
      id: 'peste',
      number: 7,
      title: '7. A Peste do Juramento',
      subtitle: 'Os três estágios e a ironia trágica',
      content: `A Barra de Peste tem 10 caixas, divididas em três estágios. Ela só avança quando o personagem age contra o próprio Juramento.

### Estágios da Peste
- **0–3 | Mancha**: Sinais cosméticos e narrativos apenas (pele descolorida, veias escuras, sombra estranha, cheiro de mofo). Sem penalidade mecânica.
- **4–7 | Corrupção**: O personagem sofre **desvantagem** (rola 2d6 e usa o pior) em qualquer teste cuja ação contrarie diretamente o espírito do próprio Juramento.
- **8–10 | Transformação**: O personagem começa a se transformar fisicamente em algo ligado ao tipo de voto quebrado de forma irônica.

### A Regra de Ouro da Ironia
*A Peste sempre tira do personagem exatamente aquilo que ele jurou proteger, guardar ou exercer.*

### Redução da Peste
A Peste não cura com descanso ou magia. Ela só reduz quando o personagem cumpre publicamente um **ato de reparação** diretamente ligado à quebra que a causou.

### Quando a Barra Enche (10/10)
O personagem passa a ser interpretado em parte pelo Mestre: a criatura amaldiçoada ainda entende sua história, mas já não controla suas escolhas.`,
    },
    {
      id: 'combate',
      number: 8,
      title: '8. Combate e Morte',
      subtitle: 'Vida, dano e estado À Beira',
      content: `O combate em Peste do Juramento é rápido e narrativo.

- **Vida Inicial = 6 + Corpo**.
- Dano é descrito pela cena e reduz a Vida diretamente.
- A Vida chegando a 0 significa que o personagem está **À Beira**, e a próxima cena decide seu destino (captura, fuga, resgate ou morte).
- **Sequência**: O Mestre descreve a ameaça, os Jurados reagem rolando 2d6 + Atributo (Corpo, Astúcia para táticas ou Presença para intimidação). Em sucesso parcial (7–9), o Mestre aplica custo, contra-ataque ou perda de posição.`,
    },
    {
      id: 'mestre',
      number: 9,
      title: '9. O Papel do Mestre (Confessor)',
      subtitle: 'Princípios e tentações',
      content: `O Mestre é o **Confessor da Mesa** — quem ouve os votos e decide o preço de cada um.

### Princípios do Confessor
1. Nunca force a quebra de um Juramento — apenas ofereça a tentação com clareza sobre o custo.
2. Trate a Peste como espelho irônico do voto, nunca como punição aleatória.
3. Construa cenas em torno dos Juramentos da mesa.
4. Deixe NPCs reagirem a personagens com Peste visível (medo, repulsa, fascínio).
5. Prepare ao menos uma cena por sessão que teste o Juramento de alguém na mesa.`,
    },
    {
      id: 'apendices',
      number: 10,
      title: '10. Resumo Rápido e Apêndices',
      subtitle: 'Guia de consulta rápida na mesa',
      content: `### Resumo Rápido de Regras
- **Rolagem Padrão**: 2d6 + Atributo (≥10 Sucesso Total, 7–9 Sucesso Parcial, ≤6 Falha).
- **Invocar Juramento**: 3d6 (manter 2 melhores) + Atributo.
- **Quebrar o Voto**: Converte falha em Sucesso Total e adiciona +1 na Peste.
- **Ajuda**: +1 na rolagem.
- **Barra de Peste**: 0–3 Mancha | 4–7 Corrupção (Desvantagem) | 8–10 Transformação (Metamorfose grotesca) | 10 Consumido.
- **Vida**: 6 + Corpo. 0 de Vida = À Beira.`,
    },
  ],
};
