// header.js
// Gestión de la cabecera de competición

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
