// navigation.js
// Lógica de navegación inferior
import { t } from "../i18n.js";
import { renderClasificacion } from "../components/ui.js";
import { setCompeticionHeader } from "./header.js";
import { getEquiposLoyola, getEquipoSeleccionado } from "../state/equipos.js";
import { getClasificacionLiga } from "../services.js";
import { renderClasificacionLoadingState, renderTeamSelectionPromptState } from "../components/loadingStates.js";

/**
 * Configura la navegación inferior y los listeners de los botones de navegación.
 * Cambia entre la vista de partidos y la de clasificación.
 * @param {Function} mostrarPartidosYClasificacion - Callback para mostrar partidos.
 */
export function setupNavigation(mostrarPartidosYClasificacion) {
  const navPartidos = document.getElementById("navPartidos");
  const navClas = document.getElementById("navClas");
  const navStats = document.getElementById("navStats");
  const bottomNav = document.querySelector(".bottom-nav");
  let clasLoadToken = 0;
  let statsLoadToken = 0;

  const TAB_INDEX = { partidos: "0", clasificacion: "1", estadisticas: "2" };

  const setActiveTab = (tab) => {
    if (!navPartidos || !navClas || !bottomNav) return;
    navPartidos.classList.toggle("active", tab === "partidos");
    navClas.classList.toggle("active", tab === "clasificacion");
    navStats?.classList.toggle("active", tab === "estadisticas");
    bottomNav.setAttribute("data-active-tab", TAB_INDEX[tab] || "0");
  };

  /**
   * Prepara el contenedor de lista y devuelve el nodo donde pintar la vista.
   *
   * @returns {HTMLElement|null} Contenedor `#matches` listo para renderizar.
   */
  const prepararContenedor = () => {
    const main = document.querySelector("main");
    const screenContent = document.getElementById("screenContent");
    if (main) main.scrollTo({ top: 0, behavior: "auto" });
    let matchesList = document.getElementById("matches");
    if (!matchesList && screenContent) {
      screenContent.innerHTML = '<ul id="matches"></ul>';
      matchesList = document.getElementById("matches");
    }
    if (matchesList) matchesList.scrollTop = 0;
    return matchesList;
  };

  if (navStats) {
    navStats.addEventListener("click", async () => {
      const loadToken = ++statsLoadToken;
      clasLoadToken += 1;
      setActiveTab("estadisticas");
      const matchesList = prepararContenedor();
      if (!matchesList) return;
      renderClasificacionLoadingState(matchesList);

      if (!getEquipoSeleccionado()) {
        renderTeamSelectionPromptState(matchesList);
        setCompeticionHeader("");
        return;
      }
      const [idComp] = getEquipoSeleccionado().split("|");
      const eq = getEquiposLoyola().find((e) => e.idCompeticion == idComp);
      setCompeticionHeader(eq?.nombreCompeticion || "");

      const sigueVigente = () => loadToken === statsLoadToken && navStats.classList.contains("active");
      try {
        const { renderEstadisticasLiga } = await import("../components/estadisticasLiga.js");
        if (!sigueVigente()) return;
        await renderEstadisticasLiga(matchesList, idComp, sigueVigente);
      } catch (e) {
        if (!sigueVigente()) return;
        matchesList.innerHTML = `<li>${t("error", e?.message || String(e))}</li>`;
      }
    });
  }

  if (navPartidos && navClas) {
    setActiveTab("partidos");

    navPartidos.addEventListener("click", async () => {
      clasLoadToken += 1;
      statsLoadToken += 1;
      setActiveTab("partidos");
      await mostrarPartidosYClasificacion();
    });

    navClas.addEventListener("click", async () => {
      const loadToken = ++clasLoadToken;
      statsLoadToken += 1;
      setActiveTab("clasificacion");
      const matchesList = prepararContenedor();
      if (!matchesList) return;
      renderClasificacionLoadingState(matchesList);
      if (!getEquipoSeleccionado()) {
        renderTeamSelectionPromptState(matchesList);
        setCompeticionHeader("");
        return;
      }
      const [idComp] = getEquipoSeleccionado().split("|");
      const eq = getEquiposLoyola().find((e) => e.idCompeticion == idComp);
      setCompeticionHeader(eq?.nombreCompeticion || "");
      try {
        const raw = await getClasificacionLiga(idComp);
        if (loadToken !== clasLoadToken || !navClas.classList.contains("active")) return;
        matchesList.innerHTML = "";
        renderClasificacion(matchesList, raw);
      } catch (e) {
        if (loadToken !== clasLoadToken || !navClas.classList.contains("active")) return;
        matchesList.innerHTML = `<li>${t("error", e?.message || String(e))}</li>`;
      }
    });
  }
}
