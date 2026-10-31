# DESIGN SYSTEM: PEDRA E PERGAMINHO (OFICIAL)

> [!IMPORTANT]
> **REGRA GERAL PARA TODOS OS PROMPTS (01C a 22):**
> Quando qualquer prompt ou especificação citar Inter, Newsreader, "modo Pergaminho claro", "card" ou raios arredondados grandes, siga rigorosamente este Design System "Pedra e Pergaminho":
> - **Fontes:** EB Garamond em vez de Inter e Newsreader; Cinzel em títulos e números.
> - **Tema:** Um tema único, escuro e atmosférico. Sem modo claro e sem toggle de tema.
> - **Contêineres:** `StonePanel` (.slab / .recess) para pedra negra ou `Parchment` (.parch com borda rasgada) para áreas de leitura. Nunca "card" genérico arredondado com cantos redondos de 16px/24px.
> - **Cantos:** Cantos retos ou bisotados/subtis de no máximo 2 px.

---

## 1. Conceito

Inspirado em inventários de ARPG sombrio clássico (estilo Diablo / Grim Dawn / Elden Ring medieval):
- **Pedra negra (`--stone`, `--stone-2`):** A moldura estrutural — barras, abas, botões, placas e fundos de slots. Nunca leva texto longo.
- **Pergaminho (`--parch`):** Superfície de papel com manchas, grão, sombra interna e borda rasgada procedural (`useTornEdge`), onde se lê: ficha do herói, descrições de itens, feitiços do grimório, diário e registros.
- **Ouro velho (`--gold`, `--gold-hi`, `--gold-lo`):** Acentos, destaques ativos, números primários e filetes ornamentais com losangos de 45 graus.
- **Orbes de vidro (`--blood`, `--mana`):** Esferas físicas de vidro na base da tela para Vida (vermelho carmim) e Foco (azul safira) com líquido volumétrico.
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

### Texturas Procedurais SVG (Data-URIs sem assets pesados)
- `--noise`: SVG `feTurbulence` fractalNoise (grão fino de pedra e pergaminho)
- `--mottle`: SVG `feTurbulence` fractalNoise amplo (manchas orgânicas da pedra)

### Raridades de Itens
- **Comum:** Borda `#3D3833`, fundo linear escuro
- **Incomum:** Borda `--moss`, brilho sutil
- **Raro:** Borda `#2F5D8F`, brilho radial azul `--mist`
- **Épico:** Borda `#5D4589`, brilho radial violeta `--violet`
- **Lendário:** Borda `--gold`, brilho radial dourado com box-shadow `--gold`

---

## 3. Tipografia

- **Cinzel (500 / 700 / 900):** Títulos, nomes, números de vitais, atributos, moedas e rótulos curtos em caixa alta com espaçamento largo (`tracking-[0.14em]`). Nunca em parágrafos longos.
- **EB Garamond (400 / 600 / Itálico):** Todo o texto corrido (descrições, lore, diálogos, regras, botões descritivos e anotações). Números em coluna utilizam `tabular-nums`.

---

## 4. Componentes Chave (`src/shared/ui`)

1. **`StonePanel` (`.slab`):** Placa de pedra com grão e bisel interno. Variantes `active` (com losango dourado no topo) e `recess` (afundada para slots).
2. **`Parchment` (`.parch`):** Papel envelhecido com manchas e borda rasgada procedural calculada via hook `useTornEdge(ref, seed)`.
3. **`StatusBar` (`.status`):** Barra superior (52px) com mini-retrato circular, nome, nível e moedas com ícone.
4. **`Orb` (`.orb`):** Esferas físicas de vidro nos cantos inferiores com anéis de ferro/ouro e líquido dinâmico animado (`hp` vermelho e `focus` azul).
5. **`Belt` (`.belt`):** Cinto de consumíveis rápidos entre os orbes.
6. **`BottomNav` (`.nav`):** Navegação inferior em pedra com 5 destinos canônicos (Ficha, Mochila, Grimório, Diário, Mais).
7. **`InventoryGrid` (`.grid8`):** Grade de 8 colunas afundadas de 36px com drag and drop e suporte a itens multi-célula.
8. **`EquipDoll` (`.doll`):** Silhueta de slots corporais de armadura, armas, anéis e amuletos.
9. **`DiceResult` (`.dice`):** Visual de resolução com fórmulas e selo de resultado (Desastre `--blood`, Sucesso `--moss`, Brilhante `--gold`, Crítico `--ember`).
10. **`GoldButton` (`.end-turn`):** Botão único dourado de destaque máximo por tela.
11. **`StoneButton` (`.act`):** Botões táteis de ação em pedra com ícone dourado e subtítulo em Garamond itálico.
12. **`Divider` (`.rule`):** Filete com losango central rotacionado a 45 graus.
