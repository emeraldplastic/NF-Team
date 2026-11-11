import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const pages = ['index', 'login', 'create', 'gallery', 'market', 'community', 'profile', 'quests'];

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      input: Object.fromEntries(pages.map(p => [p, resolve(__dirname, `${p}.html`)])),
    },
  },
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/unit/**/*.test.js'],
  },
});
