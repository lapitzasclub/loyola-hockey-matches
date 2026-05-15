import { closeEquipoSelectorOverlay } from "../components/equipoSelectorOverlay.js";
import { isNative } from "../utils/env.js";
import { isTeamSelectorOverlayOpen } from "./layoutState.js";

/**
 * Crea el coordinador ligero del botón atrás para web y entorno nativo.
 * Gestiona side menu, detalle de partido y subvista de jugador.
 *
 * @returns {{install: () => void, syncHistory: () => void, closeSideMenu: () => void}}
 */
export function createMobileBackCoordinator() {
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
    return globalThis.__partidoDetalleState && globalThis.__partidoDetalleState.navigation?.currentView === "jugador";
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
    const App = globalThis.Capacitor?.Plugins?.App;
    if (!App?.addListener) return;
    App.addListener("backButton", async ({ canGoBack }) => {
      const handled = await consumeBack();
      if (handled) return;
      if (canGoBack) {
        globalThis.history.back();
        return;
      }
      App.exitApp?.();
    });
  }

  function installWebBackHandler() {
    globalThis.addEventListener("popstate", async () => {
      await consumeBack();
    });
  }

  function install() {
    if (installed) return;
    installed = true;

    globalThis.addEventListener("app:overlay-state-changed", () => {
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
