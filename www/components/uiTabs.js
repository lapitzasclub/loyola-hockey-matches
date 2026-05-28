import { escapeHtml } from "./partidoDetalleUtils.js";

export const TAB_ACTIVATE_MS = 400;
export const TAB_CONTENT_MS = 180;

/**
 * Renderiza un grupo reutilizable de pestañas tipo pill.
 *
 * @param {object} options Configuración del grupo.
 * @param {string} options.className Clase raíz del contenedor.
 * @param {string} options.buttonClassName Clase base de los botones.
 * @param {string} options.activeClassName Clase para el botón activo.
 * @param {string} options.dataAttr Nombre del data-attribute sin prefijo data-, por ejemplo `tab`.
 * @param {string} options.ariaLabel Etiqueta accesible del tablist.
 * @param {string} options.activeTab ID activo.
 * @param {Array<[string, string]>} options.tabs Lista de tabs [key, label].
 * @returns {string} HTML del tablist.
 */
export function renderPillTabs({
  className,
  buttonClassName,
  activeClassName,
  dataAttr,
  ariaLabel,
  activeTab,
  tabs,
}) {
  return `
    <div class="${escapeHtml(className)}" role="tablist" aria-label="${escapeHtml(ariaLabel)}">
      ${tabs.map(([key, label]) => `
        <button
          type="button"
          class="${escapeHtml(buttonClassName)}${activeTab === key ? ` ${escapeHtml(activeClassName)}` : ""}"
          data-${escapeHtml(dataAttr)}="${escapeHtml(key)}"
          aria-selected="${activeTab === key ? "true" : "false"}"
        >${escapeHtml(label)}</button>
      `).join("")}
    </div>
  `;
}

/**
 * Anima el cambio visual del botón activo dentro de un tablist común.
 *
 * @param {ParentNode} root Nodo raíz que contiene los tabs.
 * @param {string} buttonSelector Selector de los botones.
 * @param {string} activeKey Clave de tab activa.
 * @param {string} dataAttr Nombre del data-attribute sin prefijo `data-`.
 * @param {string} [activeClassName="active"] Clase del estado activo.
 * @param {{ animate?: boolean }} [options={}] Opciones de animación.
 * @returns {void}
 */
export function animatePillTabSelection(root, buttonSelector, activeKey, dataAttr, activeClassName = "active", options = {}) {
  const { animate = true } = options;
  root.querySelectorAll(buttonSelector).forEach((btn) => {
    const isActive = btn.getAttribute(`data-${dataAttr}`) === activeKey;
    btn.classList.toggle(activeClassName, isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
    btn.classList.remove("is-activating");

    if (isActive && animate) {
      void btn.offsetWidth;
      btn.classList.add("is-activating");
      window.setTimeout(() => btn.classList.remove("is-activating"), TAB_ACTIVATE_MS);
    }
  });
}

/**
 * Ejecuta una transición común de contenido al cambiar de tab.
 *
 * @param {HTMLElement} container Contenedor raíz desde el que resolver el nodo animado.
 * @param {() => void} renderNext Callback que aplica el siguiente render.
 * @param {(container: HTMLElement) => HTMLElement | null} [resolveAnimatedNode=null] Resolver opcional del nodo que recibe las clases `is-entering/is-leaving`.
 * @returns {void}
 */
export function animateTabContentSwap(container, renderNext, resolveAnimatedNode = null) {
  if (!(container instanceof HTMLElement)) {
    renderNext();
    return;
  }

  const leavingNode = typeof resolveAnimatedNode === "function" ? (resolveAnimatedNode(container) || container) : container;
  leavingNode.classList.remove("is-entering", "is-leaving");
  void leavingNode.offsetWidth;
  leavingNode.classList.add("is-leaving");

  window.setTimeout(() => {
    renderNext();
    const enteringNode = typeof resolveAnimatedNode === "function" ? (resolveAnimatedNode(container) || container) : container;
    leavingNode.classList.remove("is-leaving");
    enteringNode.classList.remove("is-entering", "is-leaving");
    void enteringNode.offsetWidth;
    enteringNode.classList.add("is-entering");
    window.setTimeout(() => enteringNode.classList.remove("is-entering"), TAB_CONTENT_MS);
  }, TAB_CONTENT_MS);
}
