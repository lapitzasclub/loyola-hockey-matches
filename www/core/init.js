import { setupNavigation } from "./navigation.js";
import { setupPullToRefresh } from "./pullToRefresh.js";
import { cargarSelectorEquiposLoyola, getEquiposLoyola, getEquipoSeleccionado } from "../state/equipos.js";
import { setCompeticionHeader } from "./header.js";
import { mostrarPantallaErrorGlobal } from "../state/errorOverlay.js";
import { renderPartidos, renderClasificacion } from "../components/ui.js";
import { preloadPartidoDetalleModule } from "../components/partidos.js";
import { getLang, setLang, t, updateTexts } from "../i18n.js";
import { applyTheme, getSystemTheme, getTheme, listenSystemScheme, setTheme } from "../theme.js";
import { observeThemeAttribute, scheduleApplySystemBars } from "../systemBars.js";
import { getClasificacionLiga, getCalendarioLoyola } from "../services.js";
import { isNative } from "../utils/env.js";

/**
 * Programa la precarga diferida del módulo pesado del detalle de partido.
 *
 * @returns {void}
 */
function scheduleDetalleWarmup() {
  const warm = () => {
    void preloadPartidoDetalleModule();
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(warm, { timeout: 1200 });
    return;
  }

  window.setTimeout(warm, 250);
}

/**
 * Crea el coordinador ligero del botón atrás para web y entorno nativo.
 * Gestiona side menu, detalle de partido y subvista de jugador.
 *
 * @returns {{install: () => void, syncHistory: () => void, closeSideMenu: () => void}}
 */
function createMobileBackCoordinator() {
  let installed = false;
  let handlingBack = false;
  let hasOverlayState = false;

  /**
   * Indica si el menú lateral está visible.
   *
   * @returns {boolean} True cuando el side menu está abierto.
   */
  function isSideMenuOpen() {
    return !!document.getElementById("sideMenu")?.classList.contains("open");
  }

  /**
   * Indica si el modal de detalle de partido está abierto.
   *
   * @returns {boolean} True cuando existe el modal en DOM.
   */
  function isPartidoDetalleOpen() {
    return !!document.querySelector(".partido-detalle-modal");
  }

  /**
   * Indica si la subvista de jugador está activa dentro del detalle.
   *
   * @returns {boolean} True cuando la navegación interna apunta a jugador.
   */
  function isJugadorDetalleOpen() {
    return window.__partidoDetalleState && window.__partidoDetalleState.navigation?.currentView === "jugador";
  }

  /**
   * Cierra el menú lateral y su overlay asociado.
   *
   * @returns {void}
   */
  function closeSideMenu() {
    document.getElementById("sideMenu")?.classList.remove("open");
    document.getElementById("sideMenuOverlay")?.classList.remove("open");
  }

  /**
   * Ejecuta la acción de retroceso priorizando overlays antes que navegación global.
   *
   * @returns {Promise<boolean>} True si la pulsación quedó consumida.
   */
  async function handleBackAction() {
    if (isSideMenuOpen()) {
      closeSideMenu();
      return true;
    }

    if (isJugadorDetalleOpen()) {
      document.querySelector(".partido-detalle-back")?.click();
      return true;
    }

    if (isPartidoDetalleOpen()) {
      document.querySelector(".partido-detalle-close")?.click();
      return true;
    }

    return false;
  }

  /**
   * Calcula si el estado actual necesita interceptar el botón atrás.
   *
   * @returns {boolean} True cuando hay overlays activos.
   */
  function computeNeedsOverlayState() {
    return isSideMenuOpen() || isPartidoDetalleOpen();
  }

  /**
   * Sincroniza una entrada de historial sintética para cerrar overlays con back web.
   *
   * @returns {void}
   */
  function syncHistory() {
    if (isNative()) return;
    const needsOverlayState = computeNeedsOverlayState();
    if (needsOverlayState && !hasOverlayState) {
      history.pushState({ appOverlayBack: true }, "");
      hasOverlayState = true;
      return;
    }
    if (!needsOverlayState && hasOverlayState) {
      hasOverlayState = false;
    }
  }

  /**
   * Consume una acción de retroceso si hay UI superpuesta que deba cerrarse primero.
   *
   * @returns {Promise<boolean>} True si la acción fue absorbida por la app.
   */
  async function consumeBack() {
    if (handlingBack) return true;
    if (!computeNeedsOverlayState()) return false;
    handlingBack = true;
    try {
      return await handleBackAction();
    } finally {
      hasOverlayState = false;
      handlingBack = false;
      if (computeNeedsOverlayState()) syncHistory();
    }
  }

  /**
   * Conecta el botón atrás nativo de Capacitor con la lógica de overlays.
   *
   * @returns {void}
   */
  function installCapacitorBackButton() {
    const App = window.Capacitor?.Plugins?.App;
    if (!App?.addListener) return;
    App.addListener("backButton", async ({ canGoBack }) => {
      const handled = await consumeBack();
      if (handled) return;
      if (canGoBack) {
        window.history.back();
        return;
      }
      App.exitApp?.();
    });
  }

  /**
   * Conecta el evento `popstate` del navegador con la lógica de overlays.
   *
   * @returns {void}
   */
  function installWebBackHandler() {
    window.addEventListener("popstate", async () => {
      await consumeBack();
    });
  }

  /**
   * Instala una única vez los listeners globales necesarios para el back coordinator.
   *
   * @returns {void}
   */
  function install() {
    if (installed) return;
    installed = true;

    window.addEventListener("app:overlay-state-changed", () => {
      if (handlingBack) return;
      syncHistory();
    });

    if (isNative()) {
      installCapacitorBackButton();
    } else {
      installWebBackHandler();
    }
  }

  return { install, syncHistory, closeSideMenu };
}

/**
 * Inicializa la aplicación: tema, idioma, navegación, selector y primera carga.
 *
 * @returns {Promise<void>} Promesa resuelta cuando termina el arranque principal.
 */
export async function initApp() {
  try {
    const mobileBackCoordinator = createMobileBackCoordinator();
    mobileBackCoordinator.install();

    const themeSelect = document.getElementById("themeSelect");
    const savedTheme = getTheme();
    if (themeSelect) {
      themeSelect.value = savedTheme;
      themeSelect.addEventListener("change", (e) => setTheme(e.target.value));
    }
    applyTheme(savedTheme === "auto" ? getSystemTheme() : savedTheme);
    scheduleApplySystemBars(1);
    listenSystemScheme();
    observeThemeAttribute();
    window.addEventListener("load", () => scheduleApplySystemBars(1));
    updateTexts();
    scheduleDetalleWarmup();
    const langSelect = document.getElementById("langSelect");
    if (langSelect) {
      langSelect.value = getLang();
      langSelect.addEventListener("change", async (e) => {
        setLang(e.target.value);
        updateTexts();
        const navClas = document.getElementById("navClas");
        if (navClas && navClas.classList.contains("active")) {
          const matchesList = document.getElementById("matches");
          matchesList.innerHTML = `<li>${t("loading")}</li>`;
          if (!getEquipoSeleccionado()) {
            matchesList.innerHTML = `<li>Selecciona un equipo Loyola</li>`;
            setCompeticionHeader("");
            return;
          }
          const [idComp] = getEquipoSeleccionado().split("|");
          const eq = getEquiposLoyola().find((e) => e.idCompeticion == idComp);
          setCompeticionHeader(eq?.nombreCompeticion || "");
          try {
            const raw = await getClasificacionLiga(idComp);
            matchesList.innerHTML = "";
            renderClasificacion(matchesList, raw);
          } catch (e) {
            matchesList.innerHTML = `<li>${t("error", e?.message || String(e))}</li>`;
          }
        } else {
          await mostrarPartidosYClasificacion();
        }
      });
    }
    setupNavigation(mostrarPartidosYClasificacion);
    setupPullToRefresh(mostrarPartidosYClasificacion);

    const menuBtn = document.getElementById("menuBtn");
    const sideMenu = document.getElementById("sideMenu");
    const sideMenuOverlay = document.getElementById("sideMenuOverlay");
    if (menuBtn && sideMenu && sideMenuOverlay) {
      menuBtn.addEventListener("click", () => {
        sideMenu.classList.add("open");
        sideMenuOverlay.classList.add("open");
        mobileBackCoordinator.syncHistory();
      });
      sideMenuOverlay.addEventListener("click", () => {
        mobileBackCoordinator.closeSideMenu();
        mobileBackCoordinator.syncHistory();
      });
    }

    let selector = document.getElementById("equipoLoyolaSelect");
    if (!selector) {
      selector = document.createElement("select");
      selector.id = "equipoLoyolaSelect";
      selector.className = "equipo-loyola-select";
      const menu = document.getElementById("sideMenu") || document.body;
      menu.appendChild(selector);
    }
    await cargarSelectorEquiposLoyola(mostrarPartidosYClasificacion, mostrarPantallaErrorGlobal);
    await mostrarPartidosYClasificacion();
  } catch (err) {
    mostrarPantallaErrorGlobal(err, cargarSelectorEquiposLoyola, mostrarPartidosYClasificacion);
  }
}

/**
 * Carga y renderiza la lista de partidos del equipo actualmente seleccionado.
 *
 * Actualiza también el contexto visual superior de la competición y del equipo.
 *
 * @returns {Promise<void>} Promesa resuelta al terminar la carga principal.
 */
export async function mostrarPartidosYClasificacion() {
  const matchesList = document.getElementById("matches");
  const headerTitle = document.getElementById("headerTitle");
  if (!getEquipoSeleccionado()) {
    matchesList.innerHTML = `<li>Selecciona un equipo Loyola</li>`;
    if (headerTitle) headerTitle.textContent = "";
    setCompeticionHeader("");
    return;
  }
  const [idComp, idEquipo] = getEquipoSeleccionado().split("|");
  const eq = getEquiposLoyola().find(
    (e) => e.idCompeticion == idComp && e.idEquipoComp == idEquipo
  );
  if (headerTitle)
    headerTitle.textContent = eq?.nombreEquipo || "Equipo Loyola";
  setCompeticionHeader(eq?.nombreCompeticion || "");
  matchesList.innerHTML = `<li>${t("loading")}</li>`;
  try {
    const raw = await getCalendarioLoyola(idEquipo, idComp);
    renderPartidos(matchesList, raw);
  } catch (e) {
    matchesList.innerHTML = `<li>${t("error", e?.message || String(e))}</li>`;
  }
}
