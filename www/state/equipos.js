// equipos.js
// Carga y gestión del selector de equipos
import { getLoyolaCompetitionCatalog } from "../services.js";

let _equiposLoyola = [];
let _competitionCatalog = [];
let _equipoSeleccionado = null;

export function getEquiposLoyola() {
  return _equiposLoyola;
}
export function setEquiposLoyola(val) {
  _equiposLoyola = val;
  // Hacer accesible globalmente para renderClasificacion
  if (globalThis.window !== undefined) {
    globalThis.window._equiposLoyola = val;
  }
}
export function getCompetitionCatalog() {
  return _competitionCatalog;
}
export function setCompetitionCatalog(val) {
  _competitionCatalog = Array.isArray(val) ? val : [];
}
export function getEquipoSeleccionado() {
  return _equipoSeleccionado;
}
export function setEquipoSeleccionado(val) {
  _equipoSeleccionado = val;
}
export function hasEquipoFavorito() {
  return !!localStorage.getItem("equipoLoyolaSel");
}
export function persistEquipoSeleccionado(value) {
  const selector = document.getElementById("equipoLoyolaSelect");

  if (!value) {
    localStorage.removeItem("equipoLoyolaSel");
    setEquipoSeleccionado(null);
    if (selector) selector.value = "";
    return;
  }

  localStorage.setItem("equipoLoyolaSel", value);
  setEquipoSeleccionado(value);
  if (selector) selector.value = value;
}

export async function cargarSelectorEquiposLoyola(mostrarPartidosYClasificacion, mostrarPantallaErrorGlobal) {
  const selector = document.getElementById("equipoLoyolaSelect");
  if (!selector) return;
  selector.innerHTML = `<option value="">Cargando equipos...</option>`;
  try {
    const catalog = await getLoyolaCompetitionCatalog();
    const equipos = catalog.flatMap((competition) => competition.equipos);
    setEquiposLoyola(equipos);
    setCompetitionCatalog(catalog);
    selector.innerHTML = "";
    for (const eq of equipos) {
      const opt = document.createElement("option");
      opt.value = `${eq.idCompeticion}|${eq.idEquipoComp}`;
      opt.textContent = `${eq.nombreEquipo} (${eq.nombreCompeticion})`;
      selector.appendChild(opt);
    }
    const saved = localStorage.getItem("equipoLoyolaSel");
    if (saved) {
      selector.value = saved;
    } else {
      selector.value = "";
    }
    selector.addEventListener("change", async () => {
      persistEquipoSeleccionado(selector.value || null);
      // Cerrar el side-menu si está abierto
      const sideMenu = document.getElementById("sideMenu");
      const sideMenuOverlay = document.getElementById("sideMenuOverlay");
      if (sideMenu && sideMenuOverlay) {
        sideMenu.classList.remove("open");
        sideMenuOverlay.classList.remove("open");
      }
      // Forzar navegación a Partidos y actualizar navbar
      const navPartidos = document.getElementById("navPartidos");
      const navClas = document.getElementById("navClas");
      if (navPartidos && navClas) {
        navPartidos.classList.add("active");
        navClas.classList.remove("active");
      }
      await mostrarPartidosYClasificacion();
    });
    setEquipoSeleccionado(saved || null);
  } catch (err) {
    selector.innerHTML = `<option value="">Error cargando equipos</option>`;
    console.error("Error cargando selector de equipos Loyola:", err);
    mostrarPantallaErrorGlobal(err);
  }
}
