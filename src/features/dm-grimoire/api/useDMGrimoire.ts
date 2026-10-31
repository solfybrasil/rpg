import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../../shared/supabase';
import {
  type GrimorioSpell,
  fetchAllHeroiMagias,
  fetchHeroiMagias,
  fetchMagiasAfinidade,
  fetchMagiasCatalogo,
  magiaMestreDesfazerRPC,
  magiaMestreEnsinarRPC,
  magiaMestreLiberarRPC,
  magiaMestreRemover,
  salvarMagiaEditada,
  subscribeToHeroiMagiasRealtime,
} from '../../grimoire/api';
import {
  masterUndoMark,
  masterUnlockFree,
} from '../../../services/oathTreeService';

export const DM_GRIMOIRE_KEYS = {
  all: ['dm-grimoire'] as const,
  catalog: () => [...DM_GRIMOIRE_KEYS.all, 'catalog'] as const,
  heroSpells: (heroId?: string) => [...DM_GRIMOIRE_KEYS.all, 'hero-spells', heroId || 'all'] as const,
  afinidades: () => [...DM_GRIMOIRE_KEYS.all, 'afinidades'] as const,
};

/**
 * Hook para carregar todas as ~1.000 magias do catálogo central.
 */
export function useAllSpellsCatalog() {
  return useQuery({
    queryKey: DM_GRIMOIRE_KEYS.catalog(),
    queryFn: async () => {
      return await fetchMagiasCatalogo();
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para carregar afinidades mágicas dos caminhos.
 */
export function useMagiasAfinidade() {
  return useQuery({
    queryKey: DM_GRIMOIRE_KEYS.afinidades(),
    queryFn: async () => {
      return await fetchMagiasAfinidade();
    },
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Hook para carregar os vínculos de magias de todos os heróis ou de um herói específico,
 * com sincronização em tempo real via Supabase Realtime.
 */
export function useAllHeroSpells(heroId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = subscribeToHeroiMagiasRealtime(() => {
      void queryClient.invalidateQueries({ queryKey: DM_GRIMOIRE_KEYS.heroSpells() });
    }, heroId || null);

    return () => {
      unsub();
    };
  }, [queryClient, heroId]);

  return useQuery({
    queryKey: DM_GRIMOIRE_KEYS.heroSpells(heroId),
    queryFn: async () => {
      if (heroId) {
        return await fetchHeroiMagias(heroId);
      }
      return await fetchAllHeroiMagias();
    },
    staleTime: 1000 * 15,
  });
}

/**
 * Mutação: Mestre ensina magia diretamente ao herói (aprendida: true, marcas: 0, gratis: true).
 */
export function useEnsinarMagiaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ characterId, magiaId, magiaNome }: { characterId: string; magiaId: string | number; magiaNome?: string }) => {
      await magiaMestreEnsinarRPC(characterId, String(magiaId));
      return { characterId, magiaId, magiaNome };
    },
    onSuccess: ({ magiaNome }) => {
      toast.success(`Magia "${magiaNome || 'desconhecida'}" concedida ao herói!`);
      void queryClient.invalidateQueries({ queryKey: DM_GRIMOIRE_KEYS.heroSpells() });
    },
    onError: (err: any) => {
      toast.error(`Falha ao ensinar magia: ${err.message || 'Erro desconhecido'}`);
    },
  });
}

/**
 * Mutação: Mestre libera magia no mundo para o herói (permite investimento de Inspiração).
 */
export function useLiberarMagiaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ characterId, magiaId, magiaNome }: { characterId: string; magiaId: string | number; magiaNome?: string }) => {
      await magiaMestreLiberarRPC(characterId, String(magiaId));
      return { characterId, magiaId, magiaNome };
    },
    onSuccess: ({ magiaNome }) => {
      toast.success(`Magia "${magiaNome || 'desconhecida'}" liberada para estudo no mundo!`);
      void queryClient.invalidateQueries({ queryKey: DM_GRIMOIRE_KEYS.heroSpells() });
    },
    onError: (err: any) => {
      toast.error(`Falha ao liberar magia: ${err.message || 'Erro desconhecido'}`);
    },
  });
}

/**
 * Mutação: Mestre desfaz 1 marca ou reverte aprendizado de magia.
 */
export function useDesfazerMarcaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ characterId, magiaId }: { characterId: string; magiaId: string | number }) => {
      await magiaMestreDesfazerRPC(characterId, String(magiaId));
      return { characterId, magiaId };
    },
    onSuccess: () => {
      toast.success('Marca ou aprendizado desfeito com sucesso.');
      void queryClient.invalidateQueries({ queryKey: DM_GRIMOIRE_KEYS.heroSpells() });
    },
    onError: (err: any) => {
      toast.error(`Falha ao desfazer marca: ${err.message || 'Erro desconhecido'}`);
    },
  });
}

/**
 * Mutação: Mestre remove completamente a magia do grimório do herói.
 */
export function useRemoverMagiaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ characterId, magiaId, magiaNome }: { characterId: string; magiaId: string | number; magiaNome?: string }) => {
      await magiaMestreRemover(characterId, magiaId);
      return { characterId, magiaId, magiaNome };
    },
    onSuccess: ({ magiaNome }) => {
      toast.success(`Magia "${magiaNome || 'desconhecida'}" removida do grimório.`);
      void queryClient.invalidateQueries({ queryKey: DM_GRIMOIRE_KEYS.heroSpells() });
    },
    onError: (err: any) => {
      toast.error(`Falha ao remover magia: ${err.message || 'Erro desconhecido'}`);
    },
  });
}

/**
 * Mutação: Salvar alterações na magia no catálogo Supabase.
 */
export function useSalvarMagiaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ magiaId, updates }: { magiaId: string | number; updates: Record<string, any> }) => {
      return await salvarMagiaEditada(magiaId, updates);
    },
    onSuccess: () => {
      toast.success('Magia atualizada com sucesso no grimório motor!');
      void queryClient.invalidateQueries({ queryKey: DM_GRIMOIRE_KEYS.catalog() });
    },
    onError: (err: any) => {
      toast.error(`Falha ao salvar edição: ${err.message || 'Erro desconhecido'}`);
    },
  });
}

/**
 * Mutação: Alternar flag de revisão do Mestre (`revisar_mestre`).
 */
export function useAlternarRevisaoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ magiaId, novoValor }: { magiaId: string | number; novoValor: boolean }) => {
      return await salvarMagiaEditada(magiaId, { revisar_mestre: novoValor });
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.novoValor
          ? 'Magia enviada para fila de arbitragem do Mestre.'
          : 'Magia homologada para jogo (flag de revisão removida)!',
      );
      void queryClient.invalidateQueries({ queryKey: DM_GRIMOIRE_KEYS.catalog() });
    },
    onError: (err: any) => {
      toast.error(`Falha ao alternar revisão: ${err.message || 'Erro desconhecido'}`);
    },
  });
}

/**
 * Mutação: Mestre libera nó da árvore de graça sem gastar inspiração.
 */
export function useMasterUnlockFreeTreeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ characterId, noId, noNome }: { characterId: string; noId: string; noNome?: string }) => {
      await masterUnlockFree(characterId, noId);
      return { characterId, noId, noNome };
    },
    onSuccess: ({ noNome }) => {
      toast.success(`Nó "${noNome || 'de talento'}" liberado de graça pelo Mestre!`);
      void queryClient.invalidateQueries({ queryKey: ['hero-tree'] });
      void queryClient.invalidateQueries({ queryKey: ['characters'] });
    },
    onError: (err: any) => {
      toast.error(`Erro ao liberar nó: ${err.message || 'Falha no servidor'}`);
    },
  });
}

/**
 * Mutação: Mestre desfaz 1 marca ou nó da árvore do jogador.
 */
export function useMasterUndoMarkTreeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ characterId, noId }: { characterId: string; noId: string }) => {
      await masterUndoMark(characterId, noId);
      return { characterId, noId };
    },
    onSuccess: () => {
      toast.success('Marca ou nó desfeito na árvore do herói.');
      void queryClient.invalidateQueries({ queryKey: ['hero-tree'] });
      void queryClient.invalidateQueries({ queryKey: ['characters'] });
    },
    onError: (err: any) => {
      toast.error(`Erro ao desfazer marca: ${err.message || 'Falha no servidor'}`);
    },
  });
}

/**
 * Mutação: Mestre altera quantidade de Inspiração do herói (+1 ou -1).
 */
export function useAdjustHeroInspirationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ characterId, currentInspiration, delta }: { characterId: string; currentInspiration: number; delta: number }) => {
      const nextInsp = Math.max(0, currentInspiration + delta);
      const { data, error } = await supabase
        .from('characters')
        .update({ inspiration: nextInsp, updated_at: new Date().toISOString() })
        .eq('id', characterId)
        .select();

      if (error) throw error;
      return { characterId, nextInsp, data };
    },
    onSuccess: ({ nextInsp }) => {
      toast.success(`Inspiração do herói ajustada para ${nextInsp}✦.`);
      void queryClient.invalidateQueries({ queryKey: ['characters'] });
      void queryClient.invalidateQueries({ queryKey: ['heroes'] });
    },
    onError: (err: any) => {
      toast.error(`Erro ao ajustar inspiração: ${err.message}`);
    },
  });
}
