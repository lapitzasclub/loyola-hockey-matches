// init.js
// Inicialización principal y configuración de tema/idioma
import { setupNavigation } from "./navigation.js";
import { setupPullToRefresh } from "./pullToRefresh.js";
import { cargarSelectorEquiposLoyola, getEquiposLoyola, getEquipoSeleccionado } from "../state/equipos.js";
import { setCompeticionHeader } from "./header.js";
import { mostrarPantallaErrorGlobal } from "../state/errorOverlay.js";
import { renderPartidos } from "../components/ui.js";
import { getLang, setLang, t, updateTexts } from "../i18n.js";
import { applyTheme, getSystemTheme, getTheme, listenSystemScheme, setTheme } from "../theme.js";
import { observeThemeAttribute, scheduleApplySystemBars } from "../systemBars.js";

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
    const raw = await import("../api.js").then(m => m.getCalendarioLoyola(idEquipo, idComp));
    renderPartidos(matchesList, raw);
  } catch (e) {
    matchesList.innerHTML = `<li>${t("error", e?.message || String(e))}</li>`;
  }
}

export async function initApp() {
  try {
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
    const langSelect = document.getElementById("langSelect");
    if (langSelect) {
      langSelect.value = getLang();
      langSelect.addEventListener("change", async (e) => {
        setLang(e.target.value);
        updateTexts();
        await mostrarPartidosYClasificacion();
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
      });
      sideMenuOverlay.addEventListener("click", () => {
        sideMenu.classList.remove("open");
        sideMenuOverlay.classList.remove("open");
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
