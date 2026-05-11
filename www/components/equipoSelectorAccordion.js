/**
 * Indica si el usuario prefiere reducir animaciones.
 *
 * @returns {boolean} True cuando debe minimizarse el movimiento.
 */
function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

/**
 * Obtiene el contenedor real de scroll del selector.
 *
 * @returns {HTMLElement|null} Contenedor scrollable principal.
 */
function getTeamSelectorScrollHost() {
  return document.querySelector("main");
}

/**
 * Hace scroll suave hasta el grupo indicado dentro del contenedor principal.
 *
 * @param {HTMLElement} detailsEl Grupo objetivo.
 * @param {boolean} [animated=true] Indica si debe animarse el scroll.
 * @returns {void}
 */
function scrollGroupIntoView(detailsEl, animated = true) {
  const scrollHost = getTeamSelectorScrollHost();
  if (!scrollHost) return;

  const topOffset = 10;
  const detailsRect = detailsEl.getBoundingClientRect();
  const hostRect = scrollHost.getBoundingClientRect();
  const targetTop = Math.max(scrollHost.scrollTop + (detailsRect.top - hostRect.top) - topOffset, 0);

  scrollHost.scrollTo({
    top: targetTop,
    behavior: animated && !prefersReducedMotion() ? "smooth" : "auto",
  });
}

/**
 * Sincroniza el estado visual expandido/colapsado de un grupo.
 *
 * @param {HTMLDetailsElement} detailsEl Nodo details del grupo.
 * @param {HTMLElement} contentEl Contenedor interno animable.
 * @param {boolean} expanded Estado deseado.
 * @returns {void}
 */
function setAccordionExpandedState(detailsEl, contentEl, expanded) {
  detailsEl.open = expanded;
  detailsEl.classList.toggle("is-expanded", expanded);
  contentEl.style.height = expanded ? "auto" : "0px";
  contentEl.style.opacity = expanded ? "1" : "0";
  contentEl.style.overflow = expanded ? "visible" : "hidden";
}

/**
 * Colapsa un grupo del selector con animación si procede.
 *
 * @param {HTMLDetailsElement} detailsEl Grupo a colapsar.
 * @returns {Promise<void>} Promesa resuelta al finalizar el colapso.
 */
function collapseAccordionItem(detailsEl) {
  const contentEl = detailsEl.querySelector(".team-selector-group-content");
  if (!contentEl || !detailsEl.open) return Promise.resolve();

  const runningAnimation = detailsEl._accordionAnimation;
  if (runningAnimation) runningAnimation.cancel();

  detailsEl.classList.remove("is-expanded");

  if (prefersReducedMotion()) {
    setAccordionExpandedState(detailsEl, contentEl, false);
    return Promise.resolve();
  }

  const startHeight = `${contentEl.offsetHeight || contentEl.scrollHeight}px`;
  contentEl.style.overflow = "hidden";
  contentEl.style.height = startHeight;
  contentEl.style.opacity = "1";

  return new Promise((resolve) => {
    const animation = contentEl.animate(
      [
        { height: startHeight, opacity: 1 },
        { height: "0px", opacity: 0 },
      ],
      {
        duration: 260,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );

    detailsEl._accordionAnimation = animation;
    animation.onfinish = () => {
      setAccordionExpandedState(detailsEl, contentEl, false);
      detailsEl._accordionAnimation = null;
      resolve();
    };
    animation.oncancel = () => {
      detailsEl._accordionAnimation = null;
      resolve();
    };
  });
}

/**
 * Expande un grupo del selector con animación si procede.
 *
 * @param {HTMLDetailsElement} detailsEl Grupo a expandir.
 * @returns {Promise<void>} Promesa resuelta al finalizar la expansión.
 */
function expandAccordionItem(detailsEl) {
  const contentEl = detailsEl.querySelector(".team-selector-group-content");
  if (!contentEl) return Promise.resolve();

  const runningAnimation = detailsEl._accordionAnimation;
  if (runningAnimation) runningAnimation.cancel();

  detailsEl.open = true;
  detailsEl.classList.add("is-expanded");
  scrollGroupIntoView(detailsEl, true);

  if (prefersReducedMotion()) {
    setAccordionExpandedState(detailsEl, contentEl, true);
    return Promise.resolve();
  }

  const endHeight = `${contentEl.scrollHeight}px`;
  contentEl.style.overflow = "hidden";
  contentEl.style.height = "0px";
  contentEl.style.opacity = "0";

  return new Promise((resolve) => {
    const animation = contentEl.animate(
      [
        { height: "0px", opacity: 0 },
        { height: endHeight, opacity: 1 },
      ],
      {
        duration: 320,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );

    detailsEl._accordionAnimation = animation;
    animation.onfinish = () => {
      setAccordionExpandedState(detailsEl, contentEl, true);
      detailsEl._accordionAnimation = null;
      resolve();
    };
    animation.oncancel = () => {
      detailsEl._accordionAnimation = null;
      resolve();
    };
  });
}

/**
 * Conecta el comportamiento de acordeón exclusivo del selector de equipo.
 *
 * @param {HTMLElement} container Contenedor raíz del selector.
 * @returns {void}
 */
export function bindTeamSelectorAccordions(container) {
  const accordionItems = Array.from(container.querySelectorAll(".team-selector-group"));

  accordionItems.forEach((detailsEl) => {
    if (detailsEl.dataset.accordionBound === "true") return;
    detailsEl.dataset.accordionBound = "true";

    const summaryEl = detailsEl.querySelector(".team-selector-group-summary");
    const contentEl = detailsEl.querySelector(".team-selector-group-content");
    if (!summaryEl || !contentEl) return;

    setAccordionExpandedState(detailsEl, contentEl, detailsEl.open);

    summaryEl.addEventListener("click", async (event) => {
      event.preventDefault();
      if (container.dataset.accordionBusy === "true") return;

      const isOpening = !detailsEl.open;
      if (!isOpening) {
        container.dataset.accordionBusy = "true";
        await collapseAccordionItem(detailsEl);
        container.dataset.accordionBusy = "false";
        return;
      }

      container.dataset.accordionBusy = "true";
      const openedItem = accordionItems.find((itemEl) => itemEl !== detailsEl && itemEl.open);
      if (openedItem) {
        await collapseAccordionItem(openedItem);
      }
      await expandAccordionItem(detailsEl);
      container.dataset.accordionBusy = "false";
    });
  });
}
