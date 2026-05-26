import { getCalendarioLoyola } from "../services.js";
import { t } from "../i18n.js";
import { comparePartidosByScheduledDate, extractPartidos } from "../utils/helpers.js";
import { emphasizeTeam, formatFecha as formatFechaHelper, makeInstalacionHtml } from "../utils/partidosHelpers.js";
import { escapeHtml, formatHora, normalizarEquipoClasificacion } from "./partidoDetalleUtils.js";

export async function loadEquipoDetalleMatches(equipo) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized?.idEquipoComp || !normalized?.idCompeticion) return [];
  const raw = await getCalendarioLoyola(normalized.idEquipoComp, normalized.idCompeticion);
  const { partidos } = extractPartidos(raw);
  return Array.isArray(partidos) ? partidos.slice().sort(comparePartidosByScheduledDate) : [];
}

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

  if (hasExistingStats || !Array.isArray(partidos) || !partidos.length) return stats;

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

function getTeamDetailTabs(options = {}) {
  const tabs = [
    ["resumen", t("team_detail_tab_summary")],
    ["partidos", t("team_detail_tab_matches")],
  ];

  if (options?.showRoster) {
    tabs.push(["plantilla", t("team_detail_tab_roster")]);
  }

  return tabs;
}

function renderTeamDetailTabs(activeTab = "resumen", options = {}) {
  const tabs = getTeamDetailTabs(options);

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
  const goalDiffText = aggregate.diferenciaGoles > 0 ? `+${aggregate.diferenciaGoles}` : String(aggregate.diferenciaGoles);

  return [
    { key: "played", label: t("team_detail_played"), value: aggregate.partidosJugados, filter: "played" },
    { key: "won", label: t("team_detail_won"), value: aggregate.partidosGanados, filter: "won" },
    { key: "drawn", label: t("team_detail_drawn"), value: aggregate.partidosEmpatados, filter: "drawn" },
    { key: "lost", label: t("team_detail_lost"), value: aggregate.partidosPerdidos, filter: "lost" },
    { key: "pending", label: t("team_detail_filter_pending"), value: pendingCount, filter: "pending" },
    { key: "points", label: t("team_detail_points"), value: aggregate.puntos, filter: null },
    { key: "goals_for", label: t("team_detail_goals_for"), value: aggregate.golesAFavor, filter: null },
    { key: "goals_against", label: t("team_detail_goals_against"), value: aggregate.golesEnContra, filter: null },
    { key: "goal_difference", label: t("team_detail_goal_difference"), value: goalDiffText, filter: null },
  ];
}

export function renderEquipoDetalleSummary(equipo, partidos = [], activeFilter = "all") {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized) return "";

  const aggregate = computeTeamAggregateStats(normalized, partidos);
  if (!aggregate) return "";

  const cards = getSummaryCards(aggregate, partidos);

  return `
    <section class="team-detail-section">
      <div class="team-detail-section-title">${escapeHtml(t("team_detail_summary"))}</div>
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

function renderEquipoDetallePlaceholder(title, message) {
  return `
    <section class="team-detail-section">
      <div class="team-detail-section-title">${escapeHtml(title)}</div>
      <div class="team-detail-empty">${escapeHtml(message)}</div>
    </section>
  `;
}

export function renderEquipoDetalleView(equipo, partidos = [], options = {}) {
  const { activeTab = "resumen", activeFilter = "all", isLoading = false, showRoster = false } = options;
  const filteredMatches = filterTeamMatches(partidos, equipo, activeFilter);

  let content = "";
  if (activeTab === "resumen") {
    content = renderEquipoDetalleSummary(equipo, partidos, activeFilter);
  } else if (activeTab === "partidos") {
    content = isLoading
      ? `<div class="team-detail-loading">${escapeHtml(t("team_detail_loading"))}</div>`
      : renderEquipoDetalleMatches(filteredMatches, equipo?.nombreEquipo || "", activeFilter);
  } else if (activeTab === "plantilla") {
    content = renderEquipoDetallePlaceholder(t("team_detail_tab_roster"), t("team_detail_roster_unavailable"));
  }

  return `
    <div class="team-detail-view subview-enter">
      ${renderTeamDetailTabs(activeTab, { showRoster })}
      ${content}
    </div>
  `;
}
