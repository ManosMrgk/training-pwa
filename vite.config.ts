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
        navigateFallback: '/training-pwa/index.html',
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
          { src: 'brils-gym-512.png', sizes: '512x512', type: 'image/png' },        ]
      }
    })
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  build: {
    minify: 'esbuild'
  }
});
