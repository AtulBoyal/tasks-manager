import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

// Vite bakes env vars into the bundle at build time. If they're missing on
// Vercel, fail the build: Vercel then keeps the last working deployment live
// instead of shipping a blank page. (CI builds without them, so only Vercel.)
const requireEnvOnVercel = () => ({
  name: 'require-env-on-vercel',
  apply: 'build',
  configResolved(config) {
    if (!process.env.VERCEL) return;

    const missing = REQUIRED_ENV.filter((key) => !config.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing environment variable(s): ${missing.join(', ')}. ` +
        'Add them in Vercel → Project Settings → Environment Variables, then redeploy.'
      );
    }
  }
});

export default defineConfig({
  plugins: [react(), requireEnvOnVercel()],
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist'
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    // The extension (tasks-extension/) has its own test setup
    include: ['src/**/*.test.{js,jsx}']
  }
});
