/** Puntos otorgados al ganador de un partido. */
const POINTS_WIN  = 3;
/** Puntos otorgados a cada equipo en caso de empate. */
const POINTS_DRAW = 1;

/**
 * Agrupa los equipos de la clasificación por grupo o denominación.
 *
 * @param {Array} data Array de objetos equipo.
 * @returns {Object} Diccionario grupo -> equipos.
 */
export function groupClasificacionData(data) {
  const grupos = {};
  for (const eq of data) {
    const grupo = eq.NombreGrupo || eq.DenoComp || "Clasificación";
    if (!grupos[grupo]) grupos[grupo] = [];
    grupos[grupo].push(eq);
  }
  return grupos;
}

/**
 * Resuelve el identificador estable de equipo presente en clasificación y calendario.
 *
 * @param {object} equipo Datos del equipo o fila de clasificación.
 * @returns {string|null} Identificador utilizable o null.
 */
function getEquipoId(equipo) {
  if (typeof equipo?.IdEquipo === "number" || (typeof equipo?.IdEquipo === "string" && equipo.IdEquipo !== "")) {
    return String(equipo.IdEquipo);
  }
  if (typeof equipo?.IdEquipoComp === "number" || (typeof equipo?.IdEquipoComp === "string" && equipo.IdEquipoComp !== "")) {
    return String(equipo.IdEquipoComp);
  }
  return null;
}

/**
 * Indica si un partido puede considerarse cerrado a efectos de clasificación.
 *
 * @param {object} partido Partido del calendario.
 * @returns {boolean} True cuando hay resultado finalizable.
 */
function isFinishedMatch(partido) {
  return partido?.EstadoPartido == 2 && partido?.GolesLocal != null && partido?.GolesVisit != null;
}

/**
 * Construye la estructura de jornadas a partir del calendario disponible.
 *
 * @param {Array} partidos Partidos históricos de la competición.
 * @returns {Map<number, Array>} Jornadas agrupadas por orden.
 */
function groupPartidosByJornada(partidos) {
  const jornadas = new Map();
  for (const partido of partidos) {
    const orden = Number(partido?.Orden);
    if (!Number.isFinite(orden)) continue;
    if (!jornadas.has(orden)) jornadas.set(orden, []);
    jornadas.get(orden).push(partido);
  }
  return jornadas;
}

/**
 * Devuelve la última jornada completamente cerrada del calendario.
 *
 * @param {Map<number, Array>} jornadas Jornadas agrupadas por orden.
 * @returns {number|null} Orden de la última jornada finalizada o null.
 */
function getUltimaJornadaFinalizada(jornadas) {
  const ordenes = Array.from(jornadas.keys()).sort((a, b) => a - b);
  for (let i = ordenes.length - 1; i >= 0; i -= 1) {
    const orden = ordenes[i];
    const partidosJornada = jornadas.get(orden) || [];
    if (partidosJornada.length > 0 && partidosJornada.every(isFinishedMatch)) {
      return orden;
    }
  }
  return null;
}

/**
 * Crea un acumulador de estadísticas compatible con los criterios básicos de clasificación.
 *
 * @returns {{pts:number,gf:number,gc:number,j:number,g:number,e:number,p:number}} Estadísticas base.
 */
function createEmptyStats() {
  return { pts: 0, gf: 0, gc: 0, j: 0, g: 0, e: 0, p: 0 };
}

/**
 * Ordena una clasificación reconstruida con criterios básicos estables.
 *
 * @param {Array} equiposPrev Equipos con estadísticas reconstruidas.
 * @returns {Array} Array ordenado de mejor a peor posición.
 */
function sortClasificacionSnapshot(equiposPrev) {
  return equiposPrev.sort((a, b) =>
    b.Puntos - a.Puntos ||
    (b.GolesAFavor - b.GolesEnContra) - (a.GolesAFavor - a.GolesEnContra) ||
    b.GolesAFavor - a.GolesAFavor ||
    a.NombreEquipo.localeCompare(b.NombreEquipo)
  );
}

/**
 * Calcula el mapa de posiciones previas de los equipos usando la jornada anterior
 * a la última jornada completamente cerrada.
 *
 * @param {Array} equipos Equipos del grupo actual.
 * @param {Array} partidos Partidos históricos de la competición.
 * @returns {Object} Diccionario IdEquipo -> posición previa.
 */
export function calcularPosicionesPrevias(equipos, partidos) {
  const jornadas = groupPartidosByJornada(partidos);
  const ultimaJornadaFinalizada = getUltimaJornadaFinalizada(jornadas);
  if (ultimaJornadaFinalizada == null || ultimaJornadaFinalizada <= 1) return {};

  const jornadaObjetivo = ultimaJornadaFinalizada - 1;
  const equipoIdsGrupo = new Set(equipos.map(getEquipoId).filter(Boolean));
  const partidosPrevios = partidos.filter((partido) =>
    Number(partido?.Orden) <= jornadaObjetivo &&
    isFinishedMatch(partido) &&
    equipoIdsGrupo.has(String(partido.IdEquipoLocal)) &&
    equipoIdsGrupo.has(String(partido.IdEquipoVisit))
  );

  const stats = {};
  for (const partido of partidosPrevios) {
    const eqLoc = String(partido.IdEquipoLocal);
    const eqVis = String(partido.IdEquipoVisit);
    if (!stats[eqLoc]) stats[eqLoc] = createEmptyStats();
    if (!stats[eqVis]) stats[eqVis] = createEmptyStats();

    stats[eqLoc].j += 1;
    stats[eqVis].j += 1;
    stats[eqLoc].gf += Number(partido.GolesLocal);
    stats[eqLoc].gc += Number(partido.GolesVisit);
    stats[eqVis].gf += Number(partido.GolesVisit);
    stats[eqVis].gc += Number(partido.GolesLocal);

    if (Number(partido.GolesLocal) > Number(partido.GolesVisit)) {
      stats[eqLoc].pts += POINTS_WIN;
      stats[eqLoc].g += 1;
      stats[eqVis].p += 1;
    } else if (Number(partido.GolesLocal) < Number(partido.GolesVisit)) {
      stats[eqVis].pts += POINTS_WIN;
      stats[eqVis].g += 1;
      stats[eqLoc].p += 1;
    } else {
      stats[eqLoc].pts += POINTS_DRAW;
      stats[eqLoc].e += 1;
      stats[eqVis].pts += POINTS_DRAW;
      stats[eqVis].e += 1;
    }
  }

  const equiposPrev = equipos.map((equipo) => {
    const id = getEquipoId(equipo);
    const currentPlayed = Number(equipo?.PartidosJugados ?? 0);
    const playedDiff = currentPlayed > jornadaObjetivo ? currentPlayed - jornadaObjetivo : 1;
    const previousPlayed = Math.max(0, currentPlayed - playedDiff);
    const currentWins = Number(equipo?.PartidosGanados ?? 0);
    const currentDraws = Number(equipo?.PartidosEmpatados ?? 0);
    const currentLosses = Number(equipo?.PartidosPerdidos ?? 0);
    const currentGf = Number(equipo?.GolesAFavor ?? 0);
    const currentGc = Number(equipo?.GolesEnContra ?? 0);
    const currentPts = Number(equipo?.Puntos ?? 0);
    const rebuilt = stats[id] || createEmptyStats();

    return {
      IdEquipo: id,
      NombreEquipo: equipo?.NombreEquipo || "",
      Puntos: rebuilt.j > 0 || previousPlayed === 0 ? rebuilt.pts : Math.max(0, currentPts),
      GolesAFavor: rebuilt.j > 0 || previousPlayed === 0 ? rebuilt.gf : Math.max(0, currentGf),
      GolesEnContra: rebuilt.j > 0 || previousPlayed === 0 ? rebuilt.gc : Math.max(0, currentGc),
      PartidosGanados: rebuilt.j > 0 || previousPlayed === 0 ? rebuilt.g : Math.max(0, currentWins),
      PartidosEmpatados: rebuilt.j > 0 || previousPlayed === 0 ? rebuilt.e : Math.max(0, currentDraws),
      PartidosPerdidos: rebuilt.j > 0 || previousPlayed === 0 ? rebuilt.p : Math.max(0, currentLosses),
    };
  });

  const prevPosMap = {};
  sortClasificacionSnapshot(equiposPrev).forEach((equipo, index) => {
    if (equipo.IdEquipo) prevPosMap[equipo.IdEquipo] = index + 1;
  });

  return prevPosMap;
}
