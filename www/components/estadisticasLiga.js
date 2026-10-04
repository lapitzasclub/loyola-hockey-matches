// estadisticasLiga.js
// Vista de estadísticas de la competición.
//
// Se organiza en dos ámbitos (temporada y última jornada) y, dentro de cada uno, en tarjetas
// de premios con el líder de cada categoría más un selector que muestra una única lista. Así
// se evita apilar todos los rankings en una columna interminable.

import { t } from "../i18n.js";
import { escapeHtml } from "./partidoDetalleUtils.js";
import { decodeApiRaw } from "../utils/helpers.js";
import {
  getClasificacionLiga,
  getEstadisticasJugadoresCompeticion,
  getEstadisticasUltimaJornada,
} from "../services.js";
import { getLideresPorCategoria, renderJugadoresRanking } from "./jugadoresRanking.js";
import { getJugadorFotoUrl } from "./partidoDetalleJugadorStats.js";
import { preloadPartidoDetalleModule } from "./partidos.js";
import { createDetalleState } from "./partidoDetalleUtils.js";

/** Equipos mostrados en cada ranking de equipo. */
const TOP_EQUIPOS = 5;
/** Jugadores mostrados en cada ranking de jugador. */
const TOP_JUGADORES = 10;

/** Categorías seleccionables. `equipos` se resuelve aparte, desde la clasificación. */
const CATEGORIAS = [
  { id: "goles", label: () => t("cat_goals") },
  { id: "asistencias", label: () => t("cat_assists") },
  { id: "porteros", label: () => t("cat_keepers") },
  { id: "sanciones", label: () => t("cat_cards") },
  { id: "equipos", label: () => t("cat_teams") },
];

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
        <div class="rank-row-inner">
          <span class="rank-pos">${i + 1}</span>
          ${logo}
          <span class="rank-copy">
            <span class="rank-nombre">${escapeHtml(fila.NombreEquipo || fila.NombreEquipoAbrev || "")}</span>
            <span class="rank-meta">${chipsHtml}</span>
          </span>
          <span class="rank-valor">${escapeHtml(valor(fila))}</span>
        </div>
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
    renderEquiposSeccion(t("stats_team_attack"), ataque, (f) => String(num(f.GolesAFavor)), (f) => [["PJ", f.PartidosJugados], ["GC", f.GolesEnContra]]),
    renderEquiposSeccion(t("stats_team_defense"), defensa, (f) => String(num(f.GolesEnContra)), (f) => [["PJ", f.PartidosJugados], ["GF", f.GolesAFavor]]),
  ].filter(Boolean).join("");
}

/**
 * Renderiza las tarjetas de premios con el líder de cada categoría.
 *
 * @param {object[]} jugadores Jugadores del ámbito activo.
 * @returns {string} HTML del bloque de premios.
 */
function renderPremios(jugadores) {
  const lideres = getLideresPorCategoria(jugadores);
  if (!lideres.length) return "";

  const tarjetas = lideres.map(({ clave, jugador, valor }) => `
    <article class="award-card">
      <div class="award-label">${escapeHtml(t(`award_${clave}`))}</div>
      <img class="award-foto" src="${escapeHtml(getJugadorFotoUrl(jugador.fotoUrl))}" alt="" loading="lazy" decoding="async">
      <div class="award-nombre">${escapeHtml(jugador.nombre)}</div>
      <div class="award-equipo">${escapeHtml(jugador.equipoAbrev || "")}</div>
      <div class="award-valor">${escapeHtml(valor)}</div>
    </article>
  `).join("");

  return `
    <section class="awards-section">
      <div class="rank-section-title">${escapeHtml(t("stats_awards"))}</div>
      <div class="awards-grid">${tarjetas}</div>
    </section>
  `;
}

/**
 * Renderiza una botonera de pastillas.
 *
 * @param {Array<{id:string, label:string}>} items Opciones.
 * @param {string} activo Identificador activo.
 * @param {string} attr Atributo de datos usado para el binding.
 * @returns {string} HTML de la botonera.
 */
function renderPills(items, activo, attr) {
  const botones = items.map((item) => `
    <button type="button" class="stats-pill${item.id === activo ? " active" : ""}" ${attr}="${escapeHtml(item.id)}">
      ${escapeHtml(item.label)}
    </button>
  `).join("");
  return `<div class="stats-pills">${botones}</div>`;
}

/**
 * Pinta el panel completo según el estado actual y vuelve a enlazar sus controles.
 *
 * @param {HTMLElement} container Contenedor de la vista.
 * @param {object} estado Estado interno de la vista.
 * @returns {void}
 */
function pintar(container, estado) {
  const ambitoActivo = estado.ambito === "semana" ? estado.semana : estado.temporada;
  const jugadores = ambitoActivo?.jugadores || [];

  const ambitos = [
    { id: "temporada", label: t("stats_scope_season") },
    { id: "semana", label: estado.semana?.nombre || t("stats_scope_week") },
  ];
  const categorias = CATEGORIAS.map((c) => ({ id: c.id, label: c.label() }));

  let cuerpo;
  if (estado.ambito === "semana" && estado.cargandoSemana) {
    cuerpo = `<div class="partido-detalle-empty cardish">${escapeHtml(t("stats_loading_week"))}</div>`;
  } else if (estado.categoria === "equipos") {
    // Los equipos sólo tienen lectura de temporada: la clasificación es acumulada.
    cuerpo = renderEquiposRankings(estado.filasClasificacion) ||
      `<div class="partido-detalle-empty cardish">${escapeHtml(t("players_empty"))}</div>`;
  } else if (!jugadores.length) {
    cuerpo = `<div class="partido-detalle-empty cardish">${escapeHtml(t("players_empty"))}</div>`;
  } else {
    cuerpo = renderJugadoresRanking(jugadores, { limite: TOP_JUGADORES, secciones: [estado.categoria] });
  }

  const premios = estado.categoria === "equipos" || !jugadores.length ? "" : renderPremios(jugadores);

  container.innerHTML = `
    <div class="stats-liga-wrap">
      ${renderPills(ambitos, estado.ambito, "data-stats-scope")}
      ${premios}
      ${renderPills(categorias, estado.categoria, "data-stats-cat")}
      <div class="stats-panel">${cuerpo}</div>
    </div>
  `;

  bindControles(container, estado);
  bindFichasJugador(container);
}

/**
 * Enlaza los selectores de ámbito y categoría.
 *
 * @param {HTMLElement} container Contenedor de la vista.
 * @param {object} estado Estado interno de la vista.
 * @returns {void}
 */
function bindControles(container, estado) {
  container.querySelectorAll("[data-stats-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      estado.categoria = btn.getAttribute("data-stats-cat");
      pintar(container, estado);
    });
  });

  container.querySelectorAll("[data-stats-scope]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ambito = btn.getAttribute("data-stats-scope");
      if (ambito === estado.ambito) return;
      estado.ambito = ambito;

      // La jornada se calcula agregando sus partidos, así que se carga la primera vez
      // que se consulta y se reutiliza después.
      if (ambito === "semana" && !estado.semana) {
        estado.cargandoSemana = true;
        pintar(container, estado);
        const semana = await getEstadisticasUltimaJornada(estado.idCompeticion);
        if (!estado.sigueVigente()) return;
        estado.semana = semana;
        estado.cargandoSemana = false;
      }
      pintar(container, estado);
    });
  });
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
  const estado = {
    idCompeticion,
    ambito: "temporada",
    categoria: "goles",
    temporada: { jugadores },
    semana: null,
    cargandoSemana: false,
    filasClasificacion: Array.isArray(clasificacion) ? clasificacion : [],
    sigueVigente: isStillValid,
  };

  if (!jugadores.length && !estado.filasClasificacion.length) {
    container.innerHTML = `<div class="partido-detalle-empty cardish">${escapeHtml(t("players_empty"))}</div>`;
    return;
  }

  pintar(container, estado);
}

/**
 * Abre la ficha de un jugador en el modal compartido. Desde esta vista no hay partido de
 * contexto, así que se entra directamente en la subvista de jugador.
 *
 * @param {object} payload Datos mínimos del jugador serializados en la fila.
 * @returns {Promise<void>}
 */
async function abrirFichaJugador(payload) {
  if (!payload?.idLicencia) return;

  const initialState = createDetalleState("player-detail-entry");
  initialState.selectedJugador = {
    ...payload,
    partidoStats: null,
    eventos: [],
    statsGlobales: null,
    loading: true,
    error: "",
  };
  initialState.navigation.currentView = "jugador";

  const [{ openPartidoDetalle }, subview] = await Promise.all([
    preloadPartidoDetalleModule(),
    import("./partidoDetalleJugadorSubview.js"),
  ]);

  openPartidoDetalle("player-detail-entry", {
    initialState,
    initialHeaderHtml: subview.renderJugadorHeader(initialState.selectedJugador),
  });

  requestAnimationFrame(async () => {
    const state = globalThis.__partidoDetalleState;
    const headerEl = document.getElementById("partido-detalle-header-content");
    const bodyEl = document.getElementById("partido-detalle-body");
    const renderAll = globalThis.__partidoDetalleRenderAll;
    if (!state || !headerEl || !bodyEl || typeof renderAll !== "function") return;

    state.selectedJugador = initialState.selectedJugador;
    state.navigation.currentView = "jugador";
    renderAll(state, headerEl, bodyEl);
    await subview.hydrateJugadorStats(state, headerEl, bodyEl, renderAll);
  });
}

/**
 * Enlaza las filas del ranking con la ficha del jugador.
 *
 * @param {HTMLElement} container Contenedor de la vista.
 * @returns {void}
 */
function bindFichasJugador(container) {
  container.querySelectorAll(".rank-player-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      let payload;
      try {
        payload = JSON.parse(btn.dataset.player || "null");
      } catch {
        payload = null;
      }
      void abrirFichaJugador(payload);
    });
  });
}
