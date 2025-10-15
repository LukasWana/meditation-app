import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
