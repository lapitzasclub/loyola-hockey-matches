// services.js
// Capa de datos: expone las funciones legacy que consumen los componentes, implementadas
// contra la API nueva DigitalSport. Las respuestas se re-empaquetan en el sobre `{ d }`
// para que los componentes sigan usando `decodeApiRaw`/`parseApiArrayResponse` sin cambios.

import { getCachedApi, setCachedApi, CACHE_TTL_LONG } from "./utils/apiCache.js";
import { getApiBaseUrl } from "./servicesShared.js";
import {
  apiGet,
  buildLegacyCalendar,
  buildLegacyClasificacion,
  buildLegacyEquipos,
} from "./servicesFvp.js";

export { getEquiposLoyolaTodasCompeticiones, getLoyolaCompetitionCatalog } from "./servicesCompetitionCatalog.js";

const PARTIDO_HUB_BUS_EVENT = "loyola-signalr-partido";

/**
 * Emite un evento de partido sobre el bus interno del cliente.
 * El transporte en tiempo real (Centrifugo) publicará aquí cuando esté disponible.
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
 * Registra handlers de tiempo real. Reservado para la capa Centrifugo; hoy es no-op.
 *
 * @param {object} [handlers={}] Mapa parcial de callbacks por nombre de evento.
 * @returns {void}
 */
export function registerPartidoHubHandlers(handlers = {}) {
  const realtime = globalThis.__fvpRealtime;
  if (realtime?.registerHandlers) realtime.registerHandlers(handlers);
}

/**
 * Invoca un método del servidor de tiempo real (unirse/salir de partido).
 * Reservado para la capa Centrifugo; hoy es no-op seguro.
 *
 * @param {string} method Nombre del método remoto.
 * @param {...any} args Argumentos del método.
 * @returns {any} Resultado o undefined.
 */
export function callPartidoHubServerMethod(method, ...args) {
  const realtime = globalThis.__fvpRealtime;
  if (realtime?.callServerMethod) return realtime.callServerMethod(method, ...args);
  return undefined;
}

/**
 * Envuelve un valor en el sobre legacy `{ d: "<json>" }`.
 *
 * @param {any} value Valor serializable.
 * @returns {{d: string}} Sobre compatible con los decodificadores legacy.
 */
function wrapLegacy(value) {
  return { d: JSON.stringify(value) };
}

/**
 * Ejecuta un builder capturando errores en el formato uniforme `{ error, message }`.
 *
 * @param {() => Promise<any>} builder Función que produce el payload.
 * @returns {Promise<any>} Sobre `{ d }` o `{ error, message }`.
 */
async function safeBuild(builder) {
  try {
    return wrapLegacy(await builder());
  } catch (error) {
    return { error: true, message: error?.message || String(error) };
  }
}

/**
 * Obtiene el calendario completo de una competición fusionando los partidos de sus equipos.
 * Se usa para el cálculo de racha/posiciones previas en la clasificación.
 *
 * @param {string} idCompeticion ID de la competición.
 * @param {Array<string>} _idsEquiposComp IDs de los equipos (no requerido con la API nueva).
 * @returns {Promise<Array>} Array de partidos legacy.
 */
export async function getCalendarioTodosEquipos(idCompeticion, _idsEquiposComp) {
  try {
    return await buildLegacyCalendar(idCompeticion);
  } catch {
    return [];
  }
}

/**
 * Obtiene el calendario completo de una competición (todos los partidos).
 *
 * @param {string} idCompeticion ID de la competición.
 * @returns {Promise<any>} Sobre legacy `{ d }` con `[{ Partidos }]`.
 */
export function getCalendarioCompeticionCompleto(idCompeticion) {
  return safeBuild(async () => [{ Partidos: await buildLegacyCalendar(idCompeticion) }]);
}

/**
 * Obtiene el calendario de un equipo concreto dentro de una competición.
 *
 * @param {string} equipoId ID del equipo (inscripción) dentro de la competición.
 * @param {string} idCompeticion ID de la competición.
 * @returns {Promise<any>} Sobre legacy `{ d }` con `[{ Partidos }]` filtrado por el equipo.
 */
export function getCalendarioLoyola(equipoId, idCompeticion) {
  return safeBuild(async () => {
    const partidos = await buildLegacyCalendar(idCompeticion);
    const idStr = String(equipoId || "");
    const filtrados = idStr
      ? partidos.filter((p) => String(p.IdEquipoLocal) === idStr || String(p.IdEquipoVisit) === idStr)
      : partidos;
    return [{ Partidos: filtrados }];
  });
}

/**
 * Obtiene la clasificación de una competición (todas sus divisiones).
 *
 * @param {string} idCompeticion ID de la competición.
 * @returns {Promise<any>} Sobre legacy `{ d }` con las filas de clasificación.
 */
export function getClasificacionLiga(idCompeticion) {
  return safeBuild(() => buildLegacyClasificacion(idCompeticion));
}

/**
 * Obtiene los parámetros de una competición: principalmente los equipos y sus escudos.
 *
 * @param {string} idCompeticion ID de la competición.
 * @returns {Promise<any>} Sobre legacy `{ d }` con `[{ Equipos }]`.
 */
export function getParametrosCompeticion(idCompeticion) {
  return safeBuild(async () => [{ Equipos: await buildLegacyEquipos(idCompeticion), IdModalidadComp: "hp" }]);
}

/**
 * Traduce el estado textual del partido nuevo al código legacy (0/1/2).
 *
 * @param {string} estado Estado nuevo.
 * @param {any} golesLocal Marcador local.
 * @param {any} golesVisit Marcador visitante.
 * @returns {0|1|2}
 */
function estadoPartidoLegacy(estado, golesLocal, golesVisit) {
  const e = String(estado || "").toUpperCase();
  if (/FINAL|FINISH|JUGAD|CERRAD|PLAYED|ACTA/.test(e)) return 2;
  if (/JUEGO|LIVE|CURSO|PLAYING|DIRECTO/.test(e)) return 1;
  if (golesLocal != null && golesVisit != null) return 2;
  return 0;
}

/**
 * Mapea el detalle de partido nuevo al shape legacy que consume `normalizarPartido`.
 *
 * @param {object} d Detalle nuevo (`/public/partidos/{id}`).
 * @returns {object} Partido legacy.
 */
function mapPartidoDetalle(d) {
  const loc = d.local || {};
  const vis = d.visitante || {};
  return {
    IdPartido: d.id,
    IdModalidadComp: "hp",
    DenoComp: d.competicionNombre || "",
    NombreJornada: d.jornadaNombre || "",
    Fecha: String(d.fechaInicio || "").slice(0, 10),
    Hora: d.hora || "",
    Instalacion: d.pista || "",
    Periodo: d.periodo ?? "",
    Estado: d.estado || "",
    Eq1: loc.nombre || "",
    Eq2: vis.nombre || "",
    LocalAbrev: loc.nombreAbrev || "",
    VisitAbrev: vis.nombreAbrev || "",
    GolesLocal: loc.puntaje ?? null,
    GolesVisit: vis.puntaje ?? null,
    Arb1: d.arbitro1Nombre || "",
    Arb2: d.arbitro2Nombre || "",
    IdEntidadEq1: loc.logoUrl || "",
    IdEntidadEq2: vis.logoUrl || "",
    IdEq1: loc.inscripcionId || loc.equipoId || null,
    IdEq2: vis.inscripcionId || vis.equipoId || null,
    EstadoPartido: estadoPartidoLegacy(d.estado, loc.puntaje, vis.puntaje),
  };
}

/**
 * Obtiene el detalle de un partido (cabecera, equipos, árbitros, marcador).
 *
 * @param {string} idPartido ID del partido.
 * @returns {Promise<any>} Sobre legacy `{ d }` con `[partido]`.
 */
export function getPartido(idPartido) {
  return safeBuild(async () => {
    const d = await apiGet(`/public/partidos/${idPartido}`, CACHE_TTL_LONG);
    return [mapPartidoDetalle(d)];
  });
}

/**
 * Obtiene las estadísticas de un partido (eventos, alineaciones).
 *
 * Nota: en la temporada recién iniciada estos datos aún están vacíos en la API nueva;
 * el mapeo fino de incidencias/alineaciones se completará con partidos jugados.
 *
 * @param {string} idPartido ID del partido.
 * @returns {Promise<any>} Sobre legacy `{ d }` con `[{ partido, stats, eventos, alineaciones }]`.
 */
export function getEstadisticaPartido(idPartido) {
  return safeBuild(async () => {
    const d = await apiGet(`/public/partidos/${idPartido}`, CACHE_TTL_LONG);
    return [{
      partido: [mapPartidoDetalle(d)],
      stats: [],
      eventos: Array.isArray(d.incidencias) ? d.incidencias : [],
      alineaciones: [],
    }];
  });
}

/**
 * Obtiene las estadísticas de un jugador.
 *
 * @param {string} idLicencia ID del jugador.
 * @returns {Promise<any>} Sobre legacy `{ d }`.
 */
export function getEstadisticaJugador(idLicencia) {
  return safeBuild(async () => {
    const d = await apiGet(`/public/partidos/jugador/${idLicencia}/stats`, CACHE_TTL_LONG);
    return Array.isArray(d) ? d : [d];
  });
}

/**
 * Promueve la caché de un partido finalizado a TTL largo (datos inmutables).
 *
 * @param {string} idPartido Identificador del partido.
 * @returns {void}
 */
export function upgradeFinishedMatchCache(idPartido) {
  const url = `${getApiBaseUrl()}/public/partidos/${idPartido}`;
  const cached = getCachedApi(url, "");
  if (cached !== null) setCachedApi(url, "", cached, CACHE_TTL_LONG);
}
