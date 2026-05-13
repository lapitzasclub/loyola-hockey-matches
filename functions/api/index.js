import { buildApiInfo } from './_lib/legacyProxy.js';
import { handleOptions, withCors } from './_lib/response.js';

export async function onRequestOptions(context) {
  return handleOptions(context.request, context.env);
}

export async function onRequestGet(context) {
  return withCors(context.request, buildApiInfo(), context.env);
}
