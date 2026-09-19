// servicesFvp.js
// Cliente y mappers de la API nueva DigitalSport (fvpatinaje.eus/api).
// Traduce el modelo nuevo (UUID + jerarquía competición→división→fase) al shape legacy
// que consumen los componentes, para no reescribir la UI.

import { getCachedApi, setCachedApi, CACHE_TTL_DEFAULT, CACHE_TTL_LONG } from "./utils/apiCache.js";
import { getHttp } from "./utils/env.js";
import { shouldPreferNativeHttp } from "./config/runtime.js";
import { getApiBaseUrl, ENTIDAD_ID, DEPORTE_HP, HEADERS } from "./servicesShared.js";

const GET_HEADERS = { accept: HEADERS.accept };

/** Ventana de días que se pide a la agenda para descubrir competiciones y partidos. */
const AGENDA_DIAS = 240;

/**
 * Indica si un nombre de equipo pertenece al universo Loyola mostrado por la app.
 *
 * @param {string} nombre Nombre del equipo.
 * @returns {boolean}
 */
export function isLoyolaName(nombre) {
  const value = String(nombre || "").toUpperCase();
  return value.includes("LOYOLA") || /\bLOY\b/.test(value);
}

/**
 * Deriva el orden numérico de jornada a partir de su nombre ("JORNADA 3" → 3).
 *
 * @param {string} nombre Nombre de la jornada.
 * @returns {number} Orden numérico o 0.
 */
function jornadaOrden(nombre) {
  const match = String(nombre || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

/**
 * Traduce el estado textual del partido nuevo al código legacy (0 pendiente, 1 en juego, 2 finalizado).
 *
 * @param {string} estado Estado nuevo (PROGRAMADO, FINALIZADO, EN_JUEGO…).
 * @param {{golesLocal:any, golesVisit:any}} [goles] Marcadores para desambiguar finalizados.
 * @returns {0|1|2}
 */
function estadoLegacy(estado, goles) {
  const e = String(estado || "").toUpperCase();
  if (/FINAL|FINISH|JUGAD|CERRAD|PLAYED|ACTA/.test(e)) return 2;
  if (/JUEGO|LIVE|CURSO|PLAYING|DIRECTO/.test(e)) return 1;
  if (goles && goles.golesLocal != null && goles.golesVisit != null) return 2;
  return 0;
}

/**
 * Ejecuta un GET contra la API nueva con caché memoria+localStorage.
 * Usa el plugin HTTP nativo de Capacitor cuando está disponible; si no, `fetch`.
 *
 * @param {string} path Ruta relativa a la base de la API (empezando por `/`).
 * @param {number} [ttl] TTL de caché en ms.
 * @returns {Promise<any>} JSON parseado.
 */
export async function apiGet(path, ttl = CACHE_TTL_DEFAULT) {
  const url = `${getApiBaseUrl()}${path}`;
  const cached = getCachedApi(url, "");
  if (cached !== null) return cached;

  let data;
  if (shouldPreferNativeHttp() && getHttp()) {
    const response = await getHttp().request({ method: "GET", url, headers: GET_HEADERS });
    data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
  } else {
    const response = await fetch(url, { method: "GET", headers: GET_HEADERS });
    if (!response.ok) throw new Error(`API ${response.status} en ${path}`);
    data = await response.json();
  }

  setCachedApi(url, "", data, ttl);
  return data;
}

/**
 * Obtiene la agenda de hockey patines (ventana desde hoy).
 *
 * @returns {Promise<{eventos: Array}>} Agenda cruda.
 */
function getHpAgenda() {
  return apiGet(`/public/agenda?entidadId=${ENTIDAD_ID}&deporte=${DEPORTE_HP}&dias=${AGENDA_DIAS}`, CACHE_TTL_DEFAULT);
}

/**
 * Descubre las competiciones de hockey patines a partir de la agenda.
 *
 * @returns {Promise<Array<{id:string, nombre:string, temporada:string}>>}
 */
export async function discoverCompetitions() {
  const agenda = await getHpAgenda();
  const comps = new Map();
  for (const ev of Array.isArray(agenda?.eventos) ? agenda.eventos : []) {
    if (ev?.competicionId && !comps.has(ev.competicionId)) {
      comps.set(ev.competicionId, { id: ev.competicionId, nombre: ev.competicionNombre || "", temporada: ev.temporada || "" });
    }
  }
  return Array.from(comps.values());
}

/**
 * Devuelve el nombre y temporada de una competición.
 *
 * @param {string} compId UUID de la competición.
 * @returns {Promise<{nombre:string, temporada:string}>}
 */
async function getCompetitionMeta(compId) {
  const comps = await discoverCompetitions();
  const found = comps.find((c) => c.id === compId);
  return { nombre: found?.nombre || "", temporada: found?.temporada || "" };
}

/**
 * Obtiene los árboles (fases/jornadas/enfrentamientos) de todas las divisiones de una competición.
 *
 * @param {string} compId UUID de la competición.
 * @returns {Promise<Array<{divisionId:string, divisionNombre:string, tree:Array}>>}
 */
async function getCompetitionTrees(compId) {
  const divisiones = await apiGet(`/hierarchy/competicion/${compId}/divisiones`, CACHE_TTL_LONG);
  const result = [];
  for (const div of Array.isArray(divisiones) ? divisiones : []) {
    const tree = await apiGet(`/hierarchy/division/${div.id}/tree`, CACHE_TTL_DEFAULT);
    result.push({ divisionId: div.id, divisionNombre: div.nombreDisplay || div.categoriaNombre || "", tree: Array.isArray(tree) ? tree : [] });
  }
  return result;
}

/**
 * Construye el calendario legacy completo de una competición desde los árboles de división.
 *
 * @param {string} compId UUID de la competición.
 * @returns {Promise<Array>} Partidos en shape legacy.
 */
export async function buildLegacyCalendar(compId) {
  const [{ nombre: nombreComp }, trees] = await Promise.all([getCompetitionMeta(compId), getCompetitionTrees(compId)]);
  const partidos = [];
  for (const { tree } of trees) {
    for (const fase of tree) {
      for (const jornada of fase?.jornadas || []) {
        for (const enf of jornada?.enfrentamientos || []) {
          const [loc, vis] = enf?.participants || [];
          const golesLocal = loc?.puntaje ?? null;
          const golesVisit = vis?.puntaje ?? null;
          partidos.push({
            IdPartido: enf.id,
            NombreJornada: jornada.nombre || "",
            Orden: jornada.orden ?? jornadaOrden(jornada.nombre),
            Fecha: String(enf.fechaInicio || "").slice(0, 10),
            Hora: enf.hora || "",
            EstadoPartido: estadoLegacy(enf.estado, { golesLocal, golesVisit }),
            EquipoLocal: loc?.atletaNombre || "",
            EquipoVisit: vis?.atletaNombre || "",
            EquipoLocalAbrev: loc?.atletaNombreAbrev || "",
            EquipoVisitAbrev: vis?.atletaNombreAbrev || "",
            IdEquipoLocal: loc?.inscripcionId || "",
            IdEquipoVisit: vis?.inscripcionId || "",
            GolesLocal: golesLocal,
            GolesVisit: golesVisit,
            NombreCompeticion: nombreComp,
            Instalacion: enf.pista || "",
            CoordenadasGPS: enf.pistaLatitud != null && enf.pistaLongitud != null ? `${enf.pistaLatitud},${enf.pistaLongitud}` : "",
          });
        }
      }
    }
  }
  return partidos;
}

/**
 * Construye las filas de clasificación legacy de una competición (todas sus divisiones/fases).
 *
 * @param {string} compId UUID de la competición.
 * @returns {Promise<Array>} Filas de clasificación en shape legacy.
 */
export async function buildLegacyClasificacion(compId) {
  const divisiones = await apiGet(`/hierarchy/competicion/${compId}/divisiones`, CACHE_TTL_LONG);
  const rows = [];
  for (const div of Array.isArray(divisiones) ? divisiones : []) {
    const fases = await apiGet(`/hierarchy/division/${div.id}/fases`, CACHE_TTL_LONG);
    for (const fase of Array.isArray(fases) ? fases : []) {
      const clas = await apiGet(`/hierarchy/fase/${fase.id}/clasificacion`, CACHE_TTL_DEFAULT);
      for (const row of Array.isArray(clas) ? clas : []) {
        rows.push({
          IdCompeticion: compId,
          NombreGrupo: div.nombreDisplay || div.categoriaNombre || "Clasificación",
          IdEquipo: row.inscripcionId,
          IdEquipoComp: row.inscripcionId,
          IdEntidadEquipo: row.clubLogoUrl || null,
          TieneLogo: !!row.clubLogoUrl,
          NombreEquipo: row.equipoNombre || "",
          NombreEquipoAbrev: row.equipoNombreAbrev || "",
          Posicion: row.puesto,
          Puntos: row.pts,
          PartidosJugados: row.pj,
          PartidosGanados: row.pg,
          PartidosEmpatados: row.pe,
          PartidosPerdidos: row.pp,
          GolesAFavor: row.gf,
          GolesEnContra: row.gc,
          DiferenciaGoles: row.dg,
        });
      }
    }
  }
  return rows;
}

/**
 * Construye la lista de equipos legacy (para logos) de una competición desde los árboles.
 * Cada equipo se identifica por `inscripcionId`, consistente con calendario y clasificación.
 *
 * @param {string} compId UUID de la competición.
 * @returns {Promise<Array>} Equipos en shape legacy (`IdEquipoComp`, `IdEntidadEquipo`, `TieneLogo`…).
 */
export async function buildLegacyEquipos(compId) {
  const trees = await getCompetitionTrees(compId);
  const equipos = new Map();
  for (const { tree } of trees) {
    for (const fase of tree) {
      for (const jornada of fase?.jornadas || []) {
        for (const enf of jornada?.enfrentamientos || []) {
          for (const part of enf?.participants || []) {
            const id = part?.inscripcionId;
            if (!id || equipos.has(id)) continue;
            equipos.set(id, {
              IdEquipoComp: id,
              IdEquipo: id,
              IdEntidadEquipo: part.clubLogoUrl || null,
              TieneLogo: !!part.clubLogoUrl,
              NombreEquipo: part.atletaNombre || "",
              NombreEquipoAbrev: part.atletaNombreAbrev || "",
            });
          }
        }
      }
    }
  }
  return Array.from(equipos.values());
}
