/**
 * Script: Tradução de Famílias de Itens para Inglês
 * Gera descrição curta do objeto (material, cor, forma - max 20 palavras)
 * e salva em image_prompt_en.
 *
 * Suporta:
 * - Groq (se GROQ_API_KEY estiver definido)
 * - Cloudflare Llama 3.1 (@cf/meta/llama-3.1-8b-instruct)
 *
 * Uso:
 *   npx tsx scripts/translate-item-families.ts --limit 50
 *   npx tsx scripts/translate-item-families.ts --all
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ermkaldfvvjgnhgnvcqo.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Hnsb7fiVx3sKa7eFmxiD8w_aB0eoaGr';

const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || '';
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function translateWithAI(name: string, description?: string | null, category?: string | null): Promise<string> {
  const promptInput = `Item: "${name}". Categoria: "${category || ''}". Descrição: "${(description || '').slice(0, 100)}"`;

  // 1. Tentar Groq se chave configurada
  if (GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content:
                "Translate this RPG item to English as a concise visual prompt: '<item name in english>, <material, color and shape>'. Max 15 words. Reply ONLY with the phrase, no explanations, no quotes.",
            },
            { role: 'user', content: promptInput },
          ],
          temperature: 0.2,
          max_tokens: 40,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return text.replace(/["']/g, '');
      }
    } catch (e) {
      // Fallback para Cloudflare
    }
  }

  // 2. Fallback Cloudflare Workers AI (Llama 3.1)
  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content:
              "Translate this RPG item to English as a concise visual prompt: '<item name in english>, <material, color and shape>'. Max 15 words. Reply ONLY with the phrase, no explanations, no quotes.",
          },
          { role: 'user', content: promptInput },
        ],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.result?.response?.trim();
      if (text && !text.includes('\n')) return text.replace(/["']/g, '');
    }
  } catch (e) {
    // Fallback simples
  }

  return `${name}, ${category || 'fantasy equipment'}`;
}

async function main() {
  const args = process.argv.slice(2);
  let limit = 50;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[++i], 10);
    if (args[i] === '--all') limit = 4000;
  }

  console.log(`🌐 Traduzindo itens sem image_prompt_en (Limite: ${limit})...`);

  const { data: items, error } = await supabase
    .from('item_catalog')
    .select('id, name, description, category, image_family')
    .is('image_prompt_en', null)
    .limit(limit);

  if (error) {
    console.error('❌ Erro no Supabase:', error.message);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.log('✨ Todos os itens selecionados já possuem image_prompt_en!');
    return;
  }

  console.log(`📦 Encontrados ${items.length} itens para traduzir.\n`);

  let count = 0;
  for (const item of items) {
    const promptEn = await translateWithAI(item.name, item.description, item.category);
    console.log(`[${++count}/${items.length}] "${item.name}" -> "${promptEn}"`);

    const updateQuery = item.image_family
      ? supabase.from('item_catalog').update({ image_prompt_en: promptEn }).eq('image_family', item.image_family)
      : supabase.from('item_catalog').update({ image_prompt_en: promptEn }).eq('id', item.id);

    await updateQuery;
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n🎉 Concluído! ${count} itens traduzidos.`);
}

main().catch(console.error);
