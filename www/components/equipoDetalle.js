import { getCalendarioLoyola, getClasificacionLiga } from "../services.js";
import { t } from "../i18n.js";
import { comparePartidosByScheduledDate, decodeApiRaw, extractPartidos } from "../utils/helpers.js";
import { emphasizeTeam, formatFecha as formatFechaHelper, makeInstalacionHtml } from "../utils/partidosHelpers.js";
import { escapeHtml, formatHora, normalizarEquipoClasificacion } from "./partidoDetalleUtils.js";
import { buildRosterFromMatches, renderEquipoDetalleRoster } from "./equipoDetalleRoster.js";
import { renderTeamStatsView } from "./equipoDetalleStats.js";
import { renderPillTabs } from "./uiTabs.js";
import { hydrateMatchesWithHubLineups } from "./equipoDetalleLineupsHub.js";
import { groupClasificacionData } from "../utils/clasificacionHelpers.js";

const TEAM_SUMMARY_DEBUG = false;

/**
 * Devuelve una lista de identificadores candidatos para resolver el calendario
 * del equipo. En algunos flujos el payload llega con `IdEquipoComp` real y en
 * otros solo con `IdEquipo`, así que probamos ambos sin asumir demasiado.
 *
 * @param {object|null|undefined} equipo Payload crudo o normalizado del equipo.
 * @returns {string[]} Lista de ids candidatos, sin duplicados ni valores vacíos.
 */
function getCandidateTeamIds(equipo) {
  const normalized = normalizarEquipoClasificacion(equipo);
  return [...new Set([
    normalized?.idEquipoComp,
    normalized?.idEquipo,
    equipo?.IdEquipoComp,
    equipo?.idEquipoComp,
    equipo?.IdEquipo,
    equipo?.idEquipo,
  ].filter(Boolean).map(String))];
}

/**
 * Carga el calendario del equipo en su competición actual.
 *
 * Tolera payloads incompletos probando varios ids candidatos hasta encontrar
 * uno que realmente devuelva partidos.
 *
 * @param {object|null|undefined} equipo Equipo origen.
 * @returns {Promise<object[]>} Lista de partidos ordenada por fecha.
 */
export async function loadEquipoDetalleMatches(equipo) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized?.idCompeticion) return [];

  for (const teamCompId of getCandidateTeamIds(equipo)) {
    try {
      const raw = await getCalendarioLoyola(teamCompId, normalized.idCompeticion);
      const { partidos } = extractPartidos(raw);
      if (Array.isArray(partidos) && partidos.length) {
        return partidos.slice().sort(comparePartidosByScheduledDate);
      }
    } catch {
      // Seguimos con el siguiente candidato: el flujo mezcla IdEquipo e IdEquipoComp.
    }
  }

  return [];
}

/**
 * Enriquece la colección de partidos con alineaciones cargadas desde el hub.
 *
 * @param {object|null|undefined} equipo Equipo activo.
 * @param {object[]|null|undefined} partidos Partidos ya cargados.
 * @returns {Promise<object[]>} La misma lista, hidratada cuando ha sido posible.
 */
export async function hydrateEquipoDetalleRosterMatches(equipo, partidos) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized || !Array.isArray(partidos) || !partidos.length) return partidos || [];
  await hydrateMatchesWithHubLineups(partidos, normalized.modalidad || "hp", 12);
  return partidos;
}

/**
 * Garantiza que la clasificación de la competición del equipo está disponible
 * en caché global para reutilizar posiciones, agregados y resolución de ids.
 *
 * @param {object|null|undefined} equipo Equipo activo.
 * @returns {Promise<object[]>} Filas de clasificación actualmente disponibles.
 */
export async function ensureTeamCompetitionClasificacion(equipo) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized?.idCompeticion) return [];

  const current = Array.isArray(globalThis.window?._clasificacionLoyola) ? globalThis.window._clasificacionLoyola : [];
  const hasCompetitionLoaded = current.some((row) => String(row?.IdCompeticion || "") === String(normalized.idCompeticion));
  if (hasCompetitionLoaded) {
    return current;
  }

  try {
    const raw = await getClasificacionLiga(normalized.idCompeticion);
    const parsed = decodeApiRaw(raw);
    const data = Array.isArray(parsed) ? parsed : [];
    globalThis.window._clasificacionLoyola = data;
    return data;
  } catch {
    return current;
  }
}

/**
 * Normaliza un texto para comparaciones laxas entre nombres de equipo o grupo.
 *
 * @param {unknown} value Valor textual original.
 * @returns {string} Clave normalizada para matching.
 */
function normalizeTextKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Busca la fila de clasificación que mejor representa al equipo indicado.
 *
 * Prioriza ids de competición/equipo y luego cae a nombre y grupo, porque la
 * fuente del payload cambia según se abra desde clasificación o desde partido.
 *
 * @param {object|null|undefined} equipo Equipo de referencia.
 * @returns {object|null} Fila de clasificación asociada o null.
 */
export function getClasificacionMatch(equipo) {
  const normalized = normalizarEquipoClasificacion(equipo);
  const clasData = Array.isArray(globalThis.window?._clasificacionLoyola) ? globalThis.window._clasificacionLoyola : [];
  if (!normalized || !clasData.length) return null;

  const candidateIds = new Set([normalized.idEquipoComp, normalized.idEquipo].filter(Boolean).map(String));
  const competitionId = String(normalized.idCompeticion || "");
  const targetName = normalizeTextKey(normalized.nombreEquipo);
  const targetGroup = normalizeTextKey(normalized.nombreGrupo);

  const sameCompetitionRows = clasData.filter((row) => !competitionId || String(row?.IdCompeticion || "") === competitionId);

  const byIds = sameCompetitionRows.find((row) => {
    const rowIds = [row?.IdEquipoComp, row?.IdEquipo].filter(Boolean).map(String);
    return rowIds.some((id) => candidateIds.has(id));
  });
  if (byIds) return byIds;

  const byNameAndGroup = sameCompetitionRows.find((row) => {
    const rowName = normalizeTextKey(row?.NombreEquipo || row?.Eq || row?.Equipo);
    const rowGroup = normalizeTextKey(row?.NombreGrupo || row?.DenoComp);
    return rowName && rowName === targetName && (!targetGroup || rowGroup === targetGroup);
  });
  if (byNameAndGroup) return byNameAndGroup;

  return sameCompetitionRows.find((row) => {
    const rowName = normalizeTextKey(row?.NombreEquipo || row?.Eq || row?.Equipo);
    return rowName && rowName === targetName;
  }) || null;
}

function debugTeamSummary(equipo, aggregate, positions) {
  if (!TEAM_SUMMARY_DEBUG) return;
  const normalized = normalizarEquipoClasificacion(equipo);
  const clasData = Array.isArray(globalThis.window?._clasificacionLoyola) ? globalThis.window._clasificacionLoyola : [];
  const competitionRows = clasData.filter((row) => String(row?.IdCompeticion || "") === String(normalized?.idCompeticion || ""));
  const match = getClasificacionMatch(equipo);
  const previewRows = competitionRows.slice(0, 12).map((row) => ({
    idEquipo: row?.IdEquipo ?? null,
    idEquipoComp: row?.IdEquipoComp ?? null,
    nombre: row?.NombreEquipo || row?.Eq || row?.Equipo || "",
    grupo: row?.NombreGrupo || row?.DenoComp || "",
    posicion: row?.Posicion ?? null,
    pj: row?.PartidosJugados ?? null,
    pg: row?.PartidosGanados ?? null,
    pe: row?.PartidosEmpatados ?? null,
    pp: row?.PartidosPerdidos ?? null,
  }));
  console.log(`[team-summary] equipo=${JSON.stringify({
    idCompeticion: normalized?.idCompeticion ?? null,
    idEquipo: normalized?.idEquipo ?? null,
    idEquipoComp: normalized?.idEquipoComp ?? null,
    nombreEquipo: normalized?.nombreEquipo ?? "",
    nombreGrupo: normalized?.nombreGrupo ?? "",
  })} match=${JSON.stringify(match ? {
    idEquipo: match?.IdEquipo ?? null,
    idEquipoComp: match?.IdEquipoComp ?? null,
    nombre: match?.NombreEquipo || match?.Eq || match?.Equipo || "",
    grupo: match?.NombreGrupo || match?.DenoComp || "",
    posicion: match?.Posicion ?? null,
    pj: match?.PartidosJugados ?? null,
    pg: match?.PartidosGanados ?? null,
    pe: match?.PartidosEmpatados ?? null,
    pp: match?.PartidosPerdidos ?? null,
  } : null)} aggregate=${JSON.stringify(aggregate)} positions=${JSON.stringify(positions)} rows=${JSON.stringify(previewRows)}`);
}

export function computeTeamAggregateStats(equipo, partidos) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized) return null;

  const clasMatch = getClasificacionMatch(equipo);
  const source = clasMatch || equipo;
  const resolved = normalizarEquipoClasificacion(source);

  return {
    puntos: resolved?.puntos ?? 0,
    partidosJugados: resolved?.partidosJugados ?? 0,
    partidosGanados: resolved?.partidosGanados ?? 0,
    partidosEmpatados: resolved?.partidosEmpatados ?? 0,
    partidosPerdidos: resolved?.partidosPerdidos ?? 0,
    golesAFavor: resolved?.golesAFavor ?? 0,
    golesEnContra: resolved?.golesEnContra ?? 0,
    diferenciaGoles: resolved?.diferenciaGoles ?? 0,
  };
}

/**
 * Indica si un partido puede tratarse como jugado a efectos de filtros y resumen.
 *
 * @param {object|null|undefined} partido Partido a evaluar.
 * @returns {boolean} True cuando tiene resultado final.
 */
function isPlayedMatch(partido) {
  return partido?.EstadoPartido == 2 && partido?.GolesLocal != null && partido?.GolesVisit != null;
}

/**
 * Resuelve la perspectiva del equipo dentro de un partido concreto.
 *
 * Acepta tanto ids de equipo como ids de equipo-en-competición porque el
 * calendario y la clasificación no son consistentes entre endpoints.
 *
 * @param {object|null|undefined} partido Partido a inspeccionar.
 * @param {object|null|undefined} equipo Equipo activo.
 * @returns {{played: boolean, gf: number|null, gc: number|null}|null} Perspectiva resuelta.
 */
function getTeamPerspective(partido, equipo) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized || !partido) return null;

  const teamIds = new Set([normalized.idEquipo, normalized.idEquipoComp].filter(Boolean).map(String));
  const localIds = [partido?.IdEquipoLocal, partido?.IdEquipoCompLocal].filter(Boolean).map(String);
  const visitIds = [partido?.IdEquipoVisit, partido?.IdEquipoCompVisit].filter(Boolean).map(String);
  const isLocal = localIds.some((id) => teamIds.has(id));
  const isVisit = visitIds.some((id) => teamIds.has(id));
  if (!isLocal && !isVisit) return null;

  const gf = Number(isLocal ? partido.GolesLocal : partido.GolesVisit);
  const gc = Number(isLocal ? partido.GolesVisit : partido.GolesLocal);
  const played = isPlayedMatch(partido);

  return {
    played,
    gf: Number.isNaN(gf) ? null : gf,
    gc: Number.isNaN(gc) ? null : gc,
  };
}

/**
 * Filtra los partidos del equipo por estado o resultado.
 *
 * @param {object[]|null|undefined} partidos Lista base de partidos.
 * @param {object|null|undefined} equipo Equipo activo.
 * @param {string} [filter="all"] Filtro lógico a aplicar.
 * @returns {object[]} Partidos filtrados.
 */
export function filterTeamMatches(partidos, equipo, filter = "all") {
  if (!Array.isArray(partidos) || !partidos.length) return [];
  if (!filter || filter === "all") return partidos;

  return partidos.filter((partido) => {
    const perspective = getTeamPerspective(partido, equipo);
    if (!perspective) return false;

    switch (filter) {
      case "played":
        return perspective.played;
      case "pending":
        return !perspective.played;
      case "won":
        return perspective.played && perspective.gf > perspective.gc;
      case "drawn":
        return perspective.played && perspective.gf === perspective.gc;
      case "lost":
        return perspective.played && perspective.gf < perspective.gc;
      default:
        return true;
    }
  });
}

function getTeamDetailTabs(options = {}) {
  const tabs = [
    ["resumen", t("team_detail_tab_summary")],
    ["partidos", t("team_detail_tab_matches")],
  ];

  if (options?.showRoster) {
    tabs.push(["plantilla", t("team_detail_tab_roster")]);
  }
  if (options?.showStats) {
    tabs.push(["estadisticas", t("team_detail_tab_stats")]);
  }

  return tabs;
}

function renderTeamDetailTabs(activeTab = "resumen", options = {}) {
  const tabs = getTeamDetailTabs(options);
  return renderPillTabs({
    className: `team-detail-tabs ui-pill-tabs ${tabs.length > 3 ? "ui-pill-tabs-2col" : "ui-pill-tabs-3col"}`,
    buttonClassName: "tab-btn ui-pill-tab-btn",
    activeClassName: "active",
    dataAttr: "team-tab",
    ariaLabel: t("team_detail_title"),
    activeTab,
    tabs,
  });
}

function renderFilterIcon() {
  return `
    <span class="team-detail-summary-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="m20 20-3.5-3.5"></path>
      </svg>
    </span>
  `;
}

function renderClearFilterIcon() {
  return `
    <span class="team-detail-inline-reset-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18"></path>
        <path d="m6 6 12 12"></path>
      </svg>
    </span>
  `;
}

function getSummaryCards(aggregate, partidos = []) {
  const pendingCount = Array.isArray(partidos) ? partidos.filter((partido) => !isPlayedMatch(partido)).length : 0;
  if (!aggregate) return [
    { key: "pending", label: t("team_detail_filter_pending"), value: pendingCount, filter: "pending" },
  ];

  return [
    { key: "played", label: t("team_detail_played"), value: aggregate.partidosJugados, filter: "played" },
    { key: "won", label: t("team_detail_won"), value: aggregate.partidosGanados, filter: "won" },
    { key: "drawn", label: t("team_detail_drawn"), value: aggregate.partidosEmpatados, filter: "drawn" },
    { key: "lost", label: t("team_detail_lost"), value: aggregate.partidosPerdidos, filter: "lost" },
    { key: "pending", label: t("team_detail_filter_pending"), value: pendingCount, filter: "pending" },
  ];
}

function getTeamPositions(equipo) {
  const normalized = normalizarEquipoClasificacion(equipo);
  const clasData = Array.isArray(globalThis.window?._clasificacionLoyola) ? globalThis.window._clasificacionLoyola : [];
  if (!normalized || !clasData.length) return [];

  const competitionRows = clasData.filter((row) => String(row?.IdCompeticion || "") === String(normalized.idCompeticion || ""));
  const grouped = groupClasificacionData(competitionRows);
  const targetName = normalizeTextKey(normalized.nombreEquipo);
  const targetIds = new Set([normalized.idEquipoComp, normalized.idEquipo].filter(Boolean).map(String));

  return Object.entries(grouped).map(([groupName, equipos]) => {
    const match = equipos.find((row) => {
      const rowIds = [row?.IdEquipoComp, row?.IdEquipo].filter(Boolean).map(String);
      if (rowIds.some((id) => targetIds.has(id))) return true;
      const rowName = normalizeTextKey(row?.NombreEquipo || row?.Eq || row?.Equipo);
      return rowName && rowName === targetName;
    });
    return {
      name: groupName,
      position: match?.Posicion != null ? Number(match.Posicion) : null,
      totalTeams: Array.isArray(equipos) ? equipos.length : 0,
      current: normalizeTextKey(groupName) === normalizeTextKey(normalized.nombreGrupo),
    };
  }).filter((item) => item.position != null);
}

export function renderEquipoDetalleSummary(equipo, partidos = [], activeFilter = "all") {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized) return "";

  const aggregate = computeTeamAggregateStats(normalized, partidos);
  const positions = getTeamPositions(normalized);
  debugTeamSummary(normalized, aggregate, positions);
  const cards = getSummaryCards(aggregate, partidos);

  return `
    <section class="team-detail-section">
      <div class="team-detail-section-title">${escapeHtml(t("team_detail_summary"))}</div>
      ${positions.length ? `
        <div class="team-position-list">
          ${positions.map((item) => `
            <article class="team-position-card${item.current ? " is-current" : ""}">
              <div class="team-position-card-title">${escapeHtml(item.name)}</div>
              <div class="team-position-card-value">${item.position != null ? `${escapeHtml(item.position)} / ${escapeHtml(item.totalTeams || "-")}` : `- / ${escapeHtml(item.totalTeams || "-")}`}</div>
            </article>
          `).join("")}
        </div>
      ` : ""}
      <div class="team-detail-summary-grid team-detail-summary-grid-mobile">
        <button
          type="button"
          class="team-detail-summary-card team-detail-summary-card-action${activeFilter === "all" ? " is-active" : ""}"
          data-team-filter="all"
          aria-pressed="${activeFilter === "all" ? "true" : "false"}"
        >
          ${renderFilterIcon()}
          <div class="team-detail-summary-label">${escapeHtml(t("team_detail_filter_all"))}</div>
          <div class="team-detail-summary-value">${escapeHtml(Array.isArray(partidos) ? partidos.length : 0)}</div>
        </button>
        ${cards.map((item) => {
          const interactive = !!item.filter;
          const active = interactive && activeFilter === item.filter;
          const tag = interactive ? "button" : "article";
          return `
            <${tag}
              ${interactive ? 'type="button"' : ""}
              class="team-detail-summary-card${interactive ? " team-detail-summary-card-action" : ""}${active ? " is-active" : ""}"
              ${interactive ? `data-team-filter="${escapeHtml(item.filter)}" aria-pressed="${active ? "true" : "false"}"` : ""}
            >
              ${interactive ? renderFilterIcon() : ""}
              <div class="team-detail-summary-label">${escapeHtml(item.label)}</div>
              <div class="team-detail-summary-value">${escapeHtml(item.value)}</div>
            </${tag}>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function getActiveFilterMeta(activeFilter) {
  const labels = {
    all: t("team_detail_filter_all"),
    played: t("team_detail_played"),
    won: t("team_detail_won"),
    drawn: t("team_detail_drawn"),
    lost: t("team_detail_lost"),
    pending: t("team_detail_filter_pending"),
  };

  return {
    key: activeFilter,
    label: labels[activeFilter] || t("team_detail_filter_all"),
  };
}

export function renderEquipoDetalleMatches(partidos, equipoNombre, activeFilter = "all") {
  const filterMeta = getActiveFilterMeta(activeFilter);

  if (!Array.isArray(partidos) || partidos.length === 0) {
    return `
      <section class="team-detail-section">
        <div class="team-detail-section-title">${escapeHtml(t("team_detail_matches"))}</div>
        <div class="team-detail-empty">${escapeHtml(
          activeFilter === "all" ? t("team_detail_no_matches") : t("team_detail_no_matches_for_filter"),
        )}</div>
      </section>
    `;
  }

  return `
    <section class="team-detail-section">
      <div class="team-detail-section-head">
        <div class="team-detail-section-title">${escapeHtml(t("team_detail_matches"))}</div>
      </div>
      ${activeFilter !== "all"
        ? `
          <div class="team-detail-active-filter" role="status" aria-live="polite">
            <div class="team-detail-active-filter-text">
              <span class="team-detail-active-filter-label">${escapeHtml(t("team_detail_filter_active_label"))}</span>
              <span class="team-detail-active-filter-value">${escapeHtml(filterMeta.label)}</span>
              <span class="team-detail-active-filter-count">${escapeHtml(t("team_detail_filter_showing", partidos.length))}</span>
            </div>
            <button type="button" class="team-detail-inline-reset" data-team-filter="all" aria-label="${escapeHtml(t("team_detail_filter_clear"))}" title="${escapeHtml(t("team_detail_filter_clear"))}">${renderClearFilterIcon()}</button>
          </div>
        `
        : ""}
      <div class="team-detail-match-list">
        ${partidos.map((partido) => {
          const fecha = formatFechaHelper(partido.Fecha);
          const hora = formatHora(partido.Hora);
          const local = emphasizeTeam(partido.EquipoLocal || null, equipoNombre);
          const visit = emphasizeTeam(partido.EquipoVisit || null, equipoNombre);
          const marcador = partido.EstadoPartido == 2 && partido.GolesLocal != null && partido.GolesVisit != null
            ? `${partido.GolesLocal} - ${partido.GolesVisit}`
            : hora || "-";

          return `
            <button type="button" class="team-detail-match-card" data-team-match='${escapeHtml(JSON.stringify(partido))}' aria-label="${escapeHtml(t("team_detail_open_match"))}">
              <div class="team-detail-match-topline">
                <span class="team-detail-match-round">${escapeHtml(partido.NombreJornada || "")}</span>
                <span class="team-detail-match-date">${escapeHtml([fecha, hora].filter(Boolean).join(" · "))}</span>
              </div>
              <div class="team-detail-match-main">
                <div class="team-detail-match-team">${local}</div>
                <div class="team-detail-match-score">${escapeHtml(marcador)}</div>
                <div class="team-detail-match-team">${visit}</div>
              </div>
              <div class="team-detail-match-bottom">
                <div class="team-detail-match-venue">${makeInstalacionHtml(partido)}</div>
              </div>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderRosterSkeletonBlock(title, rows = 3) {
  return `
    <section class="team-detail-section team-roster-block">
      <div class="team-detail-section-head">
        <div class="team-detail-section-title">${escapeHtml(title)}</div>
        <span class="partido-detalle-skeleton team-roster-block-count-skeleton"></span>
      </div>
      <div class="team-roster-list">
        ${Array.from({ length: rows }).map(() => `
          <article class="team-roster-item team-roster-item-skeleton">
            <div class="team-roster-item-main">
              <span class="partido-detalle-skeleton team-roster-skeleton-marker"></span>
              <div class="team-roster-item-info team-roster-item-info-skeleton">
                <span class="partido-detalle-skeleton skeleton-line team-roster-skeleton-name"></span>
                <span class="partido-detalle-skeleton skeleton-line team-roster-skeleton-meta"></span>
              </div>
              <span class="partido-detalle-skeleton team-roster-skeleton-action"></span>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}


function renderRosterSkeleton() {
  return `
    <div class="team-roster-view">
      <div class="team-detail-inline-note">${escapeHtml(t("team_detail_roster_loading"))}</div>
      ${renderRosterSkeletonBlock(t("detail_players"), 4)}
      ${renderRosterSkeletonBlock(t("detail_goalkeepers"), 2)}
      ${renderRosterSkeletonBlock(t("detail_staff"), 2)}
    </div>
  `;
}

export function renderEquipoDetalleView(equipo, partidos = [], options = {}) {
  const { activeTab = "resumen", activeFilter = "all", isLoading = false, isLoadingRoster = false, showRoster = false, showStats = false, teamStats = null, loadingStats = false } = options;
  const filteredMatches = filterTeamMatches(partidos, equipo, activeFilter);
  const roster = showRoster ? buildRosterFromMatches(partidos, equipo) : null;

  let content = "";
  if (activeTab === "resumen") {
    content = renderEquipoDetalleSummary(equipo, partidos, activeFilter);
  } else if (activeTab === "partidos") {
    content = isLoading
      ? `<div class="team-detail-loading">${escapeHtml(t("team_detail_loading"))}</div>`
      : renderEquipoDetalleMatches(filteredMatches, equipo?.nombreEquipo || "", activeFilter);
  } else if (activeTab === "plantilla") {
    content = isLoadingRoster ? renderRosterSkeleton() : renderEquipoDetalleRoster(roster);
  } else if (activeTab === "estadisticas") {
    content = renderTeamStatsView(teamStats, { isLoading: loadingStats });
  }

  return `
    <div class="team-detail-view">
      ${renderTeamDetailTabs(activeTab, { showRoster, showStats })}
      <div class="team-tab-content" data-team-tab-content>
        ${content}
      </div>
    </div>
  `;
}
