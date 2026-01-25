// header.js
// Gestión de la cabecera de competición

/**
 * Establece o actualiza la cabecera de la competición en la interfaz.
 * Si no existe, la crea e inserta al inicio del <main>.
 * @param {string} nombreCompeticion - Nombre de la competición a mostrar.
 */
export function setCompeticionHeader(nombreCompeticion) {
  let header = document.getElementById("competicionHeader");
  if (!header) {
    header = document.createElement("div");
    header.id = "competicionHeader";
    header.className = "competicion-header";
    const main = document.querySelector("main");
    if (main) main.insertBefore(header, main.firstChild);
  }
  header.textContent = nombreCompeticion || "";
}
