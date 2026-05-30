import { getCachedApi, setCachedApi, CACHE_TTL_LONG } from "./utils/apiCache.js";
import { getHttp } from "./utils/env.js";
import { getLegacyApiMode, shouldPreferNativeHttp } from "./config/runtime.js";
import { FVP_BASE_URL, HEADERS, unwrapLegacyPayload } from "./servicesShared.js";

export { getEquiposLoyolaTodasCompeticiones, getLoyolaCompetitionCatalog } from "./servicesCompetitionCatalog.js";

const PARTIDO_HUB_BUS_EVENT = "loyola-signalr-partido";
const CERT_PATH_ERROR_HINTS = [
  "CertPathValidatorException",
  "Trust anchor for certification path not found",
];


/**
 * Emite un evento del hub de partido sobre el bus interno del cliente.
 *
 * @param {string} type Tipo lógico del evento.
 * @param {unknown} payload Payload asociado al evento.
 * @param {string|number|null} idPartido Identificador del partido relacionado.
 * @returns {void}
 */
export function emitPartidoHubEvent(type, payload, idPartido) {
  globalThis.dispatchEvent(
    new CustomEvent(PARTIDO_HUB_BUS_EVENT, {
      detail: { type, payload, idPartido: idPartido != null ? String(idPartido) : null },
    }),
  );
}

/**
 * Suscribe un listener al bus local de eventos de partido.
 *
 * @param {(detail: {type: string, payload: unknown, idPartido: string|null}) => void} handler Callback del suscriptor.
 * @returns {() => void} Función para desuscribirse.
 */
export function subscribePartidoHubEvents(handler) {
  const listener = (event) => handler(event.detail);
  globalThis.addEventListener(PARTIDO_HUB_BUS_EVENT, listener);
  return () => globalThis.removeEventListener(PARTIDO_HUB_BUS_EVENT, listener);
}
/**
 * Registra handlers legacy directamente sobre el cliente del hub enDirecto.
 *
 * @param {object} [handlers={}] Mapa parcial de callbacks por nombre de evento.
 * @returns {void}
 */
export function registerPartidoHubHandlers(handlers = {}) {
  if (!globalThis.signalR?.enDirecto?.client) {
    console.error("SignalR hub proxy no disponible");
    return;
  }
  if (handlers.marcadorPartido) globalThis.signalR.enDirecto.client.marcadorPartido = handlers.marcadorPartido;
  if (handlers.eventosPartido) globalThis.signalR.enDirecto.client.eventosPartido = handlers.eventosPartido;
  if (handlers.penaltisPartido) globalThis.signalR.enDirecto.client.penaltisPartido = handlers.penaltisPartido;
  if (handlers.alineacionPartido) globalThis.signalR.enDirecto.client.alineacionPartido = handlers.alineacionPartido;
}

/**
 * Llama a un método del servidor del hub enDirecto.
 *
 * @param {string} method Nombre del método remoto, por ejemplo `unirseAPartido`.
 * @param {...any} args Argumentos del método remoto.
 * @returns {any} Resultado devuelto por el proxy o undefined si no existe el método.
 */
export function callPartidoHubServerMethod(method, ...args) {
  const server = globalThis.hubProxy?.server || globalThis.signalR?.enDirecto?.server;
  if (!server?.[method]) {
    console.error("Método del servidor no disponible:", method);
    return;
  }
  return server[method](...args);
}

/**
 * Obtiene el calendario completo de una competición, fusionando los partidos de todos los equipos.
 * @param {string|number} idCompeticion - ID de la competición.
 * @param {Array<string|number>} idsEquiposComp - IDs de los equipos de la competición.
 * @returns {Promise<Array>} Array de partidos únicos.
 */
export async function getCalendarioTodosEquipos(idCompeticion, idsEquiposComp) {
  const results = await Promise.all(
    idsEquiposComp.map(async (idEquipo) => {
      try {
        const raw = await getCalendarioLoyola(idEquipo, idCompeticion);
        const parsed = unwrapLegacyPayload(raw);
        return Array.isArray(parsed) && parsed[0]?.Partidos ? parsed[0].Partidos : [];
      } catch {
        return [];
      }
    }),
  );
  const partidosMap = new Map();
  for (const partidos of results) {
    for (const p of partidos) {
      if (!partidosMap.has(p.IdPartido)) partidosMap.set(p.IdPartido, p);
    }
  }
  return Array.from(partidosMap.values());
}

/**
 * Construye la URL efectiva de un endpoint legacy según si se ejecuta en nativo o web.
 *
 * @param {string} endpoint Nombre del método ASMX, sin la barra inicial.
 * @returns {string} URL absoluta o ruta proxy equivalente.
 */
function getServiceUrl(endpoint) {
  return getLegacyApiMode() === "direct"
    ? `${FVP_BASE_URL}/${endpoint}`
    : `/api/${endpoint}`;
}

/**
 * Ejecuta una llamada estándar a un endpoint legacy ASMX capturando errores en formato uniforme.
 *
 * @param {string} endpoint Nombre del método remoto.
 * @param {object} payload Cuerpo JSON del POST.
 * @param {number} [ttl] TTL de caché en ms. Si se omite usa el valor por defecto del sistema.
 * @returns {Promise<any>} Respuesta válida o un objeto `{ error, message }`.
 */
async function callLegacyService(endpoint, payload, ttl) {
  const url = getServiceUrl(endpoint);
  const body = JSON.stringify(payload);

  try {
    const raw = await post({ url, body, preferNative: true, ttl });
    return ensureJsonOrThrow(raw);
  } catch (error) {
    return { error: true, message: error.message };
  }
}

/**
 * Ejecuta un endpoint cuyo parámetro principal es `idcompeticion`.
 *
 * @param {string} endpoint Nombre del método remoto.
 * @param {string|number} idCompeticion Identificador de competición.
 * @param {object} [extraPayload={}] Campos adicionales del payload.
 * @param {number} [ttl] TTL de caché en ms.
 * @returns {Promise<any>} Respuesta de la API legacy.
 */
function callCompetitionService(endpoint, idCompeticion, extraPayload = {}, ttl) {
  return callLegacyService(endpoint, {
    idcompeticion: String(idCompeticion),
    ...extraPayload,
  }, ttl);
}

/**
 * Ejecuta un endpoint legacy cuyo payload contiene una sola entidad principal.
 *
 * @param {string} endpoint Nombre del método remoto.
 * @param {string} fieldName Nombre del campo principal del payload.
 * @param {string|number} value Valor a serializar.
 * @param {number} [ttl] TTL de caché en ms. Si se omite usa el valor por defecto del sistema.
 * @returns {Promise<any>} Respuesta de la API legacy.
 */
function callEntityService(endpoint, fieldName, value, ttl) {
  return callLegacyService(endpoint, { [fieldName]: String(value) }, ttl);
}

/**
 * Obtiene el calendario completo de una competición (todos los partidos).
 *
 * @param {string|number} idCompeticion ID de la competición.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getCalendarioCompeticionCompleto(idCompeticion) {
  return callCompetitionService("GetCalendarioCompeticion", idCompeticion);
}

/**
 * Ejecuta una petición POST a la API real o al proxy, con caché local.
 *
 * @param {object} options Opciones de petición.
 * @param {string} options.url URL absoluta o relativa del endpoint.
 * @param {string} options.body Cuerpo JSON serializado.
 * @param {boolean} options.preferNative Indica si debe priorizar el plugin nativo HTTP.
 * @returns {Promise<unknown>} Respuesta cruda del endpoint.
 */
function isCertificatePathError(error) {
  const message = String(error?.message || error);
  return CERT_PATH_ERROR_HINTS.some((hint) => message.includes(hint));
}

/**
 * Ejecuta la petición por `fetch` como ruta estándar y fallback universal.
 *
 * @param {string} url URL de destino.
 * @param {string} body Cuerpo JSON serializado.
 * @returns {Promise<string>} Texto crudo devuelto por el backend.
 */
async function postWithFetch(url, body) {
  const response = await fetch(url, { method: "POST", headers: HEADERS, body });
  return response.text();
}

/**
 * Ejecuta la petición por el plugin HTTP nativo cuando está disponible.
 *
 * @param {string} url URL de destino.
 * @param {string} body Cuerpo JSON serializado.
 * @returns {Promise<unknown>} Payload devuelto por el transporte nativo.
 */
async function postWithNativeHttp(url, body) {
  const http = getHttp();
  const response = await http.request({
    method: "POST",
    url,
    headers: HEADERS,
    data: body,
  });
  return response.data;
}

/**
 * Ejecuta una petición POST a la API real o al proxy, con caché local.
 *
 * @param {object} options Opciones de petición.
 * @param {string} options.url URL absoluta o relativa del endpoint.
 * @param {string} options.body Cuerpo JSON serializado.
 * @param {boolean} options.preferNative Indica si debe priorizar el plugin nativo HTTP.
 * @returns {Promise<unknown>} Respuesta cruda del endpoint.
 */
async function post({ url, body, preferNative, ttl }) {
  const cached = getCachedApi(url, body);
  if (cached !== null) return cached;

  const canUseNative = preferNative && shouldPreferNativeHttp() && getHttp();
  let result;

  if (canUseNative) {
    try {
      result = await postWithNativeHttp(url, body);
    } catch (error) {
      if (!isCertificatePathError(error)) {
        throw error;
      }
      result = await postWithFetch(url, body);
    }
  } else {
    result = await postWithFetch(url, body);
  }

  setCachedApi(url, body, result, ttl);
  return result;
}

/**
 * Verifica que la respuesta no sea una página HTML de error camuflada como éxito.
 *
 * @param {unknown} raw Respuesta cruda del transporte.
 * @returns {unknown} La propia respuesta si parece válida.
 * @throws {Error} Si la respuesta parece HTML en vez de JSON.
 */
function ensureJsonOrThrow(raw) {
  if (typeof raw === "string" && raw.trim().startsWith("<")) {
    throw new Error(
      "La respuesta no es JSON, es HTML. Puede ser un error de CORS, login o endpoint."
    );
  }
  return raw;
}

/**
 * Obtiene la clasificación de una competición.
 *
 * @param {string|number} idCompeticion ID de la competición.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getClasificacionLiga(idCompeticion) {
  return callCompetitionService("GetClasificacionCompeticion", idCompeticion);
}

/**
 * Obtiene el calendario de un equipo concreto en una competición.
 *
 * @param {string|number} equipoId ID del equipo dentro de la competición.
 * @param {string|number} idCompeticion ID de la competición.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getCalendarioLoyola(equipoId, idCompeticion) {
  return callCompetitionService("GetCalendarioCompeticion", idCompeticion, {
    idequipocomp: String(equipoId),
  });
}

/**
 * Obtiene los parámetros completos de una competición, incluyendo equipos y logos.
 *
 * @param {string|number} idCompeticion ID de la competición.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getParametrosCompeticion(idCompeticion) {
  return callCompetitionService("GetParametrosCompeticion", idCompeticion, {}, CACHE_TTL_LONG);
}


/**
 * Obtiene el detalle completo de un partido (cabecera, equipos, árbitros, marcador, etc.).
 *
 * @param {string|number} idPartido ID del partido.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getPartido(idPartido) {
  return callEntityService("GetParametrosPartido", "idpartido", idPartido);
}

/**
 * Obtiene las estadísticas completas de un partido (goles, faltas, penaltis, tarjetas, etc.).
 *
 * @param {string|number} idPartido ID del partido.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getEstadisticaPartido(idPartido) {
  return callEntityService("GetEstadisticaPartido", "idpartido", idPartido);
}

/**
 * Obtiene las estadísticas agregadas e histórico de un jugador.
 *
 * @param {string|number} idLicencia ID de licencia del jugador.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getEstadisticaJugador(idLicencia) {
  return callEntityService("GetEstadisticasJugador", "idlicencia", idLicencia);
}

/**
 * Promueve las entradas de caché de un partido finalizado a TTL largo (24 h).
 *
 * Los datos de un partido finalizado son inmutables. Llamar a esta función
 * tras confirmar que `EstadoPartido === 2` evita re-fetches en visitas
 * posteriores dentro del mismo día.
 *
 * @param {string|number} idPartido Identificador del partido.
 * @returns {void}
 */
export function upgradeFinishedMatchCache(idPartido) {
  const idStr = String(idPartido);
  const endpoints = ["GetParametrosPartido", "GetEstadisticaPartido"];
  for (const endpoint of endpoints) {
    const url  = getServiceUrl(endpoint);
    const body = JSON.stringify({ idpartido: idStr });
    const cached = getCachedApi(url, body);
    if (cached !== null) setCachedApi(url, body, cached, CACHE_TTL_LONG);
  }
}

