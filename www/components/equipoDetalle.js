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
export function renderEquipoDetalleSummary(equipo) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized) return "";

  const summaryItems = [
    [t("team_detail_points"), normalized.puntos],
    [t("team_detail_played"), normalized.partidosJugados],
    [t("team_detail_won"), normalized.partidosGanados],
    [t("team_detail_drawn"), normalized.partidosEmpatados],
    [t("team_detail_lost"), normalized.partidosPerdidos],
    [t("team_detail_goals_for"), normalized.golesAFavor],
    [t("team_detail_goals_against"), normalized.golesEnContra],
    [t("team_detail_goal_difference"), `${normalized.diferenciaGoles >= 0 ? "+" : ""}${normalized.diferenciaGoles}`],
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
