import { proxyLegacyRequest } from './_lib/legacyProxy.js';
import { applyRateLimit } from './_lib/rateLimit.js';
import { handleOptions, withCors } from './_lib/response.js';

export async function onRequestOptions(context) {
  return handleOptions(context.request, context.env);
}

export async function onRequestPost(context) {
  const limited = await applyRateLimit(context.request, context.env, 'GetEstadisticaPartido');
  if (limited) return withCors(context.request, limited, context.env);
  const response = await proxyLegacyRequest(context.request, 'GetEstadisticaPartido', 30);
  return withCors(context.request, response, context.env);
}
