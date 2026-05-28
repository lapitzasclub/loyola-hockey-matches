import { t } from "../i18n.js";
import { getCurrentTab, setCurrentTab } from "./partidoDetalleUtils.js";
import { updateTabVisibility } from "./partidoDetalleRender.js";
import { animatePillTabSelection, renderPillTabs } from "./uiTabs.js";

/**
 * Renderiza la estructura base de pestañas de la vista principal del partido.
 *
 * @param {HTMLElement} bodyEl Contenedor principal del detalle.
 * @param {object} state Estado interno del detalle.
 * @returns {void}
 */
export function ensureBaseLayout(bodyEl, state) {
  bodyEl.innerHTML = `
    ${renderPillTabs({
      className: "partido-detalle-tabs ui-pill-tabs ui-pill-tabs-2col",
      buttonClassName: "tab-btn ui-pill-tab-btn",
      activeClassName: "active",
      dataAttr: "tab",
      ariaLabel: "Secciones del partido",
      activeTab: getCurrentTab(state),
      tabs: [
        ["resumen", t("detail_summary")],
        ["alineaciones", t("detail_lineups")],
        ["eventos", t("detail_events")],
        ["penaltis", t("detail_penalties")],
      ],
    })}
    <section class="tab-content" id="tab-resumen"></section>
    <section class="tab-content" id="tab-alineaciones" hidden></section>
    <section class="tab-content" id="tab-eventos" hidden></section>
    <section class="tab-content" id="tab-penaltis" hidden></section>
  `;

  bodyEl.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.onclick = () => {
      setCurrentTab(state, btn.dataset.tab);
      animatePillTabSelection(bodyEl, ".tab-btn", getCurrentTab(state), "tab", "active");
      updateTabVisibility(bodyEl, getCurrentTab(state));
    };
  });

  updateTabVisibility(bodyEl, getCurrentTab(state));
}
