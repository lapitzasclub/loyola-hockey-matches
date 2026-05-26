import { getCalendarioLoyola } from "../services.js";
import { t } from "../i18n.js";
import { comparePartidosByScheduledDate, extractPartidos } from "../utils/helpers.js";
import { emphasizeTeam, formatFecha as formatFechaHelper, makeInstalacionHtml } from "../utils/partidosHelpers.js";
import { escapeHtml, formatHora, normalizarEquipoClasificacion } from "./partidoDetalleUtils.js";

/**
 * Carga el calendario del equipo para el detalle ampliado.
 *
 * @param {object} equipo Equipo normalizado del detalle.
 * @returns {Promise<Array<object>>} Lista ordenada de partidos del equipo.
 */
export async function loadEquipoDetalleMatches(equipo) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized?.idEquipoComp || !normalized?.idCompeticion) return [];
  const raw = await getCalendarioLoyola(normalized.idEquipoComp, normalized.idCompeticion);
  const { partidos } = extractPartidos(raw);
  return Array.isArray(partidos) ? partidos.slice().sort(comparePartidosByScheduledDate) : [];
}

/**
 * Construye el HTML del resumen superior del equipo usando etiquetas completas.
 *
 * @param {object} equipo Fila normalizada del equipo.
 * @returns {string} HTML del resumen.
 */
export function computeTeamAggregateStats(equipo, partidos) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized) return null;

  const teamIds = new Set([normalized.idEquipo, normalized.idEquipoComp].filter(Boolean).map(String));
  const stats = {
    puntos: normalized.puntos,
    partidosJugados: normalized.partidosJugados,
    partidosGanados: normalized.partidosGanados,
    partidosEmpatados: normalized.partidosEmpatados,
    partidosPerdidos: normalized.partidosPerdidos,
    golesAFavor: normalized.golesAFavor,
    golesEnContra: normalized.golesEnContra,
    diferenciaGoles: normalized.diferenciaGoles,
  };

  const hasExistingStats = [
    stats.puntos,
    stats.partidosJugados,
    stats.partidosGanados,
    stats.partidosEmpatados,
    stats.partidosPerdidos,
    stats.golesAFavor,
    stats.golesEnContra,
  ].some((value) => Number(value) !== 0);

  if (hasExistingStats || !Array.isArray(partidos) || !partidos.length) {
    return stats;
  }

  const computed = {
    puntos: 0,
    partidosJugados: 0,
    partidosGanados: 0,
    partidosEmpatados: 0,
    partidosPerdidos: 0,
    golesAFavor: 0,
    golesEnContra: 0,
    diferenciaGoles: 0,
  };

  for (const partido of partidos) {
    if (partido?.EstadoPartido != 2 || partido?.GolesLocal == null || partido?.GolesVisit == null) continue;
    const isLocal = teamIds.has(String(partido?.IdEquipoLocal || ""));
    const isVisit = teamIds.has(String(partido?.IdEquipoVisit || ""));
    if (!isLocal && !isVisit) continue;

    const gf = Number(isLocal ? partido.GolesLocal : partido.GolesVisit) || 0;
    const gc = Number(isLocal ? partido.GolesVisit : partido.GolesLocal) || 0;

    computed.partidosJugados += 1;
    computed.golesAFavor += gf;
    computed.golesEnContra += gc;

    if (gf > gc) {
      computed.partidosGanados += 1;
      computed.puntos += 3;
    } else if (gf === gc) {
      computed.partidosEmpatados += 1;
      computed.puntos += 1;
    } else {
      computed.partidosPerdidos += 1;
    }
  }

  computed.diferenciaGoles = computed.golesAFavor - computed.golesEnContra;
  return computed;
}

function isPlayedMatch(partido) {
  return partido?.EstadoPartido == 2 && partido?.GolesLocal != null && partido?.GolesVisit != null;
}

function getTeamPerspective(partido, equipo) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized || !partido) return null;

  const teamIds = new Set([normalized.idEquipo, normalized.idEquipoComp].filter(Boolean).map(String));
  const isLocal = teamIds.has(String(partido?.IdEquipoLocal || ""));
  const isVisit = teamIds.has(String(partido?.IdEquipoVisit || ""));
  if (!isLocal && !isVisit) return null;

  const gf = Number(isLocal ? partido.GolesLocal : partido.GolesVisit);
  const gc = Number(isLocal ? partido.GolesVisit : partido.GolesLocal);
  const played = isPlayedMatch(partido);

  return {
    isLocal,
    isVisit,
    played,
    gf: Number.isNaN(gf) ? null : gf,
    gc: Number.isNaN(gc) ? null : gc,
  };
}

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

export function getTeamFilterOptions(equipo, partidos = []) {
  const aggregate = computeTeamAggregateStats(equipo, partidos) || {};
  const pendingCount = Array.isArray(partidos) ? partidos.filter((partido) => !isPlayedMatch(partido)).length : 0;

  return [
    { key: "all", label: t("team_detail_filter_all"), value: Array.isArray(partidos) ? partidos.length : 0 },
    { key: "played", label: t("team_detail_played"), value: aggregate.partidosJugados || 0 },
    { key: "won", label: t("team_detail_won"), value: aggregate.partidosGanados || 0 },
    { key: "drawn", label: t("team_detail_drawn"), value: aggregate.partidosEmpatados || 0 },
    { key: "lost", label: t("team_detail_lost"), value: aggregate.partidosPerdidos || 0 },
    { key: "pending", label: t("team_detail_filter_pending"), value: pendingCount },
  ];
}

function renderTeamDetailTabs(activeTab = "resumen") {
  const tabs = [
    ["resumen", t("team_detail_tab_summary")],
    ["partidos", t("team_detail_tab_matches")],
  ];

  return `
    <div class="team-detail-tabs" role="tablist" aria-label="${escapeHtml(t("team_detail_title"))}">
      ${tabs.map(([key, label]) => `
        <button
          type="button"
          class="team-detail-tab-btn${activeTab === key ? " is-active" : ""}"
          data-team-tab="${escapeHtml(key)}"
          aria-selected="${activeTab === key ? "true" : "false"}"
        >${escapeHtml(label)}</button>
      `).join("")}
    </div>
  `;
}

export function renderEquipoDetalleSummary(equipo, partidos = [], activeFilter = "all") {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized) return "";

  const aggregate = computeTeamAggregateStats(normalized, partidos);
  if (!aggregate) return "";

  const goalDiffText = aggregate.diferenciaGoles > 0 ? `+${aggregate.diferenciaGoles}` : String(aggregate.diferenciaGoles);
  const summaryItems = [
    ["points", t("team_detail_points"), aggregate.puntos],
    ["played", t("team_detail_played"), aggregate.partidosJugados],
    ["won", t("team_detail_won"), aggregate.partidosGanados],
    ["drawn", t("team_detail_drawn"), aggregate.partidosEmpatados],
    ["lost", t("team_detail_lost"), aggregate.partidosPerdidos],
    ["goals_for", t("team_detail_goals_for"), aggregate.golesAFavor],
    ["goals_against", t("team_detail_goals_against"), aggregate.golesEnContra],
    ["goal_difference", t("team_detail_goal_difference"), goalDiffText],
  ];

  const filterOptions = getTeamFilterOptions(normalized, partidos);

  return `
    <section class="team-detail-section">
      <div class="team-detail-section-title">${escapeHtml(t("team_detail_summary"))}</div>
      <div class="team-detail-summary-grid">
        ${summaryItems.map(([key, label, value]) => `
          <article class="team-detail-summary-card${activeFilter === key ? " is-active" : ""}">
            <div class="team-detail-summary-label">${escapeHtml(label)}</div>
            <div class="team-detail-summary-value">${escapeHtml(value)}</div>
          </article>
        `).join("")}
      </div>
      <div class="team-detail-filter-chips" role="toolbar" aria-label="${escapeHtml(t("team_detail_filter_toolbar"))}">
        ${filterOptions.map((option) => `
          <button
            type="button"
            class="team-detail-filter-chip${activeFilter === option.key ? " is-active" : ""}"
            data-team-filter="${escapeHtml(option.key)}"
            aria-pressed="${activeFilter === option.key ? "true" : "false"}"
          >
            <span>${escapeHtml(option.label)}</span>
            <span class="team-detail-filter-chip-count">${escapeHtml(option.value)}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

/**
 * Renderiza la lista simplificada de encuentros del equipo.
 *
 * @param {Array<object>} partidos Partidos del equipo ya ordenados.
 * @param {string} equipoNombre Nombre completo del equipo destacado.
 * @returns {string} HTML de la lista.
 */
export function renderEquipoDetalleMatches(partidos, equipoNombre, activeFilter = "all") {
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
      <div class="team-detail-section-title">${escapeHtml(t("team_detail_matches"))}</div>
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

export function renderEquipoDetalleView(equipo, partidos = [], options = {}) {
  const { activeTab = "resumen", activeFilter = "all", isLoading = false } = options;
  const filteredMatches = filterTeamMatches(partidos, equipo, activeFilter);

  return `
    <div class="team-detail-view subview-enter">
      ${renderTeamDetailTabs(activeTab)}
      ${activeTab === "resumen"
        ? renderEquipoDetalleSummary(equipo, partidos, activeFilter)
        : (isLoading
          ? `<div class="team-detail-loading">${escapeHtml(t("team_detail_loading"))}</div>`
          : renderEquipoDetalleMatches(filteredMatches, equipo?.nombreEquipo || "", activeFilter))}
    </div>
  `;
}
