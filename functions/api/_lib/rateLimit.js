const WINDOW_MS = 60_000;
const MAX_REQUESTS = 240;

export async function applyRateLimit(request, env, keySuffix = 'default') {
  if ((env.CF_PAGES || '').toLowerCase() !== '1' && request.headers.get('host')?.startsWith('127.0.0.1:')) {
    return null;
  }

  const kv = env.API_RATE_LIMIT;
  if (!kv?.get || !kv?.put) {
    return null;
  }

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const key = `rate:${keySuffix}:${ip}`;
  const now = Date.now();

  let bucket;
  try {
    bucket = await kv.get(key, 'json');
  } catch (error) {
    console.warn(`Rate limit KV get falló para ${keySuffix}:`, error);
    return null;
  }

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    try {
      await kv.put(
        key,
        JSON.stringify({ count: 1, windowStart: now }),
        { expirationTtl: Math.ceil(WINDOW_MS / 1000) + 5 },
      );
    } catch (error) {
      console.warn(`Rate limit KV put inicial falló para ${keySuffix}:`, error);
    }
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

  try {
    await kv.put(
      key,
      JSON.stringify({ count: bucket.count + 1, windowStart: bucket.windowStart }),
      { expirationTtl: Math.ceil(WINDOW_MS / 1000) + 5 },
    );
  } catch (error) {
    console.warn(`Rate limit KV put incremental falló para ${keySuffix}:`, error);
  }

  return null;
}
