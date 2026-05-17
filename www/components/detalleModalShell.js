import { syncMobileBackState } from "./partidoDetalleNavigation.js";

export function mountDetalleModalShell(options = {}) {
  const {
    rootClassName = "partido-detalle-modal",
    shellClassName = "partido-detalle-shell",
    headerClassName = "partido-detalle-header",
    bodyClassName = "partido-detalle-body",
    headerContentClassName = "partido-detalle-header-content",
    showBack = true,
    showClose = true,
    backAriaLabel = "Volver",
    closeAriaLabel = "Cerrar",
    contentIdPrefix = "detalle-modal",
    instantOpen = false,
  } = options;

  const modal = document.createElement("div");
  modal.className = rootClassName;
  modal.innerHTML = `
    <div class="${shellClassName}">
      <div class="partido-detalle-grabber"></div>
      <div class="${headerClassName}">
        ${showBack ? `<button class="partido-detalle-back" aria-label="${backAriaLabel}" hidden disabled>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M15.5 5 8.5 12l7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>` : ""}
        <div class="${headerContentClassName}" id="${contentIdPrefix}-header-content"></div>
        ${showClose ? `<button class="partido-detalle-close" aria-label="${closeAriaLabel}">&times;</button>` : ""}
      </div>
      <div class="${bodyClassName}" id="${contentIdPrefix}-body"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const shellEl = modal.querySelector(`.${shellClassName}`);
  const bodyEl = modal.querySelector(`#${contentIdPrefix}-body`);
  if (shellEl) shellEl.scrollTop = 0;
  if (bodyEl) bodyEl.scrollTop = 0;

  if (instantOpen) {
    modal.classList.add("is-open");
  } else {
    requestAnimationFrame(() => modal.classList.add("is-open"));
  }

  document.body.classList.add("modal-abierto");
  syncMobileBackState();

  return {
    modal,
    headerEl: modal.querySelector(`#${contentIdPrefix}-header-content`),
    bodyEl,
    backBtn: modal.querySelector(".partido-detalle-back"),
    closeBtn: modal.querySelector(".partido-detalle-close"),
  };
}
