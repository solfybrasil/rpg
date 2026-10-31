import {
  Anvil,
  BookOpen,
  Flame,
  FlaskConical,
  Info,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { InventoryItemRecord } from '../../../entities/item';
import {
  calculateCraftRollOutcome,
  calculateSuccessChance,
  checkStationPrerequisites,
  type CraftRollResult,
  type GridRecipeRecord,
  matchWorkshopRecipe3x3,
  type WorkshopStation,
} from '../../../entities/recipe';
import { useGameState, useHero, useInventory } from '../../../shared/hooks/baseHooks';
import { useSessionStore } from '../../../shared/stores/session';
import {
  useCraftAttemptMutation,
  useCraftBreakOathMutation,
  useCraftRerollMutation,
  useCraftResolveMutation,
  useKnownRecipes,
  useWorkshopRecipes,
} from '../api/useWorkshop';
import type { MinigameResult } from '../types';
import { BubblesMinigameModal } from './BubblesMinigameModal';
import { CraftDiceResultModal } from './CraftDiceResultModal';
import { HammerMinigameModal } from './HammerMinigameModal';
import { RecipeBookModal } from './RecipeBookModal';
import { WorkbenchGrid } from './WorkbenchGrid';
import { WorkshopBackpack } from './WorkshopBackpack';
import { WorkshopResultSlot } from './WorkshopResultSlot';

export const PlayerWorkshopView: React.FC = () => {
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const heroId = sessionHeroId || 'teste_1';

  const { hero } = useHero(heroId);
  const { items: inventoryItems = [] } = useInventory(heroId);
  const { gameState } = useGameState();

  const [activeStation, setActiveStation] = useState<WorkshopStation>('forja');
  const [gridSlots, setGridSlots] = useState<Array<InventoryItemRecord | null>>(Array(9).fill(null));
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedBpItemId, setSelectedBpItemId] = useState<string | null>(null);

  // Modais
  const [isHammerOpen, setIsHammerOpen] = useState(false);
  const [isBubblesOpen, setIsBubblesOpen] = useState(false);
  const [isDiceModalOpen, setIsDiceModalOpen] = useState(false);
  const [isBookOpen, setIsBookOpen] = useState(false);

  // Estado da tentativa de criação
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [rollResult, setRollResult] = useState<CraftRollResult | null>(null);
  const [minigameBonus, setMinigameBonus] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const [recipeDiscovered, setRecipeDiscovered] = useState(false);

  // Queries
  const { data: recipes = [], isLoading: isLoadingRecipes } = useWorkshopRecipes(activeStation);
  const { knownRecipeIds } = useKnownRecipes(heroId);

  // Mutations
  const attemptMutation = useCraftAttemptMutation();
  const resolveMutation = useCraftResolveMutation();
  const rerollMutation = useCraftRerollMutation();
  const breakOathMutation = useCraftBreakOathMutation();

  const forgeAvailable = Boolean(gameState?.forge_available);
  const alchemyAvailable = gameState?.descanso_evento !== 'alchemy_closed';

  // Itens não equipados na mochila
  const backpackItems = useMemo(() => {
    return inventoryItems.filter((it) => !it.equip_slot);
  }, [inventoryItems]);

  // Contagem de itens reservados na grade 3x3
  const reservedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    gridSlots.forEach((slot) => {
      if (slot?.id) {
        counts.set(slot.id, (counts.get(slot.id) || 0) + 1);
      }
    });
    return counts;
  }, [gridSlots]);

  // Checa requisitos da estação (ferramentas e forja acesa)
  const prerequisites = useMemo(() => {
    return checkStationPrerequisites(activeStation, forgeAvailable, backpackItems, alchemyAvailable);
  }, [activeStation, forgeAvailable, backpackItems, alchemyAvailable]);

  // Reconhecimento da receita 3x3
  const matchResult = useMemo(() => {
    return matchWorkshopRecipe3x3(recipes, activeStation, gridSlots, backpackItems);
  }, [recipes, activeStation, gridSlots, backpackItems]);

  const matchedRecipe = matchResult.recipe || null;
  const isRecipeKnown = useMemo(() => {
    if (!matchedRecipe) return false;
    return Boolean(matchedRecipe.starter || knownRecipeIds.has(matchedRecipe.id));
  }, [matchedRecipe, knownRecipeIds]);

  // Modificador de perícia + Astúcia do jogador
  const playerCraftModifier = useMemo(() => {
    let astucia = 0;
    const rawAttrs = (hero?.attributes as Record<string, unknown>) || {};
    if (typeof rawAttrs.astucia === 'number') {
      astucia = rawAttrs.astucia;
    }

    let skillBonus = 0;
    const targetSkill =
      activeStation === 'forja' ? 'Forja' : activeStation === 'cozinha' ? 'Sobrevivência' : 'Alquimia';
    const skillsList = Array.isArray(hero?.skills) ? hero.skills : [];
    const foundSkill = skillsList.find((s: Record<string, unknown>) =>
      String(s.name || '')
        .toLowerCase()
        .includes(targetSkill.toLowerCase()),
    );
    if (foundSkill && typeof foundSkill.bonus === 'number') {
      skillBonus = foundSkill.bonus;
    }

    return astucia + skillBonus;
  }, [hero, activeStation]);

  const successChancePct = useMemo(() => {
    if (!matchedRecipe) return 0;
    return calculateSuccessChance(playerCraftModifier, matchedRecipe.peso);
  }, [matchedRecipe, playerCraftModifier]);

  // Handlers da Grade 3x3
  const handleSlotClick = (index: number) => {
    const itemInSlot = gridSlots[index];
    if (itemInSlot) {
      // Remove do slot de volta para a mochila
      const newGrid = [...gridSlots];
      newGrid[index] = null;
      setGridSlots(newGrid);
      return;
    }

    // Se houver item da mochila selecionado, posiciona no slot
    if (selectedBpItemId) {
      const itemToPlace = backpackItems.find((it) => it.id === selectedBpItemId);
      if (itemToPlace) {
        const rawQty = Number(itemToPlace.quantity || 1);
        const used = reservedCounts.get(itemToPlace.id) || 0;
        if (rawQty > used) {
          const newGrid = [...gridSlots];
          newGrid[index] = itemToPlace;
          setGridSlots(newGrid);
          setSelectedBpItemId(null);
        } else {
          toast.error('Quantidade insuficiente deste item.');
        }
      }
    }
  };

  const handleSelectBackpackItem = (item: InventoryItemRecord) => {
    const rawQty = Number(item.quantity || 1);
    const used = reservedCounts.get(item.id) || 0;
    if (rawQty <= used) {
      toast.error('Você já usou todas as unidades disponíveis deste item na grade.');
      return;
    }

    // Coloca no primeiro slot livre da grade
    const firstFreeIndex = gridSlots.findIndex((s) => s === null);
    if (firstFreeIndex !== -1) {
      const newGrid = [...gridSlots];
      newGrid[firstFreeIndex] = item;
      setGridSlots(newGrid);
    } else {
      setSelectedBpItemId(item.id);
      toast.info('A grade está cheia ou clique em um slot para substituir.');
    }
  };

  const handleDropOnSlot = (index: number, item: InventoryItemRecord) => {
    const rawQty = Number(item.quantity || 1);
    const used = reservedCounts.get(item.id) || 0;
    if (rawQty <= used && gridSlots[index]?.id !== item.id) {
      toast.error('Quantidade insuficiente deste item.');
      return;
    }

    const newGrid = [...gridSlots];
    newGrid[index] = item;
    setGridSlots(newGrid);
  };

  const handleClearGrid = () => {
    setGridSlots(Array(9).fill(null));
    setSelectedBpItemId(null);
  };

  // Montagem automática direto do Livro de Receitas
  const handleAssembleRecipe = (recipe: GridRecipeRecord) => {
    if (!recipe || !Array.isArray(recipe.grid)) return;

    if (recipe.station !== activeStation) {
      setActiveStation(recipe.station as WorkshopStation);
    }

    const newGrid = Array(9).fill(null);
    const usedCounts = new Map<string, number>();

    recipe.grid.forEach((targetCatId, cellIdx) => {
      if (!targetCatId) return;
      const found = backpackItems.find((it) => {
        const match = it.catalog_id === targetCatId || it.id === targetCatId;
        if (!match) return false;
        const used = usedCounts.get(it.id) || 0;
        return Number(it.quantity || 1) > used;
      });

      if (found) {
        newGrid[cellIdx] = found;
        usedCounts.set(found.id, (usedCounts.get(found.id) || 0) + 1);
      }
    });

    setGridSlots(newGrid);
    toast.success(`Receita "${recipe.result_name}" montada na bancada!`);
  };

  // Disparo da Criação
  const handleStartCraft = () => {
    if (!matchResult.canCraft || !matchedRecipe) return;

    if (activeStation === 'forja') {
      setIsHammerOpen(true);
    } else if (activeStation === 'alquimia') {
      setIsBubblesOpen(true);
    } else {
      executeCraftAttempt({
        completed: true,
        score: 'normal',
        modifierBonus: 0,
        doubleYield: false,
        label: 'Cozimento Padrão',
      });
    }
  };

  const executeCraftAttempt = async (minigameRes: MinigameResult) => {
    setMinigameBonus(minigameRes.modifierBonus);

    // Dados 2d6
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const effectiveMod = playerCraftModifier + minigameRes.modifierBonus;
    const peso = matchedRecipe?.peso ?? 6;

    const outcomeData = calculateCraftRollOutcome(d1, d2, effectiveMod, peso);
    if (minigameRes.doubleYield && outcomeData.isBrilliant) {
      outcomeData.yieldMultiplier = 2;
    }
    setRollResult(outcomeData);
    setIsDiceModalOpen(true);

    try {
      setIsResolving(true);
      const gridKeys = gridSlots.map((s) => (s ? s.catalog_id || s.id || null : null));

      // Tenta RPC craft_attempt no Supabase
      const attemptRes = await attemptMutation.mutateAsync({
        playerId: heroId,
        station: activeStation,
        grid: gridKeys,
      });

      const attemptId = attemptRes?.attempt_id || attemptRes?.id;
      if (attemptId) {
        setCurrentAttemptId(attemptId);
        if (['sucesso', 'brilhante', 'critico'].includes(outcomeData.outcome)) {
          const resolved = await resolveMutation.mutateAsync({ attemptId });
          if (resolved?.recipe_discovered) {
            setRecipeDiscovered(true);
          }
          // Limpa grade após criação bem-sucedida
          setGridSlots(Array(9).fill(null));
        }
      } else {
        // Fallback gracioso caso RPC não esteja presente
        if (['sucesso', 'brilhante', 'critico'].includes(outcomeData.outcome)) {
          setGridSlots(Array(9).fill(null));
        }
      }
    } catch (err) {
      console.warn('[WORKSHOP] Tentativa de RPC craft_attempt executada em modo simulado:', err);
      if (['sucesso', 'brilhante', 'critico'].includes(outcomeData.outcome)) {
        setGridSlots(Array(9).fill(null));
      }
    } finally {
      setIsResolving(false);
    }
  };

  const handleReroll = async () => {
    if (!currentAttemptId) {
      // Re-rola localmente
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const effectiveMod = playerCraftModifier + minigameBonus;
      const peso = matchedRecipe?.peso ?? 6;
      const newRoll = calculateCraftRollOutcome(d1, d2, effectiveMod, peso);
      setRollResult(newRoll);
      return;
    }
    try {
      setIsResolving(true);
      const rerollRes = await rerollMutation.mutateAsync({ attemptId: currentAttemptId });
      if (rerollRes) {
        toast.success('Rolagem repetida com Inspiração!');
      }
    } catch (err) {
      toast.error('Falha ao repetir rolagem.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleBreakOath = async () => {
    if (!currentAttemptId) {
      if (rollResult) {
        setRollResult({
          ...rollResult,
          outcome: 'sucesso',
          yieldMultiplier: 1,
        });
      }
      return;
    }
    try {
      setIsResolving(true);
      await breakOathMutation.mutateAsync({ attemptId: currentAttemptId });
      toast.warning('Juramento quebrado! +1 Praga acumulada.');
    } catch (err) {
      toast.error('Falha ao quebrar juramento.');
    } finally {
      setIsResolving(false);
    }
  };

  const inspiration = typeof hero?.inspiration === 'number' ? hero.inspiration : 0;

  return (
    <div className="min-h-screen bg-[var(--abyss)] text-[var(--text)] p-4 md:p-6 pb-20 max-w-6xl mx-auto space-y-6">
      {/* Barra de Status e Seletor de Bancadas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--iron)] pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-['Cinzel',serif] font-bold tracking-wide text-[var(--gold-hi)] flex items-center gap-2">
            <span>Oficina do Jurado</span>
            <span className="text-[10px] px-2 py-0.5 border border-[var(--gold-lo)] text-[var(--gold-hi)] font-bold">
              Grade 3×3
            </span>
          </h1>
          <p className="text-xs text-[var(--muted)] font-['EB_Garamond',serif] italic mt-0.5">
            Manufatura, forja de aço negro, elixires e culinária de sobrevivência.
          </p>
        </div>

        {/* Botão do Livro de Receitas */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBookOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 slab border border-[var(--gold-lo)] text-[var(--gold-hi)] text-xs font-['Cinzel',serif] uppercase tracking-wider font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <BookOpen size={14} className="text-[var(--gold)]" />
            <span>Livro de Receitas</span>
            <span className="ml-1 px-1.5 py-0.2 border border-[var(--gold)] bg-[var(--gold)]/20 text-[var(--gold-hi)] font-bold text-[10px]">
              {knownRecipeIds.size}
            </span>
          </button>
        </div>
      </div>

      {/* Tabs das Três Bancadas (Forja, Alquimia, Cozinha) */}
      <div className="grid grid-cols-3 gap-2 p-1 max-w-md recess">
        {[
          { id: 'forja' as WorkshopStation, label: 'Forja', icon: Anvil, color: 'text-[var(--ember)]' },
          { id: 'alquimia' as WorkshopStation, label: 'Alquimia', icon: FlaskConical, color: 'text-[var(--violet)]' },
          { id: 'cozinha' as WorkshopStation, label: 'Cozinha', icon: UtensilsCrossed, color: 'text-[var(--moss)]' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeStation === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveStation(tab.id);
                setGridSlots(Array(9).fill(null));
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-['Cinzel',serif] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                isActive
                  ? 'slab border border-[var(--gold-lo)] text-[var(--gold-hi)] shadow-md'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <Icon size={15} className={tab.color} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Banner de Ambiente (Forja acesa/apagada) */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900/40 border border-neutral-800/80 text-xs font-mono">
        <Flame
          size={14}
          className={forgeAvailable ? 'text-amber-400 animate-pulse' : 'text-neutral-600'}
        />
        <span className="text-neutral-400">Ambiente:</span>
        <span className={forgeAvailable ? 'text-amber-300 font-bold' : 'text-neutral-500'}>
          {forgeAvailable ? 'Forja & Fogo Acessos' : 'Fogo Apagado'}
        </span>
        <span className="text-neutral-600">|</span>
        <span className="text-neutral-400">Atributo Ativo:</span>
        <span className="text-neutral-300 font-bold">
          Astúcia ({heroCraftAttr(hero)}) + {activeStation === 'forja' ? 'Forja' : activeStation === 'cozinha' ? 'Sobrevivência' : 'Alquimia'} (+{playerCraftModifier})
        </span>
      </div>

      {/* Grid Principal da Bancada e Mochila */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Painel da Bancada: Grade 3x3 e Palco do Resultado */}
        <div className="lg:col-span-7 flex flex-col md:flex-row items-center md:items-start justify-center gap-6 p-4 rounded-2xl bg-neutral-900/30 border border-neutral-800/80 shadow-md">
          <WorkbenchGrid
            station={activeStation}
            slots={gridSlots}
            onSlotClick={handleSlotClick}
            onDropOnSlot={handleDropOnSlot}
            onClearGrid={handleClearGrid}
            dragOverIndex={dragOverIndex}
            setDragOverIndex={setDragOverIndex}
            isMatched={matchResult.matched}
          />

          <WorkshopResultSlot
            station={activeStation}
            matchedRecipe={matchedRecipe}
            isKnown={isRecipeKnown}
            canCraft={matchResult.canCraft}
            prerequisites={prerequisites}
            playerModifier={playerCraftModifier}
            successChancePct={successChancePct}
            isCrafting={attemptMutation.isPending || resolveMutation.isPending}
            onStartCraft={handleStartCraft}
          />
        </div>

        {/* Mochila com Ingredientes e Materiais */}
        <div className="lg:col-span-5 h-[480px]">
          <WorkshopBackpack
            station={activeStation}
            items={backpackItems}
            reservedCounts={reservedCounts}
            onSelectItem={handleSelectBackpackItem}
            selectedItemId={selectedBpItemId}
          />
        </div>
      </div>

      {/* Modais de Minigames */}
      <HammerMinigameModal
        isOpen={isHammerOpen}
        onClose={() => setIsHammerOpen(false)}
        onComplete={(res) => {
          setIsHammerOpen(false);
          executeCraftAttempt(res);
        }}
      />

      <BubblesMinigameModal
        isOpen={isBubblesOpen}
        onClose={() => setIsBubblesOpen(false)}
        onComplete={(res) => {
          setIsBubblesOpen(false);
          executeCraftAttempt(res);
        }}
      />

      {/* Modal de Resultado dos Dados 2d6 */}
      <CraftDiceResultModal
        isOpen={isDiceModalOpen}
        recipe={matchedRecipe}
        rollResult={rollResult}
        minigameBonus={minigameBonus}
        playerInspiration={inspiration}
        isResolving={isResolving}
        recipeDiscovered={recipeDiscovered}
        onReroll={handleReroll}
        onBreakOath={handleBreakOath}
        onClose={() => {
          setIsDiceModalOpen(false);
          setRollResult(null);
          setRecipeDiscovered(false);
        }}
      />

      {/* Modal do Livro de Receitas */}
      <RecipeBookModal
        isOpen={isBookOpen}
        onClose={() => setIsBookOpen(false)}
        recipes={recipes}
        knownRecipeIds={knownRecipeIds}
        backpackItems={backpackItems}
        currentStation={activeStation}
        onAssembleRecipe={handleAssembleRecipe}
      />
    </div>
  );
};

function heroCraftAttr(hero: unknown): number {
  const h = hero as { attributes?: { astucia?: number } } | null;
  return Number(h?.attributes?.astucia || 0);
}
