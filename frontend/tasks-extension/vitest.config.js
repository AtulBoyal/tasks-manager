import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Separate from vite.config.js so the CRX plugin doesn't run during tests
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../src/utils', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
  },
})
