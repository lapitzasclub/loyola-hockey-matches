// equipos.js
// Carga y gestión del selector de equipos
import { getEquiposLoyolaTodasCompeticiones } from "../api.js";

let _equiposLoyola = [];
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
export function getEquipoSeleccionado() {
  return _equipoSeleccionado;
}
export function setEquipoSeleccionado(val) {
  _equipoSeleccionado = val;
}

export async function cargarSelectorEquiposLoyola(mostrarPartidosYClasificacion, mostrarPantallaErrorGlobal) {
  const selector = document.getElementById("equipoLoyolaSelect");
  if (!selector) return;
  selector.innerHTML = `<option value="">Cargando equipos...</option>`;
  try {
    const equipos = await getEquiposLoyolaTodasCompeticiones();
    setEquiposLoyola(equipos);
    selector.innerHTML = "";
    for (const eq of equipos) {
      const opt = document.createElement("option");
      opt.value = `${eq.idCompeticion}|${eq.idEquipoComp}`;
      opt.textContent = `${eq.nombreEquipo} (${eq.nombreCompeticion})`;
      selector.appendChild(opt);
    }
    const saved = localStorage.getItem("equipoLoyolaSel");
    if (saved) selector.value = saved;
    selector.addEventListener("change", async () => {
      localStorage.setItem("equipoLoyolaSel", selector.value);
      setEquipoSeleccionado(selector.value || null);
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
    setEquipoSeleccionado(selector.value || null);
  } catch (err) {
    mostrarPantallaErrorGlobal(err);
  }
}
