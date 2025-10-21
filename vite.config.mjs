import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'path'

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
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@config': path.resolve(__dirname, './src/config'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
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
        admin: './src/admin.jsx'
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
