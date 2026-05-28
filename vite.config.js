import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'logo.png'],
      manifest: {
        name: 'Folio',
        short_name: 'Folio',
        description: 'Tu biblioteca personal con IA',
        theme_color: '#2A1F1A',
        background_color: '#F4EDE0',
        display: 'standalone',
        start_url: '/',
        version: '1.2',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'navigation-v3',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 10 },
            },
          },
          {
            // JS/CSS bundles — CacheFirst (hashed filenames, safe to cache forever)
            urlPattern: /\/assets\/.+\.(js|css)(\?.*)?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-v3',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            // Google Fonts CSS
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-css',
              expiration: { maxEntries: 10, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            // Google Fonts WOFF2
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-woff2',
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/covers\.openlibrary\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'book-covers',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/openlibrary\.org\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-library',
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
