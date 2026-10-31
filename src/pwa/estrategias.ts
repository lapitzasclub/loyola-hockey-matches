/**
 * Decisiones del service worker, puras para poder probarlas: qué hace con
 * cada petición y qué cachés sobran al activar una versión nueva.
 */

/** Escudos y fotos: el S3 público de DigitalSport. */
export const HOST_IMAGENES = 'digitalsport-public-docs.s3.fr-par.scw.cloud';

export const PREFIJO_SHELL = 'shell-';

export type Estrategia =
  /** Navegación: el `index.html` precacheado (la app es una SPA). */
  | 'shell'
  /** Ficheros con hash del build: de la precache; si falta, la red. */
  | 'estatico'
  /** Resto de `public/` (sin hash): copia guardada y se refresca detrás. */
  | 'publico'
  /** Escudos y fotos: copia guardada para verlos sin conexión. */
  | 'imagen'
  /**
   * Sin tocar: la API (sus datos los persiste TanStack Query, que es quien
   * sabe cuándo están viejos), el directo y lo de otros hosts.
   */
  | 'red';

interface Peticion {
  url: string;
  method: string;
  mode: RequestMode;
}

const CON_EXTENSION = /\.[a-z0-9]+$/i;

export function estrategiaPara(
  { url, method, mode }: Peticion,
  origen: string,
): Estrategia {
  if (method !== 'GET') return 'red';
  const u = new URL(url);
  if (u.host === HOST_IMAGENES) return 'imagen';
  if (u.origin !== origen) return 'red';
  if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/connection/')) {
    return 'red';
  }
  if (mode === 'navigate') {
    return CON_EXTENSION.test(u.pathname) ? 'publico' : 'shell';
  }
  if (u.pathname.startsWith('/static/')) return 'estatico';
  return 'publico';
}

/**
 * Cachés de versiones anteriores que se pueden borrar. Se conserva la última
 * anterior a la actual: una página abierta con la versión vieja puede pedir
 * todavía sus chunks diferidos, que ya no existen en el despliegue nuevo.
 * `caches.keys()` devuelve las cachés en orden de creación.
 */
export function cachesQueSobran(
  nombres: readonly string[],
  actual: string,
): string[] {
  const anteriores = nombres.filter(
    (n) => n.startsWith(PREFIJO_SHELL) && n !== actual,
  );
  return anteriores.slice(0, -1);
}
