import { setupNavigation } from "./navigation.js";
import { setupPullToRefresh } from "./pullToRefresh.js";
import { cargarSelectorEquiposLoyola, getEquiposLoyola, getEquipoSeleccionado, hasEquipoFavorito } from "../state/equipos.js";
import { setCompeticionHeader } from "./header.js";
import { mostrarPantallaErrorGlobal } from "../state/errorOverlay.js";
import { renderPartidos } from "../components/ui.js";
import {
  renderErrorState,
  renderPartidosLoadingState,
  renderTeamSelectionPromptState,
} from "../components/loadingStates.js";
import { renderEquipoSelectorSkeleton } from "../components/equipoSelector.js";
import { preloadPartidoDetalleModule } from "../components/partidos.js";
import { t, updateTexts } from "../i18n.js";
import { applyTheme, listenSystemScheme } from "../theme.js";
import { observeThemeAttribute, scheduleApplySystemBars } from "../systemBars.js";
import { getCalendarioLoyola } from "../services.js";
import { setInitialTeamLoadActive, setOnboardingActive } from "./layoutState.js";
import { throwIfApiError, withRetry } from "../utils/retry.js";
import { showToast } from "../ui/toast.js";
import { friendlyErrorTitle } from "../utils/errorMessages.js";
import {
  ensureMatchesList,
  handleLanguageChange,
  mostrarSelectorInicial,
  renderMenuTeamLauncher,
} from "./teamSelectorFlow.js";
import {
  ensureHiddenTeamSelector,
  initLanguageControls,
  initSideMenuControls,
  initThemeControls,
} from "./initBootstrap.js";
import { createMobileBackCoordinator } from "./mobileBackCoordinator.js";

/** Token de la carga de partidos más reciente; descarta respuestas obsoletas. */
let partidosLoadToken = 0;

/**
 * Programa la precarga diferida del módulo pesado del detalle de partido.
 *
 * @returns {void}
 */
function scheduleDetalleWarmup() {
  const warm = () => {
    void preloadPartidoDetalleModule();
  };

  if (typeof globalThis.requestIdleCallback === "function") {
    globalThis.requestIdleCallback(warm, { timeout: 1200 });
    return;
  }

  globalThis.setTimeout(warm, 250);
}

export async function initApp() {
  const shouldShowOnboarding = !hasEquipoFavorito();
  if (shouldShowOnboarding) {
    setOnboardingActive(true);
  }

  if (shouldShowOnboarding) {
    const screenContent = document.getElementById("screenContent");
    if (screenContent) {
      renderEquipoSelectorSkeleton(screenContent, "onboarding");
    }
  } else {
    const initialMatchesList = ensureMatchesList();
    if (initialMatchesList) {
      renderPartidosLoadingState(initialMatchesList);
    }
  }

  try {
    const mobileBackCoordinator = createMobileBackCoordinator();
    mobileBackCoordinator.install();

    initThemeControls(applyTheme);
    listenSystemScheme();
    observeThemeAttribute();
    globalThis.addEventListener("load", () => scheduleApplySystemBars(1));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        scheduleApplySystemBars(1);
        scheduleApplySystemBars(140);
      }
    });
    updateTexts();
    scheduleDetalleWarmup();
    initLanguageControls(mobileBackCoordinator, handleLanguageChange, mostrarPartidosYClasificacion);
    setupNavigation(mostrarPartidosYClasificacion);
    setupPullToRefresh(mostrarPartidosYClasificacion);

    initSideMenuControls(mobileBackCoordinator);
    ensureHiddenTeamSelector();

    await cargarSelectorEquiposLoyola(mostrarPartidosYClasificacion, mostrarPantallaErrorGlobal);
    renderMenuTeamLauncher(mobileBackCoordinator, mostrarPartidosYClasificacion);

    if (shouldShowOnboarding) {
      await mostrarSelectorInicial(mobileBackCoordinator, mostrarPartidosYClasificacion);
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
export async function mostrarPartidosYClasificacion({ isBackgroundRefresh = false } = {}) {
  const matchesList = ensureMatchesList();
  const headerTitle = document.getElementById("headerTitle");
  if (!matchesList) return;
  if (!getEquipoSeleccionado()) {
    renderTeamSelectionPromptState(matchesList);
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
  if (!isBackgroundRefresh) {
    renderPartidosLoadingState(matchesList);
  }
  const token = ++partidosLoadToken;
  const sigueVigente = () =>
    token === partidosLoadToken && !!document.getElementById("navPartidos")?.classList.contains("active");
  try {
    const raw = isBackgroundRefresh
      ? await withRetry(() => getCalendarioLoyola(idEquipo, idComp).then(throwIfApiError), { attempts: 3, delayMs: 500 })
      : await withRetry(() => getCalendarioLoyola(idEquipo, idComp).then(throwIfApiError));
    setInitialTeamLoadActive(false);
    if (!sigueVigente()) return;
    await renderPartidos(matchesList, raw);
  } catch (error) {
    setInitialTeamLoadActive(false);
    if (!sigueVigente()) return;
    if (isBackgroundRefresh) {
      showToast(t("toast_refresh_failed"), { variant: "warning" });
      return;
    }
    renderErrorState(matchesList, {
      title: friendlyErrorTitle(error),
      onRetry: () => mostrarPartidosYClasificacion(),
    });
  }
}
