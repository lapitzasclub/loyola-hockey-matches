import { resolveJugadorDetalle } from "./partidoDetalleJugadorData.js";
import { nextFrame, syncMobileBackState, transitionDetalleView } from "./partidoDetalleNavigation.js";
import { getCurrentView, pushView, setCurrentView } from "./partidoDetalleUtils.js";

/**
 * Enlaza los elementos interactivos que abren la subvista de jugador.
 *
 * @param {HTMLElement} rootEl Nodo raíz donde buscar enlaces de jugador.
 * @param {object} state Estado interno del detalle de partido.
 * @param {HTMLElement} headerEl Contenedor de cabecera del modal.
 * @param {(state: object, headerEl: HTMLElement, bodyEl: HTMLElement) => void} renderAll Render principal del modal.
 * @param {(state: object, headerEl: HTMLElement, bodyEl: HTMLElement, renderAll: Function) => Promise<void>} hydrateJugadorStats Hidratador de estadísticas globales del jugador.
 * @returns {void}
 */
export function bindPlayerLinks(rootEl, state, headerEl, renderAll, hydrateJugadorStats) {
  rootEl.querySelectorAll(".partido-detalle-player-link").forEach((btn) => {
    btn.onclick = async () => {
      let payload;
      try {
        payload = JSON.parse(btn.dataset.player || "null");
      } catch {
        payload = null;
      }

      state.selectedJugador = payload ? resolveJugadorDetalle(state, payload) : null;
      if (!state.selectedJugador) return;

      pushView(state, getCurrentView(state));
      state.selectedJugador.loading = true;
      const bodyEl = rootEl.closest("#partido-detalle-body") || rootEl;

      await transitionDetalleView(bodyEl, async () => {
        setCurrentView(state, "jugador");
        renderAll(state, headerEl, bodyEl);
      }, "forward");

      syncMobileBackState();
      await nextFrame();
      await nextFrame();
      await hydrateJugadorStats(state, headerEl, bodyEl, renderAll);
    };
  });
}
