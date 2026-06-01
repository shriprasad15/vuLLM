import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => {
  return {
    plugins: [react(), tailwindcss()],
    base: command === 'build' ? '/vuLLM/' : '/',
    server: {
      proxy: {
        '/api': { target: 'http://localhost:8000', rewrite: (path) => path.replace(/^\/api/, '') },
        '/ws': { target: 'ws://localhost:8000', ws: true },
      },
    },
  }
})
