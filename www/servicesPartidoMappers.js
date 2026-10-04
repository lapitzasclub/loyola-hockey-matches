// servicesPartidoMappers.js
// Traducción del detalle de partido y de las estadísticas de jugador de la API nueva
// DigitalSport al shape legacy que consumen los componentes del detalle.
// Se mantiene aparte de `services.js`, que queda como capa de acceso a datos.

// Incidencias con render propio en el detalle; el resto (PARADA, CAMBIO…) son ruido para el
// timeline y se filtran. Se mapea `tipo` (mayúsculas de la API) al `IdTipoEvento` legacy.
const EVENTO_TIPO_MAP = {
  GOL: "gol",
  FALTA: "falta",
  "FALTA-HL": "falta-hl",
  FALTADIRECTA: "faltadirecta",
  PENALTI: "penalti",
  TM: "tm",
  TARJETAAZUL: "tarjetaazul",
  TARJETAAMARILLA: "tarjetaamarilla",
  TARJETAROJA: "tarjetaroja",
};
const ROL_TECNICO = { ENTRENADOR: 3, ENTRENADOR2: 4, DELEGADO: 5, AUXILIAR: 6 };

/**
 * Determina el lado de una incidencia/persona: 1 = local, 2 = visitante, 0 = desconocido.
 *
 * @param {string} equipoId ID de equipo de la incidencia.
 * @param {object} loc Bloque `local` del detalle.
 * @param {object} vis Bloque `visitante` del detalle.
 * @returns {0|1|2}
 */
function ladoDe(equipoId, loc, vis) {
  if (equipoId && loc.equipoId && equipoId === loc.equipoId) return 1;
  if (equipoId && vis.equipoId && equipoId === vis.equipoId) return 2;
  return 0;
}

/**
 * Formatea el crono (mm:ss) de una incidencia.
 *
 * @param {object} inc Incidencia.
 * @returns {string} Crono formateado o cadena vacía.
 */
function cronoDe(inc) {
  const m = Number(inc.minuto);
  const s = Number(inc.segundo);
  if (!Number.isFinite(m) && !Number.isFinite(s)) return "";
  return `${Number.isFinite(m) ? m : 0}:${String(Number.isFinite(s) ? s : 0).padStart(2, "0")}`;
}

/**
 * Orden cronológico ascendente. El reloj del hockey patines es cuenta atrás, así que dentro
 * de un periodo un minuto mayor ocurre antes. `renderEventos` invierte para mostrar lo último
 * arriba y acumula el marcador en orden ascendente.
 *
 * @param {object} a Incidencia A.
 * @param {object} b Incidencia B.
 * @returns {number}
 */
function ordenCronologico(a, b) {
  const pa = Number(a.periodo) || 0;
  const pb = Number(b.periodo) || 0;
  if (pa !== pb) return pa - pb;
  const ma = Number(a.minuto) || 0;
  const mb = Number(b.minuto) || 0;
  if (ma !== mb) return mb - ma;
  return (Number(b.segundo) || 0) - (Number(a.segundo) || 0);
}

/**
 * Mapea las incidencias de la API nueva al shape de evento legacy que consume `renderEventos`.
 *
 * @param {object} d Detalle nuevo (`/public/partidos/{id}`).
 * @returns {Array<object>} Eventos legacy en orden cronológico ascendente.
 */
function mapIncidenciasToEventos(d) {
  const loc = d.local || {};
  const vis = d.visitante || {};
  const inc = Array.isArray(d.incidencias) ? d.incidencias : [];
  return inc
    .filter((i) => EVENTO_TIPO_MAP[String(i.tipo || "").toUpperCase()])
    .sort(ordenCronologico)
    .map((i) => {
      const lado = ladoDe(i.equipoId, loc, vis);
      const logo = lado === 1 ? loc.logoUrl : lado === 2 ? vis.logoUrl : "";
      const eq = lado === 1 ? loc.nombreAbrev || loc.nombre : lado === 2 ? vis.nombreAbrev || vis.nombre : "";
      return {
        IdTipoEvento: EVENTO_TIPO_MAP[String(i.tipo).toUpperCase()],
        LocalVisit: lado,
        CodPeriodo: i.periodo != null ? String(i.periodo) : "",
        Crono: cronoDe(i),
        IdEntidadEquipo: logo || "sinescudo",
        Eq: eq || "",
        Dorsal1: i.dorsal ?? "",
        Lic1: i.nombre || "",
        IdLicencia1: i.plantillaEquipoId ?? null,
        Dorsal2: i.dorsalSecundario ?? "",
        Lic2: i.nombreSecundario || "",
        IdLicencia2: i.plantillaEquipoSecundariaId ?? null,
        Codigo: i.codigo || "",
        MinSancion: i.duracionSancionSegundos != null ? Math.round(Number(i.duracionSancionSegundos) / 60) : "",
        Descripcion: "",
      };
    });
}

/**
 * Calcula el marcador contando incidencias GOL por lado (el detalle trae `puntaje` a null en vivo).
 *
 * @param {object} d Detalle nuevo.
 * @returns {{golesLocal:number, golesVisit:number}}
 */
function computeGoles(d) {
  const loc = d.local || {};
  const vis = d.visitante || {};
  let golesLocal = 0;
  let golesVisit = 0;
  for (const i of Array.isArray(d.incidencias) ? d.incidencias : []) {
    if (String(i.tipo || "").toUpperCase() !== "GOL") continue;
    const lado = ladoDe(i.equipoId, loc, vis);
    if (lado === 1) golesLocal += 1;
    else if (lado === 2) golesVisit += 1;
  }
  return { golesLocal, golesVisit };
}

/**
 * Indica si el partido ha comenzado (para no mostrar 0-0 en partidos aún no jugados).
 *
 * @param {object} d Detalle nuevo.
 * @returns {boolean}
 */
function partidoComenzado(d) {
  return (Number(d.periodo) || 0) > 0 || (Array.isArray(d.incidencias) && d.incidencias.length > 0);
}

/**
 * Traduce el estado del partido nuevo al código legacy (0 = no iniciado, 1 = en juego, 2 = finalizado).
 * `periodo === 30` y `actaEstado` FINALIZADO/REABIERTA implican partido cerrado. El campo `estado`
 * del detalle no es fiable en vivo (se queda en PROGRAMADO), por eso se usa periodo + incidencias.
 *
 * @param {object} d Detalle nuevo.
 * @returns {0|1|2}
 */
function estadoPartidoLegacy(d) {
  const periodo = Number(d.periodo) || 0;
  const acta = String(d.actaEstado || "").toUpperCase();
  if (periodo === 30 || /FINAL|CERRAD|REABIERT/.test(acta)) return 2;
  if (partidoComenzado(d)) return 1;
  const e = String(d.estado || "").toUpperCase();
  if (/FINAL|FINISH|JUGAD|PLAYED/.test(e)) return 2;
  if (/JUEGO|LIVE|CURSO|PLAYING|DIRECTO/.test(e)) return 1;
  return 0;
}

/**
 * Acumula estadísticas por jugador (clave = `plantillaEquipoId`) a partir de las incidencias.
 *
 * @param {object} d Detalle nuevo.
 * @returns {Map<string, object>} Estadísticas por jugador.
 */
export function statsPorJugador(d) {
  const map = new Map();
  const get = (id) => {
    if (!id) return null;
    if (!map.has(id)) {
      map.set(id, { Goles: 0, GolesEncajados: 0, Asist: 0, FaltaReal: 0, FaltaRec: 0, Azules: 0, Amarillas: 0, Rojas: 0, Paradas: 0, TirosPenalti: 0, GolPenalti: 0, TirosFD: 0, GolFD: 0 });
    }
    return map.get(id);
  };
  // `resultado` sólo vale GOL, NO_GOL o PENDIENTE: hay que comparar exacto, porque
  // "NO_GOL".includes("GOL") también es cierto y contaría los fallados como gol.
  const esGol = (i) => String(i.resultado || "").toUpperCase() === "GOL";
  for (const i of Array.isArray(d.incidencias) ? d.incidencias : []) {
    const tipo = String(i.tipo || "").toUpperCase();
    const p = get(i.plantillaEquipoId);
    const sec = get(i.plantillaEquipoSecundariaId);
    if (tipo === "GOL") {
      if (p) p.Goles += 1;
      if (sec) sec.Asist += 1;
      // Cada gol referencia al portero batido en `porteroId`: así se obtienen los goles
      // encajados, que la UI de porteros usa para el chip GC y el % de paradas.
      const portero = get(i.porteroId);
      if (portero) portero.GolesEncajados += 1;
    } else if (tipo === "FALTA" || tipo === "FALTA-HL" || tipo === "FALTADIRECTA") {
      if (p) p.FaltaReal += 1;
      if (sec) sec.FaltaRec += 1;
      if (tipo === "FALTADIRECTA" && p) {
        p.TirosFD += 1;
        if (esGol(i)) p.GolFD += 1;
      }
    } else if (tipo === "PARADA") {
      if (p) p.Paradas += 1;
    } else if (tipo === "TARJETAAZUL") {
      if (p) p.Azules += 1;
    } else if (tipo === "TARJETAAMARILLA") {
      if (p) p.Amarillas += 1;
    } else if (tipo === "TARJETAROJA") {
      if (p) p.Rojas += 1;
    } else if (tipo === "PENALTI") {
      if (p) {
        p.TirosPenalti += 1;
        if (esGol(i)) p.GolPenalti += 1;
      }
    }
  }
  return map;
}

/**
 * Mapea una persona de alineación nueva al shape legacy, inyectando sus estadísticas.
 *
 * @param {object} a Persona de alineación nueva.
 * @param {Map<string, object>} stats Estadísticas por jugador.
 * @returns {object} Persona legacy.
 */
function personaAlineacion(a, stats) {
  const s = stats.get(a.plantillaEquipoId) || {};
  const esPortero = String(a.rolPosicion || "").toUpperCase() === "PORTERO";
  return {
    Dorsal: a.dorsal ?? "",
    ApellidosNombre: a.nombre || "",
    IdLicencia: a.plantillaEquipoId ?? null,
    Inicial: !!a.esInicial,
    Capitan: !!a.esCapitan,
    IdPosicion: ROL_TECNICO[String(a.rolPosicion || "").toUpperCase()] || null,
    // En porteros la UI interpreta `Goles` como goles encajados (chip "GC" y % de paradas),
    // no como goles marcados.
    Goles: esPortero ? s.GolesEncajados || 0 : s.Goles || 0,
    GolesRecibidos: s.GolesEncajados || 0,
    Asist: s.Asist || 0,
    FaltaReal: s.FaltaReal || 0,
    FaltaRec: s.FaltaRec || 0,
    Azules: s.Azules || 0,
    Amarillas: s.Amarillas || 0,
    Rojas: s.Rojas || 0,
    Paradas: s.Paradas || 0,
    TirosPenalti: s.TirosPenalti || 0,
    GolPenalti: s.GolPenalti || 0,
    TirosFD: s.TirosFD || 0,
    GolFD: s.GolFD || 0,
  };
}

/**
 * Mapea las alineaciones nuevas al shape legacy que consume `renderAlineaciones`.
 *
 * @param {object} d Detalle nuevo.
 * @returns {object|null} Alineaciones legacy o null si no hay datos.
 */
function mapAlineaciones(d) {
  const stats = statsPorJugador(d);
  const build = (arr) => {
    const jug = [];
    const port = [];
    const tecn = [];
    for (const a of Array.isArray(arr) ? arr : []) {
      const rol = String(a.rolPosicion || "").toUpperCase();
      const persona = personaAlineacion(a, stats);
      if (rol === "PORTERO") port.push(persona);
      else if (rol === "JUGADOR") jug.push(persona);
      // Algunas fichas llegan sin `rolPosicion`: si traen dorsal son jugadores de pista,
      // no cuerpo técnico (el staff viene siempre sin dorsal).
      else if (!rol && String(a.dorsal || "").trim()) jug.push(persona);
      else tecn.push(persona);
    }
    return { jug, port, tecn };
  };
  const L = build(d.alineacionesLocal);
  const V = build(d.alineacionesVisitante);
  const total = L.jug.length + L.port.length + L.tecn.length + V.jug.length + V.port.length + V.tecn.length;
  if (!total) return null;
  return { JugLocal: L.jug, PortLocal: L.port, TecnLocal: L.tecn, JugVisit: V.jug, PortVisit: V.port, TecnVisit: V.tecn };
}

/**
 * Agrega las incidencias en contadores por tipo y lado, en el shape que consumen
 * `buildStatsSummary` (resumen del detalle) y `pickStat` (gráficas del detalle de equipo):
 * `{IdTipoEvento, LocalVisit, Total}`.
 *
 * @param {object} d Detalle nuevo.
 * @returns {Array<object>} Contadores agregados.
 */
function mapStatsResumen(d) {
  const loc = d.local || {};
  const vis = d.visitante || {};
  const totales = new Map();
  const suma = (tipo, lado) => {
    const key = `${tipo}|${lado}`;
    totales.set(key, (totales.get(key) || 0) + 1);
  };
  for (const i of Array.isArray(d.incidencias) ? d.incidencias : []) {
    const tipo = EVENTO_TIPO_MAP[String(i.tipo || "").toUpperCase()];
    if (!tipo) continue;
    const lado = ladoDe(i.equipoId, loc, vis);
    if (!lado) continue;
    suma(tipo, lado);
    // Los consumidores buscan "faltahl" (sin guion) como alternativa a "falta".
    if (tipo === "falta-hl") suma("faltahl", lado);
  }
  return Array.from(totales, ([key, Total]) => {
    const [IdTipoEvento, lado] = key.split("|");
    return { IdTipoEvento, LocalVisit: Number(lado), Total };
  });
}

/**
 * Extrae la tanda/lanzamientos de penalti en el shape que consume `renderPenaltis`.
 * `resultado` es `GOL | NO_GOL | PENDIENTE`, que se traduce a `Gol` true/false/null.
 *
 * @param {object} d Detalle nuevo.
 * @returns {Array<object>} Penaltis legacy.
 */
function mapPenaltis(d) {
  const loc = d.local || {};
  const vis = d.visitante || {};
  const golDe = (resultado) => {
    const v = String(resultado || "").toUpperCase();
    if (v === "GOL") return true;
    if (v === "NO_GOL") return false;
    return null;
  };
  return (Array.isArray(d.incidencias) ? d.incidencias : [])
    .filter((i) => String(i.tipo || "").toUpperCase() === "PENALTI")
    .sort(ordenCronologico)
    .map((i) => {
      const lado = ladoDe(i.equipoId, loc, vis);
      // `IdEquipo` debe coincidir con localKey/visitKey, que son `IdEq1`/`IdEq2`.
      const idEquipo = lado === 1
        ? loc.inscripcionId || loc.equipoId
        : lado === 2 ? vis.inscripcionId || vis.equipoId : null;
      return {
        IdEquipo: idEquipo ?? null,
        Dorsal: i.dorsal ?? "",
        NombreApellidos: i.nombre || "",
        Gol: golDe(i.resultado),
      };
    });
}

/**
 * Mapea el detalle de partido nuevo al shape legacy que consume `normalizarPartido`.
 *
 * @param {object} d Detalle nuevo (`/public/partidos/{id}`).
 * @returns {object} Partido legacy.
 */
export function mapPartidoDetalle(d) {
  const loc = d.local || {};
  const vis = d.visitante || {};
  const periodo = Number(d.periodo) || 0;
  const comenzado = partidoComenzado(d);
  const goles = computeGoles(d);
  return {
    IdPartido: d.id,
    IdModalidadComp: "hp",
    DenoComp: d.competicionNombre || "",
    NombreJornada: d.jornadaNombre || "",
    Fecha: String(d.fechaInicio || "").slice(0, 10),
    Hora: d.hora || "",
    Instalacion: d.pista || "",
    Periodo: periodo && periodo !== 30 ? String(periodo) : "",
    Estado: d.estado || "",
    Eq1: loc.nombre || "",
    Eq2: vis.nombre || "",
    LocalAbrev: loc.nombreAbrev || "",
    VisitAbrev: vis.nombreAbrev || "",
    GolesLocal: loc.puntaje ?? (comenzado ? goles.golesLocal : null),
    GolesVisit: vis.puntaje ?? (comenzado ? goles.golesVisit : null),
    Arb1: d.arbitro1Nombre || "",
    Arb2: d.arbitro2Nombre || "",
    IdEntidadEq1: loc.logoUrl || "",
    IdEntidadEq2: vis.logoUrl || "",
    IdEq1: loc.inscripcionId || loc.equipoId || null,
    IdEq2: vis.inscripcionId || vis.equipoId || null,
    EstadoPartido: estadoPartidoLegacy(d),
    // El asterisco de punto bonus junto al marcador: la API nueva lo expresa como
    // `ganoDesempate` en el equipo que se llevó el punto extra.
    PuntoBonus: loc.ganoDesempate
      ? loc.inscripcionId || loc.equipoId || null
      : vis.ganoDesempate ? vis.inscripcionId || vis.equipoId || null : null,
  };
}

/**
 * Construye el bloque legacy de estadísticas de un partido a partir del detalle nuevo.
 *
 * @param {object} d Detalle nuevo (`/public/partidos/{id}`).
 * @returns {object} Bloque `{partido, stats, eventos, alineaciones, penaltis}`.
 */
export function buildEstadisticaBlock(d) {
  const alineaciones = mapAlineaciones(d);
  return {
    partido: [mapPartidoDetalle(d)],
    stats: mapStatsResumen(d),
    eventos: mapIncidenciasToEventos(d),
    alineaciones: alineaciones ? [alineaciones] : [],
    penaltis: mapPenaltis(d),
  };
}

/**
 * Mapea una fila de partido del histórico de jugador al shape legacy que consume
 * `renderJugadorCompeticion` (`gol/asist/FD/FDGol/Pen/PenGol/TA/TR/GolesRecibidos/Tiros`).
 * Para porteros: shots = GolesRecibidos + Tiros, con `Tiros` = paradas.
 *
 * @param {object} p Partido del histórico (`competiciones[].partidos[]`).
 * @returns {object} Fila legacy.
 */
function mapFilaPartidoJugador(p) {
  return {
    Fecha: p.fechaInicio || "",
    loc: p.localNombre || "",
    vis: p.visitanteNombre || "",
    marcador: p.localPuntaje != null && p.visitantePuntaje != null ? `${p.localPuntaje}-${p.visitantePuntaje}` : "-",
    gol: p.goles || 0,
    asist: p.asistencias || 0,
    FD: p.faltasDirectasIntentos || 0,
    FDGol: p.faltasDirectasExitosas || 0,
    Pen: p.penaltisIntentos || 0,
    PenGol: p.penaltisExitosos || 0,
    TA: p.tarjetasAzules || 0,
    TR: p.tarjetasRojas || 0,
    MinutosSancion: p.minutosJugados || 0,
    GolesRecibidos: p.golesEncajados || 0,
    Tiros: p.paradas || 0,
  };
}

/**
 * Mapea la respuesta del endpoint de estadísticas de jugador al shape legacy que consume
 * el subview (`{foto, nacionalidad, nacimiento, competiciones:[{titulo, partidos, filas}]}`).
 *
 * @param {object} d Respuesta nueva (`/public/partidos/jugador/{id}/stats`).
 * @returns {object|null} Estadísticas legacy o null.
 */
export function mapEstadisticaJugador(d) {
  if (!d || typeof d !== "object") return null;
  const competiciones = (Array.isArray(d.competiciones) ? d.competiciones : []).map((c) => ({
    titulo: c.competicionNombre || "",
    partidos: c.totalPartidos ?? (Array.isArray(c.partidos) ? c.partidos.length : 0),
    filas: (Array.isArray(c.partidos) ? c.partidos : []).map(mapFilaPartidoJugador),
  }));
  return {
    foto: d.fotoUrl || "",
    nacionalidad: d.nacionalidad || "",
    nacimiento: d.anioNacimiento != null ? String(d.anioNacimiento) : "",
    competiciones,
  };
}

