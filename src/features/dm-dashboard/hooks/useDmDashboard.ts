import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { queryKeys, subscribeRealtime, supabase } from '../../../shared/supabase';
import {
  applyConditionToHero,
  giveItemToHero,
  removeConditionFromHero,
  removeItemFromHero,
  updateHeroVitals,
} from '../api/dmService';
import type { CharacterRow, HeroDashboardItem, InventoryRow } from '../types';

export function useDmDashboard() {
  const queryClient = useQueryClient();

  // 1. Heróis do banco
  const heroesQuery = useQuery({
    queryKey: queryKeys.heroes.all,
    queryFn: async (): Promise<CharacterRow[]> => {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Realtime em 'characters'
  useEffect(() => {
    const unsub = subscribeRealtime<CharacterRow>({
      topic: 'dm_characters_realtime',
      table: 'characters',
      queryKeyToUpdate: queryKeys.heroes.all,
    });
    return () => unsub();
  }, []);

  // 3. Jogadores conectados (presença)
  const playersQuery = useQuery({
    queryKey: ['players', 'presence'],
    queryFn: async () => {
      const { data, error } = await supabase.from('players').select('*');
      if (error) return [];
      return data || [];
    },
    refetchInterval: 10000,
  });

  // 4. Realtime em 'players'
  useEffect(() => {
    const unsub = subscribeRealtime({
      topic: 'dm_players_presence',
      table: 'players',
      queryKeyToUpdate: ['players', 'presence'],
    });
    return () => unsub();
  }, []);

  // Mutação otimista de vitals
  const vitalsMutation = useMutation({
    mutationFn: async ({
      heroId,
      patch,
    }: {
      heroId: string;
      patch: Partial<CharacterRow>;
    }) => {
      return updateHeroVitals(heroId, patch);
    },
    onMutate: async ({ heroId, patch }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.heroes.all });
      const previous = queryClient.getQueryData<CharacterRow[]>(queryKeys.heroes.all);

      if (previous) {
        queryClient.setQueryData<CharacterRow[]>(
          queryKeys.heroes.all,
          previous.map((h) => (h.id === heroId ? { ...h, ...patch } : h)),
        );
      }
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.heroes.all, context.previous);
      }
      toast.error(`Falha ao sincronizar: ${err instanceof Error ? err.message : 'Erro'}`);
    },
  });

  // Atalhos rápidos
  const modifyHealth = useCallback(
    (heroId: string, delta: number) => {
      const heroes = queryClient.getQueryData<CharacterRow[]>(queryKeys.heroes.all) || [];
      const hero = heroes.find((h) => h.id === heroId);
      if (!hero) return;
      const current = hero.health ?? 10;
      const max = hero.max_health ?? 10;
      const next = Math.max(0, Math.min(max, current + delta));
      if (next === current) return;

      vitalsMutation.mutate({
        heroId,
        patch: { health: next, alive: next > 0 },
      });
    },
    [queryClient, vitalsMutation],
  );

  const modifyFocus = useCallback(
    (heroId: string, delta: number) => {
      const heroes = queryClient.getQueryData<CharacterRow[]>(queryKeys.heroes.all) || [];
      const hero = heroes.find((h) => h.id === heroId);
      if (!hero) return;
      const current = hero.focus ?? 3;
      const max = hero.max_focus ?? 3;
      const next = Math.max(0, Math.min(max, current + delta));
      if (next === current) return;

      vitalsMutation.mutate({
        heroId,
        patch: { focus: next },
      });
    },
    [queryClient, vitalsMutation],
  );

  const modifyPlague = useCallback(
    (heroId: string, delta: number) => {
      const heroes = queryClient.getQueryData<CharacterRow[]>(queryKeys.heroes.all) || [];
      const hero = heroes.find((h) => h.id === heroId);
      if (!hero) return;
      const current = hero.plague ?? 0;
      const next = Math.max(0, Math.min(10, current + delta));
      if (next === current) return;

      vitalsMutation.mutate({
        heroId,
        patch: { plague: next },
      });
    },
    [queryClient, vitalsMutation],
  );

  const modifySaciedade = useCallback(
    (heroId: string, delta: number) => {
      const heroes = queryClient.getQueryData<CharacterRow[]>(queryKeys.heroes.all) || [];
      const hero = heroes.find((h) => h.id === heroId);
      if (!hero) return;
      const current = hero.saciedade ?? 8;
      const next = Math.max(0, Math.min(10, current + delta));
      if (next === current) return;

      vitalsMutation.mutate({
        heroId,
        patch: { saciedade: next },
      });
    },
    [queryClient, vitalsMutation],
  );

  const modifyInspiration = useCallback(
    (heroId: string, delta: number) => {
      const heroes = queryClient.getQueryData<CharacterRow[]>(queryKeys.heroes.all) || [];
      const hero = heroes.find((h) => h.id === heroId);
      if (!hero) return;
      const current = hero.inspiration ?? 0;
      const next = Math.max(0, Math.min(2, current + delta));
      if (next === current) return;

      vitalsMutation.mutate({
        heroId,
        patch: { inspiration: next },
      });
    },
    [queryClient, vitalsMutation],
  );

  const toggleExausto = useCallback(
    (heroId: string) => {
      const heroes = queryClient.getQueryData<CharacterRow[]>(queryKeys.heroes.all) || [];
      const hero = heroes.find((h) => h.id === heroId);
      if (!hero) return;
      const current = Boolean(hero.exausto);

      vitalsMutation.mutate({
        heroId,
        patch: { exausto: !current },
      });
    },
    [queryClient, vitalsMutation],
  );

  const applyCondition = useCallback(
    async (heroId: string, conditionName: string) => {
      const heroes = queryClient.getQueryData<CharacterRow[]>(queryKeys.heroes.all) || [];
      const hero = heroes.find((h) => h.id === heroId);
      if (!hero) return;
      await applyConditionToHero(hero, conditionName);
      await queryClient.invalidateQueries({ queryKey: queryKeys.heroes.all });
      toast.success(`Condição "${conditionName}" aplicada a ${hero.name}.`);
    },
    [queryClient],
  );

  const removeCondition = useCallback(
    async (heroId: string, conditionName: string) => {
      const heroes = queryClient.getQueryData<CharacterRow[]>(queryKeys.heroes.all) || [];
      const hero = heroes.find((h) => h.id === heroId);
      if (!hero) return;
      await removeConditionFromHero(hero, conditionName);
      await queryClient.invalidateQueries({ queryKey: queryKeys.heroes.all });
      toast.success(`Condição "${conditionName}" removida de ${hero.name}.`);
    },
    [queryClient],
  );

  const giveItem = useCallback(
    async (heroId: string, itemData: Partial<InventoryRow>) => {
      await giveItemToHero(heroId, itemData);
      await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.byHero(heroId) });
      toast.success(`Item "${itemData.name}" concedido com sucesso!`);
    },
    [queryClient],
  );

  const removeItem = useCallback(
    async (itemId: string, heroId: string) => {
      await removeItemFromHero(itemId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.byHero(heroId) });
      toast.success('Item removido do inventário.');
    },
    [queryClient],
  );

  // Mapeamento normalizado dos heróis para exibição nos cards
  const heroesList: HeroDashboardItem[] = (heroesQuery.data || []).map((c) => {
    const onlinePlayer = (playersQuery.data || []).find(
      (p) => p.character_id === c.id || p.id === c.id,
    );
    const isOnline = Boolean(onlinePlayer?.is_online || c.active);

    const rawAttributes = (c.attributes as Record<string, number>) || {};
    const attributes = {
      corpo: Number(rawAttributes.corpo ?? 0),
      astucia: Number(rawAttributes.astucia ?? 0),
      vontade: Number(rawAttributes.vontade ?? 0),
      presenca: Number(rawAttributes.presenca ?? 0),
    };

    const conditions = Array.isArray(c.conditions)
      ? (c.conditions as string[])
      : [];

    const skills = Array.isArray(c.skills)
      ? (c.skills as Array<{ name: string; bonus: number; nivel?: number }>)
      : [];

    return {
      id: c.id,
      name: c.name,
      race: c.race || 'Jurado',
      caminho: c.caminho || 'Sem Caminho',
      epithet: c.title || undefined,
      avatarIcon: c.avatar_icon || null,
      portraitUrl: c.avatar_icon || null,
      health: Number(c.health ?? 10),
      maxHealth: Number(c.max_health ?? 10),
      plague: Number(c.plague ?? 0),
      focus: Number(c.focus ?? 3),
      maxFocus: Number(c.max_focus ?? 3),
      inspiration: Math.min(2, Math.max(0, Number(c.inspiration ?? 0))),
      saciedade: Number(c.saciedade ?? 8),
      coinsBronze: Number(c.coins_bronze ?? 0),
      defense: Number(c.defense ?? 8),
      exausto: Boolean(c.exausto),
      conditions,
      isOnline,
      attributes,
      skills,
      oath: c.oath || undefined,
      oathType: c.oath_type || undefined,
      oathPower: c.oath_power || undefined,
      oathItem: c.oath_item || undefined,
      gift: c.gift || undefined,
      racialTrait: c.racial_trait || undefined,
      backstory: c.backstory || undefined,
      connection: c.connection || undefined,
      raw: c,
    };
  });

  return {
    heroes: heroesList,
    isLoading: heroesQuery.isLoading,
    modifyHealth,
    modifyFocus,
    modifyPlague,
    modifySaciedade,
    modifyInspiration,
    toggleExausto,
    applyCondition,
    removeCondition,
    giveItem,
    removeItem,
    updateHeroVitals: (heroId: string, patch: Partial<CharacterRow>) =>
      vitalsMutation.mutateAsync({ heroId, patch }),
  };
}
