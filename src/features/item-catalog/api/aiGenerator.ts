/**
 * Serviço de geração de imagens de itens com IA (FLUX schnell da Cloudflare Workers AI)
 */

import { supabase } from '../../../shared/supabase/client.ts';

export interface GenerateItemImageParams {
  name: string;
  description?: string;
  category?: string;
  itemId?: string;
  model?: string;
}

export interface GenerateItemImageResult {
  imageUrl: string;
  promptEn?: string;
  provider: 'cloudflare-flux';
}

export async function generateItemImageWithAI(
  params: GenerateItemImageParams,
): Promise<GenerateItemImageResult> {
  if (!params.name || !params.name.trim()) {
    throw new Error('Informe o nome do artigo antes de gerar a imagem.');
  }

  let lastError: string | null = null;

  // 1. Tentar endpoint do Vite (servidor com Cloudflare FLUX)
  try {
    const res = await fetch('/api/ai/generate-item-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.imageUrl) {
      return {
        imageUrl: data.imageUrl,
        promptEn: data.promptEn,
        provider: 'cloudflare-flux',
      };
    }

    if (data?.error) {
      lastError = data.error;
    }
  } catch (err: any) {
    console.warn('[AI Image] Falha no endpoint local Vite:', err);
    lastError = err?.message || 'Falha na conexão com o servidor local.';
  }

  // 2. Tentar Edge Function Supabase: 'gerar-imagens-itens' (Cloudflare FLUX)
  try {
    const { data, error } = await supabase.functions.invoke('gerar-imagens-itens', {
      body: {
        name: params.name.trim(),
        description: params.description?.trim(),
        category: params.category,
        itemId: params.itemId,
      },
    });

    if (!error && data?.imageUrl) {
      return {
        imageUrl: data.imageUrl,
        promptEn: data.promptEn,
        provider: 'cloudflare-flux',
      };
    }

    if (error?.message) {
      lastError = error.message;
    }
  } catch (err: any) {
    console.warn('[AI Image] Erro ao invocar Edge Function:', err);
    if (!lastError) lastError = err?.message || 'Falha na Edge Function da Cloudflare.';
  }

  // Não usar Pollinations! Lançar o erro real da Cloudflare
  throw new Error(
    lastError ||
      'Não foi possível gerar a imagem no Cloudflare FLUX. Verifique as credenciais ou a cota diária gratuita (10.000 neurônios).',
  );
}
