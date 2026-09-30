import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // the admin API (server/index.js) runs next to Vite in development
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8787', xfwd: true },
      '/uploads': { target: 'http://localhost:8787', xfwd: true },
    },
  },
})
