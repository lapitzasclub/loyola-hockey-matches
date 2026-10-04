// estadisticasLiga.js
// Vista de estadísticas de la competición: rankings de jugadores (goleadores, asistentes,
// porteros, sancionados) y rankings de equipos derivados de la clasificación.

import { t } from "../i18n.js";
import { escapeHtml } from "./partidoDetalleUtils.js";
import { decodeApiRaw } from "../utils/helpers.js";
import { getClasificacionLiga, getEstadisticasJugadoresCompeticion } from "../services.js";
import { renderJugadoresRanking } from "./jugadoresRanking.js";

/** Equipos mostrados en cada ranking de equipo. */
const TOP_EQUIPOS = 5;
/** Jugadores mostrados en cada ranking de jugador. */
const TOP_JUGADORES = 10;

/**
 * Renderiza un ranking de equipos reutilizando el estilo de las filas de jugadores.
 *
 * @param {string} titulo Título de la sección.
 * @param {object[]} filas Filas de clasificación ya ordenadas y recortadas.
 * @param {(fila: object) => string} valor Valor destacado de cada fila.
 * @param {(fila: object) => Array<[string, any]>} chips Chips secundarios.
 * @returns {string} HTML de la sección o cadena vacía.
 */
function renderEquiposSeccion(titulo, filas, valor, chips) {
  if (!filas.length) return "";
  const items = filas.map((fila, i) => {
    const logo = fila.IdEntidadEquipo
      ? `<img class="rank-foto" src="${escapeHtml(fila.IdEntidadEquipo)}" alt="" loading="lazy" decoding="async">`
      : '<span class="rank-foto"></span>';
    const chipsHtml = chips(fila)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([label, v]) => `<span class="rank-chip">${escapeHtml(label)} <strong>${escapeHtml(v)}</strong></span>`)
      .join("");
    return `
      <li class="rank-row">
        <span class="rank-pos">${i + 1}</span>
        ${logo}
        <span class="rank-copy">
          <span class="rank-nombre">${escapeHtml(fila.NombreEquipo || fila.NombreEquipoAbrev || "")}</span>
          <span class="rank-meta">${chipsHtml}</span>
        </span>
        <span class="rank-valor">${escapeHtml(valor(fila))}</span>
      </li>
    `;
  }).join("");

  return `
    <section class="rank-section">
      <div class="rank-section-title">${escapeHtml(titulo)}</div>
      <ol class="rank-list">${items}</ol>
    </section>
  `;
}

/**
 * Construye los rankings de equipos a partir de las filas de clasificación.
 *
 * @param {object[]} filas Filas de clasificación.
 * @returns {string} HTML de las secciones de equipo.
 */
function renderEquiposRankings(filas) {
  const jugados = filas.filter((f) => Number(f.PartidosJugados) > 0);
  if (!jugados.length) return "";

  const num = (v) => Number(v) || 0;

  const ataque = [...jugados].sort((a, b) => num(b.GolesAFavor) - num(a.GolesAFavor)).slice(0, TOP_EQUIPOS);
  const defensa = [...jugados].sort((a, b) => num(a.GolesEnContra) - num(b.GolesEnContra)).slice(0, TOP_EQUIPOS);

  return [
    renderEquiposSeccion(
      t("stats_team_attack"),
      ataque,
      (f) => String(num(f.GolesAFavor)),
      (f) => [["PJ", f.PartidosJugados], ["GC", f.GolesEnContra]],
    ),
    renderEquiposSeccion(
      t("stats_team_defense"),
      defensa,
      (f) => String(num(f.GolesEnContra)),
      (f) => [["PJ", f.PartidosJugados], ["GF", f.GolesAFavor]],
    ),
  ].filter(Boolean).join("");
}

/**
 * Carga y renderiza las estadísticas de la competición en el contenedor indicado.
 *
 * @param {HTMLElement} container Contenedor de la vista.
 * @param {string|number} idCompeticion Competición activa.
 * @param {() => boolean} isStillValid Indica si el render sigue siendo el vigente.
 * @returns {Promise<void>}
 */
export async function renderEstadisticasLiga(container, idCompeticion, isStillValid) {
  const [jugadores, clasificacionRaw] = await Promise.all([
    getEstadisticasJugadoresCompeticion(idCompeticion),
    getClasificacionLiga(idCompeticion).catch(() => null),
  ]);

  if (!isStillValid()) return;

  const clasificacion = decodeApiRaw(clasificacionRaw);
  const filas = Array.isArray(clasificacion) ? clasificacion : [];

  const jugadoresHtml = jugadores.length
    ? renderJugadoresRanking(jugadores, { limite: TOP_JUGADORES })
    : "";
  const equiposHtml = renderEquiposRankings(filas);

  if (!jugadoresHtml && !equiposHtml) {
    container.innerHTML = `<div class="partido-detalle-empty cardish">${escapeHtml(t("players_empty"))}</div>`;
    return;
  }

  container.innerHTML = `
    <div class="stats-liga-wrap">
      ${jugadoresHtml}
      ${equiposHtml}
    </div>
  `;
}
