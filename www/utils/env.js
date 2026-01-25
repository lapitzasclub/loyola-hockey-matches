// env.js
// Helpers de entorno para detectar plataforma y obtener HTTP client

/**
 * Detecta si la app se está ejecutando en entorno nativo (Capacitor).
 * @returns {boolean} True si es nativo, false si es web.
 */
export function isNative() {
  const C = window.Capacitor;
  if (C?.isNativePlatform?.()) return true;
  if (typeof C?.getPlatform === "function") {
    const p = C.getPlatform();
    if (p && p !== "web") return true;
  }
  if (C?.platform && C.platform !== "web") return true;
  if (window.location.protocol === "file:") return true; // fallback típico
  return false;
}

/**
 * Obtiene el cliente HTTP adecuado según el entorno (Capacitor, web, legacy).
 * @returns {any|null} Cliente HTTP compatible o null si no hay.
 */
export function getHttp() {
  // Preferencia: plugin oficial (@capacitor/http)
  if (window.CapacitorHttp?.request) return window.CapacitorHttp;
  // Compat: algunos entornos lo exponen en Plugins.Http
  const classic = window.Capacitor?.Plugins?.Http;
  if (classic?.request) return classic;
  // Legacy (muy antiguo)
  if (window.Http?.request) return window.Http;
  return null;
}
