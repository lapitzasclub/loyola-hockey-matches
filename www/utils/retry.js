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
