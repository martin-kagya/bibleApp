import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    exclude: [
      '@ricky0123/vad-react',
      '@ricky0123/vad-web',
      'onnxruntime-web'
    ]
  },
  build: {
    rollupOptions: {
      external: ['onnxruntime-node']
    }
  }
})

