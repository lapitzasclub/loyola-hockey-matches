import { errorJson, json } from './response.js';

const FVP_BASE_URL = 'https://fvpatinaje.eus/webservices/WSCompeticiones.asmx';
const ALLOWED_ENDPOINTS = new Set([
  'GetCompeticiones',
  'GetParametrosCompeticion',
  'GetCalendarioCompeticion',
  'GetClasificacionCompeticion',
  'GetParametrosPartido',
  'GetEstadisticaPartido',
  'GetEstadisticasJugador',
]);

function sanitizeBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};

  const out = {};
  for (const [key, value] of Object.entries(body)) {
    if (value == null) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = String(value).trim();
    }
  }
  return out;
}

export async function proxyLegacyRequest(request, endpoint, cacheSeconds = 120) {
  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return errorJson('Endpoint no permitido.', 403);
  }

  let parsedBody = {};
  try {
    parsedBody = sanitizeBody(await request.json());
  } catch {
    return errorJson('Body JSON no válido.', 400);
  }

  const upstreamUrl = `${FVP_BASE_URL}/${endpoint}`;
  const cacheUrl = new URL(upstreamUrl);
  cacheUrl.searchParams.set('__body', JSON.stringify(parsedBody));
  const cacheKey = new Request(cacheUrl.toString(), {
    method: 'GET',
  });

  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json, text/javascript, */*; q=0.01',
        'content-type': 'application/json; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
      },
      body: JSON.stringify(parsedBody),
      cf: {
        cacheTtl: cacheSeconds,
        cacheEverything: false,
      },
    });
  } catch (error) {
    return errorJson('No se pudo contactar con el servicio externo.', 502, {
      detail: String(error?.message || error),
    });
  }

  const text = await upstreamResponse.text();
  if (!upstreamResponse.ok) {
    return errorJson('Error devuelto por el servicio externo.', 502, {
      upstreamStatus: upstreamResponse.status,
      upstreamBody: text.slice(0, 500),
    });
  }

  const response = new Response(text, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, s-maxage=${cacheSeconds}`,
    },
  });

  await cache.put(cacheKey, response.clone());
  return response;
}

export function getAllowedLegacyEndpoints() {
  return Array.from(ALLOWED_ENDPOINTS);
}

export function buildApiInfo() {
  return json({
    success: true,
    endpoints: getAllowedLegacyEndpoints(),
  });
}
