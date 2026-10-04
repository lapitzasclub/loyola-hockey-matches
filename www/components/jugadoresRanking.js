// jugadoresRanking.js
// Tabla de goleadores y estadísticas de jugadores de una competición.
// Se alimenta de `/hierarchy/division/{id}/estadisticas-jugadores`, que devuelve a todos los
// jugadores de la división con sus totales de temporada en una sola petición.
//
// El mismo componente sirve para el ranking completo (vista Clasificación) y para la vista
// filtrada por equipo (detalle de equipo): el filtro se hace por abreviatura de equipo, que es
// la clave que comparten el catálogo y este endpoint.

import { t } from "../i18n.js";
import { escapeHtml } from "./partidoDetalleUtils.js";
import { getJugadorFotoUrl } from "./partidoDetalleJugadorStats.js";

/**
 * Renderiza un chip de estadística, omitiéndolo cuando no aporta información.
 *
 * @param {string} label Etiqueta corta.
 * @param {string|number} value Valor.
 * @returns {string} HTML del chip o cadena vacía.
 */
function renderChip(label, value) {
  if (value === null || value === undefined || value === "" || value === 0) return "";
  return `<span class="rank-chip">${escapeHtml(label)} <strong>${escapeHtml(value)}</strong></span>`;
}

/**
 * Renderiza una fila del ranking.
 *
 * @param {object} jugador Jugador normalizado.
 * @param {number} posicion Puesto dentro de la sección.
 * @param {boolean} esPortero Indica si se renderiza como portero.
 * @param {boolean} mostrarEquipo Muestra la abreviatura del equipo.
 * @returns {string} HTML de la fila.
 */
function renderFila(jugador, posicion, esPortero, mostrarEquipo) {
  const valor = esPortero
    ? `${Math.round(Number(jugador.porcentajeParadas) || 0)}%`
    : String(jugador.goles || 0);

  const chips = esPortero
    ? [renderChip("PJ", jugador.partidosJugados), renderChip("GC", jugador.golesEncajados), renderChip("Par", jugador.paradas)]
    : [renderChip("PJ", jugador.partidosJugados), renderChip("As", jugador.asistencias), renderChip("Az", jugador.azules)];

  const equipo = mostrarEquipo && jugador.equipoAbrev
    ? `<span class="rank-equipo">${escapeHtml(jugador.equipoAbrev)}</span>`
    : "";

  return `
    <li class="rank-row">
      <span class="rank-pos">${posicion}</span>
      <img class="rank-foto" src="${escapeHtml(getJugadorFotoUrl(jugador.fotoUrl))}" alt="" loading="lazy" decoding="async">
      <span class="rank-copy">
        <span class="rank-nombre">${escapeHtml(jugador.nombre)}</span>
        <span class="rank-meta">${equipo}${chips.filter(Boolean).join("")}</span>
      </span>
      <span class="rank-valor">${escapeHtml(valor)}</span>
    </li>
  `;
}

/**
 * Renderiza una sección del ranking (goleadores o porteros).
 *
 * @param {string} titulo Título de la sección.
 * @param {object[]} jugadores Jugadores ya ordenados.
 * @param {boolean} esPortero Modo portero.
 * @param {boolean} mostrarEquipo Muestra la abreviatura del equipo.
 * @returns {string} HTML de la sección o cadena vacía si no hay datos.
 */
function renderSeccion(titulo, jugadores, esPortero, mostrarEquipo) {
  if (!jugadores.length) return "";
  const filas = jugadores.map((j, i) => renderFila(j, i + 1, esPortero, mostrarEquipo)).join("");
  return `
    <section class="rank-section">
      <div class="rank-section-title">${escapeHtml(titulo)}</div>
      <ol class="rank-list">${filas}</ol>
    </section>
  `;
}

/**
 * Renderiza el ranking de jugadores.
 *
 * @param {object[]} jugadores Jugadores normalizados de la competición.
 * @param {object} [options={}] Opciones de render.
 * @param {string|null} [options.equipoAbrev=null] Abreviatura para filtrar por equipo.
 * @param {number} [options.limite=0] Máximo por sección; 0 muestra todos.
 * @param {boolean} [options.mostrarEquipo=true] Muestra la abreviatura del equipo en cada fila.
 * @returns {string} HTML del ranking.
 */
export function renderJugadoresRanking(jugadores, options = {}) {
  const { equipoAbrev = null, limite = 0, mostrarEquipo = true } = options;

  let lista = Array.isArray(jugadores) ? jugadores : [];
  if (equipoAbrev) {
    const clave = String(equipoAbrev).trim().toUpperCase();
    lista = lista.filter((j) => String(j.equipoAbrev || "").trim().toUpperCase() === clave);
  }
  if (!lista.length) {
    return `<div class="partido-detalle-empty cardish">${escapeHtml(t("players_empty"))}</div>`;
  }

  const porNombre = (a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""));

  const goleadores = lista
    .filter((j) => !j.esPortero)
    .sort((a, b) => (b.goles || 0) - (a.goles || 0) || (b.asistencias || 0) - (a.asistencias || 0) || porNombre(a, b));

  const porteros = lista
    .filter((j) => j.esPortero && j.partidosJugados > 0)
    .sort((a, b) => (b.porcentajeParadas || 0) - (a.porcentajeParadas || 0) || porNombre(a, b));

  // En el ranking de la competición sólo interesan los que ya han anotado; en la vista de
  // equipo se muestra la plantilla completa aunque todavía no tenga goles.
  const goleadoresVisibles = limite ? goleadores.filter((j) => j.goles > 0).slice(0, limite) : goleadores;
  const porterosVisibles = limite ? porteros.slice(0, limite) : porteros;

  const html = [
    renderSeccion(t("players_scorers"), goleadoresVisibles, false, mostrarEquipo),
    renderSeccion(t("players_goalkeepers"), porterosVisibles, true, mostrarEquipo),
  ].filter(Boolean).join("");

  return html || `<div class="partido-detalle-empty cardish">${escapeHtml(t("players_empty"))}</div>`;
}
