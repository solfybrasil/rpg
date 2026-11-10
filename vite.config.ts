import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

interface CloudflareAccount {
  accountId: string;
  apiToken: string;
}

function getCloudflareAccounts(env: Record<string, string>): CloudflareAccount[] {
  const accounts: CloudflareAccount[] = [];
  const seen = new Set<string>();

  const addAccount = (id?: string, token?: string) => {
    const cleanId = (id || '').trim();
    const cleanToken = (token || '').trim();
    if (cleanId && cleanToken && !seen.has(cleanId)) {
      seen.add(cleanId);
      accounts.push({ accountId: cleanId, apiToken: cleanToken });
    }
  };

  for (let i = 1; i <= 5; i++) {
    addAccount(
      env[`CF_ACCOUNT_${i}_ID`] || env[`CLOUDFLARE_ACCOUNT_${i}_ID`] || process.env[`CF_ACCOUNT_${i}_ID`],
      env[`CF_ACCOUNT_${i}_TOKEN`] || env[`CLOUDFLARE_API_${i}_TOKEN`] || process.env[`CF_ACCOUNT_${i}_TOKEN`],
    );
  }

  addAccount(
    env.CLOUDFLARE_ACCOUNT_ID || env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID,
    env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN,
  );

  return accounts;
}

async function translateToVisualEnglishPrompt(
  name: string,
  description: string,
  category: string,
  accounts: CloudflareAccount[],
): Promise<string> {
  for (let idx = 0; idx < accounts.length; idx++) {
    const { accountId, apiToken } = accounts[idx];
    try {
      const llamaUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`;
      const res = await fetch(llamaUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an expert RPG visual asset artist. Convert the Portuguese item name and description into a clear, precise English physical description for an icon generator.
Identify the exact physical object (e.g. "Alaúde" -> "wooden lute musical instrument", "Adaga" -> "dagger", "Ácido" -> "acid potion vial", "Espada" -> "sword", "Poção" -> "potion bottle", "Armadura" -> "armor").
CRITICAL RULE: Always describe exactly ONE single solitary object. Never describe pairs, dual weapons, sets, or multiples (e.g. "single dagger", "one potion vial", "single sword").
Describe its material, color, and distinctive physical visual shape.
Ignore RPG game stats, dice, damage numbers, mechanics, and lore. Focus ONLY on what the object physically looks like.
Reply with ONLY the English visual description (max 15 words). No quotes, no explanations.
Examples:
- "Alaúde do Bardo" -> "single wooden lute musical instrument, polished dark pear-shaped body with strings"
- "Adaga de cobre temperado" -> "single tempered copper dagger, sharp reddish copper blade with dark hilt"
- "Ácido de pedra" -> "one bubbling green acid potion vial in ornate glass bottle"`,
            },
            {
              role: 'user',
              content: `Nome: "${name}"\nCategoria: "${category || ''}"\nDescrição: "${(description || '').slice(0, 150)}"`,
            },
          ],
          temperature: 0.1,
          max_tokens: 45,
        }),
      });

      if (res.ok) {
        const data: any = await res.json();
        const output = data.result?.response?.trim().replace(/^["']|["']$/g, '');
        if (output && output.length > 3) {
          return output;
        }
      }
    } catch (err: any) {
      console.warn(`[AI Translator] Falha no Llama 3.1 na conta ${idx + 1}:`, err.message);
    }
  }

  let cleanName = (name || '').toLowerCase();
  cleanName = cleanName.replace(/\b(alaude|alaúde)\b/gi, 'wooden lute musical instrument');
  cleanName = cleanName.replace(/\b(adaga)\b/gi, 'dagger');
  cleanName = cleanName.replace(/\b(espada curta)\b/gi, 'shortsword');
  cleanName = cleanName.replace(/\b(espada longa|espada)\b/gi, 'sword');
  cleanName = cleanName.replace(/\b(pocao|poção)\b/gi, 'potion bottle');
  cleanName = cleanName.replace(/\b(arco)\b/gi, 'bow');
  cleanName = cleanName.replace(/\b(escudo)\b/gi, 'shield');
  cleanName = cleanName.replace(/\b(armadura)\b/gi, 'armor breastplate');
  cleanName = cleanName.replace(/\b(cajado)\b/gi, 'magic staff');
  cleanName = cleanName.replace(/\b(anel)\b/gi, 'ring gemstone');
  cleanName = cleanName.replace(/\b(machado)\b/gi, 'axe');
  cleanName = cleanName.replace(/\b(martelo)\b/gi, 'warhammer');
  cleanName = cleanName.replace(/\b(tomo|livro)\b/gi, 'leatherbound spellbook');
  cleanName = cleanName.replace(/\b(cobre temperado)\b/gi, 'tempered copper blade');

  return cleanName;
}

function aiItemGeneratorPlugin(env: Record<string, string>) {
  return {
    name: 'ai-item-generator',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url?.startsWith('/api/ai/generate-item-image') && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { name, description, category } = JSON.parse(body || '{}');
              const accounts = getCloudflareAccounts(env);

              if (accounts.length === 0) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Nenhuma conta Cloudflare configurada no ambiente local.' }));
                return;
              }

              // 1. Tradução visual precisa baseada no nome e descrição (usando o pool de contas)
              const visualPrompt = await translateToVisualEnglishPrompt(
                name,
                description || '',
                category || '',
                accounts,
              );

              // 2. Montagem do prompt FLUX padronizado com fundo CINZA sólido e objeto único
              const prompt = `Fantasy RPG inventory item icon of exactly one single standalone ${visualPrompt}, solitary solo object centered, full view, isolated single item, detailed painted game asset, soft studio lighting, solid flat neutral gray background, plain uniform medium gray backdrop, no pattern, no texture, no multiple objects, no pairs, no second item, no dual weapons, no duplicates, no text, no border, square`;

              // 3. Chamada com Failover automático entre as contas Cloudflare disponíveis
              let buffer: Buffer | null = null;
              let usedAccount: CloudflareAccount | null = null;
              let lastCfError = '';

              for (let i = 0; i < accounts.length; i++) {
                const acc = accounts[i];
                const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${acc.accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
                try {
                  console.info(`[Cloudflare FLUX] Tentando gerar com conta ${i + 1}/${accounts.length} (${acc.accountId.slice(0, 6)}...)...`);
                  const cfRes = await fetch(cfUrl, {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${acc.apiToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompt, steps: 4 }),
                  });

                  if (cfRes.ok) {
                    const json: any = await cfRes.json();
                    if (json.success && json.result?.image) {
                      buffer = Buffer.from(json.result.image, 'base64');
                      usedAccount = acc;
                      console.info(`[Cloudflare FLUX] Sucesso na conta ${i + 1}!`);
                      break;
                    }
                  }

                  const errText = await cfRes.text();
                  console.warn(`[Cloudflare FLUX] Conta ${i + 1} (${acc.accountId.slice(0, 6)}...) retornou erro (${cfRes.status}):`, errText);
                  lastCfError = errText;
                } catch (netErr: any) {
                  console.warn(`[Cloudflare FLUX] Erro de rede na conta ${i + 1}:`, netErr.message);
                  lastCfError = netErr.message;
                }
              }

              if (!buffer) {
                if (lastCfError.includes('10,000 neurons') || lastCfError.includes('daily free allocation') || lastCfError.includes('429')) {
                  throw new Error(
                    `Todas as ${accounts.length} contas Cloudflare atingiram a cota diária gratuita (10.000 neurônios cada). A cota zera às 21h (00:00 UTC).`,
                  );
                }
                throw new Error(`Falha ao gerar nas contas Cloudflare: ${lastCfError}`);
              }

              const provider = 'cloudflare-flux';

              const slug = (name || 'item')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || `item_${Date.now()}`;

              const supabaseUrl = env.VITE_SUPABASE_URL || 'https://ermkaldfvvjgnhgnvcqo.supabase.co';
              const supabaseKey = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Hnsb7fiVx3sKa7eFmxiD8w_aB0eoaGr';

              // Upload direto para o bucket 'items/flux/' do Storage
              await fetch(`${supabaseUrl}/storage/v1/object/items/flux/${slug}.jpg`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${supabaseKey}`,
                  'Content-Type': 'image/jpeg',
                  'x-upsert': 'true',
                },
                body: buffer,
              });

              const publicUrl = `${supabaseUrl}/storage/v1/object/public/items/flux/${slug}.jpg`;

              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: true,
                  imageUrl: publicUrl,
                  promptEn: visualPrompt,
                  provider,
                }),
              );
              return;
            } catch (err: any) {
              console.error('[AI Generator Plugin] Erro:', err.message);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      TanStackRouterVite({
        routesDirectory: './src/routes',
        generatedRouteTree: './src/routeTree.gen.ts',
        routeFileIgnorePrefix: '-',
        autoCodeSplitting: true,
      }),
      tailwindcss(),
      react(),
      aiItemGeneratorPlugin(env),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icon-192.svg', 'icon-512.svg', 'fonts/*.woff2'],
        manifest: {
          name: 'Peste do Juramento',
          short_name: 'Peste v2',
          description: 'RPG Tático e Livro de Campanha',
          theme_color: '#08080a',
          background_color: '#08080a',
          display: 'standalone',
          orientation: 'any',
          icons: [
            {
              src: '/icon-192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
            },
            {
              src: '/icon-512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /\.(?:png|jpg|jpeg|webp|svg|gif|webm|mp4)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'media-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-dom/client'],
            'vendor-motion': ['motion', 'motion/react'],
            'vendor-three': ['three'],
            'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            'vendor-tanstack': ['@tanstack/react-router', '@tanstack/react-query'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-radix': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-popover',
              '@radix-ui/react-slot',
            ],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.{test,spec}.ts'],
      env: {
        VITE_SUPABASE_URL: 'http://localhost:54321',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      },
    },
  };
});
