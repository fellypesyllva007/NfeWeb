import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'nfeweb-html-entry',
      transformIndexHtml() {
        return [
          {
            tag: 'script',
            attrs: { type: 'module', src: '/src/main.tsx' },
            injectTo: 'body',
          },
        ]
      },
    },
  ],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3333',
        changeOrigin: true,
      },
    },
  },
})
