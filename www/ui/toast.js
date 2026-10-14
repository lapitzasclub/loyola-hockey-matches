// toast.js
// Avisos no bloqueantes (nivel "blando/informativo"): se muestran sobre el
// bottom-nav, no sustituyen contenido y se autodescartan solos.

const MAX_VISIBLE = 2;
const ICON_PATHS = {
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
};

let stack = null;

function ensureStack() {
  if (stack && document.body.contains(stack)) return stack;
  stack = document.createElement("div");
  stack.id = "toastStack";
  stack.className = "toast-stack";
  stack.setAttribute("aria-live", "polite");
  document.body.appendChild(stack);
  return stack;
}

/**
 * Muestra un aviso flotante no bloqueante que se autodescarta solo.
 * No sustituye ningún contenido existente en pantalla.
 *
 * @param {string} message Texto del aviso, ya traducido por el llamador.
 * @param {{variant?: "info"|"warning", duration?: number}} [options]
 * @returns {void}
 */
export function showToast(message, { variant = "info", duration = 3500 } = {}) {
  const container = ensureStack();

  while (container.children.length >= MAX_VISIBLE) {
    container.firstElementChild?.remove();
  }

  const toast = document.createElement("div");
  toast.className = `toast${variant === "warning" ? " toast-warning" : ""}`;
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${ICON_PATHS[variant] || ICON_PATHS.info}</span>
    <span class="toast-message"></span>
  `;
  const messageEl = toast.querySelector(".toast-message");
  if (messageEl) messageEl.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("is-visible"));

  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 260);
  }, duration);
}
