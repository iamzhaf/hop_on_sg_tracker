import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: '/',
  server: {
    port: 5173,
    host: '0.0.0.0',
     proxy: {
      '/api': {
        target: 'https://datamall2.mytransport.sg/ltaodataservice/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  }
})
