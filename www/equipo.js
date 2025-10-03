// equipo.js

/**
 * Obtener el nombre completo del equipo seleccionado desde localStorage.
 * @returns {string} "LOYOLA INDAUTXU A" o "LOYOLA INDAUTXU B"
 */
export function getEquipoNombreCompleto() {
  return localStorage.getItem("equipoLoyola") === "B"
    ? "LOYOLA INDAUTXU B"
    : "LOYOLA INDAUTXU A";
}

/**
 * Obtener el ID del equipo seleccionado desde localStorage.
 * Devolver 578 para "B" y 530 para "A" (por defecto).
 * @returns {number} ID del equipo
 */
export function getEquipoId() {
  return localStorage.getItem("equipoLoyola") === "B" ? 578 : 587;
}

/**
 * Obtener la etiqueta (A/B) del equipo seleccionado desde localStorage.
 * @returns {string} "A" o "B"
 */
export function getEquipoLabel() {
  return localStorage.getItem("equipoLoyola") === "B" ? "B" : "A";
}
