import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../../shared/supabase';
import {
  type GrimorioSpell,
  fetchAllHeroiMagias,
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
  /** Prefixo de TODAS as consultas de magias de heróis (usado para invalidar). */
  heroSpellsRoot: () => [...DM_GRIMOIRE_KEYS.all, 'hero-spells'] as const,
  heroSpells: (heroId?: string) => [...DM_GRIMOIRE_KEYS.all, 'hero-spells', heroId || 'all'] as const,
  afinidades: () => [...DM_GRIMOIRE_KEYS.all, 'afinidades'] as const,
};

/** Vínculo herói ↔ magia (tabela heroi_magias). */
export interface HeroSpellRow {
  character_id: string;
  magia_id: number;
  marcas: number;
  aprendida: boolean;
  liberada_pelo_mestre: boolean;
  gratis?: boolean;
  usos?: number;
  magias?: GrimorioSpell;
}

/** Catálogo completo (~1.000 magias), já com as edições do Mestre. */
export function useAllSpellsCatalog() {
  return useQuery({
    queryKey: DM_GRIMOIRE_KEYS.catalog(),
    queryFn: fetchMagiasCatalogo,
    staleTime: 1000 * 60 * 10,
  });
}

export function useMagiasAfinidade() {
  return useQuery({
    queryKey: DM_GRIMOIRE_KEYS.afinidades(),
    queryFn: fetchMagiasAfinidade,
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Magias de todos os heróis (dados reais do banco, sem magias "padrão" inventadas),
 * com tempo real.
 */
export function useAllHeroSpells() {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      subscribeToHeroiMagiasRealtime(() => {
        void queryClient.invalidateQueries({ queryKey: DM_GRIMOIRE_KEYS.heroSpellsRoot() });
      }, null),
    [queryClient],
  );

  return useQuery({
    queryKey: DM_GRIMOIRE_KEYS.heroSpells(),
    queryFn: async () => (await fetchAllHeroiMagias()) as unknown as HeroSpellRow[],
    staleTime: 1000 * 15,
  });
}

type SpellVars = { characterId: string; magiaId: string | number; magiaNome?: string };

/**
 * Mutação de magia de herói com atualização otimista: a tela muda na hora e
 * volta atrás se o servidor recusar.
 */
function useHeroSpellMutation(
  run: (v: SpellVars) => Promise<unknown>,
  patch: (rows: HeroSpellRow[], v: SpellVars) => HeroSpellRow[],
  successMsg: (v: SpellVars) => string,
  errorLabel: string,
) {
  const queryClient = useQueryClient();
  const key = DM_GRIMOIRE_KEYS.heroSpells();
  return useMutation({
    mutationFn: async (v: SpellVars) => {
      await run(v);
      return v;
    },
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<HeroSpellRow[]>(key);
      queryClient.setQueryData<HeroSpellRow[]>(key, (rows) => patch(rows ?? [], v));
      return { previous };
    },
    onError: (err: any, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      toast.error(`${errorLabel}: ${err?.message || 'erro desconhecido'}`);
    },
    onSuccess: (v) => toast.success(successMsg(v)),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: DM_GRIMOIRE_KEYS.heroSpellsRoot() });
    },
  });
}

function upsertRow(rows: HeroSpellRow[], v: SpellVars, change: Partial<HeroSpellRow>) {
  const id = Number(v.magiaId);
  const i = rows.findIndex((r) => r.character_id === v.characterId && Number(r.magia_id) === id);
  if (i === -1) {
    return [
      ...rows,
      { character_id: v.characterId, magia_id: id, marcas: 0, aprendida: false, liberada_pelo_mestre: false, ...change },
    ];
  }
  const next = rows.slice();
  next[i] = { ...rows[i], ...change };
  return next;
}

/** Mestre ensina a magia na hora (o herói passa a conhecê-la). */
export function useEnsinarMagiaMutation() {
  return useHeroSpellMutation(
    (v) => magiaMestreEnsinarRPC(v.characterId, String(v.magiaId)),
    (rows, v) => upsertRow(rows, v, { aprendida: true, liberada_pelo_mestre: true }),
    (v) => `"${v.magiaNome || 'Magia'}" ensinada.`,
    'Falha ao ensinar magia',
  );
}

/** Mestre libera a magia para estudo (o herói investe Inspiração para aprender). */
export function useLiberarMagiaMutation() {
  return useHeroSpellMutation(
    (v) => magiaMestreLiberarRPC(v.characterId, String(v.magiaId)),
    (rows, v) => upsertRow(rows, v, { liberada_pelo_mestre: true }),
    (v) => `"${v.magiaNome || 'Magia'}" liberada para estudo.`,
    'Falha ao liberar magia',
  );
}

/** Desfaz 1 marca, ou o aprendizado se a magia já era conhecida. */
export function useDesfazerMarcaMutation() {
  return useHeroSpellMutation(
    (v) => magiaMestreDesfazerRPC(v.characterId, String(v.magiaId)),
    (rows, v) => {
      const row = rows.find((r) => r.character_id === v.characterId && Number(r.magia_id) === Number(v.magiaId));
      if (!row) return rows;
      return upsertRow(rows, v, row.aprendida ? { aprendida: false } : { marcas: Math.max(0, (row.marcas || 0) - 1) });
    },
    () => 'Marca desfeita.',
    'Falha ao desfazer',
  );
}

/** Remove a magia do grimório do herói. */
export function useRemoverMagiaMutation() {
  return useHeroSpellMutation(
    (v) => magiaMestreRemover(v.characterId, v.magiaId),
    (rows, v) => rows.filter((r) => !(r.character_id === v.characterId && Number(r.magia_id) === Number(v.magiaId))),
    (v) => `"${v.magiaNome || 'Magia'}" removida do grimório.`,
    'Falha ao remover magia',
  );
}

/** Salva a edição de uma magia do catálogo (atualiza a lista na hora). */
export function useSalvarMagiaMutation() {
  const queryClient = useQueryClient();
  const key = DM_GRIMOIRE_KEYS.catalog();
  return useMutation({
    mutationFn: async ({
      magia,
      updates,
    }: {
      magia: GrimorioSpell;
      updates: Record<string, any>;
    }) => salvarMagiaEditada(magia.id, updates, magia.__raw as Record<string, unknown> | undefined),
    onSuccess: () => {
      toast.success('Magia salva.');
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (err: any) => toast.error(`Falha ao salvar: ${err?.message || 'erro desconhecido'}`),
  });
}

/** Marca/desmarca a magia para revisão do Mestre (fila de Provações). */
export function useAlternarRevisaoMutation() {
  const queryClient = useQueryClient();
  const key = DM_GRIMOIRE_KEYS.catalog();
  return useMutation({
    mutationFn: async ({ magia, novoValor }: { magia: GrimorioSpell; novoValor: boolean }) =>
      salvarMagiaEditada(magia.id, { revisar_mestre: novoValor }, magia.__raw as Record<string, unknown> | undefined),
    onMutate: async ({ magia, novoValor }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<GrimorioSpell[]>(key);
      queryClient.setQueryData<GrimorioSpell[]>(key, (list) =>
        list?.map((m) => (m.id === magia.id ? { ...m, revisar_mestre: novoValor } : m)),
      );
      return { previous };
    },
    onError: (err: any, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      toast.error(`Falha ao alterar revisão: ${err?.message || 'erro desconhecido'}`);
    },
    onSuccess: (_d, v) =>
      toast.success(v.novoValor ? 'Magia enviada para revisão.' : `"${v.magia.nome}" aprovada para jogo.`),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
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
