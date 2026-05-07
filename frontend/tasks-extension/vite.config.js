import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
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
  },
})