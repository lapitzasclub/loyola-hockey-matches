import { getLang } from "../i18n.js";
import { getSystemTheme, getTheme, setTheme } from "../theme.js";
import { scheduleApplySystemBars } from "../systemBars.js";

/**
 * Inicializa el selector de tema y aplica el tema efectivo actual.
 *
 * @param {(theme: string) => void} applyTheme Aplicador de tema final.
 * @returns {void}
 */
export function initThemeControls(applyTheme) {
  const themeSelect = document.getElementById("themeSelect");
  const savedTheme = getTheme();

  if (themeSelect) {
    themeSelect.value = savedTheme;
    themeSelect.addEventListener("change", (event) => setTheme(event.target.value));
  }

  applyTheme(savedTheme === "auto" ? getSystemTheme() : savedTheme);
  scheduleApplySystemBars(1);
}

/**
 * Inicializa el selector de idioma y su binding de cambio.
 *
 * @param {object} mobileBackCoordinator Coordinador de botón atrás y overlays.
 * @param {(coordinator: object, lang: string, render: Function) => Promise<void>} handleLanguageChange Handler de cambio de idioma.
 * @param {Function} mostrarPartidosYClasificacion Callback principal de refresco.
 * @returns {void}
 */
export function initLanguageControls(mobileBackCoordinator, handleLanguageChange, mostrarPartidosYClasificacion) {
  const langSelect = document.getElementById("langSelect");
  if (!langSelect) return;

  langSelect.value = getLang();
  langSelect.addEventListener("change", async (event) => {
    await handleLanguageChange(mobileBackCoordinator, event.target.value, mostrarPartidosYClasificacion);
  });
}

/**
 * Enlaza el comportamiento de apertura y cierre del menú lateral.
 *
 * @param {object} mobileBackCoordinator Coordinador de botón atrás y overlays.
 * @returns {void}
 */
export function initSideMenuControls(mobileBackCoordinator) {
  const menuBtn = document.getElementById("menuBtn");
  const sideMenu = document.getElementById("sideMenu");
  const sideMenuOverlay = document.getElementById("sideMenuOverlay");
  const sideMenuCloseBtn = document.getElementById("sideMenuCloseBtn");

  if (!menuBtn || !sideMenu || !sideMenuOverlay) return;

  menuBtn.addEventListener("click", () => {
    sideMenu.classList.add("open");
    sideMenuOverlay.classList.add("open");
    mobileBackCoordinator.syncHistory();
  });

  sideMenuOverlay.addEventListener("click", () => {
    mobileBackCoordinator.closeSideMenu();
    mobileBackCoordinator.syncHistory();
  });

  sideMenuCloseBtn?.addEventListener("click", () => {
    mobileBackCoordinator.closeSideMenu();
    mobileBackCoordinator.syncHistory();
  });
}

/**
 * Garantiza la existencia del selector oculto usado por el flujo de equipos.
 *
 * @returns {HTMLSelectElement|null} Nodo select existente o recién creado.
 */
export function ensureHiddenTeamSelector() {
  let selector = document.getElementById("equipoLoyolaSelect");
  if (selector) {
    return /** @type {HTMLSelectElement} */ (selector);
  }

  selector = document.createElement("select");
  selector.id = "equipoLoyolaSelect";
  selector.className = "equipo-loyola-select";
  selector.hidden = true;
  const menu = document.getElementById("sideMenu") || document.body;
  menu.appendChild(selector);
  return selector;
}
