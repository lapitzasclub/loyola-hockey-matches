/// <reference lib="webworker" />
/**
 * Service worker de producción (solo web). El build lo emite como `/sw.js`
 * y sustituye `__PRECACHE__` y `__VERSION_SW__` (ver `vite.config.ts`).
 * Tiene que quedar en un solo fichero sin `import`: se registra como script
 * clásico.
 */
import { cachesQueSobran, estrategiaPara, PREFIJO_SHELL } from './estrategias';

declare const self: ServiceWorkerGlobalScope;
declare const __PRECACHE__: string[];
declare const __VERSION_SW__: string;

const SHELL = `${PREFIJO_SHELL}${__VERSION_SW__}`;
const PUBLICOS = 'publicos';
const IMAGENES = 'imagenes';
/** Escudos de toda la federación y alguna foto: de sobra. */
const MAX_IMAGENES = 400;

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // `reload`: lo de la caché HTTP podría ser de la versión anterior.
      await cache.addAll(
        __PRECACHE__.map((url) => new Request(url, { cache: 'reload' })),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const sobran = cachesQueSobran(await caches.keys(), SHELL);
      await Promise.all(sobran.map((nombre) => caches.delete(nombre)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  switch (estrategiaPara(request, self.location.origin)) {
    case 'shell':
      evento.respondWith(shell(request));
      break;
    case 'estatico':
      evento.respondWith(estatico(request));
      break;
    case 'publico':
      evento.respondWith(publico(evento));
      break;
    case 'imagen':
      evento.respondWith(imagen(evento));
      break;
    case 'red':
      break;
  }
});

async function shell(peticion: Request): Promise<Response> {
  const guardado =
    (await caches.match('/', { cacheName: SHELL })) ??
    (await caches.match('/'));
  return guardado ?? fetch(peticion);
}

/**
 * `ignoreVary`: el servidor puede mandar `Vary: Origin` y los módulos se piden
 * en modo `cors`, distinto de como los guardó `addAll`; el contenido es el
 * mismo. `caches.match` busca en todas: también en la de la versión anterior.
 */
const SIN_VARY: CacheQueryOptions = { ignoreVary: true };

async function estatico(peticion: Request): Promise<Response> {
  return (await caches.match(peticion, SIN_VARY)) ?? fetch(peticion);
}

async function publico(evento: FetchEvent): Promise<Response> {
  const cache = await caches.open(PUBLICOS);
  // Primero la copia refrescada; si no hay, la de la precache.
  const guardado =
    (await cache.match(evento.request, SIN_VARY)) ??
    (await caches.match(evento.request, SIN_VARY));
  const red = fetch(evento.request).then(async (respuesta) => {
    if (respuesta.ok) await cache.put(evento.request, respuesta.clone());
    return respuesta;
  });
  if (!guardado) return red;
  evento.waitUntil(red.catch(() => undefined));
  return guardado;
}

async function imagen(evento: FetchEvent): Promise<Response> {
  const cache = await caches.open(IMAGENES);
  const guardada = await cache.match(evento.request);
  if (guardada) return guardada;
  const respuesta = await fetch(evento.request);
  // Las imágenes de otro origen llegan opacas (status 0): se guardan igual.
  if (respuesta.ok || respuesta.type === 'opaque') {
    evento.waitUntil(guardarImagen(cache, evento.request, respuesta.clone()));
  }
  return respuesta;
}

async function guardarImagen(
  cache: Cache,
  peticion: Request,
  respuesta: Response,
) {
  await cache.put(peticion, respuesta);
  const claves = await cache.keys();
  await Promise.all(
    claves
      .slice(0, Math.max(0, claves.length - MAX_IMAGENES))
      .map((c) => cache.delete(c)),
  );
}
