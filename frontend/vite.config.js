import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-dom/client', 'react/jsx-runtime',
      'motion/react', 'framer-motion', 'lucide-react', '@tanstack/react-query', 'axios',
      'recharts', 'three', '@react-three/fiber', '@phosphor-icons/react',
    ],
  },
  server: {
    // Test output must never trigger a reload of an open browser tab
    watch: { ignored: ['**/playwright-report/**', '**/test-results/**', '**/tests/**'] },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
