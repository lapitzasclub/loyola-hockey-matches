// apiCache.js
// Lógica de caché para llamadas API (memoria + localStorage, TTL configurable por entrada)

const API_CACHE = new Map();

export const CACHE_TTL_DEFAULT = 5 * 60 * 1000;       // 5 min — calendario, clasificación
export const CACHE_TTL_LONG    = 24 * 60 * 60 * 1000; // 24 h  — parámetros de competición

/**
 * Devuelve la clave de caché para una petición API.
 * @param {string} url - URL de la petición.
 * @param {any} body - Cuerpo de la petición (objeto o string).
 * @returns {string} Clave única de caché.
 */
export function getCacheKey(url, body) {
  return url + '::' + (typeof body === 'string' ? body : JSON.stringify(body));
}

/**
 * Obtiene el valor cacheado para una petición API si existe y no ha expirado.
 * @param {string} url - URL de la petición.
 * @param {any} body - Cuerpo de la petición.
 * @returns {any|null} Valor cacheado o null si no existe o expiró.
 */
export function getCachedApi(url, body) {
  const key = getCacheKey(url, body);
  const now = Date.now();

  if (API_CACHE.has(key)) {
    const entry = API_CACHE.get(key);
    if (now - entry.t < (entry.ttl ?? CACHE_TTL_DEFAULT)) return entry.v;
    API_CACHE.delete(key);
  }

  try {
    const cacheStr = localStorage.getItem('api_cache');
    if (cacheStr) {
      const cacheObj = JSON.parse(cacheStr);
      const entry = cacheObj[key];
      if (entry && now - entry.t < (entry.ttl ?? CACHE_TTL_DEFAULT)) {
        API_CACHE.set(key, entry);
        return entry.v;
      }
    }
  } catch {}

  return null;
}

/**
 * Guarda en caché el valor de una petición API con TTL opcional.
 * @param {string} url - URL de la petición.
 * @param {any} body - Cuerpo de la petición.
 * @param {any} value - Valor a cachear.
 * @param {number} [ttl] - TTL en ms. Por defecto CACHE_TTL_DEFAULT.
 */
export function setCachedApi(url, body, value, ttl = CACHE_TTL_DEFAULT) {
  const key = getCacheKey(url, body);
  const entry = { t: Date.now(), v: value, ttl };
  API_CACHE.set(key, entry);
  try {
    const cacheStr = localStorage.getItem('api_cache');
    const cacheObj = cacheStr ? JSON.parse(cacheStr) : {};
    cacheObj[key] = entry;
    localStorage.setItem('api_cache', JSON.stringify(cacheObj));
  } catch {}
}

/**
 * Invalida selectivamente las entradas cuya URL contiene alguno de los patrones dados.
 * Útil para el pull-to-refresh: borra datos volátiles sin tocar parámetros estables.
 * @param {string[]} urlPatterns - Fragmentos de URL a buscar en la clave de caché.
 */
export function invalidateApiCacheFor(urlPatterns) {
  for (const key of API_CACHE.keys()) {
    const url = key.split('::')[0];
    if (urlPatterns.some((p) => url.includes(p))) API_CACHE.delete(key);
  }
  try {
    const cacheStr = localStorage.getItem('api_cache');
    if (!cacheStr) return;
    const cacheObj = JSON.parse(cacheStr);
    let dirty = false;
    for (const key of Object.keys(cacheObj)) {
      const url = key.split('::')[0];
      if (urlPatterns.some((p) => url.includes(p))) {
        delete cacheObj[key];
        dirty = true;
      }
    }
    if (dirty) localStorage.setItem('api_cache', JSON.stringify(cacheObj));
  } catch {}
}

/**
 * Invalida toda la caché de la API (memoria y localStorage).
 */
export function invalidateApiCache() {
  API_CACHE.clear();
  try { localStorage.removeItem('api_cache'); } catch {}
}
