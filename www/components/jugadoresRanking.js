// jugadoresRanking.js
// Rankings de jugadores de una competición (goleadores, asistentes, porteros, sancionados).
// Se alimenta de `/hierarchy/division/{id}/estadisticas-jugadores`, que devuelve a todos los
// jugadores de la división con sus totales de temporada en una sola petición.
//
// El mismo componente sirve para el ranking completo (vista Estadísticas) y para la vista
// filtrada por equipo (detalle de equipo): el filtro se hace por abreviatura de equipo, que es
// la clave que comparten el catálogo y este endpoint.

import { t } from "../i18n.js";
import { escapeHtml } from "./partidoDetalleUtils.js";
import { getJugadorFotoUrl } from "./partidoDetalleJugadorStats.js";
import { bindDetailsAccordion } from "./accordion.js";

const porNombre = (a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""));

/**
 * Filtra una lista de jugadores por abreviatura de equipo, la clave común entre el catálogo
 * y el endpoint de estadísticas.
 *
 * @param {object[]} jugadores Jugadores normalizados.
 * @param {string|null} equipoAbrev Abreviatura por la que filtrar; sin ella devuelve la lista tal cual.
 * @returns {object[]} Jugadores filtrados.
 */
function filtrarPorEquipo(jugadores, equipoAbrev) {
  const lista = Array.isArray(jugadores) ? jugadores : [];
  if (!equipoAbrev) return lista;
  const clave = String(equipoAbrev).trim().toUpperCase();
  return lista.filter((j) => String(j.equipoAbrev || "").trim().toUpperCase() === clave);
}

/**
 * Definición de cada ranking: a quién incluye, cómo ordena, qué valor destaca y qué chips
 * acompañan. Centralizarlo evita repetir el render por cada métrica.
 */
const SECCIONES = {
  goles: {
    titulo: () => t("players_scorers"),
    incluye: (j) => !j.esPortero,
    relevante: (j) => j.goles > 0,
    orden: (a, b) => b.goles - a.goles || b.asistencias - a.asistencias || porNombre(a, b),
    valor: (j) => String(j.goles || 0),
    chips: (j) => [["PJ", j.partidosJugados], ["As", j.asistencias]],
  },
  asistencias: {
    titulo: () => t("players_assists"),
    incluye: (j) => !j.esPortero,
    relevante: (j) => j.asistencias > 0,
    orden: (a, b) => b.asistencias - a.asistencias || b.goles - a.goles || porNombre(a, b),
    valor: (j) => String(j.asistencias || 0),
    chips: (j) => [["PJ", j.partidosJugados], ["G", j.goles]],
  },
  porteros: {
    titulo: () => t("players_goalkeepers"),
    incluye: (j) => j.esPortero && j.partidosJugados > 0,
    relevante: () => true,
    orden: (a, b) => b.porcentajeParadas - a.porcentajeParadas || a.golesEncajados - b.golesEncajados || porNombre(a, b),
    valor: (j) => `${Math.round(Number(j.porcentajeParadas) || 0)}%`,
    chips: (j) => [["PJ", j.partidosJugados], ["GC", j.golesEncajados], ["Par", j.paradas]],
  },
  sanciones: {
    titulo: () => t("players_cards"),
    incluye: () => true,
    relevante: (j) => (j.azules || 0) + (j.rojas || 0) > 0,
    orden: (a, b) => (b.azules + b.rojas * 2) - (a.azules + a.rojas * 2) || porNombre(a, b),
    valor: (j) => String((j.azules || 0) + (j.rojas || 0)),
    chips: (j) => [["Az", j.azules], ["Rj", j.rojas], ["F", j.faltas]],
  },
};

/** Secciones mostradas cuando no se indican explícitamente. */
const SECCIONES_POR_DEFECTO = ["goles", "asistencias", "porteros", "sanciones"];

/**
 * Devuelve el líder de cada categoría, para las tarjetas de premios.
 *
 * @param {object[]} jugadores Jugadores normalizados.
 * @param {string[]} [claves=SECCIONES_POR_DEFECTO] Categorías a resolver.
 * @param {string|null} [equipoAbrev=null] Abreviatura para limitar los líderes a un equipo.
 * @returns {Array<{clave:string, titulo:string, jugador:object, valor:string}>} Líderes encontrados.
 */
export function getLideresPorCategoria(jugadores, claves = SECCIONES_POR_DEFECTO, equipoAbrev = null) {
  const lista = filtrarPorEquipo(jugadores, equipoAbrev);
  return claves.map((clave) => {
    const seccion = SECCIONES[clave];
    if (!seccion) return null;
    const lider = lista.filter(seccion.incluye).filter(seccion.relevante).sort(seccion.orden)[0];
    return lider ? { clave, titulo: seccion.titulo(), jugador: lider, valor: seccion.valor(lider) } : null;
  }).filter(Boolean);
}

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
 * Renderiza la referencia visual al equipo del jugador (escudo + abreviatura).
 *
 * @param {object} jugador Jugador normalizado.
 * @returns {string} HTML del equipo o cadena vacía.
 */
function renderEquipo(jugador) {
  if (!jugador.equipoAbrev && !jugador.clubLogoUrl) return "";
  const escudo = jugador.clubLogoUrl
    ? `<img class="rank-equipo-logo" src="${escapeHtml(jugador.clubLogoUrl)}" alt="" loading="lazy" decoding="async">`
    : "";
  return `<span class="rank-equipo">${escudo}${escapeHtml(jugador.equipoAbrev || "")}</span>`;
}

/**
 * Construye el payload de navegación que abre la ficha de un jugador desde un ranking.
 *
 * @param {object} jugador Jugador normalizado.
 * @returns {object} Payload para el atributo `data-player`.
 */
function buildPlayerLinkPayload(jugador) {
  return {
    role: jugador.esPortero ? "portero" : "jugador",
    teamType: null,
    dorsal: null,
    nombre: jugador.nombre,
    idLicencia: jugador.id,
    licenciaTipo: jugador.esPortero ? "p" : "j",
    // Marca la ficha como ajena a un partido concreto: oculta el bloque "Partido".
    source: "team-roster",
    equipo: jugador.equipoAbrev || "",
  };
}

/**
 * Renderiza una fila del ranking.
 *
 * @param {object} jugador Jugador normalizado.
 * @param {number} posicion Puesto dentro de la sección.
 * @param {object} seccion Definición de la sección activa.
 * @param {boolean} mostrarEquipo Muestra el equipo del jugador.
 * @returns {string} HTML de la fila.
 */
function renderFila(jugador, posicion, seccion, mostrarEquipo) {
  const chips = seccion.chips(jugador).map(([label, value]) => renderChip(label, value)).filter(Boolean).join("");
  const contenido = `
    <span class="rank-pos">${posicion}</span>
    <img class="rank-foto" src="${escapeHtml(getJugadorFotoUrl(jugador.fotoUrl))}" alt="" loading="lazy" decoding="async">
    <span class="rank-copy">
      <span class="rank-nombre">${escapeHtml(jugador.nombre)}</span>
      <span class="rank-meta">${mostrarEquipo ? renderEquipo(jugador) : ""}${chips}</span>
    </span>
    <span class="rank-valor">${escapeHtml(seccion.valor(jugador))}</span>
  `;

  // Sin identificador no se puede cargar su ficha: se deja como fila no interactiva.
  if (!jugador.id) {
    return `<li class="rank-row"><div class="rank-row-inner">${contenido}</div></li>`;
  }

  const payload = buildPlayerLinkPayload(jugador);

  return `
    <li class="rank-row">
      <button type="button" class="rank-row-inner rank-player-link partido-detalle-player-link" data-player='${escapeHtml(JSON.stringify(payload))}'>
        ${contenido}
      </button>
    </li>
  `;
}

/**
 * Renderiza una sección de ranking como ítem de acordeón, para no apilar varias
 * listas completas una tras otra dentro de una pestaña ya existente.
 *
 * @param {string} titulo Título de la sección.
 * @param {string} filasHtml HTML de las filas ya renderizadas.
 * @param {number} total Número de candidatos, mostrado como contador.
 * @param {boolean} abierto Si el ítem debe empezar expandido.
 * @returns {string} HTML del ítem de acordeón.
 */
function renderSeccionAcordeon(titulo, filasHtml, total, abierto) {
  return `
    <details class="rank-accordion-item"${abierto ? " open" : ""}>
      <summary class="rank-accordion-summary">
        <span class="rank-accordion-summary-main">
          <span class="rank-accordion-title">${escapeHtml(titulo)}</span>
        </span>
        <span class="rank-accordion-summary-side">
          <span class="rank-accordion-count">${escapeHtml(total)}</span>
          <span class="rank-accordion-caret" aria-hidden="true"></span>
        </span>
      </summary>
      <div class="rank-accordion-content">
        <ol class="rank-list">${filasHtml}</ol>
      </div>
    </details>
  `;
}

/**
 * Renderiza el ranking de jugadores.
 *
 * @param {object[]} jugadores Jugadores normalizados de la competición.
 * @param {object} [options={}] Opciones de render.
 * @param {string|null} [options.equipoAbrev=null] Abreviatura para filtrar por equipo.
 * @param {number} [options.limite=0] Máximo por sección; 0 muestra todos.
 * @param {boolean} [options.mostrarEquipo=true] Muestra el equipo en cada fila.
 * @param {string[]} [options.secciones] Rankings a mostrar.
 * @param {boolean} [options.acordeon=false] Muestra cada sección como ítem de acordeón en vez
 *   de apilarlas todas abiertas; pensado para reutilizar este ranking dentro de una pestaña
 *   que ya tiene sus propias secciones (p. ej. la pestaña "Jugadores" del detalle de equipo).
 * @returns {string} HTML del ranking.
 */
export function renderJugadoresRanking(jugadores, options = {}) {
  const {
    equipoAbrev = null,
    limite = 0,
    mostrarEquipo = true,
    secciones = SECCIONES_POR_DEFECTO,
    acordeon = false,
  } = options;

  const lista = filtrarPorEquipo(jugadores, equipoAbrev);

  let primeraSeccionAbierta = true;
  const bloques = secciones.map((clave) => {
    const seccion = SECCIONES[clave];
    if (!seccion) return "";

    let candidatos = lista.filter(seccion.incluye).sort(seccion.orden);
    // Con límite se está mostrando un ranking de liga: sólo interesan quienes ya tienen
    // registro. Sin límite (vista de equipo) se muestra la plantilla completa.
    if (limite) candidatos = candidatos.filter(seccion.relevante).slice(0, limite);
    if (!candidatos.length) return "";

    const filas = candidatos.map((j, i) => renderFila(j, i + 1, seccion, mostrarEquipo)).join("");
    if (acordeon) {
      const abierto = primeraSeccionAbierta;
      primeraSeccionAbierta = false;
      return renderSeccionAcordeon(seccion.titulo(), filas, candidatos.length, abierto);
    }
    return `
      <section class="rank-section">
        <div class="rank-section-title">${escapeHtml(seccion.titulo())}</div>
        <ol class="rank-list">${filas}</ol>
      </section>
    `;
  }).filter(Boolean).join("");

  if (!bloques) return `<div class="partido-detalle-empty cardish">${escapeHtml(t("players_empty"))}</div>`;
  return acordeon ? `<div class="rank-accordion-group">${bloques}</div>` : bloques;
}

/**
 * Renderiza las tarjetas de premios con el líder de cada categoría. Se usa tanto en las
 * estadísticas globales de liga como, filtrado por equipo, en la pestaña "Jugadores" del
 * detalle de equipo.
 *
 * @param {object[]} jugadores Jugadores entre los que buscar líderes.
 * @param {object} [options={}] Opciones de render.
 * @param {string|null} [options.equipoAbrev=null] Abreviatura para limitar los líderes a un equipo.
 * @param {string[]} [options.claves=SECCIONES_POR_DEFECTO] Categorías a mostrar.
 * @param {boolean} [options.mostrarEquipo=true] Muestra el equipo del jugador en cada tarjeta;
 *   se omite cuando ya se sabe que todos pertenecen al mismo equipo.
 * @returns {string} HTML del bloque de premios, o cadena vacía si no hay líderes.
 */
export function renderPremios(jugadores, options = {}) {
  const { equipoAbrev = null, claves = SECCIONES_POR_DEFECTO, mostrarEquipo = true } = options;
  const lideres = getLideresPorCategoria(jugadores, claves, equipoAbrev);
  if (!lideres.length) return "";

  const tarjetas = lideres.map(({ clave, jugador, valor }) => {
    const contenido = `
      <div class="award-label">${escapeHtml(t(`award_${clave}`))}</div>
      <img class="award-foto" src="${escapeHtml(getJugadorFotoUrl(jugador.fotoUrl))}" alt="" loading="lazy" decoding="async">
      <div class="award-nombre">${escapeHtml(jugador.nombre)}</div>
      ${mostrarEquipo ? `<div class="award-equipo">${escapeHtml(jugador.equipoAbrev || "")}</div>` : ""}
      <div class="award-valor">${escapeHtml(valor)}</div>
    `;

    // Sin identificador no se puede cargar su ficha: se deja como tarjeta no interactiva.
    if (!jugador.id) {
      return `<article class="award-card">${contenido}</article>`;
    }

    const payload = buildPlayerLinkPayload(jugador);
    return `
      <button type="button" class="award-card award-card-link rank-player-link partido-detalle-player-link" data-player='${escapeHtml(JSON.stringify(payload))}'>
        ${contenido}
      </button>
    `;
  }).join("");

  return `
    <section class="awards-section">
      <div class="rank-section-title">${escapeHtml(t("stats_awards"))}</div>
      <div class="awards-grid">${tarjetas}</div>
    </section>
  `;
}

/**
 * Vincula el comportamiento de acordeón de las secciones renderizadas con `acordeon: true`.
 *
 * @param {HTMLElement} container Nodo que contiene el grupo de acordeón renderizado.
 * @returns {void}
 */
export function bindJugadoresRankingAccordion(container) {
  if (!(container instanceof HTMLElement)) return;
  const group = container.querySelector(".rank-accordion-group") || container;
  bindDetailsAccordion(group, {
    itemSelector: ".rank-accordion-item",
    triggerSelector: ".rank-accordion-summary",
    contentSelector: ".rank-accordion-content",
    exclusive: true,
  });
}
