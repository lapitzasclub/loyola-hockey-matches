import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const API_TARGET = 'https://fvpatinaje.eus';
const LOYOLA_ASSETS_SRC = resolve(process.cwd(), 'www/assets/sidebar-loyola');

function copyLoyolaSidebarAssets() {
  return {
    name: 'copy-loyola-sidebar-assets',
    closeBundle() {
      if (!existsSync(LOYOLA_ASSETS_SRC)) return;
      const outDir = resolve(process.cwd(), 'dist/assets/sidebar-loyola');
      cpSync(LOYOLA_ASSETS_SRC, outDir, { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  root: 'www',
  publicDir: 'public', // Copia todo lo estático desde public
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [copyLoyolaSidebarAssets()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // La plataforma nueva sirve la API en el mismo origen bajo /api.
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
      },
      // Centrifugo (tiempo real) para desarrollo local.
      '/connection': {
        target: API_TARGET,
        changeOrigin: true,
        ws: true,
        secure: true,
      },
    }
  },
});
