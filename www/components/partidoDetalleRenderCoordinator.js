import { renderAlineaciones } from "./partidoDetalleAlineaciones.js";
import { renderEventos } from "./partidoDetalleEventos.js";
import {
  renderDetalleSkeleton,
  renderPartidoHeader,
  renderPartidoHeaderSkeleton,
  renderPenaltis,
  renderResumen,
  updateTabVisibility,
} from "./partidoDetalleRender.js";
import { ensureBaseLayout } from "./partidoDetalleTabs.js";
import { getCurrentTab, getCurrentView } from "./partidoDetalleUtils.js";
import { bindPlayerAccordions, scrollDetalleToTop, updateChrome } from "./partidoDetalleNavigation.js";

/**
 * Re-renderiza el estado completo del modal, cabecera incluida.
 * Decide si mostrar la vista del partido o la subvista de jugador.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @param {HTMLElement} headerEl Contenedor de cabecera del modal.
 * @param {HTMLElement} bodyEl Contenedor principal de contenido del modal.
 * @param {(headerEl: HTMLElement, html: string, reason?: string) => void} setHeaderContent Helper para actualizar cabecera.
 * @param {(state: object) => string} renderSubview Renderer de subviews secundarias.
 * @param {(state: object) => string} renderJugadorHeader Renderer específico de cabecera de jugador.
 * @param {(rootEl: HTMLElement, state: object, headerEl: HTMLElement, renderAll: Function, hydrateJugadorStats: Function) => void} bindPlayerLinks Binder de enlaces de jugador.
 * @param {Function} hydrateJugadorStats Hidratador de estadísticas globales del jugador.
 * @param {Function} renderAll Referencia al propio coordinador para callbacks recursivos.
 * @returns {void}
 */
export function renderAll(
  state,
  headerEl,
  bodyEl,
  setHeaderContent,
  renderSubview,
  renderJugadorHeader,
  bindPlayerLinks,
  hydrateJugadorStats,
  renderAll,
) {
  const modal = bodyEl.closest(".partido-detalle-modal");
  updateChrome(state, modal);

  if (state.partido) {
    const headerHtml = getCurrentView(state) === "jugador" ? renderJugadorHeader(state) : renderPartidoHeader(state);
    setHeaderContent(headerEl, headerHtml, "renderAll");
  } else if (getCurrentView(state) === "partido" && state.loadingMatch) {
    setHeaderContent(headerEl, renderPartidoHeaderSkeleton(), "renderAll-skeleton");
  }

  if (getCurrentView(state) !== "partido") {
    bodyEl.innerHTML = renderSubview(state);
    bindPlayerLinks(bodyEl, state, headerEl, renderAll, hydrateJugadorStats);
    bindPlayerAccordions(bodyEl);
    return;
  }

  if (!bodyEl.querySelector("#tab-resumen")) {
    ensureBaseLayout(bodyEl, state);
    scrollDetalleToTop(bodyEl);
  }

  if (state.loadingMatch && !state.partido) {
    renderDetalleSkeleton(bodyEl);
    return;
  }

  bodyEl.querySelector("#tab-resumen").innerHTML = renderResumen(state);
  bodyEl.querySelector("#tab-alineaciones").innerHTML = renderAlineaciones(state);
  bodyEl.querySelector("#tab-eventos").innerHTML = renderEventos(state);
  bodyEl.querySelector("#tab-penaltis").innerHTML = renderPenaltis(state);
  updateTabVisibility(bodyEl, getCurrentTab(state));
  bindPlayerLinks(bodyEl, state, headerEl, renderAll, hydrateJugadorStats);
}
