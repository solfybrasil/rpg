import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Hammer,
  FlaskConical,
  Flame,
  BookOpen,
  Trash2,
  AlertTriangle,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import type { InventoryItemRecord } from '../../../entities/item';
import {
  calculateCraftRollOutcome,
  calculateSuccessChance,
  checkStationPrerequisites,
  matchWorkshopRecipe3x3,
  type GridRecipeRecord,
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
import { Dice3DModal, type Dice3DResolveData } from './Dice3DModal';
import { RecipeBookModal } from './RecipeBookModal';
import '../../../styles/features/PlayerWorkshop.css';

// Helper para obter URL da imagem ou ícone
function getItemImageSrc(it: InventoryItemRecord | null | undefined): string | null {
  if (!it) return null;
  const anyIt = it as Record<string, unknown>;
  if (typeof anyIt.image_url === 'string' && anyIt.image_url) return anyIt.image_url;
  if (typeof anyIt.imageUrl === 'string' && anyIt.imageUrl) return anyIt.imageUrl;
  if (typeof anyIt.portraitUrl === 'string' && anyIt.portraitUrl) return anyIt.portraitUrl;
  if (typeof anyIt.icon_url === 'string' && anyIt.icon_url) return anyIt.icon_url;
  if (
    typeof anyIt.icon === 'string' &&
    (anyIt.icon.startsWith('http://') ||
      anyIt.icon.startsWith('https://') ||
      anyIt.icon.startsWith('/') ||
      anyIt.icon.startsWith('data:'))
  ) {
    return anyIt.icon;
  }
  return null;
}

export const PlayerWorkshopView: React.FC = () => {
  const sessionHeroId = useSessionStore((s) => s.heroId);
  const heroId = sessionHeroId || 'teste_1';

  const { hero } = useHero(heroId);
  const { items: inventoryItems = [] } = useInventory(heroId);
  const { gameState } = useGameState();

  const [activeTab, setActiveTab] = useState<WorkshopStation>('forja');
  const [gridSlots, setGridSlots] = useState<Array<InventoryItemRecord | null>>(Array(9).fill(null));
  const [selectedBpItem, setSelectedBpItem] = useState<InventoryItemRecord | null>(null);
  const [dragOverCell, setDragOverCell] = useState<number | null>(null);

  // Refs de alta performance para arraste 60fps/120fps sem engasgos
  const containerRef = useRef<HTMLDivElement>(null);
  const ghostElRef = useRef<HTMLDivElement>(null);
  const ghostImgRef = useRef<HTMLImageElement>(null);
  const ghostIconRef = useRef<HTMLSpanElement>(null);
  const ghostNameRef = useRef<HTMLSpanElement>(null);
  const touchDragRef = useRef<{
    type: 'backpack' | 'grid';
    item: InventoryItemRecord;
    sourceIndex?: number;
    startX: number;
    startY: number;
    isDragging: boolean;
  } | null>(null);
  const lastTouchPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentOverIndexRef = useRef<number | null>(null);
  const scrollRafRef = useRef<number | null>(null);

  // Efeito de martelada e faíscas
  const [isStriking, setIsStriking] = useState(false);

  // Estados dos Modais
  const [isDiceModalOpen, setIsDiceModalOpen] = useState(false);
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [discoveredRecipeId, setDiscoveredRecipeId] = useState<string | null>(null);

  // Dados da tentativa de criação
  const [attemptData, setAttemptData] = useState<{
    attempt_id?: string;
    dice: [number, number];
    modifier: number;
    total: number;
    peso: number;
    result: string;
    recipe?: GridRecipeRecord | null;
  } | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveResult, setResolveResult] = useState<Dice3DResolveData | null>(null);
  const [toastMsg, setToastMsg] = useState<string>('');

  const showLocalToast = (msg: string) => {
    setToastMsg(msg);
    toast(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Queries e Mutations
  const { data: recipes = [] } = useWorkshopRecipes(activeTab);
  const { knownRecipeIds } = useKnownRecipes(heroId);

  const attemptMutation = useCraftAttemptMutation();
  const resolveMutation = useCraftResolveMutation();
  const rerollMutation = useCraftRerollMutation();
  const breakOathMutation = useCraftBreakOathMutation();

  const forgeAvailable = Boolean(gameState?.forge_available);
  const alchemyAvailable = gameState?.descanso_evento !== 'alchemy_closed';

  // Itens da mochila do jogador (não equipados)
  const playerGear = useMemo(() => {
    return (inventoryItems || []).filter((it) => !it.equip_slot);
  }, [inventoryItems]);

  // Contagem de itens reservados na grade 3x3
  const reservedItemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    gridSlots.forEach((slot) => {
      if (slot?.id) {
        counts.set(slot.id, (counts.get(slot.id) || 0) + 1);
      }
    });
    return counts;
  }, [gridSlots]);

  // Checagem de ferramentas
  const hasForgeTools = useMemo(() => {
    return playerGear.some(
      (it) =>
        (it.name || '').toLowerCase().includes('ferramentas de ferreiro') ||
        it.catalog_id === 'ferramentas-de-ferreiro',
    );
  }, [playerGear]);

  const hasAlchemyKit = useMemo(() => {
    return playerGear.some(
      (it) =>
        (it.name || '').toLowerCase().includes('kit de alquimia') ||
        it.catalog_id === 'kit-de-alquimia',
    );
  }, [playerGear]);

  const hasCookingPot = useMemo(() => {
    return playerGear.some(
      (it) =>
        (it.name || '').toLowerCase().includes('panela de ferro') ||
        it.catalog_id === 'panela-de-ferro',
    );
  }, [playerGear]);

  // Checagem de pré-requisitos completa
  const prerequisites = useMemo(() => {
    return checkStationPrerequisites(activeTab, forgeAvailable, playerGear, alchemyAvailable);
  }, [activeTab, forgeAvailable, playerGear, alchemyAvailable]);

  // Identificadores de catálogo da grade atual
  const currentGridKeys = useMemo(() => {
    return gridSlots.map((slot) => {
      if (!slot) return null;
      return (
        slot.catalog_id ||
        slot.id ||
        (slot.name ? slot.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') : null)
      );
    });
  }, [gridSlots]);

  // Dicionário de receitas indexadas por JSON da grade
  const recipeIndexMap = useMemo(() => {
    const map = new Map<string, GridRecipeRecord>();
    recipes.forEach((r) => {
      if (Array.isArray(r.grid)) {
        map.set(JSON.stringify(r.grid), r);
      }
    });
    return map;
  }, [recipes]);

  // Procura receita exata correspondente (primeiro pelo Map, fallback matchWorkshopRecipe3x3)
  const matchedRecipe = useMemo(() => {
    const key = JSON.stringify(currentGridKeys);
    const directMatch = recipeIndexMap.get(key);
    if (directMatch) return directMatch;

    const matched = matchWorkshopRecipe3x3(recipes, activeTab, gridSlots, playerGear);
    return matched.recipe || null;
  }, [recipeIndexMap, currentGridKeys, recipes, activeTab, gridSlots, playerGear]);

  // Verifica se a receita combinada é conhecida pelo jogador
  const isRecipeKnown = useMemo(() => {
    if (!matchedRecipe) return false;
    return matchedRecipe.starter === true || knownRecipeIds.has(matchedRecipe.id);
  }, [matchedRecipe, knownRecipeIds]);

  // Modificador de perícia + Astúcia do herói
  const playerCraftModifier = useMemo(() => {
    let astucia = 0;
    const rawAttrs = (hero?.attributes as Record<string, unknown>) || {};
    if (typeof rawAttrs.astucia === 'number') {
      astucia = rawAttrs.astucia;
    }

    let skillBonus = 0;
    const targetSkill =
      activeTab === 'forja' ? 'Forja' : activeTab === 'cozinha' ? 'Sobrevivência' : 'Alquimia';
    const skillsList = Array.isArray(hero?.skills) ? hero.skills : [];
    const found = skillsList.find((s: Record<string, unknown>) =>
      String(s.name || '')
        .toLowerCase()
        .includes(targetSkill.toLowerCase()),
    );
    if (found && typeof found.bonus === 'number') {
      skillBonus = found.bonus;
    }

    return astucia + skillBonus;
  }, [hero, activeTab]);

  // Chance de sucesso percentual (2d6 + mod >= Peso)
  const successChancePct = useMemo(() => {
    if (!matchedRecipe) return 0;
    return calculateSuccessChance(playerCraftModifier, matchedRecipe.peso);
  }, [matchedRecipe, playerCraftModifier]);

  // Pode criar se tem receita combinada e requisitos atendidos
  const canCraft = useMemo(() => {
    if (!matchedRecipe) return false;
    if (activeTab === 'forja') {
      if (!forgeAvailable) return false;
      if (!hasForgeTools) return false;
    }
    if (activeTab === 'alquimia') {
      if (!hasAlchemyKit) return false;
    }
    if (activeTab === 'cozinha') {
      if (!hasCookingPot) return false;
    }
    return true;
  }, [matchedRecipe, activeTab, forgeAvailable, hasForgeTools, hasAlchemyKit, hasCookingPot]);

  // ── DESKTOP DRAG AND DROP HANDLERS ──
  const handleDragStartBackpack = (e: React.DragEvent, item: InventoryItemRecord) => {
    const payload = JSON.stringify({ type: 'backpack', itemId: item.id });
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragStartGrid = (e: React.DragEvent, sourceIndex: number) => {
    const payload = JSON.stringify({ type: 'grid', sourceIndex });
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverCell = (e: React.DragEvent, cellIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverCell !== cellIndex) {
      setDragOverCell(cellIndex);
    }
  };

  const handleDragLeaveCell = (e: React.DragEvent, cellIndex: number) => {
    if (dragOverCell === cellIndex) {
      setDragOverCell(null);
    }
  };

  const handleDropCell = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverCell(null);

    let rawData = e.dataTransfer.getData('application/json');
    if (!rawData) {
      rawData = e.dataTransfer.getData('text/plain');
    }
    if (!rawData) return;

    try {
      const data = JSON.parse(rawData);

      if (data.type === 'backpack') {
        const bpItem = playerGear.find((it) => it.id === data.itemId);
        if (!bpItem) return;

        if (gridSlots[targetIndex]?.id === bpItem.id) return;

        const reserved = reservedItemCounts.get(bpItem.id) || 0;
        const total = Number(bpItem.quantity || 1);

        if (reserved >= total) {
          showLocalToast('Você já reservou todas as unidades que possui deste item!');
          return;
        }

        const newSlots = [...gridSlots];
        newSlots[targetIndex] = bpItem;
        setGridSlots(newSlots);
      } else if (data.type === 'grid') {
        const sourceIndex = data.sourceIndex;
        if (sourceIndex === targetIndex || sourceIndex === undefined) return;

        const newSlots = [...gridSlots];
        const temp = newSlots[targetIndex];
        newSlots[targetIndex] = newSlots[sourceIndex];
        newSlots[sourceIndex] = temp;
        setGridSlots(newSlots);
      }
    } catch (err) {
      console.error('[WORKSHOP DRAG] Erro ao soltar item:', err);
    }
  };

  const handleDropOutsideGrid = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCell(null);

    let rawData = e.dataTransfer.getData('application/json');
    if (!rawData) {
      rawData = e.dataTransfer.getData('text/plain');
    }
    if (!rawData) return;

    try {
      const data = JSON.parse(rawData);
      if (data.type === 'grid' && data.sourceIndex !== undefined) {
        const newSlots = [...gridSlots];
        newSlots[data.sourceIndex] = null;
        setGridSlots(newSlots);
      }
    } catch (_) {}
  };

  // ── AUTO-SCROLL SUAVE BIDIRECIONAL PARA TOUCH MOBILE ──
  const startAutoScroll = useCallback(() => {
    if (scrollRafRef.current) return;

    const loop = () => {
      const drag = touchDragRef.current;
      if (!drag || !drag.isDragging) {
        scrollRafRef.current = null;
        return;
      }

      const currentY = lastTouchPosRef.current.y;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 800;

      const topThreshold = viewportHeight * 0.44;
      const bottomThreshold = viewportHeight * 0.58;

      let scrollDelta = 0;

      if (currentY < topThreshold && currentY >= 0) {
        const ratio = Math.min(1, Math.max(0, (topThreshold - currentY) / (topThreshold - 15)));
        scrollDelta = -Math.round(3 + Math.pow(ratio, 1.3) * 24);
      } else if (currentY > bottomThreshold && currentY <= viewportHeight) {
        const ratio = Math.min(
          1,
          Math.max(0, (currentY - bottomThreshold) / (viewportHeight - bottomThreshold - 15)),
        );
        scrollDelta = Math.round(3 + Math.pow(ratio, 1.3) * 24);
      }

      if (scrollDelta !== 0) {
        window.scrollBy(0, scrollDelta);

        if (scrollDelta < 0) {
          if (document.documentElement && document.documentElement.scrollTop > 0) {
            document.documentElement.scrollTop += scrollDelta;
          }
          if (document.body && document.body.scrollTop > 0) {
            document.body.scrollTop += scrollDelta;
          }
        } else {
          if (document.documentElement) {
            document.documentElement.scrollTop += scrollDelta;
          }
          if (document.body) {
            document.body.scrollTop += scrollDelta;
          }
        }

        let p = containerRef.current?.parentElement;
        while (p && p !== document.body && p !== document.documentElement) {
          const canScrollUp = scrollDelta < 0 && p.scrollTop > 0;
          const canScrollDown = scrollDelta > 0 && p.scrollTop + p.clientHeight < p.scrollHeight;
          if (canScrollUp || canScrollDown) {
            p.scrollTop += scrollDelta;
          }
          p = p.parentElement;
        }

        const el = document.elementFromPoint(lastTouchPosRef.current.x, lastTouchPosRef.current.y);
        const backpackGrid = el?.closest('.forge-backpack-grid');
        if (backpackGrid) {
          backpackGrid.scrollTop += scrollDelta;
        }

        const slotEl = el?.closest('[data-slot-index]');
        const targetIdx = slotEl ? parseInt(slotEl.getAttribute('data-slot-index') || '-1', 10) : null;
        if (targetIdx !== currentOverIndexRef.current) {
          currentOverIndexRef.current = targetIdx;
          setDragOverCell(targetIdx !== null && targetIdx >= 0 && targetIdx < 9 ? targetIdx : null);
        }
      }

      scrollRafRef.current = requestAnimationFrame(loop);
    };

    scrollRafRef.current = requestAnimationFrame(loop);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  }, []);

  const handleTouchStartBackpack = useCallback(
    (e: React.TouchEvent, item: InventoryItemRecord) => {
      const touch = e.touches[0];
      if (!touch) return;
      const reserved = reservedItemCounts.get(item.id) || 0;
      const total = Number(item.quantity || 1);
      if (reserved >= total) return;

      touchDragRef.current = {
        type: 'backpack',
        item,
        startX: touch.clientX,
        startY: touch.clientY,
        isDragging: false,
      };
      lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [reservedItemCounts],
  );

  const handleTouchStartGrid = useCallback(
    (e: React.TouchEvent, sourceIndex: number) => {
      const item = gridSlots[sourceIndex];
      if (!item) return;
      const touch = e.touches[0];
      if (!touch) return;

      touchDragRef.current = {
        type: 'grid',
        item,
        sourceIndex,
        startX: touch.clientX,
        startY: touch.clientY,
        isDragging: false,
      };
      lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [gridSlots],
  );

  useEffect(() => {
    const handleWindowTouchMove = (e: TouchEvent) => {
      const drag = touchDragRef.current;
      if (!drag) return;
      const touch = e.touches[0];
      if (!touch) return;

      lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };

      const dx = touch.clientX - drag.startX;
      const dy = touch.clientY - drag.startY;

      // Inicia modo de arrasto após 8px de movimento
      if (!drag.isDragging) {
        if (Math.hypot(dx, dy) > 8) {
          drag.isDragging = true;
          if (ghostElRef.current) {
            const imgSrc = getItemImageSrc(drag.item);
            if (imgSrc && ghostImgRef.current) {
              ghostImgRef.current.src = imgSrc;
              ghostImgRef.current.style.display = 'block';
              if (ghostIconRef.current) ghostIconRef.current.style.display = 'none';
            } else if (ghostIconRef.current) {
              const anyIt = drag.item as Record<string, unknown>;
              ghostIconRef.current.textContent = (typeof anyIt.icon === 'string' && anyIt.icon) || '🗡️';
              ghostIconRef.current.style.display = 'block';
              if (ghostImgRef.current) ghostImgRef.current.style.display = 'none';
            }
            if (ghostNameRef.current) {
              ghostNameRef.current.textContent = drag.item.name || '';
            }
            ghostElRef.current.style.transform = `translate3d(${touch.clientX - 38}px, ${touch.clientY - 75}px, 0)`;
            ghostElRef.current.style.display = 'flex';
          }
          startAutoScroll();
        }
        return;
      }

      if (e.cancelable) {
        e.preventDefault();
      }

      if (ghostElRef.current) {
        ghostElRef.current.style.transform = `translate3d(${touch.clientX - 38}px, ${touch.clientY - 75}px, 0)`;
      }

      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const slotEl = el?.closest('[data-slot-index]');
      const targetIdx = slotEl ? parseInt(slotEl.getAttribute('data-slot-index') || '-1', 10) : null;
      if (targetIdx !== currentOverIndexRef.current) {
        currentOverIndexRef.current = targetIdx;
        setDragOverCell(targetIdx !== null && targetIdx >= 0 && targetIdx < 9 ? targetIdx : null);
      }
    };

    const handleWindowTouchEnd = () => {
      const drag = touchDragRef.current;
      stopAutoScroll();

      if (ghostElRef.current) {
        ghostElRef.current.style.display = 'none';
      }

      if (drag && drag.isDragging) {
        const targetIndex = currentOverIndexRef.current;
        if (targetIndex !== null && targetIndex >= 0 && targetIndex < 9) {
          if (drag.type === 'backpack') {
            const bpItem = drag.item;
            const reserved = reservedItemCounts.get(bpItem.id) || 0;
            const total = Number(bpItem.quantity || 1);
            if (reserved < total) {
              setGridSlots((prev) => {
                const next = [...prev];
                next[targetIndex] = bpItem;
                return next;
              });
            }
          } else if (drag.type === 'grid') {
            const sourceIndex = drag.sourceIndex;
            if (sourceIndex !== targetIndex && sourceIndex !== undefined) {
              setGridSlots((prev) => {
                const next = [...prev];
                const temp = next[targetIndex];
                next[targetIndex] = next[sourceIndex];
                next[sourceIndex] = temp;
                return next;
              });
            }
          }
        } else if (drag.type === 'grid') {
          const dist = Math.hypot(
            lastTouchPosRef.current.x - drag.startX,
            lastTouchPosRef.current.y - drag.startY,
          );
          if (dist > 40 && drag.sourceIndex !== undefined) {
            setGridSlots((prev) => {
              const next = [...prev];
              next[drag.sourceIndex!] = null;
              return next;
            });
          }
        }
      }

      touchDragRef.current = null;
      currentOverIndexRef.current = null;
      setDragOverCell(null);
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);

    return () => {
      stopAutoScroll();
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [reservedItemCounts, startAutoScroll, stopAutoScroll]);

  // ── AÇÕES NA GRADE 3x3 ──
  const handleCellClick = (cellIndex: number) => {
    const current = gridSlots[cellIndex];
    if (current) {
      const newSlots = [...gridSlots];
      newSlots[cellIndex] = null;
      setGridSlots(newSlots);
      return;
    }

    if (selectedBpItem) {
      const reserved = reservedItemCounts.get(selectedBpItem.id) || 0;
      const totalAvailable = Number(selectedBpItem.quantity || 1);
      if (reserved >= totalAvailable) {
        showLocalToast('Você já reservou todas as unidades que possui deste item!');
        return;
      }

      const newSlots = [...gridSlots];
      newSlots[cellIndex] = selectedBpItem;
      setGridSlots(newSlots);

      if (reserved + 1 >= totalAvailable) {
        setSelectedBpItem(null);
      }
    }
  };

  const handleClearGrid = () => {
    setGridSlots(Array(9).fill(null));
    setSelectedBpItem(null);
  };

  // Montar na bancada diretamente do Livro de Receitas
  const handleAssembleRecipe = (recipe: GridRecipeRecord) => {
    if (!recipe || !Array.isArray(recipe.grid)) return;
    if (recipe.station && recipe.station !== activeTab) {
      setActiveTab(recipe.station as WorkshopStation);
    }

    const newGrid = Array(9).fill(null);
    const usedCounts = new Map<string, number>();

    recipe.grid.forEach((targetIngId, cellIdx) => {
      if (!targetIngId) return;
      const foundItem = playerGear.find((it) => {
        const matches =
          it.catalog_id === targetIngId ||
          it.id === targetIngId ||
          (it.name && it.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') === targetIngId);
        if (!matches) return false;
        const used = usedCounts.get(it.id) || 0;
        return Number(it.quantity || 1) > used;
      });

      if (foundItem) {
        newGrid[cellIdx] = foundItem;
        usedCounts.set(foundItem.id, (usedCounts.get(foundItem.id) || 0) + 1);
      }
    });

    setGridSlots(newGrid);
    showLocalToast(`Receita de "${recipe.result_name}" montada com os materiais que possui!`);
  };

  // ── FLUXO DE CRIAÇÃO & ROLAGEM ──
  const handleStartCraft = async () => {
    if (!canCraft || !matchedRecipe) return;

    setIsStriking(true);
    setTimeout(() => setIsStriking(false), 550);

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const peso = matchedRecipe.peso ?? 6;
    const outcome = calculateCraftRollOutcome(d1, d2, playerCraftModifier, peso);

    setResolveResult(null);
    setIsDiceModalOpen(true);

    try {
      const gridKeys = gridSlots.map((s) => (s ? s.catalog_id || s.id || null : null));
      const res = await attemptMutation.mutateAsync({
        playerId: heroId,
        station: activeTab,
        grid: gridKeys,
      });

      const attemptId = res?.attempt_id || res?.id || 'local_attempt';
      const finalDice: [number, number] = res?.dice && res.dice.length >= 2 ? [res.dice[0], res.dice[1]] : [d1, d2];
      const finalTotal = res?.total ?? outcome.total;
      const finalResult = res?.result || outcome.outcome;

      setAttemptData({
        attempt_id: attemptId,
        dice: finalDice,
        modifier: playerCraftModifier,
        total: finalTotal,
        peso,
        result: finalResult,
        recipe: matchedRecipe,
      });

      if (['sucesso', 'brilhante', 'critico'].includes(finalResult)) {
        setTimeout(async () => {
          try {
            setIsResolving(true);
            const resolved = await resolveMutation.mutateAsync({ attemptId });
            setResolveResult(resolved || {
              discovered: Boolean(!isRecipeKnown),
              created: [{ name: matchedRecipe.result_name, qty: matchedRecipe.result_qty || 1, rarity: matchedRecipe.rarity }],
            });

            if (resolved?.recipe_discovered || (!isRecipeKnown && resolved)) {
              setDiscoveredRecipeId(matchedRecipe.id);
            }
            handleClearGrid();
          } catch (resErr) {
            console.error('[CRAFT] Falha ao resolver:', resErr);
          } finally {
            setIsResolving(false);
          }
        }, 1100);
      }
    } catch (err) {
      console.warn('[WORKSHOP] Tentativa de RPC craft_attempt executada em modo local:', err);
      setAttemptData({
        attempt_id: 'local_attempt',
        dice: [d1, d2],
        modifier: playerCraftModifier,
        total: outcome.total,
        peso,
        result: outcome.outcome,
        recipe: matchedRecipe,
      });

      if (['sucesso', 'brilhante', 'critico'].includes(outcome.outcome)) {
        setTimeout(() => {
          setResolveResult({
            discovered: !isRecipeKnown,
            created: [{ name: matchedRecipe.result_name, qty: outcome.yieldMultiplier * (matchedRecipe.result_qty || 1), rarity: matchedRecipe.rarity }],
          });
          handleClearGrid();
        }, 1100);
      }
    }
  };

  const handleReroll = async () => {
    if (!attemptData?.attempt_id) return;
    try {
      setIsResolving(true);
      const res = await rerollMutation.mutateAsync({ attemptId: attemptData.attempt_id });
      const newD1 = res?.dice?.[0] ?? Math.floor(Math.random() * 6) + 1;
      const newD2 = res?.dice?.[1] ?? Math.floor(Math.random() * 6) + 1;
      const newOutcome = calculateCraftRollOutcome(newD1, newD2, playerCraftModifier, attemptData.peso);

      setAttemptData((prev) =>
        prev
          ? {
              ...prev,
              dice: [newD1, newD2],
              total: res?.total ?? newOutcome.total,
              result: res?.result ?? newOutcome.outcome,
            }
          : null,
      );

      if (['sucesso', 'brilhante', 'critico'].includes(res?.result || newOutcome.outcome)) {
        setTimeout(async () => {
          try {
            const resolved = await resolveMutation.mutateAsync({ attemptId: attemptData.attempt_id! });
            setResolveResult(resolved || {
              created: [{ name: matchedRecipe?.result_name || 'Item', qty: 1 }],
            });
            handleClearGrid();
          } catch (resErr) {
            console.error(resErr);
          } finally {
            setIsResolving(false);
          }
        }, 1100);
      } else {
        setIsResolving(false);
      }
    } catch (err) {
      console.error('[CRAFT] Erro ao rerrolar:', err);
      setIsResolving(false);
    }
  };

  const handleBreakOath = async () => {
    if (!attemptData?.attempt_id) return;
    try {
      setIsResolving(true);
      await breakOathMutation.mutateAsync({ attemptId: attemptData.attempt_id });
      const resolved = await resolveMutation.mutateAsync({ attemptId: attemptData.attempt_id });
      setResolveResult(resolved || {
        created: [{ name: matchedRecipe?.result_name || 'Item Forjado', qty: 1 }],
      });
      handleClearGrid();
    } catch (err) {
      console.error('[CRAFT] Erro ao quebrar juramento:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const handleAcceptResult = async () => {
    if (!attemptData?.attempt_id) {
      setIsDiceModalOpen(false);
      return;
    }
    try {
      setIsResolving(true);
      const resolved = await resolveMutation.mutateAsync({ attemptId: attemptData.attempt_id });
      setResolveResult(resolved);
      handleClearGrid();
    } catch (err) {
      console.error('[CRAFT] Erro ao aceitar resultado:', err);
    } finally {
      setIsResolving(false);
    }
  };

  // Cálculo de largura e cores do termômetro de calor
  const heatGaugeData = useMemo(() => {
    if (activeTab === 'forja') {
      if (!forgeAvailable) {
        return { width: '0%', text: 'Calor: fria', color: '#9fb0c4' };
      }
      return { width: '85%', text: 'Calor da forja: forte', color: '#f0a95a' };
    }
    if (activeTab === 'alquimia') {
      return {
        width: hasAlchemyKit ? '80%' : '20%',
        text: hasAlchemyKit ? 'Fogo do Caldeirão: controlado' : 'Caldeirão: sem kit',
        color: hasAlchemyKit ? '#38bdf8' : '#94a3b8',
      };
    }
    return {
      width: hasCookingPot ? '90%' : '15%',
      text: hasCookingPot ? 'Brasas do Fogão: ardentes' : 'Fogão: sem panela',
      color: hasCookingPot ? '#fb923c' : '#94a3b8',
    };
  }, [activeTab, forgeAvailable, hasAlchemyKit, hasCookingPot]);

  const inspiration = typeof hero?.inspiration === 'number' ? hero.inspiration : 0;

  return (
    <div ref={containerRef} className={`forge-hud-root station-${activeTab}`}>
      {/* Imagem de Fundo HUD da Estação Ativa */}
      <img
        src={
          activeTab === 'alquimia'
            ? forgeAvailable
              ? '/assets/alquimia/fundo_acesa.webp'
              : '/assets/alquimia/fundo_apagada.webp'
            : activeTab === 'cozinha'
              ? forgeAvailable
                ? '/assets/cozinha/fundo_acesa.webp'
                : '/assets/cozinha/fundo_apagada.webp'
              : !forgeAvailable
                ? '/assets/forja/fundo_apagada.webp'
                : '/assets/forja/fundo_acesa.webp'
        }
        alt=""
        className="forge-hud-bg"
      />
      <div className="forge-hud-overlay"></div>

      <div className="forge-hud-container">
        {/* Toast informativo */}
        {toastMsg && (
          <div
            style={{
              background:
                activeTab === 'alquimia'
                  ? 'rgba(79, 209, 197, 0.25)'
                  : activeTab === 'cozinha'
                    ? 'rgba(232, 163, 58, 0.25)'
                    : 'rgba(212, 175, 55, 0.25)',
              border:
                activeTab === 'alquimia'
                  ? '1px solid #4fd1c5'
                  : activeTab === 'cozinha'
                    ? '1px solid #e8a33a'
                    : '1px solid #d4af37',
              color:
                activeTab === 'alquimia'
                  ? '#b6fff3'
                  : activeTab === 'cozinha'
                    ? '#ffe2a0'
                    : '#ffd27a',
              padding: '0.6rem 1rem',
              borderRadius: '6px',
              fontFamily: 'Cinzel, serif',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
              alignSelf: 'center',
            }}
          >
            <Sparkles size={16} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* ── BARRA SUPERIOR: ABAS, TERMÔMETRO/STATUS, RECEITAS E FERRAMENTAS ── */}
        <div className="forge-hud-topbar">
          {/* Abas da Oficina */}
          <div className="forge-tabs-group">
            <button
              type="button"
              onClick={() => {
                setActiveTab('forja');
                handleClearGrid();
              }}
              className={`forge-tab-btn ${activeTab === 'forja' ? 'active' : ''}`}
            >
              <Hammer size={14} />
              <span>Forja</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('alquimia');
                handleClearGrid();
              }}
              className={`forge-tab-btn ${activeTab === 'alquimia' ? 'active' : ''}`}
            >
              <FlaskConical size={14} />
              <span>Alquimia</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('cozinha');
                handleClearGrid();
              }}
              className={`forge-tab-btn ${activeTab === 'cozinha' ? 'active' : ''}`}
            >
              <Flame size={14} />
              <span>Cozinha</span>
            </button>
          </div>

          {/* Indicadores de Estação */}
          <div className="forge-status-group">
            {activeTab === 'alquimia' ? (
              <>
                <span className={`alchemy-status-badge ${forgeAvailable ? 'boiling' : 'cold'}`}>
                  <Flame size={14} />
                  <span>{forgeAvailable ? 'Caldeirão fervendo' : 'Caldeirão sem fogo'}</span>
                </span>

                <button
                  type="button"
                  onClick={() => setIsBookOpen(true)}
                  className="forge-book-btn alchemy-book-btn"
                  title="Consultar fórmulas conhecidas e montar automaticamente no caldeirão"
                >
                  <BookOpen size={15} />
                  <span>Receitas</span>
                </button>

                <div className={`forge-tools-badge ${hasAlchemyKit ? 'ok' : 'warn'}`}>
                  <FlaskConical size={14} />
                  <span>{hasAlchemyKit ? 'Kit Alquimia OK' : 'Sem Kit'}</span>
                </div>
              </>
            ) : activeTab === 'cozinha' ? (
              <>
                <span className={`cozinha-status-badge ${forgeAvailable ? 'hot' : 'cold'}`}>
                  <Flame size={14} />
                  <span>{forgeAvailable ? 'Fogo alto' : 'Fogo apagado'}</span>
                </span>

                <button
                  type="button"
                  onClick={() => setIsBookOpen(true)}
                  className="forge-book-btn cozinha-book-btn"
                  title="Consultar receitas culinárias conhecidas e montar na fogueira"
                >
                  <BookOpen size={15} />
                  <span>Receitas</span>
                </button>

                <div className={`forge-tools-badge ${hasCookingPot ? 'ok' : 'warn'}`}>
                  <Flame size={14} />
                  <span>{hasCookingPot ? 'Panela e espeto OK' : 'Sem Panela'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="forge-heat-gauge-box">
                  <div className="forge-heat-gauge">
                    <div className="forge-heat-track">
                      <div
                        className="forge-heat-fill"
                        style={{
                          width: heatGaugeData.width,
                          background: '#e2771f',
                        }}
                      />
                    </div>
                    <img src="/assets/forja/barra_calor.webp" alt="" className="forge-heat-frame" />
                  </div>
                  <span className="forge-heat-label" style={{ color: heatGaugeData.color }}>
                    {heatGaugeData.text}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBookOpen(true)}
                  className="forge-book-btn"
                  title="Consultar fórmulas conhecidas e montar automaticamente na bancada"
                >
                  <BookOpen size={15} />
                  <span>Receitas</span>
                </button>

                <div className={`forge-tools-badge ${hasForgeTools ? 'ok' : 'warn'}`}>
                  <Wrench size={14} />
                  <span>{hasForgeTools ? 'Ferramentas OK' : 'Sem Ferramentas'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── AVISO SE FORJA ESTIVER APAGADA ── */}
        {activeTab === 'forja' && !forgeAvailable && (
          <div className="forge-cold-banner">
            <span className="forge-cold-title">Sem forja por perto</span>
            <span className="forge-cold-desc">
              A fornalha está fria. Procure uma ferraria, ou acampe perto de uma, para forjar. Você
              ainda pode posicionar materiais na bigorna e inspecionar os resultados.
            </span>
          </div>
        )}

        {/* ── AVISO SE CALDEIRÃO ESTIVER SEM FOGO ── */}
        {activeTab === 'alquimia' && !forgeAvailable && (
          <div className="alchemy-cold-banner">
            <span className="alchemy-cold-title">Caldeirão sem fogo</span>
            <span className="alchemy-cold-desc">
              Acenda uma fogueira ou ache um laboratório para preparar. Você ainda pode montar a
              receita e ver o que sai.
            </span>
          </div>
        )}

        {/* ── AVISO SE FOGUEIRA ESTIVER APAGADA ── */}
        {activeTab === 'cozinha' && !forgeAvailable && (
          <div className="cozinha-cold-banner">
            <span className="cozinha-cold-title">Fogo apagado</span>
            <span className="cozinha-cold-desc">
              Acenda uma fogueira ou ache uma cozinha para cozinhar. Você ainda pode montar a
              receita e ver o prato.
            </span>
          </div>
        )}

        {/* ── ÁREA PRINCIPAL: BANCADA CENTRAL (ESQUERDA) & RESULTADO (DIREITA) ── */}
        <div className="forge-hud-main">
          {activeTab === 'alquimia' ? (
            /* ═══════════ ALQUIMIA: CALDEIRÃO COM GRADE 3x3 FLUTUANTE ═══════════ */
            <div className="forge-anvil-col">
              <div className="alchemy-cauldron-stage">
                <img
                  src="/assets/alquimia/caldeirao.webp"
                  alt="Caldeirão dos Jurados"
                  className="alchemy-cauldron-img"
                  style={{
                    filter: !forgeAvailable
                      ? 'saturate(.35) brightness(.7)'
                      : 'drop-shadow(0 0 24px rgba(80, 230, 210, 0.25))',
                  }}
                />

                <div className="alchemy-grid-board">
                  {gridSlots.map((item, idx) => {
                    const imgSrc = getItemImageSrc(item);
                    const isTargeting = dragOverCell === idx;

                    return (
                      <div
                        key={idx}
                        data-slot-index={idx}
                        className={`forge-cell-slot alchemy-cell-slot ${item ? 'occupied' : 'empty'} ${isTargeting ? 'drag-hover' : ''}`}
                        onClick={() => handleCellClick(idx)}
                        onTouchStart={(e) => handleTouchStartGrid(e, idx)}
                        onDragOver={(e) => handleDragOverCell(e, idx)}
                        onDragLeave={(e) => handleDragLeaveCell(e, idx)}
                        onDrop={(e) => handleDropCell(e, idx)}
                        draggable={!!item}
                        onDragStart={(e) => item && handleDragStartGrid(e, idx)}
                        title={
                          item
                            ? `${item.name}\n(Toque para retirar ou arraste para mover)`
                            : selectedBpItem
                              ? `Toque para colocar ${selectedBpItem.name}`
                              : `Compartimento ${idx + 1}`
                        }
                      >
                        <img
                          src={
                            item
                              ? '/assets/alquimia/slot_cheio.webp'
                              : '/assets/alquimia/slot_vazio.webp'
                          }
                          alt=""
                          className="forge-cell-frame"
                        />

                        {isTargeting && (
                          <img
                            src="/assets/alquimia/slot_brilho.webp"
                            alt=""
                            className="forge-cell-glow-overlay"
                          />
                        )}

                        {item ? (
                          <div className="forge-cell-content">
                            {imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={item.name}
                                className="forge-cell-thumb"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="forge-cell-icon">{item.icon || '🧪'}</span>
                            )}
                            <span className="forge-cell-remove-badge">✕</span>
                          </div>
                        ) : (
                          <span
                            className="forge-cell-index"
                            style={{ color: 'rgba(127, 227, 214, 0.35)' }}
                          >
                            {idx + 1}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="forge-anvil-footer">
                <button
                  type="button"
                  onClick={handleClearGrid}
                  className="forge-clear-btn alchemy-clear-btn"
                  title="Esvazia os 9 compartimentos do caldeirão"
                >
                  <Trash2 size={13} /> Limpar Caldeirão
                </button>
                <span className="forge-hint-text" style={{ color: '#8aa39e' }}>
                  Arraste ou toque para misturar os reagentes
                </span>
              </div>
            </div>
          ) : activeTab === 'cozinha' ? (
            /* ═══════════ COZINHA: FOGUEIRA COM GRADE 3x3 ═══════════ */
            <div className="forge-anvil-col">
              <div className="cozinha-campfire-stage">
                <img
                  src="/assets/cozinha/fogueira.webp"
                  alt="Fogueira dos Jurados"
                  className="cozinha-campfire-img"
                  style={{
                    filter: !forgeAvailable
                      ? 'saturate(.35) brightness(.7)'
                      : 'drop-shadow(0 0 20px rgba(255, 140, 40, 0.35))',
                  }}
                />

                <div className="cozinha-grid-board">
                  {gridSlots.map((item, idx) => {
                    const imgSrc = getItemImageSrc(item);
                    const isTargeting = dragOverCell === idx;

                    return (
                      <div
                        key={idx}
                        data-slot-index={idx}
                        className={`forge-cell-slot cozinha-cell-slot ${item ? 'occupied' : 'empty'} ${isTargeting ? 'drag-hover' : ''}`}
                        onClick={() => handleCellClick(idx)}
                        onTouchStart={(e) => handleTouchStartGrid(e, idx)}
                        onDragOver={(e) => handleDragOverCell(e, idx)}
                        onDragLeave={(e) => handleDragLeaveCell(e, idx)}
                        onDrop={(e) => handleDropCell(e, idx)}
                        draggable={!!item}
                        onDragStart={(e) => item && handleDragStartGrid(e, idx)}
                        title={
                          item
                            ? `${item.name}\n(Toque para retirar ou arraste para mover)`
                            : selectedBpItem
                              ? `Toque para colocar ${selectedBpItem.name}`
                              : `Grelha ${idx + 1}`
                        }
                      >
                        <img
                          src={
                            item
                              ? '/assets/cozinha/slot_cheio.webp'
                              : '/assets/cozinha/slot_vazio.webp'
                          }
                          alt=""
                          className="forge-cell-frame"
                        />

                        {isTargeting && (
                          <img
                            src="/assets/cozinha/slot_brilho.webp"
                            alt=""
                            className="forge-cell-glow-overlay"
                          />
                        )}

                        {item ? (
                          <div className="forge-cell-content">
                            {imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={item.name}
                                className="forge-cell-thumb"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="forge-cell-icon">{item.icon || '🍖'}</span>
                            )}
                            <span className="forge-cell-remove-badge">✕</span>
                          </div>
                        ) : (
                          <span
                            className="forge-cell-index"
                            style={{ color: 'rgba(232, 163, 58, 0.35)' }}
                          >
                            {idx + 1}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="forge-anvil-footer">
                <button
                  type="button"
                  onClick={handleClearGrid}
                  className="forge-clear-btn cozinha-clear-btn"
                  title="Esvazia os 9 compartimentos da fogueira"
                >
                  <Trash2 size={13} /> Limpar Fogueira
                </button>
                <span className="forge-hint-text" style={{ color: '#b09a78' }}>
                  Arraste ou toque para colocar os ingredientes
                </span>
              </div>
            </div>
          ) : (
            /* ═══════════ FORJA: BIGORNA COM GRADE 3x3 ═══════════ */
            <div className="forge-anvil-col">
              <div className="forge-anvil-stage">
                <img
                  src="/assets/forja/bigorna.webp"
                  alt="Bigorna dos Jurados"
                  className="forge-anvil-img"
                  style={{
                    filter:
                      activeTab === 'forja' && !forgeAvailable
                        ? 'saturate(.4) brightness(.7)'
                        : 'none',
                  }}
                />

                {isStriking && (
                  <img
                    src="/assets/forja/faiscas.webp"
                    alt="Centelhas"
                    className="forge-sparks-effect"
                  />
                )}

                <div className="forge-grid-board">
                  {gridSlots.map((item, idx) => {
                    const imgSrc = getItemImageSrc(item);
                    const isTargeting = dragOverCell === idx;

                    return (
                      <div
                        key={idx}
                        data-slot-index={idx}
                        className={`forge-cell-slot ${item ? 'occupied' : 'empty'} ${isTargeting ? 'drag-hover' : ''}`}
                        onClick={() => handleCellClick(idx)}
                        onTouchStart={(e) => handleTouchStartGrid(e, idx)}
                        onDragOver={(e) => handleDragOverCell(e, idx)}
                        onDragLeave={(e) => handleDragLeaveCell(e, idx)}
                        onDrop={(e) => handleDropCell(e, idx)}
                        draggable={!!item}
                        onDragStart={(e) => item && handleDragStartGrid(e, idx)}
                        title={
                          item
                            ? `${item.name}\n(Toque para retirar ou arraste para mover)`
                            : selectedBpItem
                              ? `Toque para colocar ${selectedBpItem.name}`
                              : `Compartimento ${idx + 1}`
                        }
                      >
                        <img
                          src={
                            item ? '/assets/forja/slot_cheio.webp' : '/assets/forja/slot_vazio.webp'
                          }
                          alt=""
                          className="forge-cell-frame"
                        />

                        {isTargeting && (
                          <img
                            src="/assets/forja/slot_brilho.webp"
                            alt=""
                            className="forge-cell-glow-overlay"
                          />
                        )}

                        {item ? (
                          <div className="forge-cell-content">
                            {imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={item.name}
                                className="forge-cell-thumb"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="forge-cell-icon">{item.icon || '🗡️'}</span>
                            )}
                            <span className="forge-cell-remove-badge">✕</span>
                          </div>
                        ) : (
                          <span className="forge-cell-index">{idx + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="forge-anvil-footer">
                <button
                  type="button"
                  onClick={handleClearGrid}
                  className="forge-clear-btn"
                  title="Esvazia os 9 compartimentos da bigorna"
                >
                  <Trash2 size={13} /> Limpar Bigorna
                </button>
                <span className="forge-hint-text">
                  Toque no item ou arraste para posicionar
                </span>
              </div>
            </div>
          )}

          {/* ═══════════ COLUNA DO RESULTADO & BOTÃO DE AÇÃO ═══════════ */}
          {activeTab === 'alquimia' ? (
            <div className="alchemy-result-col">
              <span className="alchemy-result-header-badge">
                {matchedRecipe
                  ? isRecipeKnown
                    ? '✓ Receita do Livro encontrada'
                    : '✦ Mistura Experimental'
                  : 'DESTILAÇÃO'}
              </span>

              <div className="alchemy-flask-stage">
                <div
                  className="alchemy-flask-liquid"
                  style={{ opacity: matchedRecipe ? 1 : 0.45 }}
                >
                  <div className="alchemy-flask-inner-content">
                    {matchedRecipe ? (
                      isRecipeKnown ? (
                        getItemImageSrc(matchedRecipe as unknown as InventoryItemRecord) ? (
                          <img
                            src={
                              getItemImageSrc(
                                matchedRecipe as unknown as InventoryItemRecord,
                              ) || ''
                            }
                            alt={matchedRecipe.result_name}
                            className="alchemy-flask-thumb"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: '2.5rem' }}>🧪</span>
                        )
                      ) : (
                        <span className="forge-result-unknown-char">?</span>
                      )
                    ) : (
                      <span
                        className="forge-result-empty-char"
                        style={{ color: 'rgba(79, 209, 197, 0.4)' }}
                      >
                        ∅
                      </span>
                    )}
                  </div>
                </div>
                <img
                  src="/assets/alquimia/frasco.webp"
                  alt="Frasco Alquímico"
                  className="alchemy-flask-frame"
                />
              </div>

              {matchedRecipe ? (
                isRecipeKnown ? (
                  <>
                    <h3 className="alchemy-result-title">
                      {matchedRecipe.result_name}{' '}
                      {matchedRecipe.result_qty && matchedRecipe.result_qty > 1
                        ? `(${matchedRecipe.result_qty}x)`
                        : ''}
                    </h3>
                    <p className="alchemy-result-desc">
                      {matchedRecipe.description ||
                        (matchedRecipe.category
                          ? `Item da categoria ${matchedRecipe.category}`
                          : 'Elixir alquímico preparado em Aldrenor.')}
                    </p>

                    <div className="alchemy-result-pills-row">
                      <span className="alchemy-stat-pill">Peso {matchedRecipe.peso}</span>
                      <span className="alchemy-stat-pill">
                        Astúcia + Alquimia (+{playerCraftModifier})
                      </span>
                      <span className="alchemy-stat-pill chance">Chance: {successChancePct}%</span>
                      <span className="alchemy-stat-pill battle">Beber · usa em batalha</span>
                    </div>

                    <span className="alchemy-brilliant-note">
                      Sucesso Brilhante (Peso {matchedRecipe.peso + 3}): rende 2 frascos
                    </span>
                  </>
                ) : (
                  <>
                    <h3 className="alchemy-result-title" style={{ color: '#c084fc' }}>
                      Fórmula Oculta
                    </h3>
                    <p className="alchemy-result-desc">
                      Você combinou os ingredientes de um elixir ainda não registrado no seu Livro.
                      O Peso é desconhecido até a destilação.
                    </p>
                  </>
                )
              ) : (
                <p
                  className="alchemy-result-desc"
                  style={{ color: '#8aa39e', fontStyle: 'italic', margin: '14px 0' }}
                >
                  Coloque ervas e reagentes no caldeirão para destilar um novo elixir.
                </p>
              )}

              {matchedRecipe && !canCraft && (
                <div className="forge-reqs-alert">
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <div>
                    {!forgeAvailable && <div>• É necessário fogo aceso (fogueira ou laboratório).</div>}
                    {!hasAlchemyKit && <div>• Falta o "Kit de alquimia" na mochila.</div>}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleStartCraft}
                disabled={!canCraft}
                className="alchemy-prepare-btn"
                aria-label="Preparar no Caldeirão"
              >
                <img
                  src={
                    !canCraft || !forgeAvailable
                      ? '/assets/alquimia/preparar_desligado.webp'
                      : isStriking
                        ? '/assets/alquimia/preparar_apertado.webp'
                        : '/assets/alquimia/preparar.webp'
                  }
                  alt=""
                  className="alchemy-prepare-btn-bg"
                />
                <div className="alchemy-prepare-btn-text-wrap">
                  <span className="alchemy-prepare-btn-title">
                    {!forgeAvailable
                      ? 'SEM FOGO'
                      : !hasAlchemyKit
                        ? 'SEM KIT DE ALQUIMIA'
                        : !matchedRecipe
                          ? 'CALDEIRÃO INCOMPLETO'
                          : 'PREPARAR NO CALDEIRÃO'}
                  </span>
                  <span className="alchemy-prepare-btn-subtitle">
                    {!forgeAvailable
                      ? 'Precisa de fogo aceso e kit'
                      : !hasAlchemyKit
                        ? 'Coloque o kit na mochila'
                        : !matchedRecipe
                          ? 'Misture os ingredientes'
                          : 'Destila e engarrafa o elixir'}
                  </span>
                </div>
              </button>
            </div>
          ) : activeTab === 'cozinha' ? (
            <div className="cozinha-result-col">
              <span className="cozinha-result-header-badge">
                {matchedRecipe
                  ? isRecipeKnown
                    ? '✓ Receita do Livro encontrada'
                    : '✦ Prato Experimental'
                  : 'CULINÁRIA'}
              </span>

              <div className="cozinha-plate-stage">
                <div className="cozinha-plate-glow" style={{ opacity: matchedRecipe ? 1 : 0.45 }}>
                  <div className="cozinha-plate-inner-content">
                    {matchedRecipe ? (
                      isRecipeKnown ? (
                        getItemImageSrc(matchedRecipe as unknown as InventoryItemRecord) ? (
                          <img
                            src={
                              getItemImageSrc(
                                matchedRecipe as unknown as InventoryItemRecord,
                              ) || ''
                            }
                            alt={matchedRecipe.result_name}
                            className="cozinha-plate-thumb"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <img
                            src="/assets/cozinha/carne.webp"
                            alt={matchedRecipe.result_name}
                            className="cozinha-plate-thumb"
                          />
                        )
                      ) : (
                        <span className="forge-result-unknown-char">?</span>
                      )
                    ) : (
                      <span
                        className="forge-result-empty-char"
                        style={{ color: 'rgba(232, 163, 58, 0.4)' }}
                      >
                        ∅
                      </span>
                    )}
                  </div>
                </div>
                <img
                  src="/assets/cozinha/prato.webp"
                  alt="Prato"
                  className="cozinha-plate-frame"
                />
              </div>

              {matchedRecipe ? (
                isRecipeKnown ? (
                  <>
                    <h3 className="cozinha-result-title">
                      {matchedRecipe.result_name}{' '}
                      {matchedRecipe.result_qty && matchedRecipe.result_qty > 1
                        ? `(${matchedRecipe.result_qty}x)`
                        : ''}
                    </h3>
                    <p className="cozinha-result-desc">
                      {matchedRecipe.description ||
                        (matchedRecipe.category
                          ? `Refeição da categoria ${matchedRecipe.category}`
                          : 'Alimento substancioso preparado na fogueira de Aldrenor.')}
                    </p>

                    <div className="cozinha-result-pills-row">
                      <span className="cozinha-stat-pill">Peso {matchedRecipe.peso}</span>
                      <span className="cozinha-stat-pill">
                        Astúcia + Culinária (+{playerCraftModifier})
                      </span>
                      <span className="cozinha-stat-pill chance">Chance: {successChancePct}%</span>
                      <span className="cozinha-stat-pill meal">Refeição · Restaura Fôlego</span>
                    </div>

                    <span className="cozinha-brilliant-note">
                      Sucesso Brilhante (Peso {matchedRecipe.peso + 3}): +1 porção e bônus duradouro
                    </span>
                  </>
                ) : (
                  <>
                    <h3 className="cozinha-result-title" style={{ color: '#ffd070' }}>
                      Prato Desconhecido
                    </h3>
                    <p className="cozinha-result-desc">
                      Você combinou os ingredientes de uma receita culinária ainda não registrada no
                      seu Livro. O sabor e os efeitos serão revelados ao cozinhar.
                    </p>
                  </>
                )
              ) : (
                <p
                  className="cozinha-result-desc"
                  style={{ color: '#b09a78', fontStyle: 'italic', margin: '14px 0' }}
                >
                  Coloque carnes, água, ervas e temperos na grelha para cozinhar um prato vigoroso.
                </p>
              )}

              {matchedRecipe && !canCraft && (
                <div className="forge-reqs-alert">
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <div>
                    {!forgeAvailable && <div>• É necessário fogo aceso (fogueira ou cozinha).</div>}
                    {!hasCookingPot && <div>• Falta uma panela de ferro ou espeto na mochila.</div>}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleStartCraft}
                disabled={!canCraft}
                className="cozinha-cook-action-btn"
                aria-label="Cozinhar"
              >
                <img
                  src={
                    !canCraft || !forgeAvailable
                      ? '/assets/cozinha/cozinhar_desligado.webp'
                      : isStriking
                        ? '/assets/cozinha/cozinhar_apertado.webp'
                        : '/assets/cozinha/cozinhar.webp'
                  }
                  alt=""
                  className="cozinha-cook-btn-bg"
                />
                <div className="cozinha-cook-btn-text-wrap">
                  <span className="cozinha-cook-btn-title">
                    {!forgeAvailable
                      ? 'FOGO APAGADO'
                      : !hasCookingPot
                        ? 'SEM PANELA DE FERRO'
                        : !matchedRecipe
                          ? 'INGREDIENTES INSUFICIENTES'
                          : 'COZINHAR NA FOGUEIRA'}
                  </span>
                  <span className="cozinha-cook-btn-subtitle">
                    {!forgeAvailable
                      ? 'Precisa de fogo aceso e panela'
                      : !hasCookingPot
                        ? 'Coloque a panela na mochila'
                        : !matchedRecipe
                          ? 'Misture os ingredientes'
                          : 'Prepara o prato e testa a culinária'}
                  </span>
                </div>
              </button>
            </div>
          ) : (
            <div className="forge-result-col">
              <span className="forge-result-header-label">RESULTADO</span>

              <div className="forge-result-stage">
                <div className="forge-result-inner-glow">
                  {matchedRecipe ? (
                    isRecipeKnown ? (
                      getItemImageSrc(matchedRecipe as unknown as InventoryItemRecord) ? (
                        <img
                          src={
                            getItemImageSrc(
                              matchedRecipe as unknown as InventoryItemRecord,
                            ) || ''
                          }
                          alt={matchedRecipe.result_name}
                          className="forge-result-thumb"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '2.5rem' }}>
                          {matchedRecipe.rarity === 'Artefato' ? '⚜️' : '⚔️'}
                        </span>
                      )
                    ) : (
                      <span className="forge-result-unknown-char">?</span>
                    )
                  ) : (
                    <span className="forge-result-empty-char">∅</span>
                  )}
                </div>
                <img
                  src="/assets/forja/quadro_resultado.webp"
                  alt=""
                  className="forge-result-frame-img"
                />
              </div>

              {matchedRecipe ? (
                isRecipeKnown ? (
                  <>
                    <h3 className="forge-result-title">
                      {matchedRecipe.result_name}{' '}
                      {matchedRecipe.result_qty && matchedRecipe.result_qty > 1
                        ? `(${matchedRecipe.result_qty}x)`
                        : ''}
                    </h3>
                    <p className="forge-result-desc">
                      {matchedRecipe.description ||
                        (matchedRecipe.category
                          ? `Item da categoria ${matchedRecipe.category}`
                          : 'Receita tradicional de manufatura em Aldrenor.')}
                    </p>

                    <div className="forge-result-pills-row">
                      <span className="forge-stat-pill">Peso {matchedRecipe.peso}</span>
                      <span className="forge-stat-pill">
                        Astúcia + Forja (+{playerCraftModifier})
                      </span>
                      <span className="forge-stat-pill chance">Chance: {successChancePct}%</span>
                      {matchedRecipe.rarity && (
                        <span className="forge-stat-pill rarity">{matchedRecipe.rarity}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="forge-result-title" style={{ color: '#c084fc' }}>
                      Fórmula Oculta
                    </h3>
                    <p className="forge-result-desc">
                      Você combinou os ingredientes exatos de uma receita ainda não registrada no seu
                      Livro. O Peso é desconhecido até a martelada final.
                    </p>
                  </>
                )
              ) : (
                <p
                  className="forge-result-desc"
                  style={{ color: '#8c7b68', fontStyle: 'italic', margin: '14px 0' }}
                >
                  Posicione os materiais sobre a bigorna para revelar o que suas mãos são capazes de
                  moldar.
                </p>
              )}

              {matchedRecipe && !canCraft && (
                <div className="forge-reqs-alert">
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <div>
                    {activeTab === 'forja' && !forgeAvailable && (
                      <div>• É necessária uma forja acesa no local.</div>
                    )}
                    {activeTab === 'forja' && !hasForgeTools && (
                      <div>• Falta "Ferramentas de ferreiro" na mochila.</div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleStartCraft}
                disabled={!canCraft}
                className="forge-hammer-action-btn"
              >
                <img
                  src={
                    !canCraft || (activeTab === 'forja' && !forgeAvailable)
                      ? '/assets/forja/martelar_desligado.webp'
                      : isStriking
                        ? '/assets/forja/martelar_apertado.webp'
                        : '/assets/forja/martelar.webp'
                  }
                  alt=""
                  className="forge-hammer-btn-bg"
                />
                <div className="forge-hammer-btn-text-wrap">
                  <span className="forge-hammer-btn-title">
                    {activeTab === 'forja' && !forgeAvailable
                      ? 'SEM FORJA'
                      : 'MARTELAR NA BIGORNA'}
                  </span>
                  <span className="forge-hammer-btn-subtitle">
                    {activeTab === 'forja' && !forgeAvailable
                      ? 'Precisa de uma forja acesa'
                      : 'Começa a rolagem e o teste de forja'}
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* ── RODAPÉ: MOCHILA DO JOGADOR ESTILO HUD ── */}
        <div
          className="forge-backpack-panel"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropOutsideGrid}
        >
          <div className="forge-backpack-header">
            <span className="forge-backpack-title">
              {activeTab === 'alquimia'
                ? 'Mochila · Ingredientes & Reagentes'
                : activeTab === 'cozinha'
                  ? 'Mochila · Ingredientes Culinários'
                  : `Mochila · ${playerGear.length} ${playerGear.length === 1 ? 'item' : 'itens'}`}
            </span>
            <span className="forge-backpack-subtitle">
              {activeTab === 'alquimia'
                ? 'Arraste para o caldeirão, ou toque numa receita do Livro para preencher sozinho'
                : activeTab === 'cozinha'
                  ? 'Arraste para a fogueira, ou toque numa receita do Livro para preencher sozinho'
                  : 'Arraste para a bigorna · ou toque no item e depois no compartimento desejado'}
            </span>
          </div>

          <div className="forge-backpack-grid">
            {playerGear.length === 0 ? (
              <div
                style={{
                  fontSize: '13px',
                  color: '#8c7b68',
                  fontStyle: 'italic',
                  padding: '12px 0',
                }}
              >
                Nenhum ingrediente ou material disponível na mochila.
              </div>
            ) : (
              playerGear.map((it) => {
                const reserved = reservedItemCounts.get(it.id) || 0;
                const total = Number(it.quantity || 1);
                const available = Math.max(0, total - reserved);
                const isSelected = selectedBpItem?.id === it.id;
                const isOutOfStock = available <= 0;
                const bpImg = getItemImageSrc(it);

                return (
                  <div
                    key={it.id}
                    draggable={!isOutOfStock}
                    onDragStart={(e) => !isOutOfStock && handleDragStartBackpack(e, it)}
                    onTouchStart={(e) => !isOutOfStock && handleTouchStartBackpack(e, it)}
                    onClick={() => {
                      if (isOutOfStock) return;
                      setSelectedBpItem(isSelected ? null : it);
                    }}
                    className={`forge-bp-item-card ${isSelected ? 'selected' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`}
                    title={`${it.name} (${available} disponíveis de ${total} totais)`}
                  >
                    <div className="forge-bp-slot-box">
                      <img
                        src={
                          available > 0
                            ? activeTab === 'alquimia'
                              ? '/assets/alquimia/slot_cheio.webp'
                              : activeTab === 'cozinha'
                                ? '/assets/cozinha/slot_cheio.webp'
                                : '/assets/forja/slot_cheio.webp'
                            : activeTab === 'alquimia'
                              ? '/assets/alquimia/slot_vazio.webp'
                              : activeTab === 'cozinha'
                                ? '/assets/cozinha/slot_vazio.webp'
                                : '/assets/forja/slot_vazio.webp'
                        }
                        alt=""
                        className="forge-bp-slot-frame"
                      />
                      <div className="forge-bp-slot-inner">
                        {bpImg ? (
                          <img
                            src={bpImg}
                            alt={it.name}
                            className="forge-bp-thumb"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="forge-bp-icon">
                            {it.icon ||
                              (activeTab === 'alquimia'
                                ? '🌿'
                                : activeTab === 'cozinha'
                                  ? '🍖'
                                  : '🗡️')}
                          </span>
                        )}
                      </div>

                      <span className="forge-bp-qty-badge">{available}</span>

                      {reserved > 0 && (
                        <span
                          className="forge-bp-reserved-badge"
                          title="Unidades reservadas na bancada"
                        >
                          -{reserved}
                        </span>
                      )}
                    </div>

                    <span className="forge-bp-name">{it.name}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── AVATAR FLUTUANTE DE TOUCH DRAG VIA PORTAL ── */}
        {typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={ghostElRef}
              className={`forge-touch-drag-ghost ${activeTab === 'alquimia' ? 'alchemy-ghost' : activeTab === 'cozinha' ? 'cozinha-ghost' : ''}`}
              style={{
                display: 'none',
                position: 'fixed',
                left: 0,
                top: 0,
                willChange: 'transform',
                pointerEvents: 'none',
                zIndex: 99999999,
              }}
            >
              <div className="forge-ghost-box">
                <img
                  src={
                    activeTab === 'alquimia'
                      ? '/assets/alquimia/slot_cheio.webp'
                      : activeTab === 'cozinha'
                        ? '/assets/cozinha/slot_cheio.webp'
                        : '/assets/forja/slot_cheio.webp'
                  }
                  alt=""
                  className="forge-touch-drag-ghost-frame"
                />
                <img
                  ref={ghostImgRef}
                  src=""
                  alt=""
                  className="forge-touch-drag-ghost-thumb"
                  style={{ display: 'none' }}
                />
                <span
                  ref={ghostIconRef}
                  className="forge-touch-drag-ghost-icon"
                  style={{ display: 'none' }}
                >
                  {activeTab === 'cozinha' ? '🍖' : '🗡️'}
                </span>
                <span ref={ghostNameRef} className="forge-ghost-name-pill"></span>
              </div>
            </div>,
            document.body,
          )}
      </div>

      {/* ── MODAL DE DADOS 3D ANIMADOS ── */}
      <Dice3DModal
        isOpen={isDiceModalOpen}
        dice={attemptData?.dice || [1, 1]}
        modifier={attemptData?.modifier || 0}
        total={attemptData?.total || 2}
        peso={attemptData?.peso || 6}
        result={attemptData?.result || 'falha'}
        recipe={attemptData?.recipe}
        playerInspiration={inspiration}
        isResolving={isResolving}
        resolveData={resolveResult}
        onReroll={handleReroll}
        onBreakOath={handleBreakOath}
        onResolve={handleAcceptResult}
        onClose={() => setIsDiceModalOpen(false)}
      />

      {/* ── MODAL DO LIVRO DE RECEITAS ── */}
      <RecipeBookModal
        isOpen={isBookOpen}
        currentStation={activeTab}
        onAssembleRecipe={(recipe) => {
          handleAssembleRecipe(recipe);
          setIsBookOpen(false);
        }}
        onClose={() => {
          setIsBookOpen(false);
          setDiscoveredRecipeId(null);
        }}
      />
    </div>
  );
};

export default PlayerWorkshopView;
