import { t } from "../i18n.js";
import {
  callPartidoHubServerMethod,
  getEstadisticaPartido,
  getPartido,
  subscribePartidoHubEvents,
} from "../services.js";
import { renderPartidoHeader, renderPartidoHeaderSkeleton } from "./partidoDetalleRender.js";
import {
  createDetalleState,
  escapeHtml,
  getCurrentView,
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
import { ensureBaseLayout } from "./partidoDetalleTabs.js";
import { mountDetalleModalShell } from "./detalleModalShell.js";
import { bindEquipoMatchLinks, renderEquipoDetalleHeader, renderEquipoSubview } from "./equipoDetalleSubview.js";

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
 * Construye y monta el modal base del detalle de partido en el DOM.
 *
 * @returns {HTMLDivElement} Nodo raíz del modal recién montado.
 */
function mountPartidoDetalleModal(options = {}) {
  const { instantOpen = false } = options;
  return mountDetalleModalShell({
    rootClassName: "partido-detalle-modal",
    shellClassName: "partido-detalle-shell",
    headerClassName: "partido-detalle-header",
    bodyClassName: "partido-detalle-body",
    headerContentClassName: "partido-detalle-header-content",
    showBack: true,
    showClose: true,
    backAriaLabel: "Volver",
    closeAriaLabel: "Cerrar",
    contentIdPrefix: "partido-detalle",
    instantOpen,
  }).modal;
}

/**
 * Conecta los controles básicos del modal ya montado.
 *
 * @param {HTMLDivElement} modal Nodo raíz del modal.
 * @returns {void}
 */
function bindPartidoDetalleModalControls(modal) {
  modal.querySelector(".partido-detalle-close").onclick = () => closePartidoDetalle();
  modal.querySelector(".partido-detalle-back").onclick = async () => {
    const returnContext = window.__teamDetailReturnContext;
    if (returnContext?.equipo) {
      window.__teamDetailReturnContext = null;
      const currentModal = document.querySelector(".partido-detalle-modal");
      const mod = await import("./equipoDetalleModal.js");
      await mod.openEquipoDetalle(returnContext.equipo, { preserveBodyLock: true, skipCloseExisting: true });
      requestAnimationFrame(() => {
        currentModal?.remove();
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
      });
      return;
    }

    const state = window.__partidoDetalleState;
    if (!getViewStack(state).length && !(state?.parentView && getCurrentView(state) === "partido")) return;
    const headerEl = document.getElementById("partido-detalle-header-content");
    const bodyEl = document.getElementById("partido-detalle-body");

    if (state?.parentView === "equipo" && getCurrentView(state) === "partido") {
      state.navigation.viewStack = [];
      state.parentView = null;
      await transitionDetalleView(bodyEl, async () => {
        setCurrentView(state, "equipo");
        renderAll(state, headerEl, bodyEl);
      }, "back");
      syncMobileBackState();
      return;
    }

    await transitionDetalleView(bodyEl, async () => {
      setCurrentView(state, popView(state) || "partido");
      renderAll(state, headerEl, bodyEl);
    }, "back");
    syncMobileBackState();
  };
}

/**
 * Abre el modal de detalle de un partido y arranca su ciclo de carga.
 *
 * @param {string|number} idPartido Identificador del partido a abrir.
 * @returns {void}
 */
export function openPartidoDetalle(idPartido, options = {}) {
  const { preserveBodyLock = false, skipCloseExisting = false, initialState = null, initialHeaderHtml = "" } = options;
  if (!skipCloseExisting) {
    closePartidoDetalle({ immediate: true, preserveBodyLock });
  }
  const modal = mountPartidoDetalleModal({ instantOpen: skipCloseExisting });
  bindPartidoDetalleModalControls(modal);

  const returnContext = window.__teamDetailReturnContext;
  const backBtn = modal.querySelector(".partido-detalle-back");
  if (returnContext?.equipo && backBtn instanceof HTMLButtonElement) {
    backBtn.hidden = false;
    backBtn.disabled = false;
  }

  const headerEl = modal.querySelector("#partido-detalle-header-content");
  const bodyEl = modal.querySelector("#partido-detalle-body");
  if (headerEl instanceof HTMLElement && bodyEl instanceof HTMLElement) {
    if (initialState && getCurrentView(initialState) === "equipo") {
      headerEl.innerHTML = initialHeaderHtml;
    } else {
      headerEl.innerHTML = renderPartidoHeaderSkeleton();
      ensureBaseLayout(bodyEl, createDetalleState(idPartido));
    }
  }

  if (initialState && getCurrentView(initialState) === "equipo") {
    window.__partidoDetalleState = initialState;
    if (headerEl instanceof HTMLElement && bodyEl instanceof HTMLElement) {
      renderAll(initialState, headerEl, bodyEl);
    }
    return;
  }

  void cargarDetallePartido(idPartido, initialState, headerEl, bodyEl);
}

/**
 * Cierra el modal de detalle de partido y libera sus recursos asociados.
 *
 * @param {object} [options={}] Opciones de cierre.
 * @param {boolean} [options.immediate=false] Si es true, evita la animación de salida.
 * @returns {void}
 */
export function closePartidoDetalle(options = {}) {
  const { immediate = false, preserveBodyLock = false } = options;
  const modal = document.querySelector(".partido-detalle-modal");
  if (!modal) return;
  if (modal.dataset.closing === "true") return;

  const cleanup = () => {
    modal.remove();
    if (!preserveBodyLock) {
      document.body.classList.remove("modal-abierto");
    }
    if (window.signalR?.enDirecto?.server?.salirDePartido && window.__partidoDetalleId) {
      callPartidoHubServerMethod("salirDePartido", window.__partidoDetalleId);
    }
    if (window.__partidoDetalleUnsub) {
      window.__partidoDetalleUnsub();
      window.__partidoDetalleUnsub = null;
    }
    window.__partidoDetalleId = null;
    window.__partidoDetalleState = null;
    window.__teamDetailReturnContext = null;
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
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Espera a que el proxy global legacy de SignalR exista.
 *
 * @param {number} [timeout=4000] Tiempo máximo de espera en milisegundos.
 * @returns {Promise<void>} Promesa resuelta cuando `window.hubProxy` está disponible.
 */
async function waitForSignalRProxy(timeout = 4000) {
  console.log("[SignalR] Esperando disponibilidad de window.hubProxy...");
  const start = Date.now();
  while (!window.hubProxy) {
    if (Date.now() - start > timeout) {
      throw new Error("SignalR hubProxy no disponible");
    }
    await delay(50);
  }
  console.log("[SignalR] hubProxy disponible:", window.hubProxy);
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
    await delay(50);
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
  window.__partidoDetalleRenderAll = renderAll;
  renderDetalleState(
    state,
    headerEl,
    bodyEl,
    setHeaderContent,
    renderSubview,
    renderSubviewHeader,
    bindPlayerLinks,
    hydrateJugadorStats,
    renderAll,
    bindTeamInteractions,
  );
}

/**
 * Renderiza la subvista activa distinta de la vista principal del partido.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @returns {string} HTML de la subvista activa.
 */
function renderSubview(state) {
  if (getCurrentView(state) === "equipo") {
    return renderEquipoSubview(state);
  }
  return renderDetalleSubview(state);
}

function renderSubviewHeader(state) {
  if (getCurrentView(state) === "equipo" && state.selectedEquipo) {
    return renderEquipoDetalleHeader(state.selectedEquipo, state.teamCompetitionName || "");
  }
  if (getCurrentView(state) === "jugador") {
    return renderJugadorHeader(state);
  }
  return renderPartidoHeader(state);
}

function bindTeamInteractions(rootEl, state, headerEl, bodyEl, renderAllFn) {
  if (getCurrentView(state) === "equipo") {
    bindEquipoMatchLinks(rootEl, state, headerEl, bodyEl, renderAllFn, openMatchInSharedModal);
  }
}

async function openMatchInSharedModal(state, partido, headerEl, bodyEl, renderAllFn) {
  state.parentView = getCurrentView(state);
  state.idPartido = String(partido.IdPartido);
  state.partido = null;
  state.eventos = [];
  state.alineaciones = null;
  state.penaltis = [];
  state.statsResumen = [];
  state.localKey = null;
  state.visitKey = null;
  state.loadingMatch = true;
  state.loadingStats = true;
  state.selectedJugador = null;

  await transitionDetalleView(bodyEl, async () => {
    setCurrentView(state, "partido");
    renderAllFn(state, headerEl, bodyEl);
  }, "forward");

  await cargarDetallePartido(partido.IdPartido, state, headerEl, bodyEl);
}

async function cargarDetallePartido(idPartido, stateOverride = null, headerOverride = null, bodyOverride = null) {
  await waitForSignalRProxy();
  console.log("[SignalR] Esperando conexión activa del hub...");
  await waitForSignalRConnected();
  console.log("[SignalR] Hub conectado:", $.connection.hub);

  const headerEl = headerOverride || document.getElementById("partido-detalle-header-content");
  const bodyEl = bodyOverride || document.getElementById("partido-detalle-body");
  const state = stateOverride || createDetalleState(idPartido);
  state.idPartido = String(idPartido);
  window.__partidoDetalleId = String(idPartido);
  window.__partidoDetalleState = state;

  if (getCurrentView(state) === "equipo" && state.selectedEquipo) {
    setHeaderContent(headerEl, renderEquipoDetalleHeader(state.selectedEquipo, state.teamCompetitionName || ""), "equipo-header");
  } else {
    setHeaderContent(headerEl, escapeHtml(t("loading")), "init-loading");
  }
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

