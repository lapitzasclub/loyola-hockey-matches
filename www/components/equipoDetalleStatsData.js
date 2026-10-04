// equipoDetalleStatsData.js
// Cálculo de las estadísticas agregadas de un equipo a partir de sus partidos.
// Separado de la capa de gráficas (`equipoDetalleStats.js`), que es la que depende de
// Chart.js: aquí no se renderiza nada, sólo se agregan datos.

import { getEstadisticaPartido } from "../services.js";
import { comparePartidosByScheduledDate } from "../utils/helpers.js";
import { emptyArray, normalizarEquipoClasificacion, parseApiArrayResponse } from "./partidoDetalleUtils.js";

const TEAM_STATS_CACHE = new Map();
const TEAM_STATS_DEBUG = false;

/**
 * Lee un contador agregado del payload de estadísticas de partido.
 *
 * @param {object[]} stats Lista de estadísticas crudas.
 * @param {string} type Tipo de evento.
 * @param {number} side 1 local, 2 visitante.
 * @returns {number} Total encontrado o 0.
 */
function pickStat(stats, type, side) {
  return stats.find((item) => item?.IdTipoEvento === type && Number(item?.LocalVisit) === side)?.Total ?? 0;
}

/**
 * Suma el valor numérico de un campo en todos los registros de una alineación.
 *
 * @param {object[]} [lineup=[]] Alineación (jugadores o porteros).
 * @param {string} field Nombre del campo a sumar (p.ej. `GolPenalti`, `Azules`).
 * @returns {number} Suma total del campo en la alineación.
 */
function sumLineupField(lineup = [], field) {
  return emptyArray(lineup).reduce((acc, item) => acc + (Number(item?.[field]) || 0), 0);
}

/**
 * Reúne todos los ids útiles del equipo para poder casar partidos de fuentes heterogéneas.
 *
 * @param {object|null|undefined} equipo Equipo origen.
 * @returns {{teamIds: Set<string>, teamCompIds: Set<string>}} Identidad expandida.
 */
function collectTeamIdentity(equipo) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized) return { teamIds: new Set(), teamCompIds: new Set() };

  return {
    teamIds: new Set([
      normalized.idEquipo,
      equipo?.IdEquipo,
      equipo?.idEquipo,
    ].filter(Boolean).map(String)),
    teamCompIds: new Set([
      normalized.idEquipoComp,
      equipo?.IdEquipoComp,
      equipo?.idEquipoComp,
    ].filter(Boolean).map(String)),
  };
}

function getMatchTeamPerspective(partido, identity) {
  if (!partido || !identity) return null;
  const localTeamIds = [partido?.IdEquipoLocal].filter(Boolean).map(String);
  const visitTeamIds = [partido?.IdEquipoVisit].filter(Boolean).map(String);
  const localCompIds = [partido?.IdEquipoCompLocal].filter(Boolean).map(String);
  const visitCompIds = [partido?.IdEquipoCompVisit].filter(Boolean).map(String);

  const isLocalByTeam = localTeamIds.some((id) => identity.teamIds.has(id));
  const isVisitByTeam = visitTeamIds.some((id) => identity.teamIds.has(id));
  if (isLocalByTeam && !isVisitByTeam) return "local";
  if (isVisitByTeam && !isLocalByTeam) return "visit";

  const isLocalByComp = localCompIds.some((id) => identity.teamCompIds.has(id));
  const isVisitByComp = visitCompIds.some((id) => identity.teamCompIds.has(id));
  if (isLocalByComp && !isVisitByComp) return "local";
  if (isVisitByComp && !isLocalByComp) return "visit";

  return null;
}

function getFallbackPerspectiveFromNames(partido, equipo) {
  const teamName = String(equipo?.nombreEquipo || equipo?.NombreEquipo || equipo?.Equipo || "").trim().toLowerCase();
  if (!teamName) return null;
  const localName = String(partido?.EquipoLocal || "").trim().toLowerCase();
  const visitName = String(partido?.EquipoVisit || "").trim().toLowerCase();
  if (localName && localName === teamName && visitName !== teamName) return "local";
  if (visitName && visitName === teamName && localName !== teamName) return "visit";
  return null;
}

/**
 * Devuelve el lado del partido correspondiente al equipo activo.
 *
 * @param {object|null|undefined} partido Partido de referencia.
 * @param {object|null|undefined} equipo Equipo activo.
 * @returns {1|2|null} 1 local, 2 visitante o null si no se pudo resolver.
 */
function getTeamSide(partido, equipo) {
  const perspective = getMatchTeamPerspective(partido, collectTeamIdentity(equipo)) || getFallbackPerspectiveFromNames(partido, equipo);
  if (perspective === "local") return 1;
  if (perspective === "visit") return 2;
  return null;
}

function getCacheKey(equipo, partidos) {
  const normalized = normalizarEquipoClasificacion(equipo);
  const ids = emptyArray(partidos).map((partido) => partido?.IdPartido).filter(Boolean).join(",");
  return `${normalized?.idEquipoComp || normalized?.idEquipo || "team"}:${ids}`;
}

/**
 * Construye la base estadística derivable solo del calendario y marcadores.
 *
 * @param {object|null|undefined} equipo Equipo activo.
 * @param {object[]} [partidos=[]] Partidos del equipo.
 * @returns {object|null} Estructura base para enriquecer luego con estadísticas por partido.
 */
function buildBaseStats(equipo, partidos = []) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized) return null;
  const identity = collectTeamIdentity(equipo);
  const played = [];
  const home = { won: 0, drawn: 0, lost: 0 };
  const away = { won: 0, drawn: 0, lost: 0 };

  for (const partido of partidos) {
    if (partido?.EstadoPartido != 2) continue;
    const perspective = getMatchTeamPerspective(partido, identity) || getFallbackPerspectiveFromNames(partido, normalized);
    if (!perspective) continue;

    const isLocal = perspective === "local";
    const scoreFor = Number(isLocal ? partido.GolesLocal : partido.GolesVisit) || 0;
    const scoreAgainst = Number(isLocal ? partido.GolesVisit : partido.GolesLocal) || 0;
    const result = scoreFor > scoreAgainst ? "won" : scoreFor === scoreAgainst ? "drawn" : "lost";

    played.push({ ...partido, result, goalsFor: 0, goalsAgainst: 0, isLocal, perspective });
    (isLocal ? home : away)[result] += 1;
  }

  const sortedPlayed = played.slice().sort(comparePartidosByScheduledDate);
  const wonCount = played.filter((item) => item.result === "won").length;
  const drawnCount = played.filter((item) => item.result === "drawn").length;
  const lostCount = played.filter((item) => item.result === "lost").length;
  const playedCount = played.length;

  return {
    playedCount,
    wonCount,
    drawnCount,
    lostCount,
    recentForm: sortedPlayed.slice(-5).map((partido) => partido.result),
    home,
    away,
    timeline: sortedPlayed.map((item, index) => ({
      idPartido: item.IdPartido,
      index: index + 1,
      goalsFor: item.goalsFor,
      goalsAgainst: item.goalsAgainst,
      result: item.result,
      foulsFor: 0,
      foulsAgainst: 0,
      blueCardsFor: 0,
      blueCardsAgainst: 0,
      redCardsFor: 0,
      redCardsAgainst: 0,
      penaltiesFor: 0,
      penaltiesAgainst: 0,
      penaltiesScoredFor: 0,
      penaltiesScoredAgainst: 0,
      penaltiesMissedFor: 0,
      penaltiesMissedAgainst: 0,
      directFoulsFor: 0,
      directFoulsAgainst: 0,
      directFoulsScoredFor: 0,
      directFoulsScoredAgainst: 0,
      directFoulsMissedFor: 0,
      directFoulsMissedAgainst: 0,
      venue: item.isLocal ? "home" : "away",
      opponent: item.isLocal ? item.EquipoVisit || "" : item.EquipoLocal || "",
      rawLocalGoals: Number(item.GolesLocal) || 0,
      rawVisitGoals: Number(item.GolesVisit) || 0,
    })),
    goalsForTotal: 0,
    goalsAgainstTotal: 0,
    goalDifference: 0,
    cleanSheets: 0,
    scorelessMatches: 0,
    scoringGames: 0,
    avgGoalsFor: 0,
    avgGoalsAgainst: 0,
    winRate: playedCount ? ((wonCount / playedCount) * 100) : 0,
    venueAverages: {
      home: { goalsFor: 0, goalsAgainst: 0, matches: home.won + home.drawn + home.lost },
      away: { goalsFor: 0, goalsAgainst: 0, matches: away.won + away.drawn + away.lost },
    },
    disciplineTotals: {
      foulsFor: 0,
      foulsAgainst: 0,
      blueCardsFor: 0,
      blueCardsAgainst: 0,
      redCardsFor: 0,
      redCardsAgainst: 0,
    },
    setPieces: {
      penaltiesFor: 0,
      penaltiesAgainst: 0,
      penaltiesScoredFor: 0,
      penaltiesScoredAgainst: 0,
      penaltiesMissedFor: 0,
      penaltiesMissedAgainst: 0,
      directFoulsFor: 0,
      directFoulsAgainst: 0,
      directFoulsScoredFor: 0,
      directFoulsScoredAgainst: 0,
      directFoulsMissedFor: 0,
      directFoulsMissedAgainst: 0,
    },
  };
}

export function computeTeamBaseStats(equipo, partidos = []) {
  return buildBaseStats(equipo, partidos);
}

/**
 * Carga y compone las estadísticas avanzadas del equipo a partir del calendario
 * y del detalle de cada partido.
 *
 * @param {object|null|undefined} equipo Equipo activo.
 * @param {object[]} [partidos=[]] Partidos ya cargados.
 * @returns {Promise<object|null>} Estadísticas avanzadas listas para render.
 */
export async function loadTeamAdvancedStats(equipo, partidos = []) {
  const cacheKey = getCacheKey(equipo, partidos);
  if (TEAM_STATS_CACHE.has(cacheKey)) return TEAM_STATS_CACHE.get(cacheKey);

  const base = buildBaseStats(equipo, partidos);
  if (!base?.timeline?.length) {
    TEAM_STATS_CACHE.set(cacheKey, base);
    return base;
  }

  const partidosById = new Map(emptyArray(partidos).map((partido) => [String(partido?.IdPartido || ""), partido]));
  const timeline = await Promise.all(base.timeline.map(async (item) => {
    try {
      const raw = await getEstadisticaPartido(item.idPartido);
      const parsed = parseApiArrayResponse(raw);
      const payload = Array.isArray(parsed) ? parsed[0] : parsed;
      const stats = Array.isArray(payload?.stats) ? payload.stats : [];
      const side = getTeamSide(partidosById.get(String(item.idPartido)), equipo);
      if (!side) return item;

      const rivalSide = side === 1 ? 2 : 1;
      // GetEstadisticaPartido anida la alineación bajo payload.alineaciones[0].
      // Los campos directos (alinLocal, JugLocal…) son un fallback por si la estructura varía.
      const alinBlock = Array.isArray(payload?.alineaciones) ? payload.alineaciones[0] : null;
      const localLineup  = alinBlock?.JugLocal  || payload?.alinLocal  || payload?.JugLocal  || [];
      const visitLineup  = alinBlock?.JugVisit  || payload?.alinVisit  || payload?.JugVisit  || [];
      const localKeepers = alinBlock?.PortLocal || payload?.portLocal || payload?.PortLocal || [];
      const visitKeepers = alinBlock?.PortVisit || payload?.portVisit || payload?.PortVisit || [];

      const teamLineup = side === 1 ? localLineup : visitLineup;
      const rivalLineup = side === 1 ? visitLineup : localLineup;
      const teamKeepers = side === 1 ? localKeepers : visitKeepers;
      const rivalKeepers = side === 1 ? visitKeepers : localKeepers;

      const goalsFor = Number(pickStat(stats, "gol", side) || 0);
      const goalsAgainst = Number(pickStat(stats, "gol", rivalSide) || 0);
      const foulsFor = Number(pickStat(stats, "falta", side) || pickStat(stats, "faltahl", side) || 0);
      const foulsAgainst = Number(pickStat(stats, "falta", rivalSide) || pickStat(stats, "faltahl", rivalSide) || 0);
      const blueCardsFor = Number(pickStat(stats, "tarjetaazul", side) || 0) || (sumLineupField(teamLineup, "Azules") + sumLineupField(teamKeepers, "Azules"));
      const blueCardsAgainst = Number(pickStat(stats, "tarjetaazul", rivalSide) || 0) || (sumLineupField(rivalLineup, "Azules") + sumLineupField(rivalKeepers, "Azules"));
      const redCardsFor = Number(pickStat(stats, "tarjetaroja", side) || 0) || (sumLineupField(teamLineup, "Rojas") + sumLineupField(teamKeepers, "Rojas"));
      const redCardsAgainst = Number(pickStat(stats, "tarjetaroja", rivalSide) || 0) || (sumLineupField(rivalLineup, "Rojas") + sumLineupField(rivalKeepers, "Rojas"));
      const penaltiesFor = Number(pickStat(stats, "penalti", side) || 0);
      const penaltiesAgainst = Number(pickStat(stats, "penalti", rivalSide) || 0);
      const penaltiesScoredFor = sumLineupField(teamLineup, "GolPenalti");
      const penaltiesScoredAgainst = sumLineupField(rivalLineup, "GolPenalti");
      const penaltiesMissedFor = Math.max(0, penaltiesFor - penaltiesScoredFor);
      const penaltiesMissedAgainst = Math.max(0, penaltiesAgainst - penaltiesScoredAgainst);
      const directFoulsFor = Number(pickStat(stats, "faltadirecta", side) || 0);
      const directFoulsAgainst = Number(pickStat(stats, "faltadirecta", rivalSide) || 0);
      const directFoulsScoredFor = sumLineupField(teamLineup, "GolFD");
      const directFoulsScoredAgainst = sumLineupField(rivalLineup, "GolFD");
      const directFoulsMissedFor = Math.max(0, directFoulsFor - directFoulsScoredFor);
      const directFoulsMissedAgainst = Math.max(0, directFoulsAgainst - directFoulsScoredAgainst);

      if (TEAM_STATS_DEBUG) {
        console.log(`[team-stats] partido=${item.idPartido} gf=${goalsFor} gc=${goalsAgainst} foulsFor=${foulsFor} foulsAgainst=${foulsAgainst} penFor=${penaltiesFor} penAgainst=${penaltiesAgainst}`);
      }

      return {
        ...item,
        goalsFor,
        goalsAgainst,
        foulsFor,
        foulsAgainst,
        blueCardsFor,
        blueCardsAgainst,
        redCardsFor,
        redCardsAgainst,
        penaltiesFor,
        penaltiesAgainst,
        penaltiesScoredFor,
        penaltiesScoredAgainst,
        penaltiesMissedFor,
        penaltiesMissedAgainst,
        directFoulsFor,
        directFoulsAgainst,
        directFoulsScoredFor,
        directFoulsScoredAgainst,
        directFoulsMissedFor,
        directFoulsMissedAgainst,
      };
    } catch {
      return item;
    }
  }));

  const totals = timeline.reduce((acc, item) => ({
    goalsFor: acc.goalsFor + (Number(item.goalsFor) || 0),
    goalsAgainst: acc.goalsAgainst + (Number(item.goalsAgainst) || 0),
    foulsFor: acc.foulsFor + (Number(item.foulsFor) || 0),
    foulsAgainst: acc.foulsAgainst + (Number(item.foulsAgainst) || 0),
    blueCardsFor: acc.blueCardsFor + (Number(item.blueCardsFor) || 0),
    blueCardsAgainst: acc.blueCardsAgainst + (Number(item.blueCardsAgainst) || 0),
    redCardsFor: acc.redCardsFor + (Number(item.redCardsFor) || 0),
    redCardsAgainst: acc.redCardsAgainst + (Number(item.redCardsAgainst) || 0),
    cleanSheets: acc.cleanSheets + ((Number(item.goalsAgainst) || 0) === 0 ? 1 : 0),
    scorelessMatches: acc.scorelessMatches + ((Number(item.goalsFor) || 0) === 0 ? 1 : 0),
    scoringGames: acc.scoringGames + ((Number(item.goalsFor) || 0) > 0 ? 1 : 0),
    homeGoalsFor: acc.homeGoalsFor + (item.venue === "home" ? (Number(item.goalsFor) || 0) : 0),
    homeGoalsAgainst: acc.homeGoalsAgainst + (item.venue === "home" ? (Number(item.goalsAgainst) || 0) : 0),
    awayGoalsFor: acc.awayGoalsFor + (item.venue === "away" ? (Number(item.goalsFor) || 0) : 0),
    awayGoalsAgainst: acc.awayGoalsAgainst + (item.venue === "away" ? (Number(item.goalsAgainst) || 0) : 0),
    penaltiesFor: acc.penaltiesFor + (Number(item.penaltiesFor) || 0),
    penaltiesAgainst: acc.penaltiesAgainst + (Number(item.penaltiesAgainst) || 0),
    penaltiesScoredFor: acc.penaltiesScoredFor + (Number(item.penaltiesScoredFor) || 0),
    penaltiesScoredAgainst: acc.penaltiesScoredAgainst + (Number(item.penaltiesScoredAgainst) || 0),
    penaltiesMissedFor: acc.penaltiesMissedFor + (Number(item.penaltiesMissedFor) || 0),
    penaltiesMissedAgainst: acc.penaltiesMissedAgainst + (Number(item.penaltiesMissedAgainst) || 0),
    directFoulsFor: acc.directFoulsFor + (Number(item.directFoulsFor) || 0),
    directFoulsAgainst: acc.directFoulsAgainst + (Number(item.directFoulsAgainst) || 0),
    directFoulsScoredFor: acc.directFoulsScoredFor + (Number(item.directFoulsScoredFor) || 0),
    directFoulsScoredAgainst: acc.directFoulsScoredAgainst + (Number(item.directFoulsScoredAgainst) || 0),
    directFoulsMissedFor: acc.directFoulsMissedFor + (Number(item.directFoulsMissedFor) || 0),
    directFoulsMissedAgainst: acc.directFoulsMissedAgainst + (Number(item.directFoulsMissedAgainst) || 0),
  }), {
    goalsFor: 0,
    goalsAgainst: 0,
    foulsFor: 0,
    foulsAgainst: 0,
    blueCardsFor: 0,
    blueCardsAgainst: 0,
    redCardsFor: 0,
    redCardsAgainst: 0,
    cleanSheets: 0,
    scorelessMatches: 0,
    scoringGames: 0,
    homeGoalsFor: 0,
    homeGoalsAgainst: 0,
    awayGoalsFor: 0,
    awayGoalsAgainst: 0,
    penaltiesFor: 0,
    penaltiesAgainst: 0,
    penaltiesScoredFor: 0,
    penaltiesScoredAgainst: 0,
    penaltiesMissedFor: 0,
    penaltiesMissedAgainst: 0,
    directFoulsFor: 0,
    directFoulsAgainst: 0,
    directFoulsScoredFor: 0,
    directFoulsScoredAgainst: 0,
    directFoulsMissedFor: 0,
    directFoulsMissedAgainst: 0,
  });

  const playedCount = timeline.length;
  const homeMatches = timeline.filter((item) => item.venue === "home").length;
  const awayMatches = timeline.filter((item) => item.venue === "away").length;
  const enriched = {
    ...base,
    timeline,
    goalsForTotal: totals.goalsFor,
    goalsAgainstTotal: totals.goalsAgainst,
    goalDifference: totals.goalsFor - totals.goalsAgainst,
    cleanSheets: totals.cleanSheets,
    scorelessMatches: totals.scorelessMatches,
    scoringGames: totals.scoringGames,
    avgGoalsFor: playedCount ? (totals.goalsFor / playedCount) : 0,
    avgGoalsAgainst: playedCount ? (totals.goalsAgainst / playedCount) : 0,
    venueAverages: {
      home: {
        goalsFor: homeMatches ? (totals.homeGoalsFor / homeMatches) : 0,
        goalsAgainst: homeMatches ? (totals.homeGoalsAgainst / homeMatches) : 0,
        matches: homeMatches,
      },
      away: {
        goalsFor: awayMatches ? (totals.awayGoalsFor / awayMatches) : 0,
        goalsAgainst: awayMatches ? (totals.awayGoalsAgainst / awayMatches) : 0,
        matches: awayMatches,
      },
    },
    setPieces: {
      penaltiesFor: totals.penaltiesFor,
      penaltiesAgainst: totals.penaltiesAgainst,
      penaltiesScoredFor: totals.penaltiesScoredFor,
      penaltiesScoredAgainst: totals.penaltiesScoredAgainst,
      penaltiesMissedFor: totals.penaltiesMissedFor,
      penaltiesMissedAgainst: totals.penaltiesMissedAgainst,
      directFoulsFor: totals.directFoulsFor,
      directFoulsAgainst: totals.directFoulsAgainst,
      directFoulsScoredFor: totals.directFoulsScoredFor,
      directFoulsScoredAgainst: totals.directFoulsScoredAgainst,
      directFoulsMissedFor: totals.directFoulsMissedFor,
      directFoulsMissedAgainst: totals.directFoulsMissedAgainst,
    },
    disciplineTotals: {
      foulsFor: totals.foulsFor,
      foulsAgainst: totals.foulsAgainst,
      blueCardsFor: totals.blueCardsFor,
      blueCardsAgainst: totals.blueCardsAgainst,
      redCardsFor: totals.redCardsFor,
      redCardsAgainst: totals.redCardsAgainst,
    },
  };

  TEAM_STATS_CACHE.set(cacheKey, enriched);
  return enriched;
}
