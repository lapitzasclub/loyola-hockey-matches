import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

import { rutaPermitida } from './worker/rutas';

const API_TARGET = 'https://fvpatinaje.eus';

/**
 * Lo que se precachea además de los ficheros del build: el shell (Vite emite
 * `index.html` después de este plugin) y lo de `public/` que hace falta para
 * arrancar sin conexión.
 */
const PRECACHE_FIJOS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/apple-touch-icon.png',
];

/**
 * Emite `src/pwa/sw.ts` como `/sw.js` y le inyecta la lista de precache
 * (todo el build más `PRECACHE_FIJOS`) y una versión que cambia con ella.
 */
function serviceWorker(): Plugin {
  return {
    name: 'loyola:service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const sw = Object.values(bundle).find(
        (f) => f.type === 'chunk' && f.name === 'sw',
      );
      if (sw?.type !== 'chunk') return;
      if (sw.imports.length > 0 || sw.exports.length > 0) {
        throw new Error('sw.js no puede importar ni exportar nada');
      }
      // Las imágenes de `public/` que pinta el CSS (escudo, esquinas del
      // menú): sin ellas la app sin conexión sale sin marca.
      const delCss = Object.values(bundle).flatMap((f) =>
        f.type === 'asset' && f.fileName.endsWith('.css')
          ? [
              ...String(f.source).matchAll(/url\(['"]?(\/assets\/[^'")]+)/g),
            ].map((m) => m[1] ?? '')
          : [],
      );
      const urls = [
        ...new Set([
          ...Object.keys(bundle)
            .filter((f) => f !== sw.fileName && f.startsWith('static/'))
            .map((f) => `/${f}`),
          ...delCss,
          ...PRECACHE_FIJOS,
        ]),
      ].sort();
      const version = createHash('sha256')
        .update(
          urls.join('\n') +
            Object.values(bundle)
              .map((f) => (f.type === 'chunk' ? f.code : f.source))
              .filter((c) => typeof c === 'string')
              .join(''),
        )
        .digest('hex')
        .slice(0, 12);
      sw.code = sw.code
        .replace('__PRECACHE__', JSON.stringify(urls))
        .replace('__VERSION_SW__', JSON.stringify(version));
    },
  };
}

/**
 * `vite preview` sirve con las cabeceras de `public/_headers` (las de
 * Cloudflare Pages), así los e2e corren con la CSP de producción.
 */
function cabecerasDePages(): Plugin {
  const reglas: { patron: RegExp; cabeceras: [string, string][] }[] = [];
  let actual: (typeof reglas)[number] | undefined;
  for (const linea of readFileSync('public/_headers', 'utf8').split(/\r?\n/)) {
    if (!linea.trim() || linea.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(linea)) {
      const patron = linea
        .trim()
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      actual = { patron: new RegExp(`^${patron}$`), cabeceras: [] };
      reglas.push(actual);
      continue;
    }
    const [nombre = '', ...valor] = linea.trim().split(':');
    actual?.cabeceras.push([nombre.trim(), valor.join(':').trim()]);
  }
  return {
    name: 'loyola:cabeceras-pages',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const ruta = new URL(req.url ?? '/', 'http://x').pathname;
        for (const { patron, cabeceras } of reglas) {
          if (!patron.test(ruta)) continue;
          for (const [nombre, valor] of cabeceras) res.setHeader(nombre, valor);
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker(), cabecerasDePages()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Con hash y caché inmutable (`_headers`); `public/assets` no lleva hash.
    assetsDir: 'static',
    rollupOptions: {
      input: { index: 'index.html', sw: 'src/pwa/sw.ts' },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'sw' ? 'sw.js' : 'static/[name]-[hash].js',
      },
    },
  },
  server: {
    port: 5173,
    // La web habla con la API vía /api (en producción lo resuelve el worker).
    proxy: {
      '/api/': {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
        // La misma allowlist que el worker: lo que funcione en desarrollo
        // funciona desplegado. Lo demás, 404.
        bypass(peticion) {
          const url = new URL(peticion.url ?? '/', 'http://x');
          const permitida = rutaPermitida(
            peticion.method ?? 'GET',
            url.pathname.slice('/api/'.length),
            url.searchParams,
          );
          return permitida ? undefined : false;
        },
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
    include: ['src/**/*.test.{ts,tsx}', 'worker/**/*.test.ts'],
    css: false,
  },
});
