import { getEquiposLoyola, getEquipoSeleccionado } from "../state/equipos.js";
import { renderEquipoSelector, renderEquipoSelectorSkeleton } from "../components/equipoSelector.js";
import { renderEquipoSelectorLauncher } from "../components/equipoSelectorLauncher.js";
import { openEquipoSelectorOverlay } from "../components/equipoSelectorOverlay.js";
import { setCompeticionHeader } from "./header.js";
import { renderClasificacion } from "../components/ui.js";
import { renderInitialTeamLoadingState } from "../components/loadingStates.js";
import { getClasificacionLiga } from "../services.js";
import { t, updateTexts } from "../i18n.js";
import { isOnboardingActive, setInitialTeamLoadActive, setOnboardingActive } from "./layoutState.js";

/**
 * Activa la pestaña de partidos en la navegación inferior.
 *
 * @returns {void}
 */
export function setPartidosTabActive() {
  const navPartidos = document.getElementById("navPartidos");
  const navClas = document.getElementById("navClas");
  if (navPartidos && navClas) {
    navPartidos.classList.add("active");
    navClas.classList.remove("active");
  }
}

/**
 * Restaura el contenedor principal estándar de la app cuando una pantalla temporal
 * ha sustituido el contenido de `screenContent`.
 *
 * @returns {HTMLUListElement|null} Lista de partidos restaurada o existente.
 */
export function ensureMatchesList() {
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

/**
 * Refresca el lanzador del side menu tras seleccionar equipo.
 *
 * @param {{ closeSideMenu: () => void, syncHistory: () => void }} mobileBackCoordinator Coordinador de back.
 * @param {() => Promise<void>} mostrarPartidosYClasificacion Callback principal de refresco.
 * @returns {void}
 */
export function renderMenuTeamLauncher(mobileBackCoordinator, mostrarPartidosYClasificacion) {
  const selectorMenuContainer = document.getElementById("teamSelectorMenuContainer");
  if (!selectorMenuContainer) return;

  renderEquipoSelectorLauncher(selectorMenuContainer, {
    onOpen: () => {
      mobileBackCoordinator.closeSideMenu();
      mobileBackCoordinator.syncHistory();
      openEquipoSelectorOverlay({
        onSelect: async () => {
          setPartidosTabActive();
          refreshMenuTeamLauncher(mobileBackCoordinator, mostrarPartidosYClasificacion);
          await mostrarPartidosYClasificacion();
        },
      });
    },
  });
}

/**
 * Fuerza el repintado del resumen de equipo del side menu.
 *
 * @param {{ closeSideMenu: () => void, syncHistory: () => void }} mobileBackCoordinator Coordinador de back.
 * @param {() => Promise<void>} mostrarPartidosYClasificacion Callback principal de refresco.
 * @returns {void}
 */
export function refreshMenuTeamLauncher(mobileBackCoordinator, mostrarPartidosYClasificacion) {
  renderMenuTeamLauncher(mobileBackCoordinator, mostrarPartidosYClasificacion);
  const selectorMenuContainer = document.getElementById("teamSelectorMenuContainer");
  if (selectorMenuContainer) {
    selectorMenuContainer.offsetHeight;
  }
}

/**
 * Muestra la pantalla inicial de selección cuando no existe favorito.
 *
 * @param {{ closeSideMenu: () => void, syncHistory: () => void }} mobileBackCoordinator Coordinador de back.
 * @param {() => Promise<void>} mostrarPartidosYClasificacion Callback principal de refresco.
 * @returns {Promise<void>} Promesa resuelta al completar la primera selección.
 */
export async function mostrarSelectorInicial(mobileBackCoordinator, mostrarPartidosYClasificacion) {
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
      setPartidosTabActive();
      refreshMenuTeamLauncher(mobileBackCoordinator, mostrarPartidosYClasificacion);
      await mostrarPartidosYClasificacion();
    },
  });
}

/**
 * Gestiona el cambio de idioma manteniendo consistente el estado visual de la app.
 *
 * @param {{ closeSideMenu: () => void, syncHistory: () => void }} mobileBackCoordinator Coordinador de back.
 * @param {string} nextLang Código de idioma seleccionado.
 * @param {() => Promise<void>} mostrarPartidosYClasificacion Callback principal de refresco.
 * @returns {Promise<void>} Promesa resuelta al finalizar la actualización visual.
 */
export async function handleLanguageChange(mobileBackCoordinator, nextLang, mostrarPartidosYClasificacion) {
  localStorage.setItem("langLoyola", nextLang);
  updateTexts();
  refreshMenuTeamLauncher(mobileBackCoordinator, mostrarPartidosYClasificacion);

  if (isOnboardingActive()) {
    await mostrarSelectorInicial(mobileBackCoordinator, mostrarPartidosYClasificacion);
    return;
  }

  const overlay = document.getElementById("teamSelectorOverlay");
  if (overlay && !overlay.hidden) {
    openEquipoSelectorOverlay({
      onSelect: async () => {
        refreshMenuTeamLauncher(mobileBackCoordinator, mostrarPartidosYClasificacion);
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
    return;
  }

  await mostrarPartidosYClasificacion();
}
