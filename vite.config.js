import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('firebase/auth')) return 'firebase-auth'
          if (id.includes('firebase/firestore')) return 'firebase-firestore'
          if (id.includes('firebase')) return 'firebase-core'
          if (id.includes('react-dom')) return 'react-vendor'
          if (id.includes('react-router')) return 'react-router'
        }
      }
    }
  }
})
