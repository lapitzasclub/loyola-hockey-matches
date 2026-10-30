import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const API_TARGET = 'https://fvpatinaje.eus';

/**
 * Mismos prefijos que deja pasar el proxy de producción
 * (`functions/api/[[path]].js`): lo que funcione en desarrollo funciona
 * desplegado. Las cookies del origen local no tienen nada que hacer allí.
 */
const API_PERMITIDA = '^/api/(public|hierarchy|web|auth)/';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    port: 5173,
    // La web habla con la API vía /api (en producción lo resuelve el proxy de Cloudflare).
    proxy: {
      [API_PERMITIDA]: {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
        configure: (proxy) =>
          proxy.on('proxyReq', (peticion) => {
            peticion.removeHeader('cookie');
            peticion.removeHeader('origin');
            peticion.removeHeader('referer');
          }),
      },
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
