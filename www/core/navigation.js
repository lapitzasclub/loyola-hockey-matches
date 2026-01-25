// navigation.js
// Lógica de navegación inferior
import { t } from "../i18n.js";
import { renderClasificacion } from "../components/ui.js";
import { setCompeticionHeader } from "./header.js";
import { getEquiposLoyola, getEquipoSeleccionado } from "../state/equipos.js";
import { getClasificacionLiga } from "../api.js";

/**
 * Configura la navegación inferior y los listeners de los botones de navegación.
 * Cambia entre la vista de partidos y la de clasificación.
 * @param {Function} mostrarPartidosYClasificacion - Callback para mostrar partidos.
 */
export function setupNavigation(mostrarPartidosYClasificacion) {
  const navPartidos = document.getElementById("navPartidos");
  const navClas = document.getElementById("navClas");
  if (navPartidos && navClas) {
    navPartidos.addEventListener("click", async () => {
      navPartidos.classList.add("active");
      navClas.classList.remove("active");
      await mostrarPartidosYClasificacion();
    });
    navClas.addEventListener("click", async () => {
      navClas.classList.add("active");
      navPartidos.classList.remove("active");
      const matchesList = document.getElementById("matches");
      matchesList.innerHTML = "";
      matchesList.innerHTML = `<li><div class='spinner-container'><div class='spinner' aria-label='Cargando'></div></div></li>`;
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
    });
  }
}
