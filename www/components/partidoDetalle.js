import { t } from "../i18n.js";
import {
  callPartidoHubServerMethod,
  getEstadisticaPartido,
  getPartido,
  subscribePartidoHubEvents,
} from "../services.js";
import { renderPartidoHeader } from "./partidoDetalleRender.js";
import {
  createDetalleState,
  escapeHtml,
  getViewStack,
  parseApiArrayResponse,
  popView,
  setCurrentView,
} from "./partidoDetalleUtils.js";
import {
  updateAlineaciones,
  updateEstadisticaPayload,
  updateEventos,
  updatePartido,
  updatePenaltis,
} from "./partidoDetalleState.js";
import {
  hydrateJugadorStats,
  renderDetalleSubview,
  renderJugadorHeader,
} from "./partidoDetalleJugadorSubview.js";
import {
  syncMobileBackState,
  transitionDetalleView,
} from "./partidoDetalleNavigation.js";
import { bindPlayerLinks } from "./partidoDetallePlayerLinks.js";
import { renderAll as renderDetalleState } from "./partidoDetalleRenderCoordinator.js";

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
        <button class="partido-detalle-back" aria-label="Volver" hidden disabled>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M15.5 5 8.5 12l7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
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

/**
 * Re-renderiza el estado completo del modal delegando en el coordinador de render.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @param {HTMLElement} headerEl Contenedor de cabecera del modal.
 * @param {HTMLElement} bodyEl Contenedor principal de contenido del modal.
 * @returns {void}
 */
function renderAll(state, headerEl, bodyEl) {
  renderDetalleState(
    state,
    headerEl,
    bodyEl,
    setHeaderContent,
    renderSubview,
    renderJugadorHeader,
    bindPlayerLinks,
    hydrateJugadorStats,
    renderAll,
  );
}

/**
 * Renderiza la subvista activa distinta de la vista principal del partido.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @returns {string} HTML de la subvista activa.
 */
function renderSubview(state) {
  return renderDetalleSubview(state);
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
  renderAll(state, headerEl, bodyEl);

  const partidoRes = await getPartido(idPartido);
  console.log("[API] getPartido", partidoRes);
  const partidoData = parseApiArrayResponse(partidoRes);
  console.log("[API] getPartido parsed", partidoData);
  if (Array.isArray(partidoData) && partidoData.length > 0) {
    updatePartido(state, partidoData[0]);
    state.loadingMatch = false;
    setHeaderContent(headerEl, renderPartidoHeader(state), "getPartido");
  } else if (partidoRes?.error) {
    state.loadingMatch = false;
    setHeaderContent(headerEl, `<div>${escapeHtml(t("error", partidoRes.message || t("detail_match_load_error")))}</div>`, "getPartido-error");
  } else {
    console.warn("[Detalle] getPartido sin datos iniciales, se mantiene skeleton a la espera de estadística o realtime.", {
      idPartido,
      raw: partidoRes,
      parsed: partidoData,
    });
  }

  const estadistica = await getEstadisticaPartido(idPartido);
  console.log("[API] getEstadisticaPartido", estadistica);
  updateEstadisticaPayload(state, estadistica);
  state.loadingStats = false;
  if (state.partido) {
    state.loadingMatch = false;
  }
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

