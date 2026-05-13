export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json; charset=utf-8');
  }
  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function errorJson(message, status = 500, extra = {}) {
  return json(
    {
      error: true,
      message,
      ...extra,
    },
    { status },
  );
}

export function withCors(request, response, env) {
  const origin = request.headers.get('origin');
  const allowedOrigin = env.PUBLIC_APP_ORIGIN;

  if (!origin || !allowedOrigin || origin !== allowedOrigin) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function handleOptions(request, env) {
  const origin = request.headers.get('origin');
  if (!origin || !env.PUBLIC_APP_ORIGIN || origin !== env.PUBLIC_APP_ORIGIN) {
    return new Response(null, { status: 204 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': env.PUBLIC_APP_ORIGIN,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    },
  });
}
