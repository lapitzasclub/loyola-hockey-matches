import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const LEGACY_API_TARGET = 'https://fvpatinaje.eus/webservices/WSCompeticiones.asmx';
const SIGNALR_TARGET = 'https://digitalsport.online/signalr';
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
      '/api': {
        target: LEGACY_API_TARGET,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
        secure: true,
      },
      '/signalr': {
        target: SIGNALR_TARGET,
        changeOrigin: true,
        ws: true,
        rewrite: path => path.replace(/^\/signalr/, ''),
        secure: true,
      }
    }
  },
});
