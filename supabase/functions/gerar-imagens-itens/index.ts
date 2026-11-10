// Gera a imagem dos itens do catálogo com o Cloudflare Workers AI.
//
// Chamadas aceitas (POST, JSON):
//   {}                         → próximos 50 itens sem imagem
//   { "limit": 20 }            → próximos 20 itens sem imagem (máximo 50)
//   { "ids": ["espada-longa"] } → só estes itens (os que ainda não têm imagem)
//   { "ids": [...], "regenerate": true } → refaz a imagem destes itens
//
// Secrets (Supabase → Edge Functions → Secrets):
//   CF_ACCOUNT_ID  id da conta Cloudflare
//   CF_API_TOKEN   token com permissão "Workers AI"
//   (opcionais) CF_IMAGE_MODEL, CF_TEXT_MODEL, ITEM_IMAGES_BUCKET
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem em toda Edge Function.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_BATCH = 50;
const PARALLEL = 4;
/** Para antes do limite de tempo da função (150 s no plano grátis). */
const TIME_BUDGET_MS = 110_000;

/** Prompt-modelo fixo: todos os ícones com a mesma cara. */
function buildPrompt(name: string, short: string) {
  return `Fantasy RPG inventory icon of ${name}, ${short}, single object centered, painterly game asset style, dark fantasy, warm ember lighting, soft shadow, plain dark stone background, no text, no border, square 1:1`;
}

type Item = { id: string; name: string; category: string | null; description: string | null; special: string | null; rarity: string | null };

class QuotaError extends Error {}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function seedOf(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2147483647;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  const account = Deno.env.get('CF_ACCOUNT_ID');
  const token = Deno.env.get('CF_API_TOKEN');
  if (!account || !token) {
    return json({ error: 'Faltam os secrets CF_ACCOUNT_ID e CF_API_TOKEN na Edge Function.' }, 500);
  }
  const imageModel = Deno.env.get('CF_IMAGE_MODEL') || '@cf/black-forest-labs/flux-1-schnell';
  const textModel = Deno.env.get('CF_TEXT_MODEL') || '@cf/meta/llama-3.1-8b-instruct';
  const bucket = Deno.env.get('ITEM_IMAGES_BUCKET') || 'items';

  const body = await req.json().catch(() => ({}));
  const limit = Math.max(1, Math.min(MAX_BATCH, Number(body?.limit) || MAX_BATCH));
  const ids: string[] | null = Array.isArray(body?.ids) ? body.ids.map(String).slice(0, MAX_BATCH) : null;
  const regenerate = Boolean(body?.regenerate);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let q = db.from('item_catalog').select('id, name, category, description, special, rarity');
  if (ids) {
    q = q.in('id', ids);
    if (!regenerate) q = q.is('image_url', null);
  } else {
    q = q.is('image_url', null).or('archived.is.null,archived.eq.false').order('name').limit(limit);
  }
  const { data: items, error } = await q;
  if (error) return json({ error: error.message }, 500);

  const ai = async (model: string, input: unknown) => {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const text = await res.text();
    if (res.status === 429 || /quota|neurons|limit exceeded|daily free allocation/i.test(text)) {
      throw new QuotaError('Cota diária da Cloudflare acabou.');
    }
    if (!res.ok) throw new Error(`Cloudflare ${res.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text).result;
  };

  /** Nome e descrição curta em inglês, só com o que dá para desenhar. */
  const describe = async (it: Item) => {
    const desc = String(it.description || it.special || '')
      .replace(/\s+/g, ' ')
      .slice(0, 300);
    try {
      const r = await ai(textModel, {
        messages: [
          {
            role: 'system',
            content:
              'You write prompts for an image generator. Translate a fantasy RPG item from Portuguese and describe only what it looks like. Reply in ONE line exactly as: <english item name> | <visual description, max 14 words>. No game rules, no numbers, no quotes.',
          },
          { role: 'user', content: `Item: ${it.name}\nCategoria: ${it.category ?? ''}\nRaridade: ${it.rarity ?? ''}\nDescrição: ${desc}` },
        ],
        max_tokens: 60,
        temperature: 0.2,
      });
      const line = String(r?.response ?? '').split('\n')[0].replace(/["*]/g, '').trim();
      const [n, d] = line.split('|').map((s) => s.trim());
      if (n && d) return { name: n, short: d };
    } catch (err) {
      if (err instanceof QuotaError) throw err;
    }
    return { name: it.name, short: (it.category ? `${it.category}, ` : '') + desc.slice(0, 90) };
  };

  const started = Date.now();
  const generated: Array<{ id: string; name: string; url: string }> = [];
  const failed: Array<{ id: string; name: string; error: string }> = [];
  let stopped: string | null = null;
  const queue = [...((items ?? []) as Item[])];

  const worker = async () => {
    while (queue.length && !stopped) {
      if (Date.now() - started > TIME_BUDGET_MS) {
        stopped = 'tempo';
        return;
      }
      const it = queue.shift()!;
      try {
        const d = await describe(it);
        const out = await ai(imageModel, { prompt: buildPrompt(d.name, d.short), steps: 6, seed: seedOf(it.id) });
        const b64 = String(out?.image ?? '');
        if (!b64) throw new Error('Cloudflare não devolveu imagem.');
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const path = `catalogo/${it.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`;
        const up = await db.storage.from(bucket).upload(path, bytes, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '31536000',
        });
        if (up.error) throw new Error(`Storage: ${up.error.message}`);
        const url = `${db.storage.from(bucket).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
        const upd = await db.from('item_catalog').update({ image_url: url, updated_at: new Date().toISOString() }).eq('id', it.id);
        if (upd.error) throw new Error(upd.error.message);
        // Cópias já existentes (mochilas e loja antiga) ganham a imagem também.
        await db.from('inventory_items').update({ image_url: url }).eq('catalog_id', it.id).is('image_url', null);
        await db.from('shop_items').update({ image_url: url }).eq('catalog_id', it.id).is('image_url', null);
        generated.push({ id: it.id, name: it.name, url });
      } catch (err) {
        if (err instanceof QuotaError) {
          stopped = 'cota';
          queue.unshift(it);
          return;
        }
        failed.push({ id: it.id, name: it.name, error: err instanceof Error ? err.message : String(err) });
      }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));

  const { count } = await db
    .from('item_catalog')
    .select('id', { count: 'exact', head: true })
    .is('image_url', null)
    .or('archived.is.null,archived.eq.false');

  return json({ generated, failed, stopped, remaining: count ?? null });
});
