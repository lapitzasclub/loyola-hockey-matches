import { t } from "../i18n.js";
import { escapeHtml, getCurrentTab, setCurrentTab } from "./partidoDetalleUtils.js";
import { updateTabVisibility } from "./partidoDetalleRender.js";

/**
 * Renderiza la estructura base de pestañas de la vista principal del partido.
 *
 * @param {HTMLElement} bodyEl Contenedor principal del detalle.
 * @param {object} state Estado interno del detalle.
 * @returns {void}
 */
export function ensureBaseLayout(bodyEl, state) {
  bodyEl.innerHTML = `
    <div class="partido-detalle-tabs" role="tablist" aria-label="Secciones del partido">
      <button class="tab-btn" data-tab="resumen">${escapeHtml(t("detail_summary"))}</button>
      <button class="tab-btn" data-tab="alineaciones">${escapeHtml(t("detail_lineups"))}</button>
      <button class="tab-btn" data-tab="eventos">${escapeHtml(t("detail_events"))}</button>
      <button class="tab-btn" data-tab="penaltis">${escapeHtml(t("detail_penalties"))}</button>
    </div>
    <section class="tab-content" id="tab-resumen"></section>
    <section class="tab-content" id="tab-alineaciones" hidden></section>
    <section class="tab-content" id="tab-eventos" hidden></section>
    <section class="tab-content" id="tab-penaltis" hidden></section>
  `;

  bodyEl.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.onclick = () => {
      setCurrentTab(state, btn.dataset.tab);
      updateTabVisibility(bodyEl, getCurrentTab(state));
    };
  });

  updateTabVisibility(bodyEl, getCurrentTab(state));
}
