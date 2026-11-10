import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
      routeFileIgnorePrefix: '-',
      // Cada rota vira um chunk próprio: o navegador só baixa a tela que está aberta.
      autoCodeSplitting: true,
    }),
    tailwindcss(),
    react(),
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
        // Fora da instalação offline: o que quase ninguém usa e só pesa no
        // primeiro acesso (fontes de alfabetos que o jogo não usa, o motor de
        // vídeo do Mestre e o dado 3D). Continuam carregando quando preciso.
        globIgnores: [
          '**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2',
          '**/ffmpeg-core-*',
          '**/vendor-three-*',
        ],
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
        // Por caminho (e não por lista de pacotes): na forma antiga, utilitários
        // comuns do React caíam dentro do pacote do Radix e toda tela baixava
        // os 92 KB dos modais. Agora cada biblioteca fica no seu pacote.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          const m = (re: RegExp) => re.test(id.replace(/\\/g, '/'));
          if (m(/\/node_modules\/(react|react-dom|scheduler|use-sync-external-store)\//)) return 'vendor-react';
          // Lista virtual: só telas do Mestre usam; fora do pacote do roteador.
          if (m(/\/node_modules\/@tanstack\/(react-)?virtual/)) return 'vendor-virtual';
          if (m(/\/node_modules\/@tanstack\//)) return 'vendor-tanstack';
          if (m(/\/node_modules\/@supabase\//)) return 'vendor-supabase';
          if (m(/\/node_modules\/(motion|motion-dom|motion-utils|framer-motion)\//)) return 'vendor-motion';
          if (m(/\/node_modules\/three\//)) return 'vendor-three';
          if (m(/\/node_modules\/@dnd-kit\//)) return 'vendor-dnd';
          if (m(/\/node_modules\/(@radix-ui|@floating-ui|aria-hidden|react-remove-scroll[^/]*|react-style-singleton|use-callback-ref|use-sidecar|get-nonce|detect-node-es)\//))
            return 'vendor-radix';
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    // Valores falsos só para os testes: o cliente Supabase exige as variáveis ao ser importado.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
