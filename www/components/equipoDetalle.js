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

export function renderEquipoDetalleSummary(equipo, partidos = []) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized) return "";

  const aggregate = computeTeamAggregateStats(normalized, partidos);
  if (!aggregate) return "";

  const goalDiffText = aggregate.diferenciaGoles > 0 ? `+${aggregate.diferenciaGoles}` : String(aggregate.diferenciaGoles);
  const summaryItems = [
    [t("team_detail_points"), aggregate.puntos],
    [t("team_detail_played"), aggregate.partidosJugados],
    [t("team_detail_won"), aggregate.partidosGanados],
    [t("team_detail_drawn"), aggregate.partidosEmpatados],
    [t("team_detail_lost"), aggregate.partidosPerdidos],
    [t("team_detail_goals_for"), aggregate.golesAFavor],
    [t("team_detail_goals_against"), aggregate.golesEnContra],
    [t("team_detail_goal_difference"), goalDiffText],
  ];

  return `
    <section class="team-detail-section">
      <div class="team-detail-section-title">${escapeHtml(t("team_detail_summary"))}</div>
      <div class="team-detail-summary-grid">
        ${summaryItems.map(([label, value]) => `
          <article class="team-detail-summary-card">
            <div class="team-detail-summary-label">${escapeHtml(label)}</div>
            <div class="team-detail-summary-value">${escapeHtml(value)}</div>
          </article>
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
export function renderEquipoDetalleMatches(partidos, equipoNombre) {
  if (!Array.isArray(partidos) || partidos.length === 0) {
    return `
      <section class="team-detail-section">
        <div class="team-detail-section-title">${escapeHtml(t("team_detail_matches"))}</div>
        <div class="team-detail-empty">${escapeHtml(t("team_detail_no_matches"))}</div>
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
