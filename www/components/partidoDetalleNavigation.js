import { getViewStack } from "./partidoDetalleUtils.js";

/**
 * Notifica al coordinador global que el estado de overlays ha cambiado.
 *
 * @returns {void}
 */
export function syncMobileBackState() {
  try {
    window.dispatchEvent(new CustomEvent("app:overlay-state-changed"));
  } catch {}
}

/**
 * Actualiza el estado visual del botón de retroceso del modal.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @param {HTMLElement|null|undefined} modal Nodo raíz del modal.
 * @returns {void}
 */
export function updateChrome(state, modal) {
  const backBtn = modal?.querySelector(".partido-detalle-back");
  if (!backBtn) return;
  const hasTeamReturnContext = !!window.__teamDetailReturnContext?.equipo;
  const canGoBack = hasTeamReturnContext || !!state?.parentView || !!getViewStack(state).length;
  backBtn.hidden = !canGoBack;
  backBtn.disabled = !canGoBack;
}

/**
 * Fuerza el scroll del modal y del contenedor de contenido al inicio.
 *
 * @param {HTMLElement} bodyEl Contenedor principal del modal.
 * @returns {void}
 */
export function scrollDetalleToTop(bodyEl) {
  const modal = bodyEl?.closest?.(".partido-detalle-modal");
  const shellEl = modal?.querySelector?.(".partido-detalle-shell");
  if (shellEl) shellEl.scrollTop = 0;
  if (bodyEl) bodyEl.scrollTop = 0;
}

/**
 * Espera al siguiente frame de render del navegador.
 *
 * @returns {Promise<void>} Promesa resuelta en el siguiente requestAnimationFrame.
 */
export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Ejecuta la transición animada entre la vista principal del partido y una subvista.
 *
 * @param {HTMLElement} bodyEl Contenedor principal del modal.
 * @param {() => Promise<void>|void} mutateAndRender Callback que muta estado y relanza el render.
 * @param {string} [direction="forward"] Dirección visual de la transición.
 * @returns {Promise<void>} Promesa resuelta al finalizar la transición.
 */
export async function transitionDetalleView(bodyEl, mutateAndRender, direction = "forward") {
  if (!bodyEl) {
    await mutateAndRender();
    return;
  }

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduceMotion) {
    await mutateAndRender();
    return;
  }

  const activeView = bodyEl.firstElementChild;
  if (activeView) {
    activeView.classList.remove("subview-enter", "subview-enter-back");
    activeView.classList.add(direction === "back" ? "subview-leave-back" : "subview-leave");
    await new Promise((resolve) => window.setTimeout(resolve, 180));
  }

  await mutateAndRender();
  scrollDetalleToTop(bodyEl);
  await nextFrame();
  await nextFrame();

  const nextView = bodyEl.firstElementChild;
  if (nextView) {
    nextView.classList.remove("subview-leave", "subview-leave-back");
    nextView.classList.add(direction === "back" ? "subview-enter-back" : "subview-enter");
  }
}
import { bindDetailsAccordion } from "./accordion.js";

/**
 * Añade comportamiento animado a los acordeones de competiciones del jugador.
 *
 * @param {HTMLElement} rootEl Nodo raíz de la subvista de jugador.
 * @returns {void}
 */
export function bindPlayerAccordions(rootEl) {
  bindDetailsAccordion(rootEl, {
    itemSelector: ".partido-detalle-player-competition",
    triggerSelector: ".partido-detalle-player-competition-bar",
    contentSelector: ".partido-detalle-player-history-list",
    stateAttribute: "expanded",
    animationDurationOpen: 300,
    animationDurationClose: 300,
    exclusive: true,
  });
}
