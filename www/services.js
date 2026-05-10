import { getCachedApi, setCachedApi } from "./utils/apiCache.js";
import { isNative, getHttp } from "./utils/env.js";

const PARTIDO_HUB_BUS_EVENT = "loyola-signalr-partido";

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
// --- SignalR clásico: usar instancia global creada por hubs script ---
// signalR.enDirecto ya está disponible globalmente

/**
 * Registra handlers para los eventos del hub enDirecto
 * @param {Object} handlers - { marcadorPartido, eventosPartido, penaltisPartido, alineacionPartido }
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
 * Llama a un método del servidor del hub enDirecto
 * @param {string} method - Nombre del método (ej: 'unirseAPartido')
 * @param {...any} args - Argumentos del método
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
      const parsed = typeof raw === "string" ? JSON.parse(JSON.parse(raw).d) : raw;
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
 * Obtiene el calendario completo de una competición (todos los partidos).
 * @param {string|number} idCompeticion - ID de la competición.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getCalendarioCompeticionCompleto(idCompeticion) {
  const REAL =
    "https://fvpatinaje.eus/webservices/WSCompeticiones.asmx/GetCalendarioCompeticion";
  const PROXY = "/api/GetCalendarioCompeticion";
  const body = JSON.stringify({
    idcompeticion: String(idCompeticion)
    // No se pasa idequipocomp
  });

  const url = isNative() ? REAL : PROXY;
  try {
    const raw = await post({ url, body, preferNative: true });
    return ensureJsonOrThrow(raw);
  } catch (e) {
    return { error: true, message: e.message };
  }
}
// api.js

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

  const nativo = isNative();
  const http = getHttp();
  let result;
  if (preferNative && nativo && http) {
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

/** Clasificación */
export async function getClasificacionLiga(idCompeticion) {
  const REAL =
    "https://fvpatinaje.eus/webservices/WSCompeticiones.asmx/GetClasificacionCompeticion";
  const PROXY = "/api/GetClasificacionCompeticion";
  const body = JSON.stringify({ idcompeticion: String(idCompeticion) });

  const url = isNative() ? REAL : PROXY;
  try {
    const raw = await post({ url, body, preferNative: true });
    return ensureJsonOrThrow(raw);
  } catch (e) {
    return { error: true, message: e.message };
  }
}

/**
 * Obtiene el calendario de un equipo concreto en una competición.
 * @param {string|number} equipoId - ID del equipo.
 * @param {string|number} idCompeticion - ID de la competición.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getCalendarioLoyola(equipoId, idCompeticion) {
  const REAL =
    "https://fvpatinaje.eus/webservices/WSCompeticiones.asmx/GetCalendarioCompeticion";
  const PROXY = "/api/GetCalendarioCompeticion";
  const body = JSON.stringify({
    idcompeticion: String(idCompeticion),
    idequipocomp: String(equipoId),
  });

  const url = isNative() ? REAL : PROXY;
  try {
    const raw = await post({ url, body, preferNative: true });
    return ensureJsonOrThrow(raw);
  } catch (e) {
    return { error: true, message: e.message };
  }
}

/**
 * Obtiene todos los equipos Loyola de todas las competiciones.
 * @returns {Promise<Array>} Array de equipos Loyola.
 */
export async function getEquiposLoyolaTodasCompeticiones() {
  // Usar proxy en web, URL real en nativo
  const isNativo = isNative();
  const COMP_URL = isNativo
    ? "https://fvpatinaje.eus/webservices/WSCompeticiones.asmx/GetCompeticiones"
    : "/api/GetCompeticiones";
  const PARAM_URL = isNativo
    ? "https://fvpatinaje.eus/webservices/WSCompeticiones.asmx/GetParametrosCompeticion"
    : "/api/GetParametrosCompeticion";

  // 1. Pedir todas las competiciones de hockey patines y temporada actual
  const compRes = await fetch(COMP_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ modalidad: "hp", temporada: "21" }), // O ajusta temporada si es necesario
  });
  let compJson;
  try {
    compJson = await compRes.json();
  } catch (e) {
    console.error("Error parseando JSON de competiciones:", e);
    return [];
  }
  let competiciones;
  try {
    competiciones = compJson.d ? JSON.parse(compJson.d) : [];
  } catch (e) {
    console.error("Error parseando compJson.d:", compJson.d, e);
    return [];
  }

  const equiposLoyola = [];

  // 2. Para cada competición, pedir los equipos
  for (const comp of competiciones) {
    const paramRes = await fetch(PARAM_URL, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ idcompeticion: String(comp.IdCompeticion) }),
    });
    let paramJson;
    try {
      paramJson = await paramRes.json();
    } catch (e) {
      console.error("Error parseando JSON de parametros:", e);
      continue;
    }
    let params;
    try {
      params = paramJson.d ? JSON.parse(paramJson.d) : [];
    } catch (e) {
      console.error("Error parseando paramJson.d:", paramJson.d, e);
      continue;
    }
    if (!params[0]?.Equipos) continue;
    for (const eq of params[0].Equipos) {
      if (
        eq.NombreEquipo?.toUpperCase().includes("LOYOLA") ||
        eq.NombreEquipoAbrev?.toUpperCase().includes("LOY")
      ) {
        equiposLoyola.push({
          idCompeticion: comp.IdCompeticion,
          nombreCompeticion: comp.DenoComp,
          idEquipoComp: eq.IdEquipoComp,
          nombreEquipo: eq.NombreEquipo,
          nombreEquipoAbrev: eq.NombreEquipoAbrev,
        });
      }
    }
  }
  return equiposLoyola;
}

/**
 * Obtiene el detalle completo de un partido (cabecera, equipos, árbitros, marcador, etc.).
 * @param {string|number} idPartido - ID del partido.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getPartido(idPartido) {
  const REAL = "https://fvpatinaje.eus/webservices/WSCompeticiones.asmx/GetParametrosPartido";
  const PROXY = "/api/GetParametrosPartido";
  const body = JSON.stringify({ idpartido: String(idPartido) });
  const url = isNative() ? REAL : PROXY;
  try {
    const raw = await post({ url, body, preferNative: true });
    return ensureJsonOrThrow(raw);
  } catch (e) {
    return { error: true, message: e.message };
  }
}

/**
 * Obtiene las estadísticas completas de un partido (goles, faltas, penaltis, tarjetas, etc.).
 * @param {string|number} idPartido - ID del partido.
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getEstadisticaPartido(idPartido) {
  const REAL = "https://fvpatinaje.eus/webservices/WSCompeticiones.asmx/GetEstadisticaPartido";
  const PROXY = "/api/GetEstadisticaPartido";
  const body = JSON.stringify({ idpartido: String(idPartido) });
  const url = isNative() ? REAL : PROXY;
  try {
    const raw = await post({ url, body, preferNative: true });
    return ensureJsonOrThrow(raw);
  } catch (e) {
    return { error: true, message: e.message };
  }
}

/**
 * Obtiene las estadísticas agregadas e histórico de un jugador.
 * @param {string|number} idLicencia - ID de licencia del jugador.
 * @param {string} tipo - Tipo de licencia, normalmente "j" o "p".
 * @param {string} modalidad - Modalidad, normalmente "hp" o "hl".
 * @returns {Promise<any>} Respuesta de la API.
 */
export async function getEstadisticaJugador(idLicencia) {
  const REAL = "https://fvpatinaje.eus/webservices/WSCompeticiones.asmx/GetEstadisticasJugador";
  const PROXY = "/api/GetEstadisticasJugador";
  const body = JSON.stringify({ idlicencia: String(idLicencia) });
  const url = isNative() ? REAL : PROXY;
  try {
    const raw = await post({ url, body, preferNative: true });
    return ensureJsonOrThrow(raw);
  } catch (e) {
    return { error: true, message: e.message };
  }
}

