// header.js
// Gestión del contexto superior de equipo y competición

/**
 * Muestra la competición seleccionada como subtítulo del header principal.
 * Mantiene oculto el bloque antiguo `competicionHeader` si aún existe en el DOM.
 * @param {string} nombreCompeticion - Nombre de la competición a mostrar.
 */
export function setCompeticionHeader(nombreCompeticion) {
  const subtitle = document.getElementById("headerSubtitle");
  if (subtitle) {
    subtitle.textContent = nombreCompeticion || "";
    subtitle.hidden = !nombreCompeticion;
  }

  const legacyHeader = document.getElementById("competicionHeader");
  if (legacyHeader) {
    legacyHeader.textContent = nombreCompeticion || "";
    legacyHeader.hidden = true;
  }
}
