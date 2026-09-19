import { errorJson, handleOptions, withCors } from './_lib/response.js';

const UPSTREAM_BASE = 'https://fvpatinaje.eus/api';

// Prefijos permitidos de la API pública nueva (evita convertir el proxy en un open proxy).
const ALLOWED_PREFIXES = new Set(['public', 'hierarchy', 'web', 'auth']);

const DEFAULT_CACHE_SECONDS = 120;

export async function onRequestOptions(context) {
  return handleOptions(context.request, context.env);
}

export async function onRequestGet(context) {
  const segments = Array.isArray(context.params.path) ? context.params.path : [context.params.path];
  const prefix = String(segments[0] || '');
  if (!ALLOWED_PREFIXES.has(prefix)) {
    return withCors(context.request, errorJson('Ruta no permitida.', 403), context.env);
  }

  const requestUrl = new URL(context.request.url);
  const upstreamUrl = `${UPSTREAM_BASE}/${segments.map(encodeURIComponent).join('/')}${requestUrl.search}`;

  let upstream;
  try {
    upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: { accept: 'application/json, text/javascript, */*; q=0.01' },
      cf: { cacheTtl: DEFAULT_CACHE_SECONDS, cacheEverything: false },
    });
  } catch (error) {
    return withCors(context.request, errorJson('No se pudo contactar con el servicio externo.', 502, { detail: String(error?.message || error) }), context.env);
  }

  const body = await upstream.text();
  const response = new Response(body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'cache-control': upstream.ok ? `public, s-maxage=${DEFAULT_CACHE_SECONDS}` : 'no-store',
    },
  });

  return withCors(context.request, response, context.env);
}
