import { isNative } from "./utils/env.js";

/** Identificador de la Federación Vasca de Patinaje en la plataforma DigitalSport. */
export const ENTIDAD_ID = "00000000-0000-4000-0000-000000000001";

/** Código de modalidad de hockey patines en la API nueva. */
export const DEPORTE_HP = "hp";

/** Origen absoluto de la API nueva (usado en Android nativo, sin proxy). */
export const FVP_API_ORIGIN = "https://fvpatinaje.eus/api";

/**
 * Base efectiva de la API nueva según runtime.
 * - Web pública: `/api` (mismo origen, servido/proxied por Cloudflare Pages).
 * - Android nativo: origen absoluto directo.
 *
 * @returns {string} Base URL sin barra final.
 */
export function getApiBaseUrl() {
  return isNative() ? FVP_API_ORIGIN : "/api";
}

export const HEADERS = {
  accept: "application/json, text/javascript, */*; q=0.01",
  "content-type": "application/json; charset=UTF-8",
  "x-requested-with": "XMLHttpRequest",
};

/**
 * Construye la URL pública del escudo de una entidad.
 *
 * En la plataforma nueva los escudos llegan como URL absoluta (`logoUrl`/`clubLogoUrl`).
 * Para no tocar los componentes, los mappers guardan esa URL absoluta donde antes iba el
 * identificador de entidad; esta función la devuelve tal cual si ya es una URL http(s).
 *
 * @param {string|number|null|undefined} entityIdOrUrl URL absoluta del escudo o identificador legacy.
 * @returns {string} URL pública del escudo o imagen de sustitución.
 */
export function getEntityLogoUrl(entityIdOrUrl) {
  const value = entityIdOrUrl == null ? "" : String(entityIdOrUrl);
  if (/^https?:\/\//i.test(value)) return value;
  return "assets/sidebar-loyola/iconos_svg/icono_equipo_escudo_placeholder.svg";
}

/**
 * Normaliza las respuestas que los servicios devuelven envueltas como `{ d: "<json>" }`.
 *
 * Los servicios nuevos re-empaquetan sus resultados en el sobre legacy `{ d }` para que
 * los componentes existentes sigan usando `decodeApiRaw`/`unwrapLegacyPayload` sin cambios.
 *
 * @param {any} raw Respuesta cruda del servicio.
 * @returns {any} Payload normalizado listo para consumir.
 */
export function unwrapLegacyPayload(raw) {
  if (raw == null) return raw;
  if (typeof raw === "string") {
    return unwrapLegacyPayload(JSON.parse(raw));
  }
  if (typeof raw === "object" && raw.d !== undefined) {
    return typeof raw.d === "string" ? JSON.parse(raw.d) : raw.d;
  }
  return raw;
}
