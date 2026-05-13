import { errorJson, handleOptions, withCors } from '../api/_lib/response.js';

const ALLOWED_HUBS_HOSTS = new Set([
  'digitalsport.online',
  'ns.digitalsport.online',
]);

function resolveUpstream(request, env) {
  const configured = env.SIGNALR_UPSTREAM_BASE || 'https://digitalsport.online/signalr';
  const url = new URL(configured);
  if (!ALLOWED_HUBS_HOSTS.has(url.hostname)) {
    throw new Error('SIGNALR_UPSTREAM_BASE no permitido.');
  }

  const requestUrl = new URL(request.url);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/hubs`;
  url.search = requestUrl.search;
  return url.toString();
}

export async function onRequestOptions(context) {
  return handleOptions(context.request, context.env);
}

export async function onRequestGet(context) {
  let upstreamUrl;
  try {
    upstreamUrl = resolveUpstream(context.request, context.env);
  } catch (error) {
    return withCors(context.request, errorJson(String(error.message || error), 500), context.env);
  }

  const upstream = await fetch(upstreamUrl, {
    method: 'GET',
    headers: {
      accept: context.request.headers.get('accept') || '*/*',
      'user-agent': context.request.headers.get('user-agent') || 'Cloudflare-Worker',
    },
    cf: {
      cacheTtl: 300,
      cacheEverything: true,
    },
  });

  const headers = new Headers(upstream.headers);
  headers.set('cache-control', 'public, s-maxage=300');
  const response = new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });

  return withCors(context.request, response, context.env);
}
