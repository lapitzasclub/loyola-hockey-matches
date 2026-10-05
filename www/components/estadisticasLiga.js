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
import { renderJugadoresRanking, renderPremios } from "./jugadoresRanking.js";
import { preloadPartidoDetalleModule } from "./partidos.js";
import { createDetalleState } from "./partidoDetalleUtils.js";
import { animatePillTabSelection, animateTabContentSwap, renderPillTabs } from "./uiTabs.js";

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
 * Renderiza las pestañas de ámbito (temporada / última jornada).
 *
 * @param {object} estado Estado interno de la vista.
 * @returns {string} HTML de las pestañas.
 */
function renderScopeTabs(estado) {
  const ambitos = [
    { id: "temporada", label: t("stats_scope_season") },
    { id: "semana", label: estado.semana?.nombre || t("stats_scope_week") },
  ];
  return renderPillTabs({
    className: "stats-scope-tabs ui-pill-tabs ui-pill-tabs-2col",
    buttonClassName: "tab-btn ui-pill-tab-btn",
    activeClassName: "active",
    dataAttr: "stats-scope",
    ariaLabel: t("stats_scope_aria"),
    activeTab: estado.ambito,
    tabs: ambitos.map((item) => [item.id, item.label]),
  });
}

/**
 * Renderiza las pestañas de categoría (goles, asistencias, porteros, sanciones, equipos).
 *
 * @param {object} estado Estado interno de la vista.
 * @returns {string} HTML de las pestañas.
 */
function renderCategoryTabs(estado) {
  const categorias = CATEGORIAS.map((c) => ({ id: c.id, label: c.label() }));
  return renderPillTabs({
    className: `stats-category-tabs ui-pill-tabs ${categorias.length > 3 ? "ui-pill-tabs-2col" : "ui-pill-tabs-3col"}`,
    buttonClassName: "tab-btn ui-pill-tab-btn",
    activeClassName: "active",
    dataAttr: "stats-cat",
    ariaLabel: t("stats_category_aria"),
    activeTab: estado.categoria,
    tabs: categorias.map((item) => [item.id, item.label]),
  });
}

/**
 * Calcula el HTML del panel de ranking según el ámbito y la categoría activos.
 *
 * @param {object} estado Estado interno de la vista.
 * @returns {string} HTML del panel.
 */
function renderPanel(estado) {
  const ambitoActivo = estado.ambito === "semana" ? estado.semana : estado.temporada;
  const jugadores = ambitoActivo?.jugadores || [];

  if (estado.ambito === "semana" && estado.cargandoSemana) {
    return `<div class="partido-detalle-empty cardish">${escapeHtml(t("stats_loading_week"))}</div>`;
  }
  if (estado.categoria === "equipos") {
    // Los equipos sólo tienen lectura de temporada: la clasificación es acumulada.
    return renderEquiposRankings(estado.filasClasificacion) ||
      `<div class="partido-detalle-empty cardish">${escapeHtml(t("players_empty"))}</div>`;
  }
  if (!jugadores.length) {
    return `<div class="partido-detalle-empty cardish">${escapeHtml(t("players_empty"))}</div>`;
  }
  return renderJugadoresRanking(jugadores, { limite: TOP_JUGADORES, secciones: [estado.categoria] });
}

/**
 * Renderiza el bloque dependiente del ámbito activo: premios, pestañas de categoría y panel.
 *
 * @param {object} estado Estado interno de la vista.
 * @returns {string} HTML del bloque.
 */
function renderScopeBody(estado) {
  const ambitoActivo = estado.ambito === "semana" ? estado.semana : estado.temporada;
  const jugadores = ambitoActivo?.jugadores || [];
  const premios = estado.categoria === "equipos" || !jugadores.length ? "" : renderPremios(jugadores);

  return `
    ${premios}
    ${renderCategoryTabs(estado)}
    <div class="stats-panel team-tab-content" data-stats-panel>${renderPanel(estado)}</div>
  `;
}

/**
 * Pinta el armazón persistente (pestañas de ámbito + bloque dependiente) y enlaza sus
 * controles. Las pestañas se renderizan una única vez, igual que en el detalle de equipo, para
 * que los cambios de pestaña sólo reemplacen el contenido y conserven la animación de
 * selección.
 *
 * @param {HTMLElement} container Contenedor de la vista.
 * @param {object} estado Estado interno de la vista.
 * @returns {void}
 */
function pintarShell(container, estado) {
  container.innerHTML = `
    <div class="stats-liga-wrap">
      ${renderScopeTabs(estado)}
      <div class="stats-scope-body team-tab-content" data-stats-scope-body>${renderScopeBody(estado)}</div>
    </div>
  `;
  bindScopeTabs(container, estado);
  bindCategoryTabs(container, estado);
  bindFichasJugador(container);
}

/**
 * Vuelve a renderizar el bloque dependiente del ámbito (premios + pestañas de categoría +
 * panel) sin tocar las pestañas de ámbito.
 *
 * @param {HTMLElement} container Contenedor de la vista.
 * @param {object} estado Estado interno de la vista.
 * @returns {void}
 */
function actualizarScopeBody(container, estado) {
  const bodyEl = container.querySelector("[data-stats-scope-body]");
  if (!(bodyEl instanceof HTMLElement)) return;
  bodyEl.innerHTML = renderScopeBody(estado);
  bindCategoryTabs(container, estado);
  bindFichasJugador(container);
}

/**
 * Vuelve a renderizar sólo el panel de ranking, sin tocar premios ni pestañas.
 *
 * @param {HTMLElement} container Contenedor de la vista.
 * @param {object} estado Estado interno de la vista.
 * @returns {void}
 */
function actualizarPanel(container, estado) {
  const panelEl = container.querySelector("[data-stats-panel]");
  if (!(panelEl instanceof HTMLElement)) return;
  panelEl.innerHTML = renderPanel(estado);
  bindFichasJugador(container);
}

/**
 * Enlaza las pestañas de ámbito. Se vinculan una sola vez (las pestañas nunca se recrean), con
 * la misma animación de selección y de contenido que el detalle de equipo.
 *
 * @param {HTMLElement} container Contenedor de la vista.
 * @param {object} estado Estado interno de la vista.
 * @returns {void}
 */
function bindScopeTabs(container, estado) {
  container.querySelectorAll("[data-stats-scope]").forEach((btn) => {
    btn.onclick = async () => {
      const ambito = btn.getAttribute("data-stats-scope");
      if (ambito === estado.ambito) return;
      estado.ambito = ambito;
      animatePillTabSelection(container, "[data-stats-scope]", ambito, "stats-scope", "active");

      // La jornada se calcula agregando sus partidos, así que se carga la primera vez
      // que se consulta y se reutiliza después.
      if (ambito === "semana" && !estado.semana) {
        estado.cargandoSemana = true;
        animateTabContentSwap(container, () => {
          actualizarScopeBody(container, estado);
        }, (root) => root.querySelector("[data-stats-scope-body]"));

        const semana = await getEstadisticasUltimaJornada(estado.idCompeticion);
        if (!estado.sigueVigente()) return;
        estado.semana = semana;
        estado.cargandoSemana = false;
        actualizarScopeBody(container, estado);
        return;
      }

      animateTabContentSwap(container, () => {
        actualizarScopeBody(container, estado);
      }, (root) => root.querySelector("[data-stats-scope-body]"));
    };
  });
}

/**
 * Enlaza las pestañas de categoría. Se re-vinculan en cada render del bloque de ámbito, ya que
 * ese bloque sí se recrea; sólo animan el panel de ranking, no los premios ni las propias
 * pestañas.
 *
 * @param {HTMLElement} container Contenedor de la vista.
 * @param {object} estado Estado interno de la vista.
 * @returns {void}
 */
function bindCategoryTabs(container, estado) {
  container.querySelectorAll("[data-stats-cat]").forEach((btn) => {
    btn.onclick = () => {
      const categoria = btn.getAttribute("data-stats-cat");
      if (categoria === estado.categoria) return;
      estado.categoria = categoria;
      animatePillTabSelection(container, "[data-stats-cat]", categoria, "stats-cat", "active");
      animateTabContentSwap(container, () => {
        actualizarPanel(container, estado);
      }, (root) => root.querySelector("[data-stats-panel]"));
    };
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

  pintarShell(container, estado);
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

  const headerEl = document.getElementById("partido-detalle-header-content");
  const bodyEl = document.getElementById("partido-detalle-body");
  const renderAll = globalThis.__partidoDetalleRenderAll;
  if (!headerEl || !bodyEl || typeof renderAll !== "function") return;

  await subview.hydrateJugadorStats(initialState, headerEl, bodyEl, renderAll);
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
