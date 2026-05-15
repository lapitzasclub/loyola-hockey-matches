import { getCachedApi, setCachedApi } from "./utils/apiCache.js";
import { getHttp, isNative } from "./utils/env.js";
import { getLegacyApiMode, shouldPreferNativeHttp } from "./config/runtime.js";

const PARTIDO_HUB_BUS_EVENT = "loyola-signalr-partido";
const FVP_BASE_URL = "https://fvpatinaje.eus/webservices/WSCompeticiones.asmx";
const APP_PROXY_BASE_URL = "https://loyola-hockey-matches.pages.dev";
const ENTITY_LOGO_BASE_URL = "https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200";
const competitionCatalogCache = new Map();
const competitionCatalogInflight = new Map();

/**
 * Normaliza respuestas legacy ASMX que pueden venir como string JSON, como objeto con `d`
 * o ya directamente como payload final.
 *
 * @param {any} raw Respuesta cruda.
 * @returns {any} Payload normalizado.
 */
function unwrapLegacyPayload(raw) {
  if (raw == null) return raw;

  if (typeof raw === "string") {
    const first = JSON.parse(raw);
    return typeof first?.d === "string" ? JSON.parse(first.d) : (first?.d ?? first);
  }

  if (typeof raw === "object") {
    if (typeof raw.d === "string") {
      return JSON.parse(raw.d);
    }
    if (raw.d !== undefined) {
      return raw.d;
    }
  }

  return raw;
}

/**
 * Emite un evento del hub de partido sobre el bus interno del cliente.
 *
 * @param {string} type Tipo lógico del evento.
 * @param {unknown} payload Payload asociado al evento.
 * @param {string|number|null} idPartido Identificador del partido relacionado.
 * @returns {void}
 */
export function emitPartidoHubEvent(type, payload, idPartido) {
  window.dispatchEvent(
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
  window.addEventListener(PARTIDO_HUB_BUS_EVENT, listener);
  return () => window.removeEventListener(PARTIDO_HUB_BUS_EVENT, listener);
}
/**
 * Registra handlers legacy directamente sobre el cliente del hub enDirecto.
 *
 * @param {object} [handlers={}] Mapa parcial de callbacks por nombre de evento.
 * @returns {void}
 */
export function registerPartidoHubHandlers(handlers = {}) {
  if (!window.signalR?.enDirecto?.client) {
    console.error("SignalR hub proxy no disponible");
    return;
  }
  if (handlers.marcadorPartido) window.signalR.enDirecto.client.marcadorPartido = handlers.marcadorPartido;
  if (handlers.eventosPartido) window.signalR.enDirecto.client.eventosPartido = handlers.eventosPartido;
  if (handlers.penaltisPartido) window.signalR.enDirecto.client.penaltisPartido = handlers.penaltisPartido;
  if (handlers.alineacionPartido) window.signalR.enDirecto.client.alineacionPartido = handlers.alineacionPartido;
}

/**
 * Llama a un método del servidor del hub enDirecto.
 *
 * @param {string} method Nombre del método remoto, por ejemplo `unirseAPartido`.
 * @param {...any} args Argumentos del método remoto.
 * @returns {any} Resultado devuelto por el proxy o undefined si no existe el método.
 */
export function callPartidoHubServerMethod(method, ...args) {
  if (!window.signalR?.enDirecto?.server?.[method]) {
    console.error("Método del servidor no disponible:", method);
    return;
  }
  return window.signalR.enDirecto.server[method](...args);
}

/**
 * Obtiene el calendario completo de una competición, fusionando los partidos de todos los equipos.
 * @param {string|number} idCompeticion - ID de la competición.
 * @param {Array<string|number>} idsEquiposComp - IDs de los equipos de la competición.
 * @returns {Promise<Array>} Array de partidos únicos.
 */
export async function getCalendarioTodosEquipos(idCompeticion, idsEquiposComp) {
  const partidosMap = new Map();
  for (const idEquipo of idsEquiposComp) {
    try {
      const raw = await getCalendarioLoyola(idEquipo, idCompeticion);
      const parsed = unwrapLegacyPayload(raw);
      if (Array.isArray(parsed) && parsed[0]?.Partidos) {
        for (const p of parsed[0].Partidos) {
          if (!partidosMap.has(p.IdPartido)) {
            partidosMap.set(p.IdPartido, p);
          }
        }
      }
    } catch {}
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
 * Normaliza un path API para web pública y desarrollo, evitando URLs absolutas externas en frontend.
 *
 * @param {string} path Ruta relativa de API que empieza por '/'.
 * @returns {string} Ruta final consumible por el cliente.
 */
function getAppApiUrl(path) {
  if (getLegacyApiMode() === "direct") {
    return `${FVP_BASE_URL}/${path.replace(/^\/api\//, "")}`;
  }
  if (isNative()) {
    return `${APP_PROXY_BASE_URL}${path}`;
  }
  return path;
}

/**
 * Ejecuta una llamada estándar a un endpoint legacy ASMX capturando errores en formato uniforme.
 *
 * @param {string} endpoint Nombre del método remoto.
 * @param {object} payload Cuerpo JSON del POST.
 * @returns {Promise<any>} Respuesta válida o un objeto `{ error, message }`.
 */
async function callLegacyService(endpoint, payload) {
  const url = getServiceUrl(endpoint);
  const body = JSON.stringify(payload);

  try {
    const raw = await post({ url, body, preferNative: true });
    return ensureJsonOrThrow(raw);
  } catch (error) {
    return { error: true, message: error.message };
  }
}

/**
 * Obtiene el calendario completo de una competición (todos los partidos).
 *
 * @param {string|number} idCompeticion ID de la competición.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getCalendarioCompeticionCompleto(idCompeticion) {
  return callLegacyService("GetCalendarioCompeticion", {
    idcompeticion: String(idCompeticion),
  });
}

const HEADERS = {
  accept: "application/json, text/javascript, */*; q=0.01",
  "content-type": "application/json; charset=UTF-8",
  "x-requested-with": "XMLHttpRequest",
};

/**
 * Ejecuta una petición POST a la API real o al proxy, con caché local.
 *
 * @param {object} options Opciones de petición.
 * @param {string} options.url URL absoluta o relativa del endpoint.
 * @param {string} options.body Cuerpo JSON serializado.
 * @param {boolean} options.preferNative Indica si debe priorizar el plugin nativo HTTP.
 * @returns {Promise<unknown>} Respuesta cruda del endpoint.
 */
async function post({ url, body, preferNative }) {
  // --- CACHE ---
  const cached = getCachedApi(url, body);
  if (cached !== null) return cached;

  const http = getHttp();
  let result;
  if (preferNative && shouldPreferNativeHttp() && http) {
    try {
      const res = await http.request({
        method: "POST",
        url,
        headers: HEADERS,
        data: body, // string JSON va bien con el plugin oficial
      });
      result = res.data;
    } catch (e) {
      // Si el error es de certificado, reintenta con fetch
      if (
        String(e?.message || e).includes("CertPathValidatorException") ||
        String(e?.message || e).includes(
          "Trust anchor for certification path not found"
        )
      ) {
        const r = await fetch(url, { method: "POST", headers: HEADERS, body });
        result = await r.text();
      } else {
        throw e;
      }
    }
  } else {
    const r = await fetch(url, { method: "POST", headers: HEADERS, body });
    result = await r.text();
  }
  setCachedApi(url, body, result);
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
  return callLegacyService("GetClasificacionCompeticion", {
    idcompeticion: String(idCompeticion),
  });
}

/**
 * Obtiene el calendario de un equipo concreto en una competición.
 *
 * @param {string|number} equipoId ID del equipo dentro de la competición.
 * @param {string|number} idCompeticion ID de la competición.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getCalendarioLoyola(equipoId, idCompeticion) {
  return callLegacyService("GetCalendarioCompeticion", {
    idcompeticion: String(idCompeticion),
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
  return callLegacyService("GetParametrosCompeticion", {
    idcompeticion: String(idCompeticion),
  });
}

/**
 * Obtiene todos los equipos Loyola de todas las competiciones.
 * @returns {Promise<Array>} Array de equipos Loyola.
 */
/**
 * Construye la URL pública de un logo de entidad o un fallback sin escudo.
 *
 * @param {string|number|null|undefined} entityId Identificador de entidad.
 * @returns {string} URL del recurso visual.
 */
function getEntityLogoUrl(entityId) {
  return `${ENTITY_LOGO_BASE_URL}/${entityId || "sinescudo"}.png`;
}

/**
 * Devuelve true si un equipo pertenece al universo Loyola mostrado por la app.
 *
 * @param {object} equipo Equipo de competición.
 * @returns {boolean} True si debe incluirse en el selector propio.
 */
function isLoyolaTeam(equipo) {
  return (
    equipo?.NombreEquipo?.toUpperCase().includes("LOYOLA") ||
    equipo?.NombreEquipoAbrev?.toUpperCase().includes("LOY")
  );
}

/**
 * Obtiene y cachea el catálogo de competiciones con sus equipos Loyola y logos.
 *
 * @returns {Promise<Array>} Catálogo visual agrupado por competición.
 */
export async function getLoyolaCompetitionCatalog() {
  const cacheKey = "hp:21";
  if (competitionCatalogCache.has(cacheKey)) {
    return competitionCatalogCache.get(cacheKey);
  }
  if (competitionCatalogInflight.has(cacheKey)) {
    return competitionCatalogInflight.get(cacheKey);
  }

  const requestPromise = (async () => {
    const compUrl = getAppApiUrl('/api/GetCompeticiones');
    const compRes = await fetch(compUrl, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ modalidad: "hp", temporada: "21" }),
    });

    if (!compRes.ok) {
      throw new Error(`Error cargando competiciones (${compRes.status})`);
    }

    let compJson;
    try {
      compJson = await compRes.json();
    } catch (error) {
      console.error("Error parseando JSON de competiciones:", error);
      throw new Error("No se pudo interpretar la respuesta de competiciones", { cause: error });
    }

    if (compJson?.error) {
      throw new Error(compJson.message || "Error remoto cargando competiciones");
    }

    let competiciones;
    try {
      competiciones = compJson.d ? JSON.parse(compJson.d) : [];
    } catch (error) {
      console.error("Error parseando compJson.d:", compJson.d, error);
      throw new Error("Formato inválido en competiciones", { cause: error });
    }

    const catalog = [];
    for (const comp of competiciones) {
      const rawParams = await getParametrosCompeticion(comp.IdCompeticion);
      if (rawParams?.error) {
        console.error("Error remoto cargando parametros de competición:", comp.IdCompeticion, rawParams.message);
        continue;
      }
      let params;
      try {
        params = unwrapLegacyPayload(rawParams);
      } catch (error) {
        console.error("Error parseando parametros de competición:", comp.IdCompeticion, error);
        continue;
      }

      const competitionData = Array.isArray(params) ? params[0] : null;
      const equipos = Array.isArray(competitionData?.Equipos) ? competitionData.Equipos : [];
      const equiposLoyola = equipos
        .filter(isLoyolaTeam)
        .map((equipo) => ({
          idCompeticion: comp.IdCompeticion,
          nombreCompeticion: comp.DenoComp,
          temporada: comp.Temporada || competitionData?.Temporada || "",
          modalidad: comp.IdModalidadComp || competitionData?.IdModalidadComp || "hp",
          idEquipoComp: equipo.IdEquipoComp,
          idEntidadEquipo: equipo.IdEntidadEquipo,
          nombreEquipo: equipo.NombreEquipo,
          nombreEquipoAbrev: equipo.NombreEquipoAbrev,
          tieneLogo: !!equipo.TieneLogo,
          logoEquipoUrl: equipo.TieneLogo ? getEntityLogoUrl(equipo.IdEntidadEquipo) : getEntityLogoUrl("sinescudo"),
        }));

      if (!equiposLoyola.length) continue;

      catalog.push({
        idCompeticion: comp.IdCompeticion,
        nombreCompeticion: comp.DenoComp,
        nombreCompeticionAbrev: comp.DenoAbrevComp || comp.DenoComp,
        temporada: comp.Temporada || competitionData?.Temporada || "",
        modalidad: comp.IdModalidadComp || competitionData?.IdModalidadComp || "hp",
        tieneLogoComp: !!competitionData?.LogoComp,
        logoCompeticionUrl: competitionData?.LogoComp && competitionData?.IdEntidad
          ? getEntityLogoUrl(competitionData.IdEntidad)
          : getEntityLogoUrl("sinescudo"),
        equipos: equiposLoyola,
      });
    }

    competitionCatalogCache.set(cacheKey, catalog);
    return catalog;
  })();

  competitionCatalogInflight.set(cacheKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    competitionCatalogInflight.delete(cacheKey);
  }
}

/**
 * Obtiene todos los equipos Loyola de todas las competiciones.
 * @returns {Promise<Array>} Array de equipos Loyola.
 */
export async function getEquiposLoyolaTodasCompeticiones() {
  const catalog = await getLoyolaCompetitionCatalog();
  return catalog.flatMap((competition) => competition.equipos);
}

/**
 * Obtiene el detalle completo de un partido (cabecera, equipos, árbitros, marcador, etc.).
 *
 * @param {string|number} idPartido ID del partido.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getPartido(idPartido) {
  return callLegacyService("GetParametrosPartido", {
    idpartido: String(idPartido),
  });
}

/**
 * Obtiene las estadísticas completas de un partido (goles, faltas, penaltis, tarjetas, etc.).
 *
 * @param {string|number} idPartido ID del partido.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getEstadisticaPartido(idPartido) {
  return callLegacyService("GetEstadisticaPartido", {
    idpartido: String(idPartido),
  });
}

/**
 * Obtiene las estadísticas agregadas e histórico de un jugador.
 *
 * @param {string|number} idLicencia ID de licencia del jugador.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getEstadisticaJugador(idLicencia) {
  return callLegacyService("GetEstadisticasJugador", {
    idlicencia: String(idLicencia),
  });
}

