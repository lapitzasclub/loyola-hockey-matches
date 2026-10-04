// servicesFvp.js
// Cliente y mappers de la API nueva DigitalSport (fvpatinaje.eus/api).
// Traduce el modelo nuevo (UUID + jerarquía competición→división→fase) al shape legacy
// que consumen los componentes, para no reescribir la UI.

import { getCachedApi, setCachedApi, CACHE_TTL_DEFAULT, CACHE_TTL_LONG } from "./utils/apiCache.js";
import { getHttp } from "./utils/env.js";
import { shouldPreferNativeHttp } from "./config/runtime.js";
import { getApiBaseUrl, ENTIDAD_ID, DEPORTE_HP, HEADERS } from "./servicesShared.js";
import { statsPorJugador } from "./servicesPartidoMappers.js";

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
  // La API mezcla vocabularios: la agenda devuelve FINALIZADO/EN_JUEGO/PROGRAMADO y el árbol
  // de división FINISHED/SCHEDULED. Se cubren ambos, más IN_PROGRESS por si aparece en vivo.
  if (/FINAL|FINISH|JUGAD|CERRAD|PLAYED|ACTA/.test(e)) return 2;
  if (/JUEGO|LIVE|CURSO|PLAYING|PROGRESS|JUGANDO|DIRECTO/.test(e)) return 1;
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
  // Esta agenda pesa ~490 KB y sólo se usa para descubrir las competiciones de la temporada,
  // que no cambian de un día para otro: con TTL corto se re-descargaba cada 5 minutos.
  return apiGet(`/public/agenda?entidadId=${ENTIDAD_ID}&deporte=${DEPORTE_HP}&dias=${AGENDA_DIAS}`, CACHE_TTL_LONG);
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
  return Promise.all(
    (Array.isArray(divisiones) ? divisiones : []).map(async (div) => {
      const tree = await apiGet(`/hierarchy/division/${div.id}/tree`, CACHE_TTL_DEFAULT);
      return {
        divisionId: div.id,
        divisionNombre: div.nombreDisplay || div.categoriaNombre || "",
        tree: Array.isArray(tree) ? tree : [],
      };
    }),
  );
}

/**
 * Obtiene, en paralelo, las filas de clasificación de todas las fases de una competición.
 *
 * Es además la fuente ligera de equipos: trae `inscripcionId` (la clave interna que comparten
 * calendario y clasificación), nombre, abreviatura y logo, y pesa ~33 veces menos que el árbol
 * de la división (≈7 KB frente a ≈222 KB).
 *
 * @param {string} compId UUID de la competición.
 * @returns {Promise<Array<{div:object, filas:Array}>>} Filas agrupadas por división.
 */
async function getCompetitionClasificacion(compId) {
  const divisiones = await apiGet(`/hierarchy/competicion/${compId}/divisiones`, CACHE_TTL_LONG);
  return Promise.all(
    (Array.isArray(divisiones) ? divisiones : []).map(async (div) => {
      const fases = await apiGet(`/hierarchy/division/${div.id}/fases`, CACHE_TTL_LONG);
      const clasificaciones = await Promise.all(
        (Array.isArray(fases) ? fases : []).map((fase) =>
          apiGet(`/hierarchy/fase/${fase.id}/clasificacion`, CACHE_TTL_DEFAULT).catch(() => []),
        ),
      );
      return { div, filas: clasificaciones.flatMap((c) => (Array.isArray(c) ? c : [])) };
    }),
  );
}

/**
 * Obtiene el marcador en vivo por partido. El árbol/jerarquía deja `estado` en PROGRAMADO y
 * `puntaje` a null durante el directo; sólo `/public/partidos/marcadores` refleja los partidos
 * en juego (y recién finalizados: `periodo === 30`). Se usa para superponer estado/goles reales.
 *
 * @returns {Promise<Map<string,{periodo:number, golesLocal:number|null, golesVisit:number|null}>>}
 */
async function getMarcadoresLive() {
  try {
    const data = await apiGet(`/public/partidos/marcadores?entidadId=${ENTIDAD_ID}`, 30 * 1000);
    const map = new Map();
    for (const comp of Array.isArray(data) ? data : []) {
      for (const m of Array.isArray(comp?.matches) ? comp.matches : []) {
        map.set(String(m.id), {
          periodo: Number(m.periodo) || 0,
          golesLocal: m.local?.goles ?? null,
          golesVisit: m.visitante?.goles ?? null,
        });
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * Construye el calendario legacy completo de una competición desde los árboles de división,
 * superponiendo el marcador/estado en vivo de los partidos en juego o recién finalizados.
 *
 * @param {string} compId UUID de la competición.
 * @returns {Promise<Array>} Partidos en shape legacy.
 */
export async function buildLegacyCalendar(compId) {
  const [{ nombre: nombreComp }, trees, marcadores] = await Promise.all([
    getCompetitionMeta(compId),
    getCompetitionTrees(compId),
    getMarcadoresLive(),
  ]);
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
  for (const p of partidos) {
    const live = marcadores.get(String(p.IdPartido));
    // `marcadores` también lista partidos aún no empezados (periodo 0, marcador 0-0):
    // hay que ignorarlos o se pintarían como "en juego" con un falso 0-0.
    if (!live || live.periodo <= 0) continue;
    if (live.golesLocal != null) p.GolesLocal = live.golesLocal;
    if (live.golesVisit != null) p.GolesVisit = live.golesVisit;
    p.EstadoPartido = live.periodo === 30 ? 2 : 1;
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
  const porDivision = await getCompetitionClasificacion(compId);
  const rows = [];
  for (const { div, filas } of porDivision) {
    for (const row of filas) {
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
  return rows;
}

/**
 * Normaliza un jugador del ranking de la división al shape que consume la vista.
 *
 * @param {object} j Jugador crudo de `/estadisticas-jugadores`.
 * @param {object} div División a la que pertenece.
 * @returns {object} Jugador normalizado.
 */
function mapJugadorEstadistica(j, div) {
  return {
    id: j.plantillaEquipoId || null,
    nombre: j.nombreCompleto || "",
    fotoUrl: j.fotoUrl || "",
    // En este endpoint `equipoNombre` llega abreviado (p. ej. "LOY A"), que es justo la
    // clave por la que se empareja con el equipo seleccionado.
    equipoAbrev: j.equipoNombre || "",
    equipoId: j.equipoId || null,
    clubLogoUrl: j.clubLogoUrl || "",
    grupo: div?.nombreDisplay || div?.categoriaNombre || "",
    esPortero: !!j.esPortero,
    partidosJugados: j.partidosJugados || 0,
    goles: j.goles || 0,
    asistencias: j.asistencias || 0,
    azules: j.tarjetasAzules || 0,
    amarillas: j.tarjetasAmarillas || 0,
    rojas: j.tarjetasRojas || 0,
    faltas: j.faltas || 0,
    paradas: j.paradas || 0,
    golesEncajados: j.golesEncajados || 0,
    porcentajeParadas: j.porcentajeParadas || 0,
    minutosJugados: j.minutosJugados || 0,
  };
}

/**
 * Obtiene el ranking de jugadores de todas las divisiones de una competición.
 * Una sola petición por división devuelve a todos los jugadores con sus totales de temporada.
 *
 * @param {string} compId UUID de la competición.
 * @returns {Promise<Array<object>>} Jugadores normalizados.
 */
export async function buildEstadisticasJugadores(compId) {
  const divisiones = await apiGet(`/hierarchy/competicion/${compId}/divisiones`, CACHE_TTL_LONG);
  const porDivision = await Promise.all(
    (Array.isArray(divisiones) ? divisiones : []).map(async (div) => {
      const data = await apiGet(`/hierarchy/division/${div.id}/estadisticas-jugadores`, CACHE_TTL_DEFAULT)
        .catch(() => null);
      const jugadores = Array.isArray(data?.jugadores) ? data.jugadores : [];
      return jugadores.map((j) => mapJugadorEstadistica(j, div));
    }),
  );
  return porDivision.flat();
}

/**
 * Localiza la última jornada con partidos ya jugados de una competición.
 *
 * @param {Array<{tree:Array}>} trees Árboles por división.
 * @returns {{orden:number, nombre:string, partidos:string[]}|null}
 */
function ultimaJornadaJugada(trees) {
  let mejor = null;
  for (const { tree } of trees) {
    for (const fase of tree) {
      for (const jornada of fase?.jornadas || []) {
        const jugados = (jornada?.enfrentamientos || [])
          .filter((e) => /FINISH|FINAL/i.test(String(e?.estado || "")))
          .map((e) => e.id)
          .filter(Boolean);
        if (!jugados.length) continue;

        const orden = jornada.orden ?? jornadaOrden(jornada.nombre);
        if (!mejor || orden > mejor.orden) {
          mejor = { orden, nombre: jornada.nombre || "", partidos: [...jugados] };
        } else if (orden === mejor.orden) {
          // Varias divisiones comparten numeración de jornada: se acumulan sus partidos.
          mejor.partidos.push(...jugados);
        }
      }
    }
  }
  return mejor;
}

/**
 * Agrega las estadísticas de los jugadores que participaron en los partidos indicados.
 * Reutiliza el acumulador de incidencias del detalle de partido.
 *
 * @param {object[]} detalles Detalles de partido ya descargados.
 * @returns {Array<object>} Jugadores normalizados, con el mismo shape que el ranking de temporada.
 */
function agregarJugadoresJornada(detalles) {
  const acc = new Map();

  for (const d of detalles) {
    const stats = statsPorJugador(d);
    const lados = [
      [d.alineacionesLocal, d.local || {}],
      [d.alineacionesVisitante, d.visitante || {}],
    ];

    for (const [alineacion, equipo] of lados) {
      for (const a of Array.isArray(alineacion) ? alineacion : []) {
        const rol = String(a.rolPosicion || "").toUpperCase();
        if (rol && rol !== "JUGADOR" && rol !== "PORTERO") continue;
        const id = a.plantillaEquipoId;
        if (!id) continue;

        let j = acc.get(id);
        if (!j) {
          j = {
            id,
            nombre: a.nombre || "",
            fotoUrl: a.fotoUrl || "",
            equipoAbrev: equipo.nombreAbrev || "",
            equipoId: equipo.equipoId || null,
            clubLogoUrl: equipo.logoUrl || "",
            grupo: "",
            esPortero: rol === "PORTERO",
            partidosJugados: 0,
            goles: 0,
            asistencias: 0,
            azules: 0,
            amarillas: 0,
            rojas: 0,
            faltas: 0,
            paradas: 0,
            golesEncajados: 0,
            porcentajeParadas: 0,
            minutosJugados: 0,
          };
          acc.set(id, j);
        }

        const s = stats.get(id) || {};
        j.partidosJugados += 1;
        j.goles += s.Goles || 0;
        j.asistencias += s.Asist || 0;
        j.azules += s.Azules || 0;
        j.amarillas += s.Amarillas || 0;
        j.rojas += s.Rojas || 0;
        j.faltas += s.FaltaReal || 0;
        j.paradas += s.Paradas || 0;
        j.golesEncajados += s.GolesEncajados || 0;
      }
    }
  }

  for (const j of acc.values()) {
    const tiros = j.paradas + j.golesEncajados;
    j.porcentajeParadas = tiros ? (j.paradas / tiros) * 100 : 0;
  }
  return Array.from(acc.values());
}

/**
 * Obtiene las estadísticas de jugador de la última jornada jugada.
 * El endpoint de estadísticas sólo da totales de temporada (ignora cualquier filtro), así que
 * la jornada se agrega a partir de las incidencias de sus partidos, que son inmutables.
 *
 * @param {string} compId UUID de la competición.
 * @returns {Promise<{nombre:string, jugadores:Array<object>}>}
 */
export async function buildEstadisticasUltimaJornada(compId) {
  const trees = await getCompetitionTrees(compId);
  const jornada = ultimaJornadaJugada(trees);
  if (!jornada?.partidos?.length) return { nombre: "", jugadores: [] };

  const detalles = await Promise.all(
    jornada.partidos.map((id) => apiGet(`/public/partidos/${id}`, CACHE_TTL_LONG).catch(() => null)),
  );
  return { nombre: jornada.nombre, jugadores: agregarJugadoresJornada(detalles.filter(Boolean)) };
}

/**
 * Construye la lista de equipos legacy (para logos) de una competición desde los árboles.
 * Cada equipo se identifica por `inscripcionId`, consistente con calendario y clasificación.
 *
 * @param {string} compId UUID de la competición.
 * @returns {Promise<Array>} Equipos en shape legacy (`IdEquipoComp`, `IdEntidadEquipo`, `TieneLogo`…).
 */
export async function buildLegacyEquipos(compId) {
  const porDivision = await getCompetitionClasificacion(compId);
  const equipos = new Map();
  for (const { filas } of porDivision) {
    for (const row of filas) {
      const id = row?.inscripcionId;
      if (!id || equipos.has(id)) continue;
      equipos.set(id, {
        IdEquipoComp: id,
        IdEquipo: id,
        IdEntidadEquipo: row.clubLogoUrl || null,
        TieneLogo: !!row.clubLogoUrl,
        NombreEquipo: row.equipoNombre || "",
        NombreEquipoAbrev: row.equipoNombreAbrev || "",
      });
    }
  }
  if (equipos.size) return Array.from(equipos.values());
  // Formatos sin tabla (eliminatorias puras): se recurre al árbol, que es la otra fuente
  // con `inscripcionId` aunque pese mucho más.
  return buildLegacyEquiposDesdeArbol(compId);
}

/**
 * Extrae los equipos desde el árbol de la competición. Reservado como respaldo de
 * `buildLegacyEquipos` cuando la competición no expone clasificación.
 *
 * @param {string} compId UUID de la competición.
 * @returns {Promise<Array>} Equipos en shape legacy.
 */
async function buildLegacyEquiposDesdeArbol(compId) {
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
