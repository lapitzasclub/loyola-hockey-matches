import { t } from "../i18n.js";
import { getEstadisticaJugador } from "../services.js";
import { renderJugadorHeader } from "./partidoDetalleJugadorView.js";
import {
  getJugadorFotoUrl,
  getPlayerStatsData,
  renderJugadorCompeticion,
  renderJugadorTimeline,
  renderPartidoJugadorChips,
  safeNumber,
} from "./partidoDetalleJugadorStats.js";
import { emptyArray, escapeHtml, getCurrentView } from "./partidoDetalleUtils.js";

/**
 * Renderiza la subvista activa distinta de la vista principal del partido.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @returns {string} HTML de la subvista activa.
 */
export function renderDetalleSubview(state) {
  if (getCurrentView(state) === "jugador") {
    return renderJugadorSubview(state);
  }
  return `
    <div class="partido-detalle-subview-placeholder">
      <div class="partido-detalle-empty">${escapeHtml(t("detail_loading_view"))}</div>
    </div>
  `;
}

/**
 * Renderiza la hoja completa del detalle de jugador dentro del modal.
 * Mantiene la shell estable y revela el contenido hidratado por bloques.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @returns {string} HTML de la subvista de jugador.
 */
export function renderJugadorSubview(state) {
  const jugador = state.selectedJugador;
  if (!jugador) {
    return `
      <div class="partido-detalle-subview-placeholder subview-enter">
        <div class="partido-detalle-empty">${escapeHtml(t("detail_player_unavailable"))}</div>
      </div>
    `;
  }

  const partidoStats = jugador.partidoStats || {};
  const globales = jugador.statsGlobales;
  const hasGlobales = !!globales;
  const foto = getJugadorFotoUrl(globales?.foto);
  const competicionesOrdenadas = emptyArray(globales?.competiciones)
    .slice()
    .sort((a, b) => safeNumber(b?.partidos || emptyArray(b?.filas).length) - safeNumber(a?.partidos || emptyArray(a?.filas).length));
  const competicionesHtml = competicionesOrdenadas.length
    ? competicionesOrdenadas.map((comp, index) => renderJugadorCompeticion(comp, jugador.licenciaTipo || "j", state.modalidad || "hp", { open: index === 0 })).join("")
    : "";
  const timeline = renderJugadorTimeline(jugador.eventos);
  const partidoChips = renderPartidoJugadorChips(partidoStats);
  const showMatchBlock = jugador.source !== "team-roster";

  return `
    <div class="partido-detalle-player-sheet subview-enter">
      <section class="partido-detalle-section partido-detalle-player-card partido-detalle-player-card-hero">
        <div class="partido-detalle-player-block ${hasGlobales ? "is-ready" : "is-loading"}">
          <div class="partido-detalle-player-block-loading partido-detalle-player-hero partido-detalle-player-hero-lg partido-detalle-player-hero-card">
            <span class="partido-detalle-skeleton skeleton-photo"></span>
            <div class="partido-detalle-player-skeleton-meta">
              <span class="partido-detalle-skeleton skeleton-line skeleton-line-sm"></span>
              <span class="partido-detalle-skeleton skeleton-line skeleton-line-lg"></span>
              <span class="partido-detalle-skeleton skeleton-line skeleton-line-xs"></span>
              <span class="partido-detalle-skeleton skeleton-line skeleton-line-md"></span>
            </div>
          </div>
          <div class="partido-detalle-player-block-content partido-detalle-player-hero partido-detalle-player-hero-lg partido-detalle-player-hero-card">
            <img class="partido-detalle-player-photo" src="${foto}" alt="${escapeHtml(jugador.nombre || "Jugador")}" loading="eager" decoding="async" onload="this.classList.add('is-loaded')">
            <div class="partido-detalle-player-identity">
              <div class="partido-detalle-player-eyebrow">${escapeHtml(jugador.equipo || state.partido?.equipoLoyola || "")}</div>
              <div class="partido-detalle-player-name">${escapeHtml(jugador.nombre || "Jugador")}</div>
              ${jugador.dorsal ? `<div class="partido-detalle-player-number">#${escapeHtml(jugador.dorsal)}</div>` : ""}
              <div class="partido-detalle-player-meta partido-detalle-player-meta-compact">${[globales?.nacionalidad ? `${escapeHtml(t("detail_player_nationality"))}: ${escapeHtml(globales.nacionalidad)}` : "", globales?.nacimiento ? `${escapeHtml(t("detail_player_birth"))}: ${escapeHtml(globales.nacimiento)}` : ""].filter(Boolean).join(" · ")}</div>
            </div>
          </div>
        </div>
        ${jugador.error ? `<div class="partido-detalle-empty small cardish">${escapeHtml(jugador.error)}</div>` : ""}
      </section>
      ${showMatchBlock ? `
        <section class="partido-detalle-section partido-detalle-player-events-card">
          <div class="partido-detalle-section-title">${escapeHtml(t("detail_match"))}</div>
          <div class="partido-detalle-player-section-body">
            ${partidoChips ? `<div class="alineacion-chips partido-detalle-player-chips partido-detalle-player-chips-compact">${partidoChips}</div>` : `<div class="alineacion-chips partido-detalle-player-chips partido-detalle-player-chips-compact"><span class="partido-detalle-skeleton skeleton-chip"></span><span class="partido-detalle-skeleton skeleton-chip"></span></div>`}
            <div class="partido-detalle-player-events-list">${timeline}</div>
          </div>
        </section>
      ` : ""}
      <section class="partido-detalle-section partido-detalle-player-events-card">
        <div class="partido-detalle-section-title">${escapeHtml(t("detail_player_statistics"))}</div>
        <div class="partido-detalle-player-block ${hasGlobales ? "is-ready" : "is-loading"}">
          <div class="partido-detalle-player-block-loading partido-detalle-player-competitions">
            <div class="partido-detalle-player-competition partido-detalle-player-competition-skeleton">
              <div class="partido-detalle-player-competition-bar">
                <div class="partido-detalle-player-competition-summary-main">
                  <span class="partido-detalle-skeleton skeleton-line skeleton-line-sm"></span>
                  <span class="partido-detalle-skeleton skeleton-line skeleton-line-xs"></span>
                </div>
                <div class="partido-detalle-player-competition-summary-side">
                  <span class="partido-detalle-skeleton skeleton-chip"></span>
                </div>
              </div>
              <div class="partido-detalle-player-history-list-skeleton">
                <div class="partido-detalle-player-history-row partido-detalle-player-history-row-skeleton"><span class="partido-detalle-skeleton skeleton-line skeleton-line-lg"></span><span class="partido-detalle-skeleton skeleton-line skeleton-line-md"></span></div>
                <div class="partido-detalle-player-history-row partido-detalle-player-history-row-skeleton"><span class="partido-detalle-skeleton skeleton-line skeleton-line-lg"></span><span class="partido-detalle-skeleton skeleton-line skeleton-line-sm"></span></div>
              </div>
            </div>
          </div>
          <div class="partido-detalle-player-block-content">
            ${competicionesHtml ? `<div class="partido-detalle-player-competitions">${competicionesHtml}</div>` : `<div class="partido-detalle-empty small cardish">${escapeHtml(t("detail_no_matches_available"))}</div>`}
          </div>
        </div>
      </section>
    </div>
  `;
}

/**
 * Hidrata las estadísticas globales del jugador seleccionado y relanza el render.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @param {HTMLElement} headerEl Contenedor de cabecera del modal.
 * @param {HTMLElement} bodyEl Contenedor principal del modal.
 * @param {(state: object, headerEl: HTMLElement, bodyEl: HTMLElement) => void} renderAll Render principal del modal.
 * @returns {Promise<void>} Promesa resuelta cuando termina la carga del jugador.
 */
export async function hydrateJugadorStats(state, headerEl, bodyEl, renderAll) {
  const jugador = state.selectedJugador;
  if (!jugador?.idLicencia) {
    jugador.loading = false;
    jugador.error = t("detail_player_no_license");
    renderAll(state, headerEl, bodyEl);
    return;
  }

  try {
    const statsRes = await getEstadisticaJugador(jugador.idLicencia);
    jugador.statsGlobales = getPlayerStatsData(statsRes);
    jugador.error = jugador.statsGlobales ? "" : t("detail_player_load_error");
  } catch (error) {
    jugador.error = error?.message || t("detail_player_load_error");
  } finally {
    jugador.loading = false;
    renderAll(state, headerEl, bodyEl);
  }
}

export { renderJugadorHeader };
