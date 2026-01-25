// clasificacionHelpers.js
// Helpers para agrupación y cálculo de posiciones en la clasificación

/**
 * Agrupa los equipos de la clasificación por grupo o denominación.
 * @param {Array} data - Array de objetos equipo.
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
 * Calcula el mapa de posiciones previas de los equipos según el histórico de partidos.
 * @param {Array} equipos - Equipos del grupo.
 * @param {Array} partidos - Partidos históricos.
 * @returns {Object} Diccionario IdEquipo -> posición previa.
 */
export function calcularPosicionesPrevias(equipos, partidos) {
  // Agrupar partidos por Orden (jornada)
  const jornadas = {};
  for (const p of partidos) {
    if (!jornadas[p.Orden]) jornadas[p.Orden] = [];
    jornadas[p.Orden].push(p);
  }
  // Buscar la última jornada (Orden) donde todos los partidos tienen resultado
  const ordenes = Object.keys(jornadas).map(Number).sort((a, b) => a - b);
  let ultimaJornadaFinalizada = null;
  for (let i = ordenes.length - 1; i >= 0; i--) {
    const ord = ordenes[i];
    const partidosJornada = jornadas[ord];
    if (partidosJornada.length > 0 && partidosJornada.every(p => p.EstadoPartido == 2 && p.GolesLocal != null && p.GolesVisit != null)) {
      ultimaJornadaFinalizada = ord;
      break;
    }
  }
  if (ultimaJornadaFinalizada == null) return {};
  // Filtrar solo partidos donde ambos equipos están en el grupo actual
  const equipoIdsGrupo = new Set(equipos.map(eq => {
    return typeof eq?.IdEquipo === "number" || (typeof eq?.IdEquipo === "string" && eq.IdEquipo !== "") ? String(eq.IdEquipo) : String(eq?.IdEquipoComp);
  }));
  const partidosPrevios = partidos.filter(p =>
    Number(p.Orden) <= ultimaJornadaFinalizada &&
    p.EstadoPartido == 2 &&
    p.GolesLocal != null && p.GolesVisit != null &&
    equipoIdsGrupo.has(String(p.IdEquipoLocal)) &&
    equipoIdsGrupo.has(String(p.IdEquipoVisit))
  );
  // Calcular puntos y stats por equipo SOLO para los del grupo
  const stats = {};
  for (const p of partidosPrevios) {
    const eqLoc = String(p.IdEquipoLocal);
    const eqVis = String(p.IdEquipoVisit);
    if (!stats[eqLoc]) stats[eqLoc] = { pts: 0, gf: 0, gc: 0, j: 0, g: 0, e: 0, p: 0 };
    if (!stats[eqVis]) stats[eqVis] = { pts: 0, gf: 0, gc: 0, j: 0, g: 0, e: 0, p: 0 };
    stats[eqLoc].j++;
    stats[eqVis].j++;
    stats[eqLoc].gf += Number(p.GolesLocal);
    stats[eqLoc].gc += Number(p.GolesVisit);
    stats[eqVis].gf += Number(p.GolesVisit);
    stats[eqVis].gc += Number(p.GolesLocal);
    if (p.GolesLocal > p.GolesVisit) {
      stats[eqLoc].pts += 3; stats[eqLoc].g++;
      stats[eqVis].p++;
    } else if (p.GolesLocal < p.GolesVisit) {
      stats[eqVis].pts += 3; stats[eqVis].g++;
      stats[eqLoc].p++;
    } else {
      stats[eqLoc].pts += 1; stats[eqLoc].e++;
      stats[eqVis].pts += 1; stats[eqVis].e++;
    }
  }
  // Construir array de equipos con posición previa
  const equiposPrev = equipos.map(eq => {
    const id = typeof eq?.IdEquipo === "number" || (typeof eq?.IdEquipo === "string" && eq.IdEquipo !== "") ? String(eq.IdEquipo) : String(eq?.IdEquipoComp);
    const s = stats[id] || { pts: 0, gf: 0, gc: 0 };
    return {
      IdEquipo: id,
      Puntos: s.pts,
      GolesAFavor: s.gf,
      GolesEnContra: s.gc,
      NombreEquipo: eq.NombreEquipo,
    };
  });
  // Ordenar por puntos, goles, nombre
  equiposPrev.sort((a, b) =>
    b.Puntos - a.Puntos ||
    (b.GolesAFavor - b.GolesEnContra) - (a.GolesAFavor - a.GolesEnContra) ||
    b.GolesAFavor - a.GolesAFavor ||
    a.NombreEquipo.localeCompare(b.NombreEquipo)
  );
  // Asignar posición previa
  const prevPosMap = {};
  equiposPrev.forEach((eq, idx) => {
    prevPosMap[eq.IdEquipo] = idx + 1;
  });
  return prevPosMap;
}
