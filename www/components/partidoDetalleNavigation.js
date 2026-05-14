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
  const canGoBack = !!getViewStack(state).length;
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

/**
 * Añade comportamiento animado a los acordeones de competiciones del jugador.
 *
 * @param {HTMLElement} rootEl Nodo raíz de la subvista de jugador.
 * @returns {void}
 */
export function bindPlayerAccordions(rootEl) {
  const accordionItems = Array.from(rootEl.querySelectorAll(".partido-detalle-player-competition"));

  function setExpandedState(detailsEl, expanded) {
    detailsEl.dataset.expanded = expanded ? "true" : "false";
  }

  function animateOpen(detailsEl, contentEl, reduceMotion) {
    detailsEl.dataset.animating = "true";
    setExpandedState(detailsEl, true);
    detailsEl.open = true;

    if (reduceMotion) {
      contentEl.style.height = "auto";
      contentEl.style.opacity = "1";
      contentEl.style.overflow = "visible";
      detailsEl.dataset.animating = "false";
      return;
    }

    const endHeight = `${contentEl.scrollHeight}px`;
    contentEl.getAnimations().forEach((animation) => animation.cancel());
    contentEl.style.overflow = "hidden";
    contentEl.style.height = "0px";
    contentEl.style.opacity = "0";

    const animation = contentEl.animate(
      [
        { height: "0px", opacity: 0 },
        { height: endHeight, opacity: 1 },
      ],
      {
        duration: 300,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );

    animation.onfinish = () => {
      contentEl.style.height = "auto";
      contentEl.style.opacity = "1";
      contentEl.style.overflow = "visible";
      detailsEl.dataset.animating = "false";
    };
    animation.oncancel = () => {
      detailsEl.dataset.animating = "false";
    };
  }

  function animateClose(detailsEl, contentEl, reduceMotion) {
    detailsEl.dataset.animating = "true";
    setExpandedState(detailsEl, false);
    detailsEl.open = false;

    if (reduceMotion) {
      contentEl.style.height = "0px";
      contentEl.style.opacity = "0";
      contentEl.style.overflow = "hidden";
      detailsEl.dataset.animating = "false";
      return;
    }

    const startHeight = `${contentEl.offsetHeight || contentEl.scrollHeight}px`;
    contentEl.getAnimations().forEach((animation) => animation.cancel());
    contentEl.style.overflow = "hidden";
    contentEl.style.height = startHeight;
    contentEl.style.opacity = "1";

    const animation = contentEl.animate(
      [
        { height: startHeight, opacity: 1 },
        { height: "0px", opacity: 0 },
      ],
      {
        duration: 300,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );

    animation.onfinish = () => {
      contentEl.style.height = "0px";
      contentEl.style.opacity = "0";
      contentEl.style.overflow = "hidden";
      detailsEl.dataset.animating = "false";
    };
    animation.oncancel = () => {
      detailsEl.dataset.animating = "false";
    };
  }

  accordionItems.forEach((detailsEl) => {
    if (detailsEl.dataset.accordionBound === "true") return;
    detailsEl.dataset.accordionBound = "true";

    const summaryEl = detailsEl.querySelector(".partido-detalle-player-competition-bar");
    const contentEl = detailsEl.querySelector(".partido-detalle-player-history-list");
    if (!summaryEl || !contentEl) return;

    setExpandedState(detailsEl, detailsEl.open);
    if (detailsEl.open) {
      contentEl.style.height = "auto";
      contentEl.style.opacity = "1";
      contentEl.style.overflow = "visible";
    } else {
      contentEl.style.height = "0px";
      contentEl.style.opacity = "0";
      contentEl.style.overflow = "hidden";
    }

    summaryEl.addEventListener("click", (event) => {
      event.preventDefault();
      if (detailsEl.dataset.animating === "true") return;

      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const isOpening = !detailsEl.open;

      if (isOpening) {
        accordionItems.forEach((item) => {
          if (item === detailsEl) return;
          const siblingContent = item.querySelector(".partido-detalle-player-history-list");
          if (!siblingContent || !item.open) return;
          animateClose(item, siblingContent, reduceMotion);
        });
        animateOpen(detailsEl, contentEl, reduceMotion);
      } else {
        animateClose(detailsEl, contentEl, reduceMotion);
      }
    });
  });
}
