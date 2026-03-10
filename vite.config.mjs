import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'path'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        exportType: 'default'
      }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
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
          // React a React DOM
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react';
          }

          // Framer Motion
          if (id.includes('framer-motion')) {
            return 'framer';
          }

          // Firebase
          if (id.includes('firebase')) {
            return 'firebase';
          }

          // Lucide React (ikony)
          if (id.includes('lucide-react')) {
            return 'icons';
          }

          // Komponenty
          if (id.includes('/src/components/')) {
            return 'components';
          }

          // Features - rozdělit na samostatné chunky pro lepší izolaci
          if (id.includes('/src/features/audio/')) {
            return 'features-audio';
          }

          if (id.includes('/src/features/meditation/')) {
            return 'features-meditation';
          }

          if (id.includes('/src/features/navigation/')) {
            return 'features-navigation';
          }

          // Services
          if (id.includes('/src/services/')) {
            return 'services';
          }

          // Hooks
          if (id.includes('/src/hooks/')) {
            return 'hooks';
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
    target: 'es2015',
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
