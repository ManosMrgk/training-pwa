import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import vuetify from 'vite-plugin-vuetify';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'Personal Training',
        short_name: 'Training',
        start_url: '.',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#1976D2',
        icons: [
          { src: 'brils-gym-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'brils-gym-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  base: '/training-pwa/',
  build: {
    minify: 'esbuild',
  }
});