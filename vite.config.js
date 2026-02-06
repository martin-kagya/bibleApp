import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
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

