import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import vuetify from 'vite-plugin-vuetify';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: '/training-pwa/',
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'robots.txt',
        'apple-touch-icon.png'
      ],
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Precache all necessary assets and ensure offline page is cached
        globPatterns: [
          '**/*.{html,js,css,png,jpg,jpeg,svg,webp}',
        ],
        runtimeCaching: [
          {
            // Cache API requests using NetworkFirst strategy
            urlPattern: /^https:\/\/omtihiegyctfxmzgkvgt\.supabase\.co/,
            handler: 'NetworkFirst', // Always try to fetch from the network first
            options: {
              networkTimeoutSeconds: 10, // Timeout after 10 seconds of no response
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50, // Limit cache entries for the API responses
              },
            },
          },
          {
            // Cache assets like JS, CSS, HTML, and images
            urlPattern: /\.(js|css|html|json|jpg|jpeg|png|gif|svg)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // Cache for 1 week
              },
            },
          },
        ],
        navigateFallback: '/training-pwa/index.html',
        navigateFallbackDenylist: [/^https:\/\/omtihiegyctfxmzgkvgt\.supabase\.co/],
      },
      manifest: {
        name: 'BRILS GYM',
        short_name: 'BRILS',
        id: '/training-pwa/',
        start_url: '/training-pwa/',
        scope: '/training-pwa/',
        display: 'standalone',
        background_color: '#0F1115',
        theme_color: '#111827',
        icons: [
          { src: 'brils-gym-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'brils-gym-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'brils-gym-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'brils-gym-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    minify: 'esbuild',
  },
});
