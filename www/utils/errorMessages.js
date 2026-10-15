// errorMessages.js
// Traduce errores técnicos (ej. "Failed to fetch" del navegador) a mensajes
// amigables para el usuario, en vez de mostrar el texto crudo.

import { t } from "../i18n.js";

const NETWORK_ERROR_PATTERN = /failed to fetch|networkerror|network request failed|load failed|err_internet_disconnected|err_network|err_connection/i;

/**
 * Devuelve un título de error amigable y traducido a partir de un `Error`,
 * un sobre `{message}` o un string crudo. Nunca expone el mensaje técnico
 * original al usuario.
 *
 * @param {unknown} error Error capturado o mensaje crudo.
 * @returns {string} Título traducido.
 */
export function friendlyErrorTitle(error) {
  const msg = String(error?.message || error || "");
  if (NETWORK_ERROR_PATTERN.test(msg)) {
    return t("error_network");
  }
  return t("error_generic");
}
