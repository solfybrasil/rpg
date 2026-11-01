# Bugs de Lógica Encontrados durante a Auditoria (Fase 1)

> **Regra de ouro:** Conforme instruído, **nenhum** destes bugs de lógica foi alterado na Fase 1. Eles estão registrados aqui para sua decisão. Caso queira que algum seja corrigido junto com os lotes visuais ou depois, basta nos avisar.

---

## 1. Área do Jogador & Componentes Compartilhados

1. **`src/shared/ui/StatusBar.tsx` (linha 25) — Conversão de Moedas de Ouro incorreta:**
   - **Problema:** Calcula `const goldApprox = Math.floor(coinsBronze / 100);`. Porém, na regra canônica do sistema (`src/entities/item/model.ts` e `PlayerShopView.tsx`), **1 Prata = 50 Bronze** e **1 Ouro = 50 Pratas = 2.500 Bronze** (não 100). Além disso, se o herói tiver menos de 2.500 bronzes, a barra mostra `0` ou um valor distorcido em vez de usar `fromBronze(coinsBronze)`.

2. **`src/features/grimoire/components/SpellCastModal.tsx` (linhas 142, 161, 182–184) & `PlayerGrimoireView.tsx` (linha 767) — Uso da coluna inexistente `hp_current` em vez de `health`:**
   - **Problema:** Ao queimar vida na Conjuração Desesperada (`-2 PV`), sofrer dano de Surto Mágico ou aplicar cura de feitiço na ficha, `SpellCastModal` lê `hero.hp_current` (que é `undefined`, caindo no fallback `10`) e chama `updateHeroAsync({ hp_current: newHp })`. Na tabela `characters`, o campo real de vida é **`health`** (e `max_health`).

3. **`src/features/dice/components/PlayerDiceView.tsx` & `src/features/sheet/components/SkillsList.tsx` (linha 78) — Parâmetro `?pericia=` ignorado na tela de Dados:**
   - **Problema:** Na Ficha (`SkillsList.tsx`), clicar em uma perícia navega para `/jogador/dados?pericia=<nome>`. Porém, `PlayerDiceView.tsx` nunca lê os parâmetros de busca da URL e inicializa `selectedSkill` sempre como `null`, sem seletor de perícia na UI.

4. **`src/features/dice/components/PlayerDiceView.tsx` (linhas 171–175) — Destaque incorreto de dados mantidos (`isKept`) em Vantagem/Desvantagem com dados repetidos:**
   - **Problema:** A condição `val === keptDice[0] || val === keptDice[1]` compara apenas o valor numérico, não o índice do dado. Se o jogador rolar `3d6` em Desvantagem e tirar `[6, 6, 2]` (`keptDice = [2, 6]`), todos os 3 dados satisfazem `val === 2 || val === 6` e aparecem acesos como mantidos.

5. **`src/features/shop/components/PlayerShopView.tsx` (linha 233) — Contador da aba `"Vender"` mostra total de itens do inventário em vez de `sellableItems.length`:**
   - **Problema:** O botão da aba Vender exibe `Vender ({inventoryItems.length})`, contando inclusive itens equipados e itens sem valor de venda (`price_bronze === 0`), enquanto a grade abaixo renderiza apenas `sellableItems`.

6. **`src/features/battle-map/components/PlayerBattleCanvas.tsx` & `src/shared/layouts/JogadorLayout.tsx` (linha 25) — Jogador sem botão de saída em `/jogador/mesa`:**
   - **Problema:** Quando o jogador entra em `/jogador/mesa`, `JogadorLayout` oculta o HUD inferior (`!isMesaRoute`), e `PlayerBattleCanvas` não renderiza botão de retorno para `/jogador/ficha`.

7. **`src/shared/layouts/JogadorLayout.tsx` (linhas 85–92) — Cinto de Poções (`Belt`) pega os 4 primeiros itens quaisquer e não possui handler de clique:**
   - **Problema:** `quickItems` faz `inventory.slice(0, 4)` (incluindo armas/armaduras) em vez de filtrar consumíveis, e `<Belt items={quickItems} />` não recebe `onItemClick`.

---

## 2. Área do Mestre

8. **`SpellInspectModal` nunca abre no Grimório do Mestre (Prop incorreta):**
   - **Arquivos:** `src/features/dm-grimoire/components/DMHeroSpellsTab.tsx:356`, `DMSpellsCatalogTab.tsx:337`, `DMArbitrationTab.tsx:290` vs `src/features/grimoire/components/SpellInspectModal.tsx:6-10`.
   - **Problema:** `SpellInspectModal` espera a prop `magia`, mas as 3 abas do Mestre passam `spell={inspectMagia}` (`as any`). Como `magia` é `undefined`, o modal retorna `null` e nunca abre.

9. **`src/features/dm-grimoire/components/DMOathTreeTab.tsx` (linhas 93–106) — Vazamento de Estado da Árvore do Juramento entre Heróis:**
   - **Problema:** Ao trocar de herói selecionado (`activeHero.id`), `setTreeState((prev) => mergeTreeStates(prev, remoteTree))` mescla o estado `prev` (do herói anterior) com a árvore do novo herói e salva no `localStorage` do novo herói.

10. **`src/features/dm-grimoire/components/DMSpellEditorSheet.tsx` (linhas 84–94) — Campo `Custo de Foco` descartado ao salvar:**
    - **Problema:** O formulário possui input para `custoFoco`, mas `handleSave` monta o objeto `updates` sem incluir `custo_foco`.

11. **`src/features/dm-dashboard/components/AltarView.tsx` (linha 24) & `HeroDetailModal.tsx` — Estado `hero` estático dentro do modal de detalhes:**
    - **Problema:** `detailModalTarget` guarda um snapshot do herói no momento do clique em vez de derivá-lo da lista reativa `heroes`. Adicionar/remover condições dentro do modal não atualiza a lista exibida no próprio modal até fechá-lo.

12. **`src/features/dm-dashboard/components/GiveItemModal.tsx` (linha 76) — Perda de `image_url` ao entregar item do catálogo:**
    - **Problema:** Passa `image_url: selectedItem?.id ? undefined : null`, descartando `selectedItem.image_url`.

13. **`src/features/bestiary/components/CreatureDetailSheet.tsx` (linha 64 vs 318) — Rolagem 2d6 ignora `atk.acerto`:**
    - **Problema:** A UI exibe `Acerto: +{atk.acerto ?? creature.attack_bonus ?? 0}`, mas `handleRollAttack` usa sempre `creature.attack_bonus`, ignorando o bônus específico do ataque (`atk.acerto`).

14. **`src/features/bestiary/components/DMBestiaryView.tsx` (linhas 155–159) — `selectedCreature` perde formatação após edição:**
    - **Problema:** `setSelectedCreature(updated)` recebe a linha crua do banco sem passar por `formatarCriaturaParaBatalha`, perdendo o array formatado de `ataques` na gaveta aberta.

15. **`src/features/item-catalog/components/ItemFormSheet.tsx` (linha 95) — Valor inicial inválido `'arma_principal'` em `equippableAs`:**
    - **Problema:** Inicia `equippableAs` com `'arma_principal'`, que não pertence às chaves válidas de `ITEM_EQUIP_SLOTS` (`main_hand`, `off_hand`, `two_hands`, `armor`, `shield`, `amulet`, `ring`).

16. **`src/features/shop/components/ShopItemFormModal.tsx` (linhas 63–91) — Importação do catálogo descarta dados de combate e `catalog_id`:**
    - **Problema:** `handleSelectFromCatalog` não copia `catalog_id`, `equippable_as`, `damage_dice`, `armor_bonus`, `attack_bonus`, `durability` e `max_durability`.

17. **`src/features/system/components/CommandPaletteModal.tsx` (linhas 96–97, 153–201) — Rotas 404 na Paleta de Comandos:**
    - **Problema:** Aponta para `/mestre/batalha` (em vez de `/mestre/mesa`) e `/jogadores/*` (em vez de `/jogador/*`), além de usar `window.location.href` (reload total).

18. **`src/features/system/api/useDMSystem.ts` (linhas 150–173 e 305–344) — Colunas antigas no JSON compilado e restauração parcial de backup:**
    - **Problema:** `useCompiledPlayersJson` lê `item_type`, `damage`, `armor`, `effect` (em vez de `category`, `damage_dice`, `armor_bonus`, `special`), e `useRestoreBackupMutation` restaura apenas 2 das 7 tabelas exportadas no backup.

19. **`src/features/battle-map/components/DMBattleMapEditor.tsx` (linhas 1195–1212) — `onMediaSaved` não dispara `queueMapAutosave`:**
    - **Problema:** Ao salvar mídia/croma de uma peça no `MediaBattleModal`, atualiza `setTokens` localmente mas não chama `queueMapAutosave({ tokens: nextTokens })`.

---

## 3. TV e Mesa Compartilhada

20. **`src/features/mesa/services/mesaRealtime.ts` (linha 29) — Verificação de crítico olha `dice[0]` e `dice[1]` brutos em vez dos dados mantidos (`kept`):**
    - **Problema:** Em rolagens com vantagem/desvantagem (3d6), se os dois `6` estiverem nos índices `[0]` e `[2]`, `dice[0] === 6 && dice[1] === 6` falha.
