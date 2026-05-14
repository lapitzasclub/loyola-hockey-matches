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
  const bottomNav = document.querySelector(".bottom-nav");

  const setActiveTab = (tab) => {
    if (!navPartidos || !navClas || !bottomNav) return;
    const isPartidos = tab === "partidos";
    navPartidos.classList.toggle("active", isPartidos);
    navClas.classList.toggle("active", !isPartidos);
    bottomNav.setAttribute("data-active-tab", isPartidos ? "0" : "1");
  };

  if (navPartidos && navClas) {
    setActiveTab("partidos");

    navPartidos.addEventListener("click", async () => {
      setActiveTab("partidos");
      await mostrarPartidosYClasificacion();
    });

    navClas.addEventListener("click", async () => {
      setActiveTab("clasificacion");
      const screenContent = document.getElementById("screenContent");
      let matchesList = document.getElementById("matches");
      if (!matchesList && screenContent) {
        screenContent.innerHTML = '<ul id="matches"></ul>';
        matchesList = document.getElementById("matches");
      }
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
        matchesList.innerHTML = "";
        renderClasificacion(matchesList, raw);
      } catch (e) {
        matchesList.innerHTML = `<li>${t("error", e?.message || String(e))}</li>`;
      }
    });
  }
}
