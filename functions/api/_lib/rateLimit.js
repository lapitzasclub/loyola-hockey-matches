const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

export async function applyRateLimit(request, env, keySuffix = 'default') {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const key = `rate:${keySuffix}:${ip}`;
  const now = Date.now();
  const bucket = await env.API_RATE_LIMIT.get(key, 'json');

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    await env.API_RATE_LIMIT.put(
      key,
      JSON.stringify({ count: 1, windowStart: now }),
      { expirationTtl: Math.ceil(WINDOW_MS / 1000) + 5 },
    );
    return null;
  }

  if (bucket.count >= MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((WINDOW_MS - (now - bucket.windowStart)) / 1000));
    return new Response(
      JSON.stringify({ error: true, message: 'Demasiadas peticiones, inténtalo más tarde.' }),
      {
        status: 429,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'retry-after': String(retryAfter),
        },
      },
    );
  }

  await env.API_RATE_LIMIT.put(
    key,
    JSON.stringify({ count: bucket.count + 1, windowStart: bucket.windowStart }),
    { expirationTtl: Math.ceil(WINDOW_MS / 1000) + 5 },
  );

  return null;
}
