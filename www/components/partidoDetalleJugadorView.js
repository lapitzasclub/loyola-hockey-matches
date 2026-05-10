import { t } from "../i18n.js";
import { escapeHtml } from "./partidoDetalleUtils.js";

/**
 * Renderiza la cabecera compacta de la subvista de jugador dentro del modal.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @returns {string} HTML de la cabecera de jugador.
 */
export function renderJugadorHeader(state) {
  const jugador = state.selectedJugador;
  if (!jugador) return `<div>${escapeHtml(t("detail_match"))}</div>`;
  const nombre = jugador.statsGlobales?.nombre || jugador.nombre || "Jugador";
  const meta = jugador.dorsal ? `#${escapeHtml(jugador.dorsal)}` : "";

  return `
    <div class="partido-detalle-subheader subview-enter${jugador.loading ? " partido-detalle-subheader-loading" : ""}">
      <div class="partido-detalle-subheader-top">${escapeHtml(jugador.teamName || jugador.teamType || t("detail_match"))}</div>
      <div class="partido-detalle-subheader-title">${escapeHtml(nombre)}</div>
      <div class="partido-detalle-subheader-meta">${meta || (jugador.loading ? `<span class="partido-detalle-skeleton skeleton-line skeleton-line-xs"></span>` : "")}</div>
    </div>
  `;
}
