import { setupNavigation } from "./navigation.js";
import { setupPullToRefresh } from "./pullToRefresh.js";
import { cargarSelectorEquiposLoyola, getEquiposLoyola, getEquipoSeleccionado, hasEquipoFavorito } from "../state/equipos.js";
import { renderEquipoSelector, renderEquipoSelectorSkeleton } from "../components/equipoSelector.js";
import { renderEquipoSelectorLauncher } from "../components/equipoSelectorLauncher.js";
import { closeEquipoSelectorOverlay, openEquipoSelectorOverlay } from "../components/equipoSelectorOverlay.js";
import { setCompeticionHeader } from "./header.js";
import { mostrarPantallaErrorGlobal } from "../state/errorOverlay.js";
import { renderPartidos, renderClasificacion } from "../components/ui.js";
import { renderInitialTeamLoadingState, renderPartidosLoadingState } from "../components/loadingStates.js";
import { preloadPartidoDetalleModule } from "../components/partidos.js";
import { getLang, setLang, t, updateTexts } from "../i18n.js";
import { applyTheme, getSystemTheme, getTheme, listenSystemScheme, setTheme } from "../theme.js";
import { observeThemeAttribute, scheduleApplySystemBars } from "../systemBars.js";
import { getClasificacionLiga, getCalendarioLoyola } from "../services.js";
import { isNative } from "../utils/env.js";
import { isOnboardingActive, isTeamSelectorOverlayOpen, setInitialTeamLoadActive, setOnboardingActive } from "./layoutState.js";

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

    if (isTeamSelectorOverlayOpen()) {
      closeEquipoSelectorOverlay();
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
    return isSideMenuOpen() || isPartidoDetalleOpen() || isTeamSelectorOverlayOpen();
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
 * Renderiza el lanzador compacto para cambiar de equipo desde el side menu.
 *
 * @param {{ closeSideMenu: () => void, syncHistory: () => void }} mobileBackCoordinator Coordinador de back.
 * @returns {void}
 */
function renderMenuTeamLauncher(mobileBackCoordinator) {
  const selectorMenuContainer = document.getElementById("teamSelectorMenuContainer");
  if (!selectorMenuContainer) return;

  renderEquipoSelectorLauncher(selectorMenuContainer, {
    onOpen: () => {
      mobileBackCoordinator.closeSideMenu();
      mobileBackCoordinator.syncHistory();
      openEquipoSelectorOverlay({
        onSelect: async () => {
          const navPartidos = document.getElementById("navPartidos");
          const navClas = document.getElementById("navClas");
          if (navPartidos && navClas) {
            navPartidos.classList.add("active");
            navClas.classList.remove("active");
          }
          renderMenuTeamLauncher(mobileBackCoordinator);
          const selectorMenuContainer = document.getElementById("teamSelectorMenuContainer");
          if (selectorMenuContainer) {
            selectorMenuContainer.offsetHeight;
          }
          await mostrarPartidosYClasificacion();
        },
      });
    },
  });
}

/**
 * Muestra la pantalla inicial de selección cuando todavía no existe equipo favorito.
 *
 * @returns {Promise<void>} Promesa resuelta al completar la primera selección.
 */
/**
 * Restaura el contenedor principal estándar de la app cuando una pantalla temporal
 * ha sustituido el contenido de `screenContent`.
 *
 * @returns {HTMLUListElement|null} Lista de partidos restaurada o existente.
 */
function ensureMatchesList() {
  const screenContent = document.getElementById("screenContent");
  let matchesList = document.getElementById("matches");
  if (!screenContent) return matchesList;
  const loadingScreen = screenContent.querySelector(".initial-team-loading");
  if (!matchesList || loadingScreen) {
    screenContent.innerHTML = '<ul id="matches"></ul>';
    matchesList = document.getElementById("matches");
  }
  return matchesList;
}

async function mostrarSelectorInicial(mobileBackCoordinator) {
  const screenContent = document.getElementById("screenContent");
  const headerTitle = document.getElementById("headerTitle");
  if (!screenContent) return;

  setOnboardingActive(true);
  if (headerTitle) headerTitle.textContent = "";
  setCompeticionHeader("");
  renderEquipoSelectorSkeleton(screenContent, "onboarding");
  await new Promise((resolve) => window.setTimeout(resolve, 180));
  renderEquipoSelector(screenContent, {
    mode: "onboarding",
    onSelect: async () => {
      document.body.classList.add("app-ready");
      setInitialTeamLoadActive(true);
      renderInitialTeamLoadingState(screenContent);
      setOnboardingActive(false);
      const navPartidos = document.getElementById("navPartidos");
      const navClas = document.getElementById("navClas");
      if (navPartidos && navClas) {
        navPartidos.classList.add("active");
        navClas.classList.remove("active");
      }
      renderMenuTeamLauncher(mobileBackCoordinator);
      await mostrarPartidosYClasificacion();
    },
  });
}

/**
 * Inicializa la aplicación: tema, idioma, navegación, selector y primera carga.
 *
 * @returns {Promise<void>} Promesa resuelta cuando termina el arranque principal.
 */
export async function initApp() {
  const shouldShowOnboarding = !hasEquipoFavorito();
  if (shouldShowOnboarding) {
    setOnboardingActive(true);
  }

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
        renderMenuTeamLauncher(mobileBackCoordinator);
        if (isOnboardingActive()) {
          await mostrarSelectorInicial(mobileBackCoordinator);
          return;
        }
        if (document.getElementById("teamSelectorOverlay") && !document.getElementById("teamSelectorOverlay").hidden) {
          openEquipoSelectorOverlay({
            onSelect: async () => {
              renderMenuTeamLauncher(mobileBackCoordinator);
              await mostrarPartidosYClasificacion();
            },
          });
          return;
        }
        const navClas = document.getElementById("navClas");
        if (navClas && navClas.classList.contains("active")) {
          const matchesList = ensureMatchesList();
          if (!matchesList) return;
          matchesList.innerHTML = `<li>${t("loading")}</li>`;
          if (!getEquipoSeleccionado()) {
            matchesList.innerHTML = `<li>${t("team_selector_prompt_inline")}</li>`;
            setCompeticionHeader("");
            return;
          }
          const [idComp] = getEquipoSeleccionado().split("|");
          const eq = getEquiposLoyola().find((item) => item.idCompeticion == idComp);
          setCompeticionHeader(eq?.nombreCompeticion || "");
          try {
            const raw = await getClasificacionLiga(idComp);
            matchesList.innerHTML = "";
            renderClasificacion(matchesList, raw);
          } catch (error) {
            matchesList.innerHTML = `<li>${t("error", error?.message || String(error))}</li>`;
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
      selector.hidden = true;
      const menu = document.getElementById("sideMenu") || document.body;
      menu.appendChild(selector);
    }

    await cargarSelectorEquiposLoyola(mostrarPartidosYClasificacion, mostrarPantallaErrorGlobal);
    renderMenuTeamLauncher(mobileBackCoordinator);

    if (shouldShowOnboarding) {
      await mostrarSelectorInicial(mobileBackCoordinator);
      return;
    }

    document.body.classList.add("app-ready");
    setOnboardingActive(false);
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
  const matchesList = ensureMatchesList();
  const headerTitle = document.getElementById("headerTitle");
  if (!matchesList) return;
  if (!getEquipoSeleccionado()) {
    matchesList.innerHTML = `<li>${t("team_selector_prompt_inline")}</li>`;
    if (headerTitle) headerTitle.textContent = "";
    setCompeticionHeader("");
    return;
  }
  const [idComp, idEquipo] = getEquipoSeleccionado().split("|");
  const eq = getEquiposLoyola().find(
    (item) => item.idCompeticion == idComp && item.idEquipoComp == idEquipo,
  );
  if (headerTitle) {
    headerTitle.textContent = eq?.nombreEquipo || "Equipo Loyola";
  }
  setCompeticionHeader(eq?.nombreCompeticion || "");
  renderPartidosLoadingState(matchesList);
  try {
    const raw = await getCalendarioLoyola(idEquipo, idComp);
    setInitialTeamLoadActive(false);
    renderPartidos(matchesList, raw);
  } catch (error) {
    setInitialTeamLoadActive(false);
    matchesList.innerHTML = `<li>${t("error", error?.message || String(error))}</li>`;
  }
}
