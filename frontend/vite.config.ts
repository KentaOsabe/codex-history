import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { resolveProxyTarget } from './src/config/proxyTarget'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: resolveProxyTarget(process.env.VITE_API_BASE_URL),
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
})
