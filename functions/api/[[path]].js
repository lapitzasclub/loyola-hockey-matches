import { errorJson, handleOptions, withCors } from './_lib/response.js';

const UPSTREAM_BASE = 'https://fvpatinaje.eus/api';

// Prefijos permitidos de la API pública nueva (evita convertir el proxy en un open proxy).
const ALLOWED_PREFIXES = new Set(['public', 'hierarchy', 'web', 'auth']);

const DEFAULT_CACHE_SECONDS = 120;

// Único POST de la API que usa la app (v2): divisiones de varias competiciones de una vez.
const POST_PERMITIDOS = new Set(['hierarchy/competiciones/divisiones']);
const MAX_COMPETICIONES = 100;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function onRequestOptions(context) {
  return handleOptions(context.request, context.env);
}

export async function onRequestGet(context) {
  const segments = Array.isArray(context.params.path) ? context.params.path : [context.params.path];
  const prefix = String(segments[0] || '');
  if (!ALLOWED_PREFIXES.has(prefix)) {
    return withCors(context.request, errorJson('Ruta no permitida.', 403), context.env);
  }

  // Los tokens de `auth` (conexión y suscripción a Centrifugo) son de corta duración: cachearlos
  // en el edge puede servir un token ya caducado. El resto de prefijos sigue cacheado 120s para
  // no consumir de más la cuota de requests del plan gratuito de Cloudflare.
  const isAuth = prefix === 'auth';

  const requestUrl = new URL(context.request.url);
  const upstreamUrl = `${UPSTREAM_BASE}/${segments.map(encodeURIComponent).join('/')}${requestUrl.search}`;

  let upstream;
  try {
    upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: { accept: 'application/json, text/javascript, */*; q=0.01' },
      cf: isAuth ? { cacheTtl: 0, cacheEverything: false } : { cacheTtl: DEFAULT_CACHE_SECONDS, cacheEverything: false },
    });
  } catch (error) {
    return withCors(context.request, errorJson('No se pudo contactar con el servicio externo.', 502, { detail: String(error?.message || error) }), context.env);
  }

  const body = await upstream.text();
  const response = new Response(body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'cache-control': isAuth || !upstream.ok ? 'no-store' : `public, s-maxage=${DEFAULT_CACHE_SECONDS}`,
    },
  });

  return withCors(context.request, response, context.env);
}

export async function onRequestPost(context) {
  const segments = Array.isArray(context.params.path) ? context.params.path : [context.params.path];
  const ruta = segments.join('/');
  if (!POST_PERMITIDOS.has(ruta)) {
    return withCors(context.request, errorJson('Ruta no permitida.', 403), context.env);
  }

  // Solo una lista corta de GUID: el proxy no reenvía cuerpos arbitrarios.
  let ids;
  try {
    ids = await context.request.json();
  } catch {
    ids = null;
  }
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_COMPETICIONES || !ids.every((id) => typeof id === 'string' && GUID.test(id))) {
    return withCors(context.request, errorJson('Cuerpo no válido.', 400), context.env);
  }

  let upstream;
  try {
    upstream = await fetch(`${UPSTREAM_BASE}/${ruta}`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(ids),
    });
  } catch (error) {
    return withCors(context.request, errorJson('No se pudo contactar con el servicio externo.', 502, { detail: String(error?.message || error) }), context.env);
  }

  const response = new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
  return withCors(context.request, response, context.env);
}
