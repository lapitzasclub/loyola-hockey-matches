import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const API_TARGET = 'https://fvpatinaje.eus';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    port: 5173,
    // La web habla con la API vía /api (en producción lo resuelve el proxy de Cloudflare).
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true, secure: true },
      '/connection': {
        target: API_TARGET,
        changeOrigin: true,
        ws: true,
        secure: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
