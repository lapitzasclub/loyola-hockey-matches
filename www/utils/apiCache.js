// apiCache.js
// Lógica de caché para llamadas API (memoria + localStorage, TTL configurable)

const API_CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Devuelve la clave de caché para una petición API.
 * @param {string} url - URL de la petición.
 * @param {any} body - Cuerpo de la petición (objeto o string).
 * @returns {string} Clave única de caché.
 */
export function getCacheKey(url, body) {
  const key = url + '::' + (typeof body === 'string' ? body : JSON.stringify(body));
  return key;
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
    const { t, v } = API_CACHE.get(key);
    if (now - t < CACHE_TTL) {
      return v;
    }
    API_CACHE.delete(key);
  }
  try {
    const cacheStr = localStorage.getItem('api_cache');
    if (cacheStr) {
      const cacheObj = JSON.parse(cacheStr);
      if (cacheObj[key] && now - cacheObj[key].t < CACHE_TTL) {
        API_CACHE.set(key, cacheObj[key]);
        return cacheObj[key].v;
      }
    }
  } catch {}
  return null;
}

/**
 * Guarda en caché el valor de una petición API.
 * @param {string} url - URL de la petición.
 * @param {any} body - Cuerpo de la petición.
 * @param {any} value - Valor a cachear.
 */
export function setCachedApi(url, body, value) {
  const key = getCacheKey(url, body);
  const entry = { t: Date.now(), v: value };
  API_CACHE.set(key, entry);
  try {
    const cacheStr = localStorage.getItem('api_cache');
    const cacheObj = cacheStr ? JSON.parse(cacheStr) : {};
    cacheObj[key] = entry;
    localStorage.setItem('api_cache', JSON.stringify(cacheObj));
  } catch {}
}

/**
 * Invalida toda la caché de la API (memoria y localStorage).
 */
export function invalidateApiCache() {
  API_CACHE.clear();
  try { localStorage.removeItem('api_cache'); } catch {}
}
