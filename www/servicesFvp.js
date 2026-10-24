// servicesFvp.js
// Cliente y mappers de la API nueva DigitalSport (fvpatinaje.eus/api).
// Traduce el modelo nuevo (UUID + jerarquía competición→división→fase) al shape legacy
// que consumen los componentes, para no reescribir la UI.

import { getCachedApi, setCachedApi, CACHE_TTL_DEFAULT, CACHE_TTL_LONG } from "./utils/apiCache.js";
import { getHttp } from "./utils/env.js";
import { shouldPreferNativeHttp } from "./config/runtime.js";
import { getApiBaseUrl, ENTIDAD_ID, DEPORTE_HP, HEADERS } from "./servicesShared.js";
import { statsPorJugador, mapPartidoDetalle } from "./servicesPartidoMappers.js";

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

  const data = await requestJson(path);
  setCachedApi(url, "", data, ttl);
  return data;
}

/**
 * GET directo a la API nueva, sin caché. Quien lo use decide qué guardar.
 *
 * @param {string} path Ruta relativa a la base de la API.
 * @returns {Promise<any>} JSON parseado.
 */
async function requestJson(path) {
  const url = `${getApiBaseUrl()}${path}`;
  if (shouldPreferNativeHttp() && getHttp()) {
    const response = await getHttp().request({ method: "GET", url, headers: GET_HEADERS });
    return typeof response.data === "string" ? JSON.parse(response.data) : response.data;
  }
  const response = await fetch(url, { method: "GET", headers: GET_HEADERS });
  if (!response.ok) throw new Error(`API ${response.status} en ${path}`);
  return response.json();
}

/**
 * Marcador de un partido finalizado. La federación puede corregir el acta durante la jornada,
 * así que no se guarda más de 6 h; el pull-to-refresh lo vacía además por completo.
 */
const MARCADOR_FINAL_TTL = 6 * 60 * 60 * 1000;
/** Marcador en juego: se refresca casi en cada vista. */
const MARCADOR_LIVE_TTL = 30 * 1000;
const MARCADOR_STORE_KEY = "partido_marcador_cache";
const marcadorLive = new Map();

/**
 * Descarta los marcadores guardados (finales y en juego) para que el próximo cálculo
 * vuelva a pedir el detalle. Lo usa el pull-to-refresh: sin esto un acta corregida
 * seguiría viéndose hasta que caduque el almacén.
 *
 * @returns {void}
 */
export function invalidarMarcadoresFinales() {
  marcadorLive.clear();
  try {
    localStorage.removeItem(MARCADOR_STORE_KEY);
  } catch {
    // Sin localStorage no hay almacén que vaciar.
  }
}

/**
 * Lee el almacén compacto de marcadores finalizados (solo números, no el detalle completo).
 *
 * @returns {Record<string, object>} Registros por id de partido.
 */
function leerMarcadorStore() {
  try {
    return JSON.parse(localStorage.getItem(MARCADOR_STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * Guarda un marcador final y descarta los caducados para que el almacén no crezca sin límite.
 *
 * @param {string} id Id del partido.
 * @param {object} rec Registro compacto con marca de tiempo.
 * @returns {void}
 */
function guardarMarcadorStore(id, rec) {
  try {
    const ahora = Date.now();
    const store = leerMarcadorStore();
    for (const key of Object.keys(store)) {
      if (ahora - store[key].t >= MARCADOR_FINAL_TTL) delete store[key];
    }
    store[id] = rec;
    localStorage.setItem(MARCADOR_STORE_KEY, JSON.stringify(store));
  } catch {
    // Sin localStorage se vuelve a pedir el detalle en la siguiente carga.
  }
}

/**
 * Pone en el partido el marcador real (incidencias GOL) y el oficial, desde su detalle.
 * Los finalizados salen del almacén si son recientes; los demás, de memoria con TTL corto.
 *
 * @param {object} p Partido legacy del calendario (se modifica en sitio).
 * @returns {Promise<void>}
 */
async function aplicarMarcadorDetalle(p) {
  const id = String(p.IdPartido);
  const finalizado = p.EstadoPartido === 2;
  const ttl = finalizado ? MARCADOR_FINAL_TTL : MARCADOR_LIVE_TTL;
  let rec = finalizado ? leerMarcadorStore()[id] : marcadorLive.get(id);

  if (!rec || Date.now() - rec.t >= ttl) {
    try {
      const mapped = mapPartidoDetalle(await requestJson(`/public/partidos/${id}`));
      rec = {
        t: Date.now(),
        e: mapped.EstadoPartido,
        gl: mapped.GolesLocal,
        gv: mapped.GolesVisit,
        ol: mapped.GolesOficialLocal,
        ov: mapped.GolesOficialVisit,
      };
      if (rec.e === 2) guardarMarcadorStore(id, rec);
      else marcadorLive.set(id, rec);
    } catch {
      // Sin detalle no hay marcador fiable: la tarjeta se queda sin resultado.
      rec = null;
    }
  }

  p.GolesLocal = rec?.gl ?? null;
  p.GolesVisit = rec?.gv ?? null;
  p.GolesOficialLocal = rec?.ol ?? null;
  p.GolesOficialVisit = rec?.ov ?? null;
  if (rec?.e) p.EstadoPartido = rec.e;
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
 * @returns {Promise<Array<{div:object, fase:object, grupoNombre:string, filas:Array, fasesConTabla:number, gruposConTabla:number}>>} Una entrada por tabla (fase × grupo).
 */
async function getCompetitionClasificacion(compId) {
  const divisiones = await apiGet(`/hierarchy/competicion/${compId}/divisiones`, CACHE_TTL_LONG);
  const porDivision = await Promise.all(
    (Array.isArray(divisiones) ? divisiones : []).map(async (div) => {
      const fases = await apiGet(`/hierarchy/division/${div.id}/fases`, CACHE_TTL_LONG);
      const porFase = await Promise.all(
        (Array.isArray(fases) ? fases : []).map(async (fase) => {
          const filas = await apiGet(`/hierarchy/fase/${fase.id}/clasificacion`, CACHE_TTL_DEFAULT).catch(() => []);
          return { fase, filas: Array.isArray(filas) ? filas : [] };
        }),
      );
      // Dentro de una fase, la API mezcla varias clasificaciones (p. ej. por territorio o año de nacimiento).
      // Cada grupo viene marcado en `datosAdicionales.grupoId`/`grupoNombre`: se separan en tablas distintas.
      const tablas = porFase.flatMap(({ fase, filas }) => {
        const porGrupo = new Map();
        for (const row of filas) {
          const datos = parseDatosAdicionales(row.datosAdicionales);
          const key = datos.grupoId || "";
          if (!porGrupo.has(key)) porGrupo.set(key, { grupoNombre: datos.grupoNombre || "", filas: [] });
          porGrupo.get(key).filas.push(row);
        }
        return [...porGrupo.values()].map((g) => ({ fase, ...g }));
      });
      const fasesConTabla = new Set(tablas.map((t) => t.fase.id)).size;
      const gruposConTabla = new Set(tablas.map((t) => t.grupoNombre)).size;
      return tablas.map((t) => ({ div, ...t, fasesConTabla, gruposConTabla }));
    }),
  );
  return porDivision.flat();
}

/**
 * Lee `datosAdicionales` de una fila de clasificación, que llega como JSON en texto.
 *
 * @param {string|object|null} raw Valor crudo.
 * @returns {{grupoId?:string, grupoNombre?:string}} Datos del grupo o vacío.
 */
function parseDatosAdicionales(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
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
  for (const { divisionId, tree } of trees) {
    for (const fase of tree) {
      for (const jornada of fase?.jornadas || []) {
        for (const enf of jornada?.enfrentamientos || []) {
          const [loc, vis] = enf?.participants || [];
          // El puntaje del árbol solo sirve para saber que el partido ya tiene acta (estado).
          // El marcador que se muestra sale del detalle (incidencias GOL), más abajo.
          const puntajeLocal = loc?.puntaje ?? null;
          const puntajeVisit = vis?.puntaje ?? null;
          partidos.push({
            IdPartido: enf.id,
            IdDivision: divisionId,
            NombreJornada: jornada.nombre || "",
            Orden: jornada.orden ?? jornadaOrden(jornada.nombre),
            Fecha: String(enf.fechaInicio || "").slice(0, 10),
            Hora: enf.hora || "",
            EstadoPartido: estadoLegacy(enf.estado, { golesLocal: puntajeLocal, golesVisit: puntajeVisit }),
            EquipoLocal: loc?.atletaNombre || "",
            EquipoVisit: vis?.atletaNombre || "",
            EquipoLocalAbrev: loc?.atletaNombreAbrev || "",
            EquipoVisitAbrev: vis?.atletaNombreAbrev || "",
            IdEquipoLocal: loc?.inscripcionId || "",
            IdEquipoVisit: vis?.inscripcionId || "",
            GolesLocal: null,
            GolesVisit: null,
            GolesOficialLocal: puntajeLocal,
            GolesOficialVisit: puntajeVisit,
            NombreCompeticion: nombreComp,
            Instalacion: enf.pista || "",
            CoordenadasGPS: enf.pistaLatitud != null && enf.pistaLongitud != null ? `${enf.pistaLatitud},${enf.pistaLongitud}` : "",
          });
        }
      }
    }
  }
  // Marcador y estado salen del detalle (incidencias GOL), no del puntaje oficial, que puede
  // venir topado. Se piden los finalizados, los que tienen periodo en vivo y los de hoy ya
  // empezados (`marcadores` no lo cubre todo, p. ej. Benjamín).
  const ahora = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" });
  const hoy = ahora.slice(0, 10);
  const horaAhora = ahora.slice(11, 16);
  const candidatos = partidos.filter((p) => {
    const live = marcadores.get(String(p.IdPartido));
    return p.EstadoPartido === 2 || (live && live.periodo > 0) || (p.Fecha === hoy && p.Hora && p.Hora.slice(0, 5) <= horaAhora);
  });
  await Promise.all(candidatos.map(aplicarMarcadorDetalle));
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
  for (const { div, fase, grupoNombre, filas, fasesConTabla, gruposConTabla } of porDivision) {
    // Con varias tablas en la misma división, el nombre del grupo (y de la fase si hay varias) las separa en la vista.
    const base = div.nombreDisplay || div.categoriaNombre || "Clasificación";
    let grupo = gruposConTabla > 1 && grupoNombre ? grupoNombre : base;
    if (fasesConTabla > 1 && fase?.nombre) grupo = `${grupo} · ${fase.nombre}`;
    for (const row of filas) {
      rows.push({
        IdCompeticion: compId,
        NombreGrupo: grupo,
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
 * Resuelve la división y el `equipoId` reales (claves de la API nueva, distintas del
 * `inscripcionId` legacy) de un equipo a partir de su abreviatura, cruzando el listado
 * ligero de equipos de cada división de la competición.
 *
 * @param {string} compId UUID de la competición.
 * @param {string} equipoAbrev Abreviatura del equipo (p. ej. "LOY").
 * @returns {Promise<{divisionId:string, equipoId:string}|null>} Ids resueltos o `null`.
 */
async function resolveEquipoDivision(compId, equipoAbrev) {
  const clave = String(equipoAbrev || "").trim().toUpperCase();
  if (!clave) return null;

  const divisiones = await apiGet(`/hierarchy/competicion/${compId}/divisiones`, CACHE_TTL_LONG);
  const porDivision = await Promise.all(
    (Array.isArray(divisiones) ? divisiones : []).map(async (div) => {
      const equipos = await apiGet(`/hierarchy/division/${div.id}/equipos`, CACHE_TTL_LONG).catch(() => []);
      const match = (Array.isArray(equipos) ? equipos : []).find(
        (eq) => String(eq?.nombreAbrev || "").trim().toUpperCase() === clave,
      );
      return match ? { divisionId: div.id, equipoId: match.equipoId } : null;
    }),
  );
  return porDivision.find(Boolean) || null;
}

/**
 * Normaliza un jugador o miembro del cuerpo técnico del endpoint `/plantilla`, con el mismo
 * shape que `mapJugadorEstadistica` para poder compartir helpers de render (foto, chips…).
 *
 * @param {object} p Persona cruda de `/plantilla`.
 * @returns {object} Persona normalizada.
 */
function mapPlantillaPersona(p) {
  return {
    id: p.plantillaEquipoId || null,
    nombre: p.nombreCompleto || p.nombreCorto || "",
    fotoUrl: p.fotoUrl || "",
    equipoAbrev: "",
    clubLogoUrl: p.clubLogoUrl || "",
    esPortero: !!p.esPortero,
    rolCuerpoTecnico: p.rolCuerpoTecnico || "",
    partidosJugados: p.partidosJugados || 0,
    goles: p.goles || 0,
    asistencias: p.asistencias || 0,
    azules: p.tarjetasAzules || 0,
    amarillas: p.tarjetasAmarillas || 0,
    rojas: p.tarjetasRojas || 0,
    faltas: p.faltas || 0,
    paradas: p.paradas || 0,
    golesEncajados: p.golesEncajados || 0,
    porcentajeParadas: p.porcentajeParadas || 0,
    minutosJugados: p.minutosJugados || 0,
  };
}

/**
 * Construye la plantilla completa (jugadores + cuerpo técnico) de un equipo con sus
 * estadísticas de temporada. A diferencia del roster derivado de alineaciones de partidos,
 * incluye también a quienes todavía no han debutado.
 *
 * @param {string} compId UUID de la competición.
 * @param {string} equipoAbrev Abreviatura del equipo.
 * @returns {Promise<{jugadores:Array<object>, tecnicos:Array<object>}|null>} Plantilla normalizada, o `null` si no se pudo resolver el equipo.
 */
export async function buildPlantillaEquipo(compId, equipoAbrev) {
  const resolved = await resolveEquipoDivision(compId, equipoAbrev);
  if (!resolved) return null;

  const data = await apiGet(`/hierarchy/division/${resolved.divisionId}/equipo/${resolved.equipoId}/plantilla`, CACHE_TTL_DEFAULT);
  return {
    jugadores: (Array.isArray(data?.jugadores) ? data.jugadores : []).map(mapPlantillaPersona),
    tecnicos: (Array.isArray(data?.cuerpoTecnico) ? data.cuerpoTecnico : []).map(mapPlantillaPersona),
  };
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
