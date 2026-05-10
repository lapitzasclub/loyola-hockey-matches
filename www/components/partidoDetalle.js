import { t } from "../i18n.js";
import {
  callPartidoHubServerMethod,
  getEstadisticaJugador,
  getEstadisticaPartido,
  getPartido,
  subscribePartidoHubEvents,
} from "../services.js";
import { renderAlineaciones } from "./partidoDetalleAlineaciones.js";
import { renderEventos } from "./partidoDetalleEventos.js";
import {
  renderDetalleSkeleton,
  renderPartidoHeader,
  renderPartidoHeaderSkeleton,
  updateTabVisibility,
} from "./partidoDetalleRender.js";
import {
  createDetalleState,
  emptyArray,
  escapeHtml,
  getCurrentTab,
  getCurrentView,
  getViewStack,
  normalizarPartido,
  parseApiArrayResponse,
  popView,
  pushView,
  setCurrentTab,
  setCurrentView,
} from "./partidoDetalleUtils.js";
import {
  getJugadorFotoUrl,
  getPlayerStatsData,
  renderJugadorCompeticion,
  renderJugadorTimeline,
  renderPartidoJugadorChips,
  safeNumber,
} from "./partidoDetalleJugadorStats.js";
import { resolveJugadorDetalle } from "./partidoDetalleJugadorData.js";
import { renderJugadorHeader } from "./partidoDetalleJugadorView.js";

/**
 * Notifica al coordinador global que el estado de overlays ha cambiado.
 *
 * @returns {void}
 */
function syncMobileBackState() {
  try {
    window.dispatchEvent(new CustomEvent("app:overlay-state-changed"));
  } catch {}
}

/**
 * Actualiza el contenido HTML de la cabecera del modal y deja una traza de depuración.
 *
 * @param {HTMLElement} headerEl Contenedor de cabecera del modal.
 * @param {string} html HTML ya renderizado de la cabecera.
 * @param {string} [reason=""] Motivo opcional para depuración.
 * @returns {void}
 */
function setHeaderContent(headerEl, html, reason = "") {
  headerEl.innerHTML = html;
  console.log("[Detalle] Header actualizado", {
    reason,
    html,
    text: headerEl.textContent,
  });
}


/**
 * Abre el modal de detalle de un partido y arranca su ciclo de carga.
 *
 * @param {string|number} idPartido Identificador del partido a abrir.
 * @returns {void}
 */
export function openPartidoDetalle(idPartido) {
  closePartidoDetalle({ immediate: true });
  const modal = document.createElement("div");
  modal.className = "partido-detalle-modal";
  modal.innerHTML = `
    <div class="partido-detalle-shell">
      <div class="partido-detalle-grabber"></div>
      <div class="partido-detalle-header">
        <button class="partido-detalle-back" aria-label="Volver" hidden disabled>←</button>
        <div class="partido-detalle-header-content" id="partido-detalle-header-content"></div>
        <button class="partido-detalle-close" aria-label="Cerrar">&times;</button>
      </div>
      <div class="partido-detalle-body" id="partido-detalle-body"></div>
    </div>
  `;
  document.body.appendChild(modal);
  const shellEl = modal.querySelector(".partido-detalle-shell");
  const bodyScrollEl = modal.querySelector(".partido-detalle-body");
  if (shellEl) shellEl.scrollTop = 0;
  if (bodyScrollEl) bodyScrollEl.scrollTop = 0;
  requestAnimationFrame(() => modal.classList.add("is-open"));
  document.body.classList.add("modal-abierto");
  syncMobileBackState();
  modal.querySelector(".partido-detalle-close").onclick = () => closePartidoDetalle();
  modal.querySelector(".partido-detalle-back").onclick = async () => {
    const state = window.__partidoDetalleState;
    if (!getViewStack(state).length) return;
    const headerEl = document.getElementById("partido-detalle-header-content");
    const bodyEl = document.getElementById("partido-detalle-body");
    await transitionDetalleView(bodyEl, async () => {
      setCurrentView(state, popView(state) || "partido");
      renderAll(state, headerEl, bodyEl);
    }, "back");
    syncMobileBackState();
  };
  cargarDetallePartido(idPartido);
}

/**
 * Cierra el modal de detalle de partido y libera sus recursos asociados.
 *
 * @param {object} [options={}] Opciones de cierre.
 * @param {boolean} [options.immediate=false] Si es true, evita la animación de salida.
 * @returns {void}
 */
export function closePartidoDetalle(options = {}) {
  const { immediate = false } = options;
  const modal = document.querySelector(".partido-detalle-modal");
  if (!modal) return;
  if (modal.dataset.closing === "true") return;

  const cleanup = () => {
    modal.remove();
    document.body.classList.remove("modal-abierto");
    if (window.signalR?.enDirecto?.server?.salirDePartido && window.__partidoDetalleId) {
      callPartidoHubServerMethod("salirDePartido", window.__partidoDetalleId);
    }
    if (window.__partidoDetalleUnsub) {
      window.__partidoDetalleUnsub();
      window.__partidoDetalleUnsub = null;
    }
    window.__partidoDetalleId = null;
    window.__partidoDetalleState = null;
    syncMobileBackState();
  };

  if (immediate) {
    cleanup();
    return;
  }

  modal.dataset.closing = "true";
  modal.classList.remove("is-open");
  modal.classList.add("is-closing");

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduceMotion) {
    cleanup();
    return;
  }

  window.setTimeout(cleanup, 280);
}

/**
 * Espera a que la conexión SignalR esté plenamente operativa.
 *
 * @param {number} [timeout=4000] Tiempo máximo de espera en milisegundos.
 * @returns {Promise<void>} Promesa resuelta cuando el hub está conectado.
 */
async function waitForSignalRConnected(timeout = 4000) {
  const start = Date.now();
  while ($.connection.hub.state !== $.signalR.connectionState.connected) {
    if (Date.now() - start > timeout) {
      throw new Error("SignalR hub no conectado");
    }
    await new Promise((res) => setTimeout(res, 50));
  }
}

function ensureBaseLayout(bodyEl, state) {
  bodyEl.innerHTML = `
    <div class="partido-detalle-tabs" role="tablist" aria-label="Secciones del partido">
      <button class="tab-btn" data-tab="resumen">${escapeHtml(t("detail_summary"))}</button>
      <button class="tab-btn" data-tab="alineaciones">${escapeHtml(t("detail_lineups"))}</button>
      <button class="tab-btn" data-tab="eventos">${escapeHtml(t("detail_events"))}</button>
      <button class="tab-btn" data-tab="penaltis">${escapeHtml(t("detail_penalties"))}</button>
    </div>
    <section class="tab-content" id="tab-resumen"></section>
    <section class="tab-content" id="tab-alineaciones" hidden></section>
    <section class="tab-content" id="tab-eventos" hidden></section>
    <section class="tab-content" id="tab-penaltis" hidden></section>
  `;

  bodyEl.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.onclick = () => {
      setCurrentTab(state, btn.dataset.tab);
      updateTabVisibility(bodyEl, getCurrentTab(state));
    };
  });

  updateTabVisibility(bodyEl, getCurrentTab(state));
}

function updateChrome(state, modal) {
  const backBtn = modal?.querySelector(".partido-detalle-back");
  if (!backBtn) return;
  const canGoBack = !!getViewStack(state).length;
  backBtn.hidden = !canGoBack;
  backBtn.disabled = !canGoBack;
}

/**
 * Re-renderiza el estado completo del modal, cabecera incluida.
 * Decide si mostrar la vista del partido o la subvista de jugador.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @param {HTMLElement} headerEl Contenedor de cabecera del modal.
 * @param {HTMLElement} bodyEl Contenedor principal de contenido del modal.
 * @returns {void}
 */
function renderAll(state, headerEl, bodyEl) {
  const modal = bodyEl.closest(".partido-detalle-modal");
  updateChrome(state, modal);
  if (state.partido) {
    const headerHtml = getCurrentView(state) === "jugador" ? renderJugadorHeader(state) : renderPartidoHeader(state);
    setHeaderContent(headerEl, headerHtml, "renderAll");
  } else if (getCurrentView(state) === "partido" && state.loadingMatch) {
    setHeaderContent(headerEl, renderPartidoHeaderSkeleton(), "renderAll-skeleton");
  }
  if (getCurrentView(state) !== "partido") {
    bodyEl.innerHTML = renderSubview(state);
    bindPlayerLinks(bodyEl, state, headerEl);
    bindPlayerAccordions(bodyEl);
    return;
  }
  if (!bodyEl.querySelector("#tab-resumen")) {
    ensureBaseLayout(bodyEl, state);
    scrollDetalleToTop(bodyEl);
  }
  if (state.loadingMatch && !state.partido) {
    renderDetalleSkeleton(bodyEl);
    return;
  }
  bodyEl.querySelector("#tab-resumen").innerHTML = renderResumen(state);
  bodyEl.querySelector("#tab-alineaciones").innerHTML = renderAlineaciones(state);
  bodyEl.querySelector("#tab-eventos").innerHTML = renderEventos(state);
  bodyEl.querySelector("#tab-penaltis").innerHTML = renderPenaltis(state);
  updateTabVisibility(bodyEl, getCurrentTab(state));
  bindPlayerLinks(bodyEl, state, headerEl);
}

/**
 * Enlaza los elementos interactivos que abren la subvista de jugador.
 *
 * @param {HTMLElement} rootEl Nodo raíz donde buscar enlaces de jugador.
 * @param {object} state Estado interno del detalle de partido.
 * @param {HTMLElement} headerEl Contenedor de cabecera del modal.
 * @returns {void}
 */
function bindPlayerLinks(rootEl, state, headerEl) {
  rootEl.querySelectorAll(".partido-detalle-player-link").forEach((btn) => {
    btn.onclick = async () => {
      let payload;
      try {
        payload = JSON.parse(btn.dataset.player || "null");
      } catch {
        payload = null;
      }
      state.selectedJugador = payload ? resolveJugadorDetalle(state, payload) : null;
      if (!state.selectedJugador) return;
      pushView(state, getCurrentView(state));
      state.selectedJugador.loading = true;
      const bodyEl = rootEl.closest("#partido-detalle-body") || rootEl;
      await transitionDetalleView(bodyEl, async () => {
        setCurrentView(state, "jugador");
        renderAll(state, headerEl, bodyEl);
      }, "forward");
      syncMobileBackState();
      await nextFrame();
      await nextFrame();
      await hydrateJugadorStats(state, headerEl, bodyEl);
    };
  });
}

/**
 * Renderiza la subvista activa distinta de la vista principal del partido.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @returns {string} HTML de la subvista activa.
 */
function renderSubview(state) {
  if (getCurrentView(state) === "jugador") {
    return renderJugadorSubview(state);
  }
  return `
    <div class="partido-detalle-subview-placeholder">
      <div class="partido-detalle-empty">${escapeHtml(t("detail_loading_view"))}</div>
    </div>
  `;
}

/**
 * Renderiza la hoja completa del detalle de jugador dentro del modal.
 * Mantiene la shell estable y revela el contenido hidratado por bloques.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @returns {string} HTML de la subvista de jugador.
 */
function renderJugadorSubview(state) {
  const jugador = state.selectedJugador;
  if (!jugador) {
    return `
      <div class="partido-detalle-subview-placeholder subview-enter">
        <div class="partido-detalle-empty">${escapeHtml(t("detail_player_unavailable"))}</div>
      </div>
    `;
  }

  const partidoStats = jugador.partidoStats || {};
  const globales = jugador.statsGlobales;
  const hasGlobales = !!globales;
  const foto = getJugadorFotoUrl(globales?.foto);
  const competicionesOrdenadas = emptyArray(globales?.competiciones)
    .slice()
    .sort((a, b) => safeNumber(b?.partidos || emptyArray(b?.filas).length) - safeNumber(a?.partidos || emptyArray(a?.filas).length));
  const competicionesHtml = competicionesOrdenadas.length
    ? competicionesOrdenadas.map((comp, index) => renderJugadorCompeticion(comp, jugador.licenciaTipo || "j", state.modalidad || "hp", { open: index === 0 })).join("")
    : "";
  const timeline = renderJugadorTimeline(jugador.eventos);
  const partidoChips = renderPartidoJugadorChips(partidoStats);

  return `
    <div class="partido-detalle-player-sheet subview-enter">
      <section class="partido-detalle-section partido-detalle-player-card partido-detalle-player-card-hero">
        <div class="partido-detalle-player-block ${hasGlobales ? "is-ready" : "is-loading"}">
          <div class="partido-detalle-player-block-loading partido-detalle-player-hero partido-detalle-player-hero-lg">
            <span class="partido-detalle-skeleton skeleton-photo"></span>
            <div class="partido-detalle-player-skeleton-meta">
              <span class="partido-detalle-skeleton skeleton-line skeleton-line-md"></span>
              <span class="partido-detalle-skeleton skeleton-line skeleton-line-sm"></span>
            </div>
          </div>
          <div class="partido-detalle-player-block-content partido-detalle-player-hero partido-detalle-player-hero-lg">
            <img class="partido-detalle-player-photo" src="${foto}" alt="${escapeHtml(jugador.nombre || "Jugador")}" loading="eager" decoding="async" onload="this.classList.add('is-loaded')">
            <div>
              <div class="partido-detalle-player-meta partido-detalle-player-meta-compact">${[globales?.nacionalidad ? `${escapeHtml(t("detail_player_nationality"))}: ${escapeHtml(globales.nacionalidad)}` : "", globales?.nacimiento ? `${escapeHtml(t("detail_player_birth"))}: ${escapeHtml(globales.nacimiento)}` : ""].filter(Boolean).join(" · ")}</div>
            </div>
          </div>
        </div>
        ${jugador.error ? `<div class="partido-detalle-empty small">${escapeHtml(jugador.error)}</div>` : ""}
      </section>
      <section class="partido-detalle-section partido-detalle-player-events-card">
        <div class="partido-detalle-section-title">${escapeHtml(t("detail_match"))}</div>
        <div class="partido-detalle-player-section-body">
          ${partidoChips ? `<div class="alineacion-chips partido-detalle-player-chips partido-detalle-player-chips-compact">${partidoChips}</div>` : `<div class="alineacion-chips partido-detalle-player-chips partido-detalle-player-chips-compact"><span class="partido-detalle-skeleton skeleton-chip"></span><span class="partido-detalle-skeleton skeleton-chip"></span></div>`}
          <div class="partido-detalle-player-events-list">${timeline}</div>
        </div>
      </section>
      <section class="partido-detalle-section partido-detalle-player-events-card">
        <div class="partido-detalle-section-title">${escapeHtml(t("detail_player_statistics"))}</div>
        <div class="partido-detalle-player-block ${hasGlobales ? "is-ready" : "is-loading"}">
          <div class="partido-detalle-player-block-loading partido-detalle-player-competitions">
            <div class="partido-detalle-player-competition partido-detalle-player-competition-skeleton">
              <div class="partido-detalle-player-competition-bar">
                <div class="partido-detalle-player-competition-summary-main">
                  <span class="partido-detalle-skeleton skeleton-line skeleton-line-sm"></span>
                  <span class="partido-detalle-skeleton skeleton-line skeleton-line-xs"></span>
                </div>
                <div class="partido-detalle-player-competition-summary-side">
                  <span class="partido-detalle-skeleton skeleton-chip"></span>
                </div>
              </div>
              <div class="partido-detalle-player-history-list-skeleton">
                <div class="partido-detalle-player-history-row partido-detalle-player-history-row-skeleton"><span class="partido-detalle-skeleton skeleton-line skeleton-line-lg"></span><span class="partido-detalle-skeleton skeleton-line skeleton-line-md"></span></div>
                <div class="partido-detalle-player-history-row partido-detalle-player-history-row-skeleton"><span class="partido-detalle-skeleton skeleton-line skeleton-line-lg"></span><span class="partido-detalle-skeleton skeleton-line skeleton-line-sm"></span></div>
              </div>
            </div>
          </div>
          <div class="partido-detalle-player-block-content">
            ${competicionesHtml ? `<div class="partido-detalle-player-competitions">${competicionesHtml}</div>` : `<div class="partido-detalle-empty small">${escapeHtml(t("detail_no_matches_available"))}</div>`}
          </div>
        </div>
      </section>
    </div>
  `;
}

/**
 * Hidrata las estadísticas globales del jugador seleccionado y relanza el render.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @param {HTMLElement} headerEl Contenedor de cabecera del modal.
 * @param {HTMLElement} bodyEl Contenedor principal del modal.
 * @returns {Promise<void>} Promesa resuelta cuando termina la carga del jugador.
 */
async function hydrateJugadorStats(state, headerEl, bodyEl) {
  const jugador = state.selectedJugador;
  if (!jugador?.idLicencia) {
    jugador.loading = false;
    jugador.error = t("detail_player_no_license");
    renderAll(state, headerEl, bodyEl);
    return;
  }

  try {
    const statsRes = await getEstadisticaJugador(jugador.idLicencia);
    jugador.statsGlobales = getPlayerStatsData(statsRes);
    console.log("[Detalle jugador] statsGlobales", {
      idLicencia: jugador.idLicencia,
      nombre: jugador.statsGlobales?.nombre,
      competiciones: emptyArray(jugador.statsGlobales?.competiciones).length,
      filasPorCompeticion: emptyArray(jugador.statsGlobales?.competiciones).map((comp) => ({
        titulo: comp?.titulo,
        filas: emptyArray(comp?.filas).length,
      })),
      raw: jugador.statsGlobales,
    });
    jugador.error = jugador.statsGlobales ? "" : t("detail_player_load_error");
  } catch (error) {
    jugador.error = error?.message || t("detail_player_load_error");
  } finally {
    jugador.loading = false;
    renderAll(state, headerEl, bodyEl);
  }
}


/**
 * Fuerza el scroll del modal y del contenedor de contenido al inicio.
 *
 * @param {HTMLElement} bodyEl Contenedor principal del modal.
 * @returns {void}
 */
function scrollDetalleToTop(bodyEl) {
  const modal = bodyEl?.closest?.(".partido-detalle-modal");
  const shellEl = modal?.querySelector?.(".partido-detalle-shell");
  if (shellEl) shellEl.scrollTop = 0;
  if (bodyEl) bodyEl.scrollTop = 0;
}

/**
 * Espera al siguiente frame de render del navegador.
 *
 * @returns {Promise<void>} Promesa resuelta en el siguiente requestAnimationFrame.
 */
function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Ejecuta la transición animada entre la vista principal del partido y una subvista.
 *
 * @param {HTMLElement} bodyEl Contenedor principal del modal.
 * @param {() => Promise<void>|void} mutateAndRender Callback que muta estado y relanza el render.
 * @param {string} [direction="forward"] Dirección visual de la transición.
 * @returns {Promise<void>} Promesa resuelta al finalizar la transición.
 */
async function transitionDetalleView(bodyEl, mutateAndRender, direction = "forward") {
  if (!bodyEl) {
    await mutateAndRender();
    return;
  }

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduceMotion) {
    await mutateAndRender();
    return;
  }

  const activeView = bodyEl.firstElementChild;
  if (activeView) {
    activeView.classList.remove("subview-enter", "subview-enter-back");
    activeView.classList.add(direction === "back" ? "subview-leave-back" : "subview-leave");
    await new Promise((resolve) => window.setTimeout(resolve, 180));
  }

  await mutateAndRender();
  scrollDetalleToTop(bodyEl);
  await nextFrame();
  await nextFrame();

  const nextView = bodyEl.firstElementChild;
  if (nextView) {
    nextView.classList.remove("subview-leave", "subview-leave-back");
    nextView.classList.add(direction === "back" ? "subview-enter-back" : "subview-enter");
  }
}

/**
 * Añade comportamiento animado a los acordeones de competiciones del jugador.
 *
 * @param {HTMLElement} rootEl Nodo raíz de la subvista de jugador.
 * @returns {void}
 */
function bindPlayerAccordions(rootEl) {
  rootEl.querySelectorAll(".partido-detalle-player-competition").forEach((detailsEl) => {
    if (detailsEl.dataset.accordionBound === "true") return;
    detailsEl.dataset.accordionBound = "true";

    const summaryEl = detailsEl.querySelector(".partido-detalle-player-competition-bar");
    const contentEl = detailsEl.querySelector(".partido-detalle-player-history-list");
    if (!summaryEl || !contentEl) return;

    if (detailsEl.open) {
      contentEl.style.height = "auto";
      contentEl.style.opacity = "1";
    } else {
      contentEl.style.height = "0px";
      contentEl.style.opacity = "0";
    }

    let animation = null;

    summaryEl.addEventListener("click", (event) => {
      event.preventDefault();
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      if (reduceMotion) {
        detailsEl.open = !detailsEl.open;
        contentEl.style.height = detailsEl.open ? "auto" : "0px";
        contentEl.style.opacity = detailsEl.open ? "1" : "0";
        return;
      }

      const isOpening = !detailsEl.open;
      const startHeight = `${contentEl.offsetHeight}px`;

      if (animation) animation.cancel();

      if (isOpening) {
        detailsEl.open = true;
        const endHeight = `${contentEl.scrollHeight}px`;
        contentEl.style.overflow = "hidden";
        contentEl.style.height = startHeight === "0px" ? "0px" : startHeight;
        contentEl.style.opacity = "0";
        animation = contentEl.animate(
          [
            { height: "0px", opacity: 0 },
            { height: endHeight, opacity: 1 },
          ],
          {
            duration: 320,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards",
          },
        );
        animation.onfinish = () => {
          contentEl.style.height = "auto";
          contentEl.style.opacity = "1";
          contentEl.style.overflow = "visible";
          animation = null;
        };
      } else {
        const measuredStart = startHeight === "0px" ? `${contentEl.scrollHeight}px` : startHeight;
        contentEl.style.overflow = "hidden";
        contentEl.style.height = measuredStart;
        contentEl.style.opacity = "1";
        animation = contentEl.animate(
          [
            { height: measuredStart, opacity: 1 },
            { height: "0px", opacity: 0 },
          ],
          {
            duration: 280,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards",
          },
        );
        animation.onfinish = () => {
          detailsEl.open = false;
          contentEl.style.height = "0px";
          contentEl.style.opacity = "0";
          contentEl.style.overflow = "hidden";
          animation = null;
        };
      }
    });
  });
}

/**
 * Fusiona dos objetos priorizando los valores útiles del nuevo payload.
 *
 * @param {object|null} prev Estado previo normalizado.
 * @param {object|null} next Nuevo bloque de datos normalizado.
 * @returns {object|null} Objeto fusionado.
 */
function mergeTruthy(prev, next) {
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
function updatePartido(state, payload) {
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
function updateEstadisticaPayload(state, payload) {
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
function updateEventos(state, payload) {
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
function updatePenaltis(state, payload) {
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
function updateAlineaciones(state, payload) {
  const parsed = parseApiArrayResponse(payload);
  if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === "object") {
    state.alineaciones = parsed[0];
  } else if (parsed && typeof parsed === "object") {
    state.alineaciones = parsed;
  } else {
    state.alineaciones = null;
  }
}

/**
 * Carga el detalle completo del partido, engancha SignalR y activa el render reactivo del modal.
 *
 * @param {string|number} idPartido Identificador del partido a cargar.
 * @returns {Promise<void>} Promesa resuelta al terminar la carga inicial.
 */
async function cargarDetallePartido(idPartido) {
  console.log("[SignalR] Esperando disponibilidad de window.hubProxy...");
  const start = Date.now();
  while (!window.hubProxy) {
    if (Date.now() - start > 4000) throw new Error("SignalR hubProxy no disponible");
    await new Promise((res) => setTimeout(res, 50));
  }

  console.log("[SignalR] hubProxy disponible:", window.hubProxy);
  console.log("[SignalR] Esperando conexión activa del hub...");
  await waitForSignalRConnected();
  console.log("[SignalR] Hub conectado:", $.connection.hub);

  const headerEl = document.getElementById("partido-detalle-header-content");
  const bodyEl = document.getElementById("partido-detalle-body");
  const state = createDetalleState(idPartido);
  window.__partidoDetalleId = String(idPartido);
  window.__partidoDetalleState = state;

  setHeaderContent(headerEl, escapeHtml(t("loading")), "init-loading");
  ensureBaseLayout(bodyEl, state);
  renderAll(state, headerEl, bodyEl);

  const partidoRes = await getPartido(idPartido);
  console.log("[API] getPartido", partidoRes);
  const partidoData = parseApiArrayResponse(partidoRes);
  if (Array.isArray(partidoData) && partidoData.length > 0) {
    updatePartido(state, partidoData[0]);
    state.loadingMatch = false;
    setHeaderContent(headerEl, renderPartidoHeader(state), "getPartido");
  } else if (partidoRes?.error) {
    setHeaderContent(headerEl, `<div>${escapeHtml(t("error", partidoRes.message || t("detail_match_load_error")))}</div>`, "getPartido-error");
  } else {
    state.loadingMatch = false;
    setHeaderContent(headerEl, `<div>${escapeHtml(t("detail_match_no_data"))}</div>`, "getPartido-empty");
  }

  const estadistica = await getEstadisticaPartido(idPartido);
  console.log("[API] getEstadisticaPartido", estadistica);
  updateEstadisticaPayload(state, estadistica);
  state.loadingStats = false;
  renderAll(state, headerEl, bodyEl);

  console.log("[SignalR] Suscribiendo modal al bus global del hub...");
  window.__partidoDetalleUnsub = subscribePartidoHubEvents(({ type, payload, idPartido: incomingId }) => {
    if (!incomingId || String(incomingId) !== String(idPartido)) return;
    console.log(`[SignalR] EVENT modal desde bus: ${type} para partido ${incomingId}`, payload);
    switch (type) {
      case "marcadorPartido":
      case "recibirMarcadorPartido":
      case "cronoPartido":
        updatePartido(state, payload);
        break;
      case "eventosPartido":
      case "recibirEventosIniciales":
        updateEventos(state, payload);
        break;
      case "penaltisPartido":
      case "recibirPenaltisIniciales":
        updatePenaltis(state, payload);
        break;
      case "alineacionPartido":
      case "recibirAlinIniciales":
        updateAlineaciones(state, payload);
        break;
      default:
        return;
    }
    renderAll(state, headerEl, bodyEl);
  });
  console.log("[SignalR] Modal suscrito al bus global del hub.");
  if (window.hubProxy.server.unirseAPartido) {
    try {
      console.log("[SignalR] Llamando a unirseAPartido en el hub:", idPartido);
      const modalidad = state.modalidad || "hp";
      window.hubProxy.server
        .unirseAPartido(idPartido, modalidad)
        .done((eventosActuales) => {
          console.log(`[SignalR] Unido al partido ${idPartido} con modalidad '${modalidad}'. Eventos actuales:`, eventosActuales);
        })
        .fail((err) => {
          console.error("[SignalR] Error al unirse al partido:", err);
        });
    } catch (err) {
      console.error("[SignalR] Error llamando a unirseAPartido:", err);
    }
  } else {
    console.error("[SignalR] Método unirseAPartido no disponible en hubProxy.server.");
  }
}

function renderResumen(state) {
  const p = state.partido;
  if (!p) return `<div class="partido-detalle-empty">${escapeHtml(t("detail_summary_title"))}</div>`;

  const resumen = buildStatsSummary(state.statsResumen);
  const rows = [
    { label: t("detail_goals"), local: resumen.golesLocal, visit: resumen.golesVisit },
    { label: t("detail_fouls"), local: resumen.faltasLocal, visit: resumen.faltasVisit },
    { label: t("detail_blue_cards"), local: resumen.azulesLocal, visit: resumen.azulesVisit },
    { label: t("detail_red_cards"), local: resumen.rojasLocal, visit: resumen.rojasVisit },
  ];

  return `
    <div class="partido-detalle-section">
      <div class="partido-detalle-section-title">${escapeHtml(t("detail_summary_title"))}</div>
      <div class="partido-detalle-summary-table-wrap">
        <table class="partido-detalle-summary-table">
          <thead>
            <tr>
              <th></th>
              <th>${escapeHtml(p.localAbrev || "LOC")}</th>
              <th>${escapeHtml(p.visitAbrev || "VIS")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <th scope="row">${escapeHtml(row.label)}</th>
                <td>${escapeHtml(row.local)}</td>
                <td>${escapeHtml(row.visit)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildStatsSummary(stats) {
  const pick = (type, side) => stats.find((s) => s.IdTipoEvento === type && Number(s.LocalVisit) === side)?.Total ?? 0;
  return {
    golesLocal: pick("gol", 1),
    golesVisit: pick("gol", 2),
    faltasLocal: pick("falta", 1) || pick("faltahl", 1),
    faltasVisit: pick("falta", 2) || pick("faltahl", 2),
    azulesLocal: pick("tarjetaazul", 1),
    azulesVisit: pick("tarjetaazul", 2),
    rojasLocal: pick("tarjetaroja", 1),
    rojasVisit: pick("tarjetaroja", 2),
  };
}

function renderPenaltis(state) {
  const penaltis = state.penaltis;
  if (!Array.isArray(penaltis) || !penaltis.length) {
    return `<div class="partido-detalle-empty">${escapeHtml(t("detail_penalty_shots_none"))}</div>`;
  }

  const localId = state.localKey != null ? String(state.localKey) : null;
  const visitId = state.visitKey != null ? String(state.visitKey) : null;
  const local = penaltis.filter((p) => localId && String(p.IdEquipo) === localId);
  const visit = penaltis.filter((p) => visitId && String(p.IdEquipo) === visitId);
  const rest = !localId && !visitId ? penaltis : [];

  return `
    <div class="penaltis-grid">
      ${renderPenaltisColumn(state.partido?.local || t("detail_local"), local.length ? local : rest)}
      ${visit.length ? renderPenaltisColumn(state.partido?.visit || t("detail_visitor"), visit) : ""}
    </div>
  `;
}

function renderPenaltisColumn(title, items) {
  return `
    <section class="partido-detalle-section">
      <div class="partido-detalle-section-title">${escapeHtml(title)}</div>
      <div class="penaltis-column">
        ${items.map((p) => {
          const icon = p.Gol === true ? "✔" : p.Gol === false ? "✘" : "□";
          const cls = p.Gol === true ? "ok" : p.Gol === false ? "bad" : "neutral";
          return `<div class="penalti-row"><span class="penalti-dorsal">${escapeHtml(p.Dorsal ?? "")}</span><span class="penalti-nombre">${escapeHtml(p.NombreApellidos ?? "")}</span><span class="penalti-estado ${cls}">${icon}</span></div>`;
        }).join("")}
      </div>
    </section>
  `;
}
