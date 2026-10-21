import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        format: 'es',
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  publicDir: 'public',
});