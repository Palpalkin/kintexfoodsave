import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.png', 'logo-hero.webp', 'logo-mascot.webp'],
      manifest: {
        name: 'KINTEXFOODSAVE',
        short_name: 'FoodSave',
        description: 'Продукты, сроки годности и питание',
        lang: 'ru',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        background_color: '#fdfdfc',
        theme_color: '#15803d',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        globIgnores: ['tesseract/**'], // тяжёлый OCR-движок кэшируется при первом использовании (runtimeCaching ниже)
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/tesseract/'),
            handler: 'CacheFirst',
            options: { cacheName: 'fs-ocr', cacheableResponse: { statuses: [0, 200] }, expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/storage/v1/object/sign/'),
            handler: 'CacheFirst',
            options: { cacheName: 'fs-photos', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 } },
          },
        ],
      },
    }),
  ],
})
