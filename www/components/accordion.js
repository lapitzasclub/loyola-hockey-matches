/**
 * Devuelve si el usuario prefiere reducir animaciones.
 *
 * @returns {boolean}
 */
function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

/**
 * Sincroniza el estado expandido visual de un acordeón basado en details.
 *
 * @param {HTMLDetailsElement} detailsEl
 * @param {HTMLElement} contentEl
 * @param {boolean} expanded
 * @param {{ expandedClass?: string, stateAttribute?: string, collapsedOverflow?: string, expandedOverflow?: string }} options
 */
function setExpandedState(detailsEl, contentEl, expanded, options = {}) {
  const {
    expandedClass = "is-expanded",
    stateAttribute,
    collapsedOverflow = "hidden",
    expandedOverflow = "visible",
  } = options;

  detailsEl.open = expanded;
  if (expandedClass) {
    detailsEl.classList.toggle(expandedClass, expanded);
  }
  if (stateAttribute) {
    detailsEl.dataset[stateAttribute] = expanded ? "true" : "false";
  }
  contentEl.style.height = expanded ? "auto" : "0px";
  contentEl.style.opacity = expanded ? "1" : "0";
  contentEl.style.overflow = expanded ? expandedOverflow : collapsedOverflow;
}

/**
 * Anima la apertura/cierre de un acordeón details reutilizable.
 *
 * @param {HTMLElement} rootEl
 * @param {{
 *  itemSelector: string,
 *  triggerSelector: string,
 *  contentSelector: string,
 *  expandedClass?: string,
 *  stateAttribute?: string,
 *  busyAttribute?: string,
 *  animationDurationOpen?: number,
 *  animationDurationClose?: number,
 *  easing?: string,
 *  exclusive?: boolean,
 *  collapsedOverflow?: string,
 *  expandedOverflow?: string,
 *  onBeforeOpen?: (detailsEl: HTMLDetailsElement) => void,
 *  onAfterOpen?: (detailsEl: HTMLDetailsElement) => void,
 *  onAfterClose?: (detailsEl: HTMLDetailsElement) => void,
 * }} config
 */
export function bindDetailsAccordion(rootEl, config) {
  const {
    itemSelector,
    triggerSelector,
    contentSelector,
    expandedClass = "is-expanded",
    stateAttribute,
    busyAttribute = "accordionBusy",
    animationDurationOpen = 300,
    animationDurationClose = 280,
    easing = "cubic-bezier(0.22, 1, 0.36, 1)",
    exclusive = true,
    collapsedOverflow = "hidden",
    expandedOverflow = "visible",
    onBeforeOpen,
    onAfterOpen,
    onAfterClose,
  } = config;

  const items = Array.from(rootEl.querySelectorAll(itemSelector));
  const reduceMotion = prefersReducedMotion();

  function sync(detailsEl, contentEl, expanded) {
    setExpandedState(detailsEl, contentEl, expanded, {
      expandedClass,
      stateAttribute,
      collapsedOverflow,
      expandedOverflow,
    });
  }

  function animate(detailsEl, contentEl, expanded) {
    const runningAnimation = detailsEl._accordionAnimation;
    if (runningAnimation) runningAnimation.cancel();

    if (reduceMotion) {
      sync(detailsEl, contentEl, expanded);
      if (expanded) onAfterOpen?.(detailsEl);
      else onAfterClose?.(detailsEl);
      return Promise.resolve();
    }

    if (expanded) {
      detailsEl.open = true;
      if (expandedClass) detailsEl.classList.add(expandedClass);
      if (stateAttribute) detailsEl.dataset[stateAttribute] = "true";
      onBeforeOpen?.(detailsEl);
      const endHeight = `${contentEl.scrollHeight}px`;
      contentEl.style.overflow = collapsedOverflow;
      contentEl.style.height = "0px";
      contentEl.style.opacity = "0";

      return new Promise((resolve) => {
        const animation = contentEl.animate(
          [
            { height: "0px", opacity: 0 },
            { height: endHeight, opacity: 1 },
          ],
          {
            duration: animationDurationOpen,
            easing,
            fill: "forwards",
          },
        );

        detailsEl._accordionAnimation = animation;
        animation.onfinish = () => {
          sync(detailsEl, contentEl, true);
          detailsEl._accordionAnimation = null;
          onAfterOpen?.(detailsEl);
          resolve();
        };
        animation.oncancel = () => {
          detailsEl._accordionAnimation = null;
          resolve();
        };
      });
    }

    const startHeight = `${contentEl.offsetHeight || contentEl.scrollHeight}px`;
    detailsEl.open = true;
    if (expandedClass) detailsEl.classList.remove(expandedClass);
    if (stateAttribute) detailsEl.dataset[stateAttribute] = "false";
    contentEl.style.overflow = collapsedOverflow;
    contentEl.style.height = startHeight;
    contentEl.style.opacity = "1";

    return new Promise((resolve) => {
      const animation = contentEl.animate(
        [
          { height: startHeight, opacity: 1 },
          { height: "0px", opacity: 0 },
        ],
        {
          duration: animationDurationClose,
          easing,
          fill: "forwards",
        },
      );

      detailsEl._accordionAnimation = animation;
      animation.onfinish = () => {
        sync(detailsEl, contentEl, false);
        detailsEl._accordionAnimation = null;
        onAfterClose?.(detailsEl);
        resolve();
      };
      animation.oncancel = () => {
        detailsEl._accordionAnimation = null;
        resolve();
      };
    });
  }

  items.forEach((detailsEl) => {
    if (detailsEl.dataset.accordionBound === "true") return;
    detailsEl.dataset.accordionBound = "true";

    const triggerEl = detailsEl.querySelector(triggerSelector);
    const contentEl = detailsEl.querySelector(contentSelector);
    if (!triggerEl || !contentEl) return;

    sync(detailsEl, contentEl, detailsEl.open);

    triggerEl.addEventListener("click", async (event) => {
      event.preventDefault();
      if (rootEl.dataset[busyAttribute] === "true") return;

      const isOpening = !detailsEl.open;
      rootEl.dataset[busyAttribute] = "true";

      if (isOpening && exclusive) {
        const openedItems = items.filter((item) => item !== detailsEl && item.open);
        for (const openedItem of openedItems) {
          const openedContent = openedItem.querySelector(contentSelector);
          if (!openedContent) continue;
          await animate(openedItem, openedContent, false);
        }
      }

      await animate(detailsEl, contentEl, isOpening);
      rootEl.dataset[busyAttribute] = "false";
    });
  });
}
