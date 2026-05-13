import { defineConfig } from 'vite';

const LEGACY_API_TARGET = 'https://fvpatinaje.eus/webservices/WSCompeticiones.asmx';
const SIGNALR_TARGET = 'https://digitalsport.online/signalr';

export default defineConfig({
  root: 'www',
  publicDir: 'public', // Copia todo lo estático desde public
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
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
