import { Hono } from 'hono';
import type { Context } from 'hono';
import { secureHeaders } from 'hono/secure-headers';

import { conCache } from './cache';
import { crearLimitador } from './limite';
import type { KvLimite } from './limite';
import { competicionesValidas, rutaPermitida } from './rutas';

const FEDERACION = 'https://fvpatinaje.eus';
const DIRECTO = `${FEDERACION}/connection/websocket`;

/** La federación tarda a veces varios segundos con el árbol de una división. */
const TIMEOUT_MS = 20_000;
/** El POST de divisiones son como mucho 100 GUID (unos 4 KB). */
const MAX_CUERPO = 8 * 1024;

export interface Env {
  /** KV de los bloqueos del rate limit (el `API_RATE_LIMIT` de la v1). */
  API_RATE_LIMIT?: KvLimite;
  /** Estáticos de Pages (modo avanzado). */
  ASSETS?: { fetch(peticion: Request): Promise<Response> };
}

type Ctx = Context<{ Bindings: Env }>;

const error = (
  c: Ctx,
  status: 400 | 403 | 404 | 426 | 429 | 502 | 504,
  mensaje: string,
) =>
  c.json({ error: true, message: mensaje }, status, {
    'cache-control': 'no-store',
  });

/** Cosas que deben sobrevivir a la respuesta (guardar en caché). */
function enSegundoPlano(c: Ctx) {
  return (tarea: Promise<unknown>) => {
    try {
      c.executionCtx.waitUntil(tarea);
    } catch {
      // Sin contexto de ejecución (tests): la promesa sigue sola.
    }
  };
}

export interface OpcionesApp {
  /** Peticiones por IP y minuto. Generoso: un pabellón comparte IP. */
  maximoPorMinuto?: number;
}

export function crearApp({ maximoPorMinuto = 600 }: OpcionesApp = {}) {
  const limitador = crearLimitador({
    maximo: maximoPorMinuto,
    ventanaMs: 60_000,
  });
  const app = new Hono<{ Bindings: Env }>();

  app.use('/api/*', secureHeaders());
  app.use('*', async (c, next) => {
    // Solo hay IP detrás de Cloudflare; en local no se limita.
    const ip = c.req.header('cf-connecting-ip');
    const espera = ip
      ? await limitador.comprobar(ip, c.env.API_RATE_LIMIT)
      : null;
    if (espera === null) return next();
    c.header('retry-after', String(espera));
    return error(c, 429, 'Demasiadas peticiones, inténtalo más tarde.');
  });

  app.on(['GET', 'POST'], '/api/*', async (c) => {
    const url = new URL(c.req.url);
    const permitida = rutaPermitida(
      c.req.method,
      url.pathname.slice('/api/'.length),
      url.searchParams,
    );
    if (!permitida) return error(c, 404, 'Ruta no permitida.');

    let cuerpo: string | undefined;
    let clave = `${url.origin}/api/${permitida.ruta}${permitida.query}`;
    if (c.req.method === 'POST') {
      const texto = await c.req.text();
      let ids: string[] | null = null;
      if (texto.length <= MAX_CUERPO) {
        try {
          ids = competicionesValidas(JSON.parse(texto));
        } catch {
          ids = null;
        }
      }
      if (!ids) return error(c, 400, 'Cuerpo no válido.');
      cuerpo = JSON.stringify(ids);
      // La Cache API solo guarda GET: el cuerpo va en la clave.
      clave += `${permitida.query ? '&' : '?'}ids=${ids.join(',')}`;
    }

    let respuesta;
    try {
      respuesta = await conCache({
        clave,
        politica: permitida.cache,
        enSegundoPlano: enSegundoPlano(c),
        pedir: () =>
          fetch(`${FEDERACION}/api/${permitida.ruta}${permitida.query}`, {
            method: c.req.method,
            headers: cuerpo
              ? {
                  accept: 'application/json',
                  'content-type': 'application/json',
                }
              : { accept: 'application/json' },
            body: cuerpo,
            signal: AbortSignal.timeout(TIMEOUT_MS),
          }),
      });
    } catch (e) {
      return e instanceof DOMException && e.name === 'TimeoutError'
        ? error(c, 504, 'La federación no ha respondido a tiempo.')
        : error(c, 502, 'No se pudo contactar con la federación.');
    }

    return c.body(respuesta.cuerpo, respuesta.status as 200, {
      'content-type': respuesta.contentType,
      // La caché es del edge y de TanStack Query; el navegador siempre pide.
      'cache-control': 'no-store',
      'x-cache': respuesta.cache,
    });
  });

  app.all('/api/*', (c) => error(c, 404, 'Ruta no permitida.'));

  // WebSocket del directo (Centrifugo): la web lo abre en su propio origen y
  // aquí se pasa tal cual a la federación. Va sin cabeceras añadidas: la
  // respuesta 101 lleva el socket y no se puede reconstruir.
  app.get('/connection/websocket', async (c) => {
    if (c.req.header('upgrade')?.toLowerCase() !== 'websocket') {
      return error(c, 426, 'Solo WebSocket.');
    }
    const origen = c.req.header('origin');
    if (origen && origen !== new URL(c.req.url).origin) {
      return error(c, 403, 'Origen no permitido.');
    }
    try {
      return await fetch(DIRECTO, c.req.raw);
    } catch {
      return error(c, 502, 'No se pudo contactar con el directo.');
    }
  });

  app.all('/connection/*', (c) => error(c, 404, 'Ruta no permitida.'));

  // `_routes.json` solo manda aquí /api y /connection; por si acaso, el
  // resto son los estáticos de Pages.
  app.all('*', (c) =>
    c.env.ASSETS ? c.env.ASSETS.fetch(c.req.raw) : c.notFound(),
  );

  return app;
}
