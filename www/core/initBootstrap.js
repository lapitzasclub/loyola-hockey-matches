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
  const themeCycleBtn = document.getElementById("themeCycleBtn");
  const themeButtons = Array.from(document.querySelectorAll("[data-theme-option]"));
  const savedTheme = getTheme();

  const syncThemeUi = (value) => {
    if (themeSelect) themeSelect.value = value;
    if (!themeCycleBtn) return;
    themeCycleBtn.dataset.themeValue = value;
    themeCycleBtn.dataset.effectiveTheme = value === "auto" ? getSystemTheme() : value;
    themeButtons.forEach((button) => {
      const isActive = button.dataset.themeOption === value;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  if (themeSelect) {
    themeSelect.value = savedTheme;
    themeSelect.addEventListener("change", (event) => {
      const nextTheme = event.target.value;
      syncThemeUi(nextTheme);
      setTheme(nextTheme);
    });
  }

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTheme = button.dataset.themeOption;
      if (!nextTheme) return;

      const apply = () => {
        syncThemeUi(nextTheme);
        setTheme(nextTheme);
      };

      if (typeof document.startViewTransition === "function") {
        const rect = button.getBoundingClientRect();
        document.documentElement.style.setProperty("--theme-toggle-x", `${rect.left + rect.width / 2}px`);
        document.documentElement.style.setProperty("--theme-toggle-y", `${rect.top + rect.height / 2}px`);
        document.startViewTransition(apply);
        return;
      }

      apply();
    });
  });

  syncThemeUi(savedTheme);
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
  const langButtons = Array.from(document.querySelectorAll("[data-lang-option]"));
  if (!langSelect) return;

  const syncLangUi = (value) => {
    langSelect.value = value;
    langButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.langOption === value);
      button.setAttribute("aria-pressed", button.dataset.langOption === value ? "true" : "false");
    });
  };

  syncLangUi(getLang());
  langSelect.addEventListener("change", async (event) => {
    const nextLang = event.target.value;
    syncLangUi(nextLang);
    await handleLanguageChange(mobileBackCoordinator, nextLang, mostrarPartidosYClasificacion);
    syncLangUi(getLang());
  });

  langButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const nextLang = button.dataset.langOption;
      if (!nextLang || nextLang === langSelect.value) return;
      syncLangUi(nextLang);
      await handleLanguageChange(mobileBackCoordinator, nextLang, mostrarPartidosYClasificacion);
      syncLangUi(getLang());
    });
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
