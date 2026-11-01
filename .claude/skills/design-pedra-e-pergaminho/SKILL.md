---
name: design-pedra-e-pergaminho
description: Aplica e mantém o design "Pedra e Pergaminho" (dark fantasy moderno, com animações) em todas as telas do app Peste do Juramento. Use sempre que criar ou alterar qualquer tela, componente, modal, lista ou animação do Jogador, do Mestre ou da TV.
---

# Design "Pedra e Pergaminho": moderno e animado

Você é o diretor de arte e o engenheiro de interface deste app de RPG. Seu trabalho é deixar **o sistema inteiro** com a mesma cara: um grimório sombrio de pedra, pergaminho e ouro velho, com interface **moderna**, **rápida** e **viva**, onde cada animação tem motivo.

A referência visual é o arquivo `referencia_painel.html` (5 telas do Jogador). Copie dele o estilo, as cores, as texturas e as medidas. **Nunca** copie os dados de exemplo: use os campos reais do sistema (Vida, **Foco**, **2d6 + mod contra o Peso**, os atributos reais, a Peste e o Juramento).

---

## 1. Quando usar esta skill

Use em toda tarefa que mexa no que o usuário vê:
- telas;
- componentes;
- modais;
- listas;
- estados de carregamento e erro;
- avisos;
- animações.

Se uma tarefa de lógica criar um elemento visual novo, ele também segue esta skill.

## 2. Os 3 materiais (a regra mais importante)

| Material | Onde | Nunca |
|---|---|---|
| **Pedra** (`StonePanel`) | moldura: barras, abas, botões, menus, fundo, painéis do Mestre | texto longo em cima |
| **Pergaminho** (`Parchment`, borda rasgada) | onde se **lê**: ficha, descrição de item, feitiço, diário, missiva, log de combate, detalhe no Mestre | botões principais em cima |
| **Ouro velho** | o que está **ativo** ou **importante**: aba aberta, item selecionado, turno atual, botão principal | decoração solta, mais de 1 botão de ouro maciço por tela |

Os orbes de **Vida** (vermelho) e **Foco** (azul) ficam fixos no HUD do Jogador, em todas as abas.

## 3. Tokens (fonte única: `src/shared/styles/tokens.css`)

Use **só** tokens. Nenhuma cor, tamanho, sombra ou duração solta no código.

### 3.1 Cores

| Token | Valor |
|---|---|
| `--abyss` | `#070605` |
| `--stone` | `#151311` |
| `--stone-2` | `#1E1B18` |
| `--iron` | `#3A342D` |
| `--gold` | `#C9A45C` |
| `--gold-hi` | `#ECD395` |
| `--gold-lo` | `#6E5528` |
| `--parch` | `#D6C9AA` |
| `--parch-2` | `#BFAE88` |
| `--ink` | `#2A1F15` |
| `--ink-soft` | `#5A4632` |
| `--blood` | `#A3291F` |
| `--mana` | `#2C5FB8` |
| `--mist` | `#7FA6CF` |
| `--violet` | `#9C7BD1` |
| `--moss` | `#7FA36B` |
| `--ember` | `#E08A3C` |
| `--plague` | `#8A8F96` |
| `--text` | `#E7DCC6` |
| `--muted` | `#958A78` |

**Raridade** (borda e brilho interno):
- comum: `#3D3833`;
- incomum: `--moss`;
- raro: `#2F5D8F`;
- épico: `#5D4589`;
- lendário: `--gold`, com brilho.

### 3.2 Texturas
- `--noise` (grão) e `--mottle` (manchas da pedra) são SVG `feTurbulence` em data-URI, definidos **uma vez** no `:root`. Copie da referência.
- Proibido usar imagem PNG ou JPG como textura.

### 3.3 Tipografia
- **Cinzel** 500/700/900 (via `@fontsource`): títulos, nomes, números, rótulos curtos em CAIXA ALTA com `letter-spacing` de `.1em` a `.2em`.
- **EB Garamond** 400/600 e itálico: todo o resto. O itálico é para textos de sabor.
- Números em coluna sempre com `tabular-nums`.

### 3.4 Movimento (`src/shared/styles/motion.ts` + variáveis CSS)

| Token | Valor | Uso |
|---|---|---|
| `--t-instant` | 90 ms | toque, pressão |
| `--t-fast` | 160 ms | hover, troca de estado |
| `--t-base` | 240 ms | trocar aba, abrir lista |
| `--t-slow` | 420 ms | modal, pergaminho desenrolando |
| `--t-epic` | 900 ms | subir de nível, crítico, missão concluída |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` | entradas |
| `--ease-in` | `cubic-bezier(.55,0,1,.45)` | saídas |
| `--ease-heavy` | `cubic-bezier(.3,1.4,.5,1)` | carimbo, peça pesada caindo (com leve volta) |
| `spring.soft` | `{stiffness: 260, damping: 26}` | orbes, barras |
| `spring.snap` | `{stiffness: 520, damping: 32}` | arrastar e soltar item |

## 4. Princípios de animação

1. **Peso e material.** Pedra é pesada: move pouco, assenta com firmeza e nunca quica. Pergaminho é leve: desenrola, ondula e desliza. Ouro brilha e reflete. Líquido dos orbes balança.
2. **Toda animação responde a algo:** um toque, um dado novo do banco ou um evento do jogo. Nada se mexe à toa, exceto **um** elemento ambiente por tela (brasas, vela ou névoa).
3. **Rápido no comum, épico no raro.** Interação comum tem até 240 ms. Só os momentos de jogo (crítico, nível, morte, missão) passam de 400 ms.
4. **60 fps sempre:**
   - anime **só** `transform`, `opacity` e `clip-path` (e `filter` em 1 elemento por vez);
   - nunca anime `width`, `height`, `top`, `left`, `box-shadow` em lista ou `background-position` de textura grande.
5. **Acessível:** com `prefers-reduced-motion`, troque movimentos por um fade de 120 ms e desligue partículas e balanço. Toda informação animada também existe em texto.
6. **Saída mais rápida que a entrada,** cerca de 70% do tempo.

## 5. Catálogo de animações (implemente todas e mostre em `/design`)

### Navegação
- **Trocar aba do Jogador:** o conteúdo sai com fade e desce 6 px (`--t-fast`); o novo entra com fade e sobe 8 px (`--t-base`, `--ease-out`). O losango dourado do menu **desliza** até a aba nova (`layoutId`), e o ícone ativo acende com brilho dourado.
- **Abas internas (`TabBar`):** o losango e o brilho da placa ativa deslizam entre as abas com `layoutId`.
- **Menu "Mais":** o `Sheet` de pedra sobe de baixo (`--t-slow`). Os ícones entram em cascata (20 ms cada, no máximo 10).

### Pergaminho
- **Desenrolar:** em modal, tooltip de item, carta e detalhe, o pergaminho abre de cima para baixo com `clip-path: inset(0 0 100% 0)` → `inset(0)` (`--t-slow`) e o texto entra em fade 80 ms depois. Ao fechar, enrola de volta mais rápido.
- **Carregando:** esqueleto de pergaminho com um brilho claro que passa devagar (1,6 s, `transform` em uma faixa por cima). Nunca use spinner genérico.

### Pedra e botões
- **Pressionar:** a placa desce 1 px, a sombra interna aumenta e o brilho aparece (`--t-instant`).
- **Hover (PC):** uma luz dourada fina percorre a borda superior (faixa com `transform`, 600 ms, uma vez).
- **Botão de ouro:** reflexo diagonal passa a cada 6 s, só quando a tela está parada.

### Orbes e números
- **Vida ou Foco mudando:** o líquido sobe ou desce com `spring.soft`, a superfície balança 2 a 3 vezes e acalma.
  - **Dano:** a borda da tela pulsa em vermelho (vinheta, 300 ms), um número `-5` sobe e some, e o orbe treme 2 px.
  - **Cura:** bolhas verdes sobem dentro do orbe e aparece `+4` em verde.
  - **Foco gasto:** o azul escurece por um instante.
- **Números (vida, moedas, XP):** contam do valor antigo ao novo (300 ms) com `tabular-nums`, sem pular o layout.
- **Barra de XP:** enche com `spring.soft`. Ao encher, o ouro brilha e a tela de nível abre.

### Itens e Mochila
- **Item novo:** a célula pulsa na cor da raridade 2 vezes. O lendário tem um reflexo dourado passando e 6 faíscas.
- **Arrastar:** o item levanta (escala 1,06 e sombra) e as células válidas acendem em dourado fraco. Ao soltar, encaixa com `spring.snap` e um "toc" opcional. Em lugar inválido, volta tremendo de leve.
- **Equipar:** o item voa da grade até o slot do corpo (`layoutId`) e o slot brilha uma vez.
- **Moedas:** ao ganhar, 3 moedas pequenas saltam até o contador.

### Grimório e Oficina
- **Lançar feitiço:** a placa brilha na cor do elemento (fogo `--ember`, névoa `--mist`, cura `--moss`) e o custo voa até o orbe de Foco.
- **Árvore do Juramento:** ao liberar um nó, um traço dourado é desenhado no caminho (`stroke-dashoffset`) e o nó acende.
- **Criar item na Oficina:** brasas sobem na forja ou na alquimia e o item resultante aparece girando de leve.

### Diário e Missivas
- **Objetivo concluído:** o risco atravessa o texto (linha desenhada da esquerda para a direita, 300 ms) e o losango fica preenchido.
- **Missão concluída:** o selo de cera **carimba** (escala 1,4 → 1 com `--ease-heavy`, mais uma sombra que se espalha) e a missão vai para "Concluídas".
- **Nova missiva:** a carta desliza, o selo pulsa e o lacre se rompe ao abrir.

### Combate e dados
- **Seu turno:** a faixa "Seu turno" desce como um estandarte, o retrato atual cresce com aro dourado e o resto da fila escurece 15%.
- **Rolagem 2d6:**
  - os dados giram 400 ms e o total aparece com escala 0,6 → 1,08 → 1;
  - o selo do resultado vem por último: Desastre `--blood`, Sucesso `--moss`, Brilhante `--gold`, Crítico `--ember`;
  - no crítico, a tela treme 3 px e soltam brasas;
  - no desastre, uma rachadura cinza da Peste passa pela borda.
- **Log de combate:** cada linha nova entra pela esquerda num pergaminho. O dano fica em vermelho e pulsa uma vez.

### Momentos épicos (`--t-epic`, no máximo 1 por vez, com fila)
- **Subir de nível:** a tela escurece, raios dourados giram atrás e "NÍVEL 6" aparece em Cinzel, de letras espaçadas para normais. Toque para fechar.
- **Peste avançando:** veias cinzas se espalham pelas bordas e o marcador da Peste avança com tremor.
- **Herói caído:** o orbe de Vida esvazia, a tela fica sem cor (filtro `grayscale` em 1 elemento) e a frase em itálico aparece devagar.

### Ambiente (1 por tela, leve)
- Na **entrada e escolha de papel**, brasas sobem num `<canvas>`:
  - no máximo 40 partículas;
  - pausa quando a aba está escondida;
  - limite de 30 fps.
- Opcional na **TV**: névoa lenta no rodapé.
- **Mestre:** sem ambiente (é tela de trabalho).

### Avisos (Toast)
Uma placa de pedra desce do topo com um filete colorido à esquerda e uma faísca na cor do tipo. Some sozinha em 3 s, e a barra de tempo é um traço dourado que encurta.

## 6. Componentes (em `src/shared/ui`, todos em `/design` com as animações)

`StonePanel` (variantes `active` e `recess`), `Parchment` (`useTornEdge`), `TabBar`, `StatusBar`, `Orb`, `Belt`, `BottomNav`, `MoreSheet`, `ItemCell`, `InventoryGrid`, `EquipDoll`, `ItemTooltip`, `StatSlab`, `AttrSlab`, `ConditionPill`, `WaxSeal`, `DiceResult`, `InitiativeStrip`, `GoldButton`, `StoneButton`, `Divider`, `Modal`, `Sheet`, `Toast`, `Skeleton`, `FloatingNumber`, `CountUp`, `EmberField`, `EpicMoment`.

Cada componente:
- tem props tipadas;
- tem estado de carregamento e de vazio;
- tem foco visível de teclado (contorno `--gold-hi`);
- tem as animações da seção 5 embutidas, para que quem usa não precise animar nada.

## 7. Layouts

- **Jogador (celular primeiro):**
  - `StatusBar` (52 px), conteúdo rolando, e HUD fixo (150 px) com os orbes, o `Belt` e o `BottomNav` (Ficha, Mochila, Grimório, Diário, Mais);
  - no PC, uma coluna central de no máximo 480 px, com pedra dos lados.
- **Mestre:**
  - menu lateral de pedra recolhível;
  - painéis `StonePanel`, listas em `recess` e detalhes em `Parchment`;
  - sem orbes: a vida dos heróis aparece em barras finas vermelhas e azuis com `spring.soft`.
- **TV:** pedra com títulos grandes em Cinzel dourado, `DiceResult` gigante e transições lentas e legíveis de longe.

## 8. Desempenho (obrigatório)

- **Biblioteca de animação:**
  - use `motion` com `LazyMotion` + `domAnimation` (pacote leve);
  - o efeito simples (hover, pressão, pulso) é **CSS puro**;
  - partículas ficam em `<canvas>` próprio, nunca em dezenas de `<div>`.
- **Listas grandes:**
  - listas com mais de 50 itens são virtualizadas;
  - a cascata de entrada é só nos primeiros 10;
  - pergaminho em lista longa usa borda reta (sem `clip-path`).
- **`will-change`:** só durante a animação; remova ao terminar.
- **Orçamento:**
  - durante qualquer animação, nenhuma tarefa longa acima de 50 ms (aba Performance do Chrome, CPU 4x);
  - a primeira tela continua dentro do orçamento de JS do prompt 00.
- **Celular fraco:** se o fps cair abaixo de 45 por 2 s, desligue o ambiente e as partículas (flag `lowFx`).

## 9. Processo para aplicar no sistema inteiro

1. **Auditoria:** liste todas as rotas e telas (Jogador, Mestre e TV) numa tabela no `DESIGN.md`, com a coluna "status do design".
2. **Base:** tokens de cor, textura, fonte e **movimento**, mais `motion.ts`, `LazyMotion` no `App` e `useReducedMotion`.
3. **Componentes:** crie ou atualize todos os da seção 6, com as animações, e monte `/design` mostrando cada um parado **e** animando (com botões "simular dano", "simular cura", "subir nível", "concluir missão", "crítico" e "novo item lendário").
4. **Telas:** aplique tela por tela usando só componentes. Não mude regra de negócio, dados ou funções. Marque cada tela na tabela da auditoria.
5. **Eventos do jogo → animação:** ligue o realtime às animações. Quando o Mestre tira vida, o orbe do jogador anima. Quando uma missão termina, o selo carimba. Quando o herói sobe de nível, abre o momento épico.
6. **Revisão final:** passe por todas as telas no celular (390×844) e no PC (1440×900) e corrija o que fugir desta skill.

## 10. Provas (sempre, ao terminar cada lote)

- `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build`, com a saída colada.
- Prints de cada tela no celular e no PC, lado a lado com a `referencia_painel.html`.
- Um **GIF ou vídeo curto** de `/design` com todas as animações e um de cada momento épico.
- Gravação da aba Performance (CPU 4x) trocando abas e simulando dano: fps e tarefas longas.
- Commit: `style: design pedra e pergaminho animado (<lote>)`.

## 11. Proibido

- Cor, sombra ou duração fora dos tokens.
- Emoji como ícone.
- Spinner genérico.
- Mais de 1 botão de ouro maciço por tela.
- Mais de 1 animação ambiente por tela.
- Animação sem motivo ou que bloqueie o toque (exceto os momentos épicos, que fecham com um toque).
- Texto longo em cima de pedra.
- Inter, Newsreader, tema claro, cantos muito arredondados (máximo de 2 px nas placas; só pílulas e orbes são redondos).
- Mudar função, regra ou dado ao mexer no visual.

## 12. Checklist da tela (copie no relatório de cada tela)

- [ ] Materiais certos (pedra = moldura, pergaminho = leitura, ouro = ativo)
- [ ] Só tokens e componentes de `shared/ui`
- [ ] Entrada e saída da tela animadas (`--t-base`)
- [ ] Toda mudança de número animada (`CountUp` ou orbe)
- [ ] Eventos do jogo desta tela com sua animação da seção 5
- [ ] `prefers-reduced-motion` testado
- [ ] 60 fps com CPU 4x e sem tarefa acima de 50 ms
- [ ] Prints celular e PC + GIF das animações
