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

  // 1. Tentar endpoint local do Vite (servidor de desenvolvimento com Cloudflare FLUX)
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
    console.warn('[AI Image] Endpoint local Vite indisponível, tentando Edge Function:', err);
  }

  // 2. Tentar Edge Function Supabase: 'gerar-imagens-itens' (em produção ou se o Vite não estiver interceptando)
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
  } catch (err) {
    console.warn('[AI Image] Erro ao invocar gerar-imagens-itens no Supabase:', err);
  }

  // 3. Fallback client-side direto com o mesmo prompt FLUX e fundo cinza sólido
  const desc = params.description ? params.description.slice(0, 80) : params.category || 'equipment';
  const prompt = `Fantasy RPG inventory item icon of ${params.name}, ${desc}, single object centered, full view, detailed painted game asset, soft studio lighting, solid flat neutral gray background, plain uniform medium gray backdrop, no pattern, no texture, no text, no border, square`;
  const seed = Math.floor(Math.random() * 1000000);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=512&height=512&nologo=true&seed=${seed}`;

  return {
    imageUrl,
    promptEn: prompt,
    provider: 'pollinations-flux',
  };
}
