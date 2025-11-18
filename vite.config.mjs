import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'path'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        exportType: 'default'
      }
    })
  ],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      // Firebase moduly - přidat pro pre-bundling a vyřešení 504 chyb
      'firebase/app',
      'firebase/storage',
      'firebase/firestore',
      'firebase/database',
      'firebase/auth',
      'firebase/app-check'
    ],
    // NEPOUŽÍVEJ force: true - může způsobit problémy při prvním načtení
    // force: true,
    esbuildOptions: {
      // Zajisti, že React je správně zpracován
      jsx: 'automatic'
    }
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      // Explicitní aliasy pro React, aby se vždy použila stejná kopie
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
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
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: './index.html',
        admin: './admin.html'
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

          // Features
          if (id.includes('/src/features/')) {
            return 'features';
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
        chunkFileNames: () => {
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
    ],
    proxy: {
      '/firebase-storage': {
        target: 'https://firebasestorage.googleapis.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/firebase-storage/, '')
      }
    }
  }
})
