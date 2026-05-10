// init.js
// Inicialización principal y configuración de tema/idioma
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

function createMobileBackCoordinator() {
  let installed = false;
  let handlingBack = false;
  let hasOverlayState = false;

  function isSideMenuOpen() {
    return !!document.getElementById("sideMenu")?.classList.contains("open");
  }

  function isPartidoDetalleOpen() {
    return !!document.querySelector(".partido-detalle-modal");
  }

  function isJugadorDetalleOpen() {
    return window.__partidoDetalleState && window.__partidoDetalleState.navigation?.currentView === "jugador";
  }

  function closeSideMenu() {
    document.getElementById("sideMenu")?.classList.remove("open");
    document.getElementById("sideMenuOverlay")?.classList.remove("open");
  }

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

  function computeNeedsOverlayState() {
    return isSideMenuOpen() || isPartidoDetalleOpen();
  }

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

  function installWebBackHandler() {
    window.addEventListener("popstate", async () => {
      await consumeBack();
    });
  }

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
 * Inicializa la app: tema, idioma, listeners y render inicial.
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
        // Detectar pestaña activa y recargar solo esa vista
        const navClas = document.getElementById("navClas");
        if (navClas && navClas.classList.contains("active")) {
          // Si está activa la pestaña de clasificación, recargar clasificación
          const matchesList = document.getElementById("matches");
          matchesList.innerHTML = `<li>${t("loading")}</li>`;
          // Ya importados arriba
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
          // Por defecto, recargar partidos
          await mostrarPartidosYClasificacion();
        }
      });
    }
    setupNavigation(mostrarPartidosYClasificacion);
    setupPullToRefresh(mostrarPartidosYClasificacion);

    // Restaurar lógica del menú lateral
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
 * Muestra la pantalla de partidos y clasificación para el equipo seleccionado.
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
