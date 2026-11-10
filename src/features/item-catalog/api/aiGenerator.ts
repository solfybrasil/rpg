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
  provider: 'cloudflare-flux' | 'pollinations-flux';
}

export async function generateItemImageWithAI(
  params: GenerateItemImageParams,
): Promise<GenerateItemImageResult> {
  if (!params.name || !params.name.trim()) {
    throw new Error('Informe o nome do artigo antes de gerar a imagem.');
  }

  // 1. Tentar Edge Function Supabase: 'gerar-imagens-itens' (Cloudflare FLUX-1-schnell)
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
    if (error) {
      console.warn('[AI Image] Supabase Edge Function indisponível ou secrets não configurados:', error.message);
    }
  } catch (err) {
    console.warn('[AI Image] Erro ao invocar gerar-imagens-itens no Supabase:', err);
  }

  // 2. Tentar endpoint do servidor Vite local se estiver ativo com as credenciais
  try {
    const res = await fetch('/api/ai/generate-item-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.imageUrl) {
        return {
          imageUrl: data.imageUrl,
          promptEn: data.promptEn,
          provider: 'cloudflare-flux',
        };
      }
    }
  } catch (err) {
    console.warn('[AI Image] Endpoint local Vite não respondeu:', err);
  }

  // 3. Fallback client-side direto via Pollinations usando o modelo FLUX e o mesmo prompt dark fantasy
  const desc = params.description ? params.description.slice(0, 80) : params.category || 'equipment';
  const prompt = `Fantasy RPG inventory icon of ${params.name}, ${desc}, single object centered, full view, painterly game asset style, dark fantasy, warm soft lighting, plain dark stone background, no text, no border, square`;
  const seed = Math.floor(Math.random() * 1000000);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=512&height=512&nologo=true&seed=${seed}`;

  return {
    imageUrl,
    promptEn: prompt,
    provider: 'pollinations-flux',
  };
}
