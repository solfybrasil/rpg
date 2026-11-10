/**
 * Script de Produção para Gerar Ícones de Itens com Cloudflare Workers AI.
 *
 * Pipeline:
 * 1. Busca itens pendentes no Supabase (item_catalog onde image_url é null)
 * 2. Traduz e sumariza o item em inglês usando Llama 3.1 (@cf/meta/llama-3.1-8b-instruct)
 * 3. Gera a imagem com DreamShaper LCM ou SDXL Lightning (guidance 1.5, 8 steps, negative prompt)
 * 4. Faz upload do PNG para o Supabase Storage (bucket 'items/icons/{id}.png')
 * 5. Atualiza a coluna image_url no item_catalog
 *
 * Uso:
 *   npx tsx scripts/generate-item-images.ts --limit 10
 *   npx tsx scripts/generate-item-images.ts --limit 50 --model @cf/bytedance/stable-diffusion-xl-lightning
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ermkaldfvvjgnhgnvcqo.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Hnsb7fiVx3sKa7eFmxiD8w_aB0eoaGr';

const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || '';
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || '';

const DEFAULT_IMAGE_MODEL = '@cf/lykon/dreamshaper-8-lcm';
const LLAMA_MODEL = '@cf/meta/llama-3.1-8b-instruct';

const NEGATIVE_PROMPT =
  'dark, black background, blurry, low quality, noisy, text, watermark, frame, border, multiple objects, cropped';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    limit: 10,
    model: DEFAULT_IMAGE_MODEL,
    accountId: CF_ACCOUNT_ID,
    dryRun: false,
    delayMs: 600,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) options.limit = parseInt(args[++i], 10);
    if (args[i] === '--model' && args[i + 1]) options.model = args[++i];
    if (args[i] === '--account-id' && args[i + 1]) options.accountId = args[++i];
    if (args[i] === '--delay' && args[i + 1]) options.delayMs = parseInt(args[++i], 10);
    if (args[i] === '--dry-run') options.dryRun = true;
  }
  return options;
}

/**
 * Traduz o item de PT para EN em poucas palavras usando Llama 3.1 da Cloudflare.
 */
async function translateItemToEnglish(name: string, description?: string | null, category?: string | null): Promise<string> {
  const promptText = `Item: "${name}". Descrição: "${(description || category || '').slice(0, 100)}"`;

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${LLAMA_MODEL}`;
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
              "Convert this RPG item into a short English description for an icon: '<english item name>, <materials and colors>'. Reply ONLY with this short phrase (max 10 words), nothing else.",
          },
          { role: 'user', content: promptText },
        ],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const raw = data?.result?.response?.trim();
      if (raw && !raw.includes('\n')) {
        return raw.replace(/["']/g, '');
      }
    }
  } catch {
    // fallback se houver falha de rede na tradução
  }

  return `${name}, ${category || 'magical equipment'}`;
}

async function generateImage(promptEn: string, accountId: string, model: string): Promise<Buffer> {
  const fullPrompt = `fantasy rpg item icon, ${promptEn}, single object, centered, full view, detailed painted game asset, soft studio lighting, clean light parchment background, high quality, sharp`;

  const isSDXL = model.includes('stable-diffusion-xl');
  const width = isSDXL ? 1024 : 512;
  const height = isSDXL ? 1024 : 512;

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      negative_prompt: NEGATIVE_PROMPT,
      num_steps: 8,
      guidance: 1.5,
      width,
      height,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cloudflare AI error (${res.status}): ${errorText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToStorage(itemId: string, imageBuffer: Buffer): Promise<string> {
  const filePath = `icons/${itemId}.png`;

  const { error: uploadError } = await supabase.storage
    .from('items')
    .upload(filePath, imageBuffer, {
      contentType: 'image/png',
      upsert: true,
      cacheControl: '31536000',
    });

  if (uploadError) {
    throw new Error(`Erro ao enviar para Storage (${filePath}): ${uploadError.message}`);
  }

  const { data } = supabase.storage.from('items').getPublicUrl(filePath);
  return data.publicUrl;
}

async function main() {
  const options = parseArgs();
  console.log(`\n🧙 Pipeline de Geração de Ícones`);
  console.log(`   Modelo: ${options.model}`);
  console.log(`   Limite: ${options.limit}`);
  console.log(`   Dry Run: ${options.dryRun ? 'SIM' : 'NÃO'}\n`);

  const { data: items, error } = await supabase
    .from('item_catalog')
    .select('id, name, description, category, subcategory')
    .is('image_url', null)
    .limit(options.limit);

  if (error) {
    console.error('❌ Erro ao buscar itens do Supabase:', error.message);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.log('✨ Nenhum item sem imagem pendente no catálogo!');
    return;
  }

  console.log(`📦 Encontrados ${items.length} itens pendentes de imagem.\n`);

  let successCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`[${i + 1}/${items.length}] "${item.name}" (ID: ${item.id})`);

    try {
      process.stdout.write(`   🌐 Traduzindo... `);
      const promptEn = await translateItemToEnglish(item.name, item.description, item.category);
      console.log(`"${promptEn}"`);

      if (options.dryRun) {
        successCount++;
        continue;
      }

      const start = Date.now();
      process.stdout.write(`   🎨 Gerando imagem com ${options.model}... `);
      const imageBuffer = await generateImage(promptEn, options.accountId, options.model);
      const sec = ((Date.now() - start) / 1000).toFixed(1);
      process.stdout.write(`pronto em ${sec}s.\n`);

      process.stdout.write(`   ☁️ Salvando no Supabase Storage... `);
      const finalImageUrl = await uploadToStorage(item.id, imageBuffer);
      process.stdout.write(`OK!\n`);

      const { error: updateError } = await supabase
        .from('item_catalog')
        .update({ image_url: finalImageUrl })
        .eq('id', item.id);

      if (updateError) {
        console.error(`   ❌ Falha ao atualizar Supabase: ${updateError.message}`);
      } else {
        console.log(`   ✅ URL: ${finalImageUrl}`);
        successCount++;
      }
    } catch (err: any) {
      console.error(`\n   ❌ Erro no item "${item.name}": ${err.message}`);
    }

    if (i < items.length - 1) {
      await new Promise((r) => setTimeout(r, options.delayMs));
    }
  }

  console.log(`\n🎉 Concluído! ${successCount}/${items.length} itens processados com sucesso.\n`);
}

main().catch(console.error);
