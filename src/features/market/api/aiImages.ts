import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase as typedSupabase } from '../../../shared/supabase';

// biome-ignore lint/suspicious/noExplicitAny: consulta simples de contagem
const db = typedSupabase as any;

export const IMAGE_FUNCTION = 'gerar-imagens-itens';

export interface ImageRunResult {
  generated: Array<{ id: string; name: string; url: string }>;
  failed: Array<{ id: string; name: string; error: string }>;
  stopped: 'tempo' | 'cota' | null;
  remaining: number | null;
}

/** Quantos itens do catálogo já têm imagem. */
export function useImageStats() {
  return useQuery({
    queryKey: ['market', 'image-stats'],
    queryFn: async () => {
      const base = () => db.from('item_catalog').select('id', { count: 'exact', head: true }).or('archived.is.null,archived.eq.false');
      const [all, missing] = await Promise.all([base(), base().is('image_url', null)]);
      if (all.error) throw new Error(all.error.message);
      return { total: all.count ?? 0, missing: missing.count ?? 0 };
    },
    staleTime: 30_000,
  });
}

/** Mensagem clara quando a função ainda não foi publicada ou falta configuração. */
async function explain(err: unknown): Promise<string> {
  const e = err as { name?: string; message?: string; context?: Response };
  if (e?.context && typeof e.context.json === 'function') {
    try {
      const body = await e.context.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      /* corpo não é JSON */
    }
    if (e.context.status === 404) return 'A função de imagens ainda não foi publicada no Supabase.';
  }
  if (e?.name === 'FunctionsFetchError' || e?.name === 'FunctionsRelayError') {
    return 'Não foi possível falar com a função de imagens (ela foi publicada no Supabase?).';
  }
  return e?.message || 'Erro desconhecido';
}

/** Chama a Edge Function que gera imagens com IA. */
export async function generateItemImages(body: { limit?: number; ids?: string[]; regenerate?: boolean }): Promise<ImageRunResult> {
  const { data, error } = await db.functions.invoke(IMAGE_FUNCTION, { body });
  if (error) throw new Error(await explain(error));
  return data as ImageRunResult;
}

export function useGenerateImages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: generateItemImages,
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['market', 'image-stats'] });
      void qc.invalidateQueries({ queryKey: ['market', 'catalog'] });
      void qc.invalidateQueries({ queryKey: ['item_catalog'] });
    },
  });
}
