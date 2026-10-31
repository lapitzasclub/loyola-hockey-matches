import { defineConfig } from 'vite';

/**
 * Compila `worker/` a `dist/_worker.js`, el worker de Pages en modo avanzado.
 * Va en un solo fichero con Hono dentro y se ejecuta después del build de la
 * app, sin vaciar `dist/`.
 */
export default defineConfig({
  publicDir: false,
  ssr: { target: 'webworker', noExternal: true },
  build: {
    ssr: 'worker/index.ts',
    outDir: 'dist',
    emptyOutDir: false,
    minify: true,
    target: 'es2022',
    rollupOptions: { output: { entryFileNames: '_worker.js', format: 'es' } },
  },
});
