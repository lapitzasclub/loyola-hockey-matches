export const FVP_BASE_URL = "https://fvpatinaje.eus/webservices/WSCompeticiones.asmx";
export const ENTITY_LOGO_BASE_URL = "https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200";

export const HEADERS = {
  accept: "application/json, text/javascript, */*; q=0.01",
  "content-type": "application/json; charset=UTF-8",
  "x-requested-with": "XMLHttpRequest",
};

/**
 * Construye la URL pública del escudo de una entidad.
 * Usado tanto para escudos de equipos (entidad/200x200) como fallback sin imagen.
 *
 * @param {string|number|null|undefined} entityId Identificador de entidad de digitalsport.
 * @returns {string} URL pública del escudo o imagen de sustitución.
 */
export function getEntityLogoUrl(entityId) {
  return `${ENTITY_LOGO_BASE_URL}/${entityId || "sinescudo"}.png`;
}

/**
 * Normaliza las respuestas legacy ASMX que llegan envueltas en capas variables de JSON.
 *
 * El endpoint ASMX puede devolver:
 * - Una cadena JSON cruda
 * - Un objeto `{ d: "<json-string>" }` (patrón ScriptService de ASP.NET)
 * - El payload final directamente
 *
 * La función aplica el desempaquetado de forma recursiva hasta obtener el valor final.
 *
 * @param {any} raw Respuesta cruda del endpoint ASMX.
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
