// retry.js
// Reintento silencioso para operaciones que pueden fallar por red/timeout,
// antes de que el llamador escale a una UI de error.

/**
 * Ejecuta `fn`, reintentando en silencio (sin cambiar ningún estado visual)
 * antes de que el llamador decida escalar a overlay/tarjeta/toast de error.
 *
 * @template T
 * @param {() => Promise<T>} fn Operación a ejecutar.
 * @param {{attempts?: number, delayMs?: number}} [options] `attempts` es el número
 *   total de intentos, incluido el primero. `delayMs` es la base de la espera entre
 *   intentos (se multiplica por el número de intento para dar un backoff corto).
 * @returns {Promise<T>}
 */
export async function withRetry(fn, { attempts = 2, delayMs = 900 } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * Convierte el sobre de error legacy `{error: true, message}` (que usan las
 * funciones de `services.js` envueltas en `safeBuild`, que nunca rechazan)
 * en una excepción real, para que `withRetry` pueda detectar el fallo.
 *
 * @param {any} raw Respuesta cruda de una función de `services.js`.
 * @returns {any} La misma respuesta si no es un error.
 * @throws {Error} Si la respuesta es el sobre `{error: true, message}`.
 */
export function throwIfApiError(raw) {
  if (raw && typeof raw === "object" && raw.error === true) {
    throw new Error(raw.message || "Error de API");
  }
  return raw;
}
