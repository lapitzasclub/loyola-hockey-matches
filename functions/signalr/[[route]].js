import { errorJson, handleOptions, withCors } from '../api/_lib/response.js';

const ALLOWED_HUBS_HOSTS = new Set([
  'digitalsport.online',
  'ns.digitalsport.online',
]);

function getConfiguredBase(env) {
  const configured = env.SIGNALR_UPSTREAM_BASE || 'https://digitalsport.online/signalr';
  const url = new URL(configured);
  if (!ALLOWED_HUBS_HOSTS.has(url.hostname)) {
    throw new Error('SIGNALR_UPSTREAM_BASE no permitido.');
  }
  return url;
}

function resolveUpstream(request, env, routeSegments = []) {
  const baseUrl = getConfiguredBase(env);
  const requestUrl = new URL(request.url);
  const suffix = Array.isArray(routeSegments) && routeSegments.length
    ? `/${routeSegments.join('/')}`
    : '';

  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, '')}${suffix}`;
  baseUrl.search = requestUrl.search;
  return baseUrl.toString();
}

async function proxySignalRRequest(context, method) {
  let upstreamUrl;
  try {
    upstreamUrl = resolveUpstream(context.request, context.env, context.params.route);
  } catch (error) {
    return withCors(context.request, errorJson(String(error.message || error), 500), context.env);
  }

  const headers = new Headers();
  const accept = context.request.headers.get('accept');
  const userAgent = context.request.headers.get('user-agent');
  const contentType = context.request.headers.get('content-type');

  if (accept) headers.set('accept', accept);
  if (userAgent) headers.set('user-agent', userAgent);
  if (contentType) headers.set('content-type', contentType);

  let body = undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await context.request.text();
  }

  const upstream = await fetch(upstreamUrl, {
    method,
    headers,
    body,
    redirect: 'manual',
  });

  const responseHeaders = new Headers(upstream.headers);
  if (method === 'GET' && String(context.params.route?.[0] || '') === 'hubs') {
    responseHeaders.set('cache-control', 'public, s-maxage=300');
  }

  const response = new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });

  return withCors(context.request, response, context.env);
}

export async function onRequestOptions(context) {
  return handleOptions(context.request, context.env);
}

export async function onRequestGet(context) {
  return proxySignalRRequest(context, 'GET');
}

export async function onRequestPost(context) {
  return proxySignalRRequest(context, 'POST');
}
