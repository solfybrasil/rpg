# DESIGN SYSTEM: PEDRA E PERGAMINHO (OFICIAL)

> [!IMPORTANT]
> **REGRA GERAL PARA TODOS OS PROMPTS (01C a 22):**
> Quando qualquer prompt ou especificação citar Inter, Newsreader, "modo Pergaminho claro", "card" ou raios arredondados grandes, siga rigorosamente este Design System "Pedra e Pergaminho":
> - **Fontes:** EB Garamond em vez de Inter e Newsreader; Cinzel em títulos e números.
> - **Tema:** Um tema único, escuro e atmosférico. Sem modo claro e sem toggle de tema.
> - **Contêineres:** `StonePanel` (.slab / .recess) para pedra negra ou `Parchment` (.parch com borda rasgada) para áreas de leitura. Nunca "card" genérico arredondado com cantos redondos de 16px/24px.
> - **Cantos:** Cantos retos ou bisotados/subtis de no máximo 2 px (exceto orbes, selos de cera e badges circulares).

---

## 1. Conceito

Inspirado em inventários de ARPG sombrio clássico (estilo Diablo / Grim Dawn / Elden Ring medieval):
- **Pedra negra (`--stone`, `--stone-2`):** A moldura estrutural — barras, abas, botões, placas e fundos de slots. Nunca leva texto longo.
- **Pergaminho (`--parch`):** Superfície de papel com manchas, grão, sombra interna e borda rasgada procedural (`useTornEdge`), onde se lê: ficha do herói, descrições de itens, feitiços do grimório, diário e registros.
- **Ouro velho (`--gold`, `--gold-hi`, `--gold-lo`):** Acentos, destaques ativos, números primários e filetes ornamentais com losangos de 45 graus. No máximo 1 botão de ouro maciço por tela.
- **Orbes de vidro (`--blood`, `--mana`):** Esferas físicas de vidro na base da tela para Vida (vermelho carmim) e Foco (azul safira) com líquido volumétrico animado via `spring.soft`.
- **Cinto de Poções (`--belt`):** Faixa de pedra entre os orbes com até 4 consumíveis rápidos.

---

## 2. Paleta de Tokens (Exatos em `tokens.css` e `@theme`)

| Token | Hex | Aplicação Canônica |
|---|---|---|
| `--abyss` | `#070605` | Fundo profundo atrás de tudo |
| `--stone` | `#151311` | Fundo principal de pedra das telas |
| `--stone-2` | `#1E1B18` | Pedra elevada/placas, barras e cabeçalhos |
| `--iron` | `#3A342D` | Bordas e molduras de ferro |
| `--gold` | `#C9A45C` | Ouro velho para acentos, ícones ativos e losangos |
| `--gold-hi` | `#ECD395` | Destaque dourado luminoso, títulos e números ativos |
| `--gold-lo` | `#6E5528` | Filetes sutis e bordas douradas gravadas |
| `--parch` | `#D6C9AA` | Fundo do pergaminho |
| `--parch-2` | `#BFAE88` | Manchas do pergaminho envelhecido |
| `--ink` | `#2A1F15` | Texto escuro sobre pergaminho |
| `--ink-soft` | `#5A4632` | Texto secundário / itálico sobre pergaminho |
| `--blood` | `#A3291F` | Vida, dano, selos de cera e desastre |
| `--mana` | `#2C5FB8` | Foco (orbe azul de mana) |
| `--mist` | `#7FA6CF` | Raridade rara, magia e névoa |
| `--violet` | `#9C7BD1` | Raridade épica e arcanismo |
| `--moss` | `#7FA36B` | Cura, veneno, sucesso em rolagens |
| `--ember` | `#E08A3C` | Fogo, brasas e acertos críticos |
| `--plague` | `#8A8F96` | Peste e cinzas |
| `--text` | `#E7DCC6` | Texto legível claro sobre pedra |
| `--muted` | `#958A78` | Rótulos e texto secundário sobre pedra |

### Tokens de Movimento (`src/shared/styles/motion.ts` e CSS)
- `--t-instant`: `90ms` (toque, pressão)
- `--t-fast`: `160ms` (hover, troca de estado)
- `--t-base`: `240ms` (trocar aba, abrir lista)
- `--t-slow`: `420ms` (modal, pergaminho desenrolando)
- `--t-epic`: `900ms` (subir de nível, crítico, missão concluída)
- `--ease-out`: `cubic-bezier(.22, 1, .36, 1)`
- `--ease-in`: `cubic-bezier(.55, 0, 1, .45)`
- `--ease-heavy`: `cubic-bezier(.3, 1.4, .5, 1)`
- `spring.soft`: `{ stiffness: 260, damping: 26 }` (orbes, barras)
- `spring.snap`: `{ stiffness: 520, damping: 32 }` (arrastar e soltar item)

---

## 3. Auditoria de Rotas e Status do Design (Seção 9)

| Rota | Tela | Papel | Lote | Status do Design |
|---|---|---|---|---|
| `/design` | Vitrine de Componentes & Animações | Dev / Showcase | Lote 1 | Em Execução (Lote 1) |
| `/` | Entrada / Santuário / Escolha de Herói | Geral | Lote 1 / 2 | Pedra e Pergaminho Base |
| `/jogador/ficha` | Ficha do Jurado (Atributos, Bio, Peste, Dom) | Jogador | Lote 2 | Aguardando Lote 2 |
| `/jogador/mochila` | Mochila & Inventário (Grade 8 colunas, Boneco) | Jogador | Lote 2 | Aguardando Lote 2 |
| `/jogador/grimorio` | Grimório (Feitiços, Círculos, Sigilos) | Jogador | Lote 2 | Aguardando Lote 2 |
| `/jogador/diario` | Diário de Quests & Anotações | Jogador | Lote 2 | Aguardando Lote 2 |
| `/jogador/combate` | Combate por Turnos (Iniciativa, Ações, Fila) | Jogador | Lote 2 | Aguardando Lote 2 |
| `/jogador/oficina` | Oficina & Bancada de Alquimia/Forja | Jogador (Mais) | Lote 2 | Aguardando Lote 2 |
| `/jogador/receitas` | Catálogo de Receitas Conhecidas | Jogador (Mais) | Lote 2 | Aguardando Lote 2 |
| `/jogador/loja` | Mercador / Empório de Artigos | Jogador (Mais) | Lote 2 | Aguardando Lote 2 |
| `/jogador/mapa` | Mapa do Mundo & Regiões | Jogador (Mais) | Lote 2 | Aguardando Lote 2 |
| `/jogador/arvore` | Árvore de Juramento & Bênçãos | Jogador (Mais) | Lote 2 | Aguardando Lote 2 |
| `/jogador/missivas` | Missivas e Cartas Seladas | Jogador (Mais) | Lote 2 | Aguardando Lote 2 |
| `/jogador/dados` | Rolador de Dados 3D Peste | Jogador (Mais) | Lote 2 | Aguardando Lote 2 |
| `/jogador/mesa` | Mesa Tática do Jogador | Jogador (Mais) | Lote 2 | Aguardando Lote 2 |
| `/mestre` | Painel Geral do Mestre (Dashboard) | Mestre | Lote 3 | Aguardando Lote 3 |
| `/mestre/jogadores` | Fichas & Monitoramento de Heróis | Mestre | Lote 3 | Aguardando Lote 3 |
| `/mestre/campanha` | Crônicas, Linha do Tempo e Clima | Mestre | Lote 3 | Aguardando Lote 3 |
| `/mestre/bestiario` | Bestiário de Monstros e Feromônios | Mestre | Lote 3 | Aguardando Lote 3 |
| `/mestre/itens` | Catálogo e Editor de Itens | Mestre | Lote 3 | Aguardando Lote 3 |
| `/mestre/oficina` | Editor de Receitas e Alquimia | Mestre | Lote 3 | Aguardando Lote 3 |
| `/mestre/grimorio` | Grimório do Mestre & Árvores | Mestre | Lote 3 | Aguardando Lote 3 |
| `/mestre/sistema` | Configurações, Áudio e Backups | Mestre | Lote 3 | Aguardando Lote 3 |
| `/mestre/mesa` | Mesa de Batalha do Mestre | Mestre | Lote 3 | Aguardando Lote 3 |
| `/tv` | Transmissão de Mesa na TV | TV / Espectador | Lote 4 | Aguardando Lote 4 |
| `/batalha` | Arena de Combate e Estandarte | TV / Espectador | Lote 4 | Aguardando Lote 4 |
| `/mesa` | Mesa de Combate e Rolagens | Geral | Lote 4 | Aguardando Lote 4 |
