/**
 * Prova 1: Teste com 5 itens diferentes usando @cf/black-forest-labs/flux-1-schnell
 * Salva no Supabase Storage e retorna as URLs públicas.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ermkaldfvvjgnhgnvcqo.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Hnsb7fiVx3sKa7eFmxiD8w_aB0eoaGr';

const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || '';
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_ITEMS = [
  {
    family: 'espada-de-ferro',
    namePt: 'Espada de Ferro',
    promptEn: 'iron sword, steel blade with leather wrapped hilt',
  },
  {
    family: 'pocao-de-vida',
    namePt: 'Poção de Vida',
    promptEn: 'healing potion, glowing red liquid in ornate glass flask with brass cork',
  },
  {
    family: 'erva-medicinal',
    namePt: 'Erva Medicinal da Floresta',
    promptEn: 'medicinal herb sprig, fresh green serrated leaves with tiny luminescent dew',
  },
  {
    family: 'anel-do-juramento',
    namePt: 'Anel do Juramento',
    promptEn: 'ancient golden signet ring, engraved gold band with sparkling ruby gemstone',
  },
  {
    family: 'armadura-de-placas',
    namePt: 'Armadura de Placas de Aço',
    promptEn: 'steel plate armor, polished knight breastplate with darkened iron buckles',
  },
];

async function generateWithFlux(promptEn: string): Promise<Buffer> {
  const fullPrompt = `Fantasy RPG inventory icon of ${promptEn}, single object centered, full view, painterly game asset style, dark fantasy, warm soft lighting, plain dark stone background, no text, no border, square`;

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: fullPrompt, steps: 4 }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudflare FLUX error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  if (!json.result?.image) {
    throw new Error(`Imagem não retornada: ${JSON.stringify(json)}`);
  }

  return Buffer.from(json.result.image, 'base64');
}

async function uploadImage(family: string, buffer: Buffer): Promise<string> {
  const fileName = `${family}.jpg`;
  
  // Tenta bucket 'itens', se falhar tenta bucket 'items'
  let bucket = 'itens';
  let uploadRes = await supabase.storage.from(bucket).upload(fileName, buffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (uploadRes.error) {
    bucket = 'items';
    uploadRes = await supabase.storage.from(bucket).upload(`flux-test/${fileName}`, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  }

  if (uploadRes.error) {
    throw new Error(`Falha no upload para Storage: ${uploadRes.error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(bucket === 'itens' ? fileName : `flux-test/${fileName}`);
  return data.publicUrl;
}

async function main() {
  console.log('⚡ Gerando os 5 itens com Cloudflare FLUX-1-schnell (steps: 4)...\n');

  const results = [];

  for (let i = 0; i < TEST_ITEMS.length; i++) {
    const item = TEST_ITEMS[i];
    process.stdout.write(`[${i + 1}/5] Gerando ${item.namePt} (${item.family})... `);
    const start = Date.now();

    try {
      const buffer = await generateWithFlux(item.promptEn);
      const timeSec = ((Date.now() - start) / 1000).toFixed(1);
      process.stdout.write(`pronto em ${timeSec}s. Fazendo upload... `);

      const url = await uploadImage(item.family, buffer);
      console.log(`OK!\n   🔗 ${url}\n`);

      results.push({ item: item.namePt, url });
    } catch (err: any) {
      console.error(`ERRO: ${err.message}\n`);
    }

    if (i < TEST_ITEMS.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log('🎉 Todas as 5 imagens de prova foram geradas com sucesso!');
}

main().catch(console.error);
