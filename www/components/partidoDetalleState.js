import { normalizarPartido, parseApiArrayResponse } from "./partidoDetalleUtils.js";

/**
 * Fusiona dos objetos priorizando los valores útiles del nuevo payload.
 *
 * @param {object|null} prev Estado previo normalizado.
 * @param {object|null} next Nuevo bloque de datos normalizado.
 * @returns {object|null} Objeto fusionado.
 */
export function mergeTruthy(prev, next) {
  if (!prev) return next;
  if (!next) return prev;
  const merged = { ...prev };
  for (const [key, value] of Object.entries(next)) {
    if (Array.isArray(value)) {
      if (value.length) merged[key] = value;
      continue;
    }
    if (value !== undefined && value !== null && value !== "") {
      merged[key] = value;
    }
  }
  return merged;
}

/**
 * Actualiza el bloque principal del partido en el estado del modal.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @param {unknown} payload Payload crudo del partido.
 * @returns {void}
 */
export function updatePartido(state, payload) {
  const normalizado = normalizarPartido(payload);
  if (!normalizado) return;
  state.partido = mergeTruthy(state.partido, normalizado);
  state.modalidad = normalizado.modalidad || state.modalidad;
  state.localKey = normalizado.idEquipoLocal || state.localKey;
  state.visitKey = normalizado.idEquipoVisit || state.visitKey;
}

/**
 * Integra en el estado la respuesta del endpoint de estadísticas del partido.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @param {unknown} payload Payload crudo de estadísticas.
 * @returns {void}
 */
export function updateEstadisticaPayload(state, payload) {
  const parsed = parseApiArrayResponse(payload);
  if (!Array.isArray(parsed) || !parsed[0]) return;
  const block = parsed[0];
  if (Array.isArray(block.partido) && block.partido[0]) {
    updatePartido(state, block.partido[0]);
  }
  if (Array.isArray(block.stats)) {
    state.statsResumen = block.stats;
    if (!state.eventos.length) state.eventos = block.stats;
  }
  if (Array.isArray(block.eventos)) {
    state.eventos = block.eventos;
  }
  if (Array.isArray(block.alineaciones) && block.alineaciones.length) {
    state.alineaciones = block.alineaciones[0];
  }
}

/**
 * Sustituye la colección de eventos del partido en el estado actual.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @param {unknown} payload Payload crudo de eventos.
 * @returns {void}
 */
export function updateEventos(state, payload) {
  const parsed = parseApiArrayResponse(payload);
  state.eventos = Array.isArray(parsed) ? parsed : [];
}

/**
 * Sustituye la colección de penaltis del partido en el estado actual.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @param {unknown} payload Payload crudo de penaltis.
 * @returns {void}
 */
export function updatePenaltis(state, payload) {
  const parsed = parseApiArrayResponse(payload);
  state.penaltis = Array.isArray(parsed) ? parsed : [];
}

/**
 * Sustituye o normaliza la estructura de alineaciones del partido en el estado.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @param {unknown} payload Payload crudo de alineaciones.
 * @returns {void}
 */
export function updateAlineaciones(state, payload) {
  const parsed = parseApiArrayResponse(payload);
  if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === "object") {
    state.alineaciones = parsed[0];
  } else if (parsed && typeof parsed === "object") {
    state.alineaciones = parsed;
  } else {
    state.alineaciones = null;
  }
}
