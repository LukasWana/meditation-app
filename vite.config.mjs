import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'path'
import fs from 'fs'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    '__GOOGLE_SERVICES_JSON_PRESENT__': fs.existsSync(path.resolve('android/app/google-services.json')),
  },
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        exportType: 'default'
      }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "Meditation App",
        short_name: "Meditace",
        description: "Aplikace pro meditaci, dýchací cvičení a relaxaci",
        start_url: "/",
        display: "standalone",
        background_color: "#f4ddc4",
        theme_color: "#f4ddc4",
        orientation: "portrait",
        scope: "/",
        lang: "sk",
        icons: [
          {
            src: "icon-192x192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable"
          },
          {
            src: "icon-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ],
        categories: ["health", "lifestyle", "wellness"],
        screenshots: [
          {
            src: "screenshot-mobile.png",
            sizes: "390x844",
            type: "image/png",
            form_factor: "narrow"
          }
        ],
        shortcuts: [
          {
            name: "Rychlá meditace",
            short_name: "Meditace",
            description: "Spustit 5min meditaci",
            url: "/?screen=meditation&duration=5",
            icons: [{ src: "icon-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Dýchací cvičení",
            short_name: "Dýchání",
            description: "Spustit dýchací cvičení",
            url: "/?screen=breath",
            icons: [{ src: "icon-192x192.png", sizes: "192x192" }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Audio files - use CacheFirst but with shorter expiration
            urlPattern: /\.(mp3|ogg|wav|m4a)(\?|$)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'meditation-audio',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days (reduced from 30)
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              fetchOptions: {
                mode: 'cors',
                credentials: 'omit'
              },
              matchOptions: {
                ignoreSearch: true
              }
            }
          },
          {
            // Firebase Storage metadata/JSON files - use NetworkFirst to always get fresh data
            urlPattern: /https:\/\/firebasestorage\.googleapis\.com\/.*\.json/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-metadata',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 1 // 1 day only
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              fetchOptions: {
                mode: 'cors',
                credentials: 'omit'
              }
            }
          },
          {
            // Firebase Storage images - use CacheFirst with medium expiration
            urlPattern: /https:\/\/firebasestorage\.googleapis\.com\/.*(jpg|jpeg|png|webp|svg)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-images',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              fetchOptions: {
                mode: 'cors',
                credentials: 'omit'
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
      '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
      '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
      '@config': fileURLToPath(new URL('./src/config', import.meta.url)),
      '@contexts': fileURLToPath(new URL('./src/contexts', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
      '@stores': fileURLToPath(new URL('./src/stores', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks: (id) => {
            // Pozn.: src/* (components/features/services/hooks) schválně NESLAZUJEME do
            // sdílených chunků — rozbilo by to lazy() code-splitting. Necháváme na
            // automatickém Rollup chunkování podle skutečných statických hran.

            // React a React DOM (pouze node_modules, ne shody v cestách src)
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
              return 'react';
            }

            // Framer Motion
            if (id.includes('node_modules/framer-motion/')) {
              return 'framer';
            }

            // Firebase
            if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
              return 'firebase';
            }

            // Lucide React (ikony)
            if (id.includes('node_modules/lucide-react/')) {
              return 'icons';
            }

            // Node modules (ostatní)
            if (id.includes('node_modules')) {
              return 'vendor';
            }
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop().replace('.jsx', '').replace('.js', '') : 'chunk';
          return `assets/[name]-[hash].js`;
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Optimalizace pro produkci
    target: 'es2020',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    open: true,
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '192.168.0.173',
      'meditation-app.loca.lt',
      'tough-oranges-return.loca.lt',
      '.loca.lt'
    ]
  }
})
