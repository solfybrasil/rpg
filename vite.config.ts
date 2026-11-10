import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

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
              const cfAccountId =
                env.CLOUDFLARE_ACCOUNT_ID || env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '';
              const cfApiToken =
                env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || '';

              if (!cfAccountId || !cfApiToken) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Chaves da Cloudflare não configuradas no ambiente local.' }));
                return;
              }

              const desc = description ? description.slice(0, 80) : category || 'equipment';
              const prompt = `Fantasy RPG inventory icon of ${name}, ${desc}, single object centered, full view, painterly game asset style, dark fantasy, warm soft lighting, plain dark stone background, no text, no border, square`;

              const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
              const cfRes = await fetch(cfUrl, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${cfApiToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt, steps: 4 }),
              });

              if (!cfRes.ok) {
                const errText = await cfRes.text();
                throw new Error(`Cloudflare error (${cfRes.status}): ${errText}`);
              }

              const json: any = await cfRes.json();
              if (!json.success || !json.result?.image) {
                throw new Error('Falha na resposta do FLUX');
              }

              const buffer = Buffer.from(json.result.image, 'base64');
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
                  promptEn: prompt,
                  provider: 'cloudflare-flux',
                }),
              );
            } catch (err: any) {
              console.error('[AI Generator Plugin] Erro:', err.message);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
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
