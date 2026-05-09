import { defineConfig } from 'vite';

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
        target: 'https://fvpatinaje.eus/webservices/WSCompeticiones.asmx',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
        secure: true,
      },
      '/signalr': {
        target: 'https://digitalsport.online/signalr',
        changeOrigin: true,
        ws: true,
        rewrite: path => path.replace(/^\/signalr/, ''),
        secure: true,
      }
    }
  },
});
