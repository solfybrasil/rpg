import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  type CoinsBreakdown,
  type EquipSlotKey,
  type InventoryItemRecord,
  allocateInventoryGrid40,
  calcTotalInventoryWeight,
  canStackTogether,
  fromBronze,
  getDefaultEquipSlot,
  parseConsumableEffects,
} from '../../../entities/item';
import { type CharacterRow, useHero, useHeroes, useInventory } from '../../../shared/hooks/baseHooks';
import { queryKeys, supabase } from '../../../shared/supabase';
import {
  deleteInventoryItemInDB,
  equipItemInDB,
  moveSlotInDB,
  transferItemInDB,
  unequipItemInDB,
  updateInventoryItemInDB,
} from '../api/inventoryService';

export function useBackpack(heroId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { hero, updateHeroAsync } = useHero(heroId);
  const { heroes } = useHeroes();
  const { items = [], isLoading, refetch } = useInventory(heroId);

  const [selectedItem, setSelectedItem] = useState<InventoryItemRecord | null>(null);
  const [recentlyReceivedId, setRecentlyReceivedId] = useState<string | null>(null);

  // Armazena itens anteriores para detectar itens novos em tempo real
  const prevItemsRef = useRef<Map<string, number>>(new Map());
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!items || items.length === 0) {
      if (initialLoadRef.current && !isLoading) {
        initialLoadRef.current = false;
      }
      return;
    }

    if (initialLoadRef.current) {
      const map = new Map<string, number>();
      for (const it of items) {
        map.set(it.id, Number(it.quantity || 1));
      }
      prevItemsRef.current = map;
      initialLoadRef.current = false;
      return;
    }

    // Detecta item novo ou com quantidade aumentada
    for (const it of items) {
      const prevQty = prevItemsRef.current.get(it.id);
      const curQty = Number(it.quantity || 1);

      if (prevQty === undefined || curQty > prevQty) {
        // Novo item recebido!
        setRecentlyReceivedId(it.id);
        toast.success(`Recebido: ${it.name} ${curQty > 1 ? `(${curQty}x)` : ''}`, {
          duration: 3500,
        });

        // Remove highlight após 600ms
        const timer = setTimeout(() => {
          setRecentlyReceivedId((curr) => (curr === it.id ? null : curr));
        }, 600);

        // Atualiza ref
        const newMap = new Map<string, number>();
        for (const item of items) {
          newMap.set(item.id, Number(item.quantity || 1));
        }
        prevItemsRef.current = newMap;
        return () => clearTimeout(timer);
      }
    }

    const newMap = new Map<string, number>();
    for (const item of items) {
      newMap.set(item.id, Number(item.quantity || 1));
    }
    prevItemsRef.current = newMap;
  }, [items, isLoading]);

  // Separa equipamentos de itens da grade de 40 slots
  const { backpackItems, equippedMap } = useMemo(() => {
    const eq: Record<EquipSlotKey, InventoryItemRecord | null> = {
      head: null,
      chest: null,
      hands: null,
      main_hand: null,
      off_hand: null,
      ring_1: null,
      ring_2: null,
      amulet: null,
    };
    const bp: InventoryItemRecord[] = [];

    for (const item of items as unknown as InventoryItemRecord[]) {
      if (item.equip_slot) {
        const slotKey = item.equip_slot as EquipSlotKey;
        if (slotKey in eq) {
          eq[slotKey] = item;
        } else {
          bp.push(item);
        }
      } else {
        bp.push(item);
      }
    }

    return { backpackItems: bp, equippedMap: eq };
  }, [items]);

  // Aloca a grade de 40 slots
  const slots = useMemo(() => {
    const { grid } = allocateInventoryGrid40(backpackItems);
    return grid;
  }, [backpackItems]);

  // Moedas
  const coins: CoinsBreakdown = useMemo(() => {
    return fromBronze(hero?.coins_bronze || 0);
  }, [hero?.coins_bronze]);

  // Peso total
  const totalWeight = useMemo(() => {
    return calcTotalInventoryWeight(items as unknown as InventoryItemRecord[]);
  }, [items]);

  // Ocupação
  const occupiedCount = useMemo(() => {
    return slots.filter(Boolean).length;
  }, [slots]);

  // Mover ou empilhar slot
  const handleMoveSlot = useCallback(
    async (fromSlotIndex: number, toSlotIndex: number) => {
      if (!heroId || fromSlotIndex === toSlotIndex) return;
      const movingItem = slots[fromSlotIndex];
      if (!movingItem) return;

      const targetItem = slots[toSlotIndex];
      const qk = queryKeys.inventory.byHero(heroId);

      // Otimista
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<InventoryItemRecord[]>(qk);

      try {
        if (targetItem && canStackTogether(targetItem, movingItem)) {
          // Empilhar
          const newQty = Number(targetItem.quantity || 1) + Number(movingItem.quantity || 1);
          queryClient.setQueryData<InventoryItemRecord[]>(qk, (old = []) =>
            old
              .filter((i) => i.id !== movingItem.id)
              .map((i) => (i.id === targetItem.id ? { ...i, quantity: newQty } : i)),
          );

          await updateInventoryItemInDB(targetItem.id, { quantity: newQty });
          await deleteInventoryItemInDB(movingItem.id);
          toast.success(`Itens agrupados (${newQty}x)`);
        } else if (targetItem) {
          // Trocar de posição
          queryClient.setQueryData<InventoryItemRecord[]>(qk, (old = []) =>
            old.map((i) => {
              if (i.id === movingItem.id) return { ...i, slot_index: toSlotIndex };
              if (i.id === targetItem.id) return { ...i, slot_index: fromSlotIndex };
              return i;
            }),
          );

          await moveSlotInDB(movingItem.id, toSlotIndex, heroId);
          await moveSlotInDB(targetItem.id, fromSlotIndex, heroId);
        } else {
          // Mover para slot vazio
          queryClient.setQueryData<InventoryItemRecord[]>(qk, (old = []) =>
            old.map((i) => (i.id === movingItem.id ? { ...i, slot_index: toSlotIndex } : i)),
          );

          await moveSlotInDB(movingItem.id, toSlotIndex, heroId);
        }
      } catch (err) {
        if (previous) queryClient.setQueryData(qk, previous);
        toast.error(`Falha ao reposicionar item: ${err instanceof Error ? err.message : 'Erro'}`);
      }
    },
    [heroId, slots, queryClient],
  );

  // Equipar item
  const handleEquip = useCallback(
    async (item: InventoryItemRecord, slotKey?: EquipSlotKey) => {
      if (!heroId) return;
      const targetSlot = slotKey || getDefaultEquipSlot(item, equippedMap);
      if (!targetSlot) {
        toast.error('Este item não pode ser equipado.');
        return;
      }

      const qk = queryKeys.inventory.byHero(heroId);
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<InventoryItemRecord[]>(qk);

      try {
        queryClient.setQueryData<InventoryItemRecord[]>(qk, (old = []) =>
          old.map((i) => {
            if (i.id === item.id) return { ...i, equip_slot: targetSlot, slot_index: -1 };
            if (i.equip_slot === targetSlot) return { ...i, equip_slot: null, slot_index: item.slot_index ?? null };
            return i;
          }),
        );

        await equipItemInDB(item.id, targetSlot, heroId);
        toast.success(`Equipado em ${targetSlot.replace('_', ' ')}`);
        setSelectedItem(null);
      } catch (err) {
        if (previous) queryClient.setQueryData(qk, previous);
        toast.error(`Falha ao equipar: ${err instanceof Error ? err.message : 'Erro'}`);
      }
    },
    [heroId, equippedMap, queryClient],
  );

  // Desequipar item
  const handleUnequip = useCallback(
    async (item: InventoryItemRecord) => {
      if (!heroId) return;
      const freeIdx = slots.findIndex((s) => s === null);
      if (freeIdx === -1) {
        toast.error('A mochila está cheia (40/40 slots ocupados).');
        return;
      }

      const qk = queryKeys.inventory.byHero(heroId);
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<InventoryItemRecord[]>(qk);

      try {
        queryClient.setQueryData<InventoryItemRecord[]>(qk, (old = []) =>
          old.map((i) => (i.id === item.id ? { ...i, equip_slot: null, slot_index: freeIdx } : i)),
        );

        await unequipItemInDB(item.id, freeIdx);
        toast.success(`Desequipado para o compartimento #${freeIdx + 1}`);
        setSelectedItem(null);
      } catch (err) {
        if (previous) queryClient.setQueryData(qk, previous);
        toast.error(`Falha ao desequipar: ${err instanceof Error ? err.message : 'Erro'}`);
      }
    },
    [heroId, slots, queryClient],
  );

  // Usar / Consumir item
  const handleUseItem = useCallback(
    async (item: InventoryItemRecord) => {
      if (!heroId || !hero) return;

      const effects = parseConsumableEffects(item);

      // Aviso de peste se aplicável
      if (effects.givesPlague) {
        const confirmed = window.confirm(
          `Consumir "${item.name}" aumentará sua Peste em +1. Deseja continuar?`,
        );
        if (!confirmed) return;
        const curPlague = Number(hero.plague || 0);
        await updateHeroAsync({ plague: Math.min(10, curPlague + 1) });
        toast.warning('+1 de Peste absorvida!');
      }

      // Efeitos de Vida
      if (effects.healsAllHp) {
        await updateHeroAsync({ health: hero.max_health || 10 });
        toast.success('Vida totalmente restaurada!');
      } else if (effects.healsHp) {
        const nextHp = Math.min(hero.max_health || 10, (hero.health || 0) + effects.healsHp);
        await updateHeroAsync({ health: nextHp });
        toast.success(`+${effects.healsHp} Vida recuperada!`);
      }

      // Efeitos de Foco
      if (effects.restoresAllFocus) {
        await updateHeroAsync({ focus: hero.max_focus || 3 });
        toast.success('Foco totalmente restaurado!');
      } else if (effects.restoresFocus) {
        const nextFocus = Math.min(hero.max_focus || 3, (hero.focus || 0) + effects.restoresFocus);
        await updateHeroAsync({ focus: nextFocus });
        toast.success(`+${effects.restoresFocus} Foco recuperado!`);
      }

      // Comida / Saciedade
      if (effects.isFood && effects.saciedade > 0) {
        const curSac = Number(hero.saciedade || 0);
        const nextSac = Math.min(10, curSac + effects.saciedade);
        await updateHeroAsync({ saciedade: nextSac });
        toast.success(`+${effects.saciedade} de Saciedade!`);
      }

      // Desgaste ou Consumo
      const curQty = Number(item.quantity || 1);
      const wearType = item.wear_type || (effects.isFood ? 'single_use' : 'unlimited');

      if (wearType === 'single_use' || effects.isFood) {
        if (curQty > 1) {
          await updateInventoryItemInDB(item.id, { quantity: curQty - 1 });
          toast.success(`1x "${item.name}" consumido (${curQty - 1} restantes).`);
        } else {
          await deleteInventoryItemInDB(item.id);
          toast.success(`"${item.name}" totalmente consumido.`);
          setSelectedItem(null);
        }
      } else if (wearType === 'durability') {
        const curDur = Number(item.durability ?? 1);
        const nextDur = curDur - 1;
        if (nextDur <= 0) {
          if (curQty > 1) {
            await updateInventoryItemInDB(item.id, {
              quantity: curQty - 1,
              durability: Number(item.max_durability || 1),
            });
            toast.warning(`Um exemplar de "${item.name}" esgotou as cargas.`);
          } else {
            await deleteInventoryItemInDB(item.id);
            toast.warning(`"${item.name}" quebrou/esgotou.`);
            setSelectedItem(null);
          }
        } else {
          await updateInventoryItemInDB(item.id, { durability: nextDur });
          toast.info(`Cargas restantes de "${item.name}": ${nextDur}/${item.max_durability || 1}`);
        }
      }

      // Invalida cache de inventário
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.byHero(heroId) });
    },
    [heroId, hero, updateHeroAsync, queryClient],
  );

  // Transferir item
  const handleTransfer = useCallback(
    async (item: InventoryItemRecord, targetHeroId: string, quantity: number) => {
      if (!heroId || !targetHeroId) return;
      const qty = Math.max(1, Math.min(Number(item.quantity || 1), Math.floor(quantity)));

      const targetHero = heroes.find((h) => h.id === targetHeroId);
      const recipientName = targetHero?.name || 'Companheiro';

      const qk = queryKeys.inventory.byHero(heroId);
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<InventoryItemRecord[]>(qk);

      try {
        const curQty = Number(item.quantity || 1);
        if (qty >= curQty) {
          queryClient.setQueryData<InventoryItemRecord[]>(qk, (old = []) =>
            old.filter((i) => i.id !== item.id),
          );
        } else {
          queryClient.setQueryData<InventoryItemRecord[]>(qk, (old = []) =>
            old.map((i) => (i.id === item.id ? { ...i, quantity: curQty - qty } : i)),
          );
        }

        await transferItemInDB(item.id, targetHeroId, -1, qty);
        toast.success(`Enviado ${qty > 1 ? `${qty}x ` : ''}"${item.name}" para ${recipientName}`);
        setSelectedItem(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.byHero(targetHeroId) });
      } catch (err) {
        if (previous) queryClient.setQueryData(qk, previous);
        toast.error(`Falha ao transferir: ${err instanceof Error ? err.message : 'Erro'}`);
      }
    },
    [heroId, heroes, queryClient],
  );

  // Descartar item
  const handleDiscard = useCallback(
    async (item: InventoryItemRecord, quantity: number) => {
      if (!heroId) return;
      const curQty = Number(item.quantity || 1);
      const qty = Math.max(1, Math.min(curQty, Math.floor(quantity)));

      const qk = queryKeys.inventory.byHero(heroId);
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<InventoryItemRecord[]>(qk);

      try {
        if (qty >= curQty) {
          queryClient.setQueryData<InventoryItemRecord[]>(qk, (old = []) =>
            old.filter((i) => i.id !== item.id),
          );
          await deleteInventoryItemInDB(item.id);
          toast.success(`"${item.name}" descartado.`);
          setSelectedItem(null);
        } else {
          const rem = curQty - qty;
          queryClient.setQueryData<InventoryItemRecord[]>(qk, (old = []) =>
            old.map((i) => (i.id === item.id ? { ...i, quantity: rem } : i)),
          );
          await updateInventoryItemInDB(item.id, { quantity: rem });
          toast.success(`${qty}x "${item.name}" descartado(s).`);
        }
      } catch (err) {
        if (previous) queryClient.setQueryData(qk, previous);
        toast.error(`Falha ao descartar: ${err instanceof Error ? err.message : 'Erro'}`);
      }
    },
    [heroId, queryClient],
  );

  return {
    hero,
    heroes,
    slots,
    equippedMap,
    coins,
    totalWeight,
    occupiedCount,
    isLoading,
    selectedItem,
    setSelectedItem,
    recentlyReceivedId,
    handleMoveSlot,
    handleEquip,
    handleUnequip,
    handleUseItem,
    handleTransfer,
    handleDiscard,
    refetch,
  };
}
