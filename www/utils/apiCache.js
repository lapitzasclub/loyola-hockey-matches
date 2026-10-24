// apiCache.js
// Lógica de caché para llamadas API (memoria + localStorage, TTL configurable por entrada).
// Cada entrada vive en su propia clave de localStorage: escribir una respuesta no reserializa
// el resto de la caché (antes se reescribía un blob único de ~1 MB en cada llamada).

const API_CACHE = new Map();
const STORE_PREFIX = 'api_cache:';
const LEGACY_KEY = 'api_cache';

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
 * Lee una entrada persistida. Si aún existe el blob antiguo `api_cache` se usa como respaldo.
 * @param {string} key - Clave de caché.
 * @returns {{t:number,v:any,ttl?:number}|null}
 */
function readStoredEntry(key) {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + key);
    if (raw) return JSON.parse(raw);
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return JSON.parse(legacy)[key] ?? null;
  } catch {}
  return null;
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

  const entry = readStoredEntry(key);
  if (entry && now - entry.t < (entry.ttl ?? CACHE_TTL_DEFAULT)) {
    API_CACHE.set(key, entry);
    return entry.v;
  }
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
    localStorage.setItem(STORE_PREFIX + key, JSON.stringify(entry));
    // El blob antiguo ya no se lee salvo como respaldo: se retira en la primera escritura.
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

/**
 * Lista las claves persistidas de la caché (nuevo formato).
 * @returns {string[]} Claves de caché sin prefijo.
 */
function storedKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORE_PREFIX)) keys.push(k.slice(STORE_PREFIX.length));
    }
  } catch {}
  return keys;
}

/**
 * Invalida selectivamente las entradas cuya URL contiene alguno de los patrones dados.
 * Útil para el pull-to-refresh: borra datos volátiles sin tocar parámetros estables.
 * @param {string[]} urlPatterns - Fragmentos de URL a buscar en la clave de caché.
 */
export function invalidateApiCacheFor(urlPatterns) {
  const matches = (key) => urlPatterns.some((p) => key.split('::')[0].includes(p));

  for (const key of [...API_CACHE.keys()]) {
    if (matches(key)) API_CACHE.delete(key);
  }
  for (const key of storedKeys()) {
    if (matches(key)) {
      try { localStorage.removeItem(STORE_PREFIX + key); } catch {}
    }
  }
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return;
    const cacheObj = JSON.parse(legacy);
    let dirty = false;
    for (const key of Object.keys(cacheObj)) {
      if (matches(key)) {
        delete cacheObj[key];
        dirty = true;
      }
    }
    if (dirty) localStorage.setItem(LEGACY_KEY, JSON.stringify(cacheObj));
  } catch {}
}

/**
 * Invalida toda la caché de la API (memoria y localStorage).
 */
export function invalidateApiCache() {
  API_CACHE.clear();
  try {
    for (const key of storedKeys()) localStorage.removeItem(STORE_PREFIX + key);
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}
