import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json' with { type: 'json' }

// Code shared with the web app (e.g. the tag engine) lives in frontend/src/utils
const sharedDir = fileURLToPath(new URL('../src/utils', import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@shared': sharedDir,
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1', // Forces Vite to use IPv4
    origin: "http://127.0.0.1:5173",
    hmr: {
      protocol: "ws",
      host: "127.0.0.1", // Forces Chrome to look at IPv4
      port: 5173,
    },
    fs: {
      // Allow the dev server to serve the shared web-app modules
      allow: ['.', sharedDir],
    },
  },
})
