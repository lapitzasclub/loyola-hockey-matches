"use strict";
import { initApp } from "./init.js";
import { emitPartidoHubEvent } from "../services.js";
import { getEquipoSeleccionado, getEquiposLoyola } from "../state/equipos.js";
import { getSignalRMode } from "../config/runtime.js";

/** Ruta base del proxy SignalR tanto en desarrollo local como en producción web. */
const SIGNALR_PROXY_PATH = "/signalr";

/** Tiempo de espera antes de reintentar la conexión SignalR tras una desconexión. */
const SIGNALR_RECONNECT_DELAY_MS = 5_000;

const SIGNALR_EVENT_NAMES = [
  "marcadorPartido",
  "eventosPartido",
  "penaltisPartido",
  "alineacionPartido",
  "cronoPartido",
  "recibirEventosIniciales",
  "recibirPenaltisIniciales",
  "recibirAlinIniciales",
  "recibirMarcadorPartido",
];

/**
 * Devuelve el proxy global actual del hub legacy, si existe.
 *
 * @returns {any} Proxy global del hub o null.
 */
function getHubProxy() {
  return globalThis.hubProxy || null;
}


/**
 * Resuelve la URL base de SignalR según el entorno actual.
 *
 * @returns {string} URL base del hub SignalR.
 */
function getSignalRBaseUrl() {
  if (getSignalRMode() === "direct") {
    return "https://digitalsport.online/signalr";
  }
  return SIGNALR_PROXY_PATH;
}

/**
 * Carga dinámicamente el script de hubs de SignalR reutilizando el mismo nodo.
 *
 * @param {string} src URL del script a cargar.
 * @returns {Promise<void>} Promesa resuelta cuando el script termina de cargar.
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.getElementById("signalr-hubs-script") || document.createElement("script");
    script.id = "signalr-hubs-script";
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    script.src = src;
    if (!script.parentNode) document.body.appendChild(script);
  });
}

/**
 * Garantiza que el script `/hubs` esté cargado antes de usar el proxy global.
 *
 * @returns {Promise<void>} Promesa resuelta cuando `globalThis.$.connection.enDirecto` existe.
 */
async function ensureSignalRHubsLoaded() {
  if (globalThis.$?.connection?.enDirecto) return;
  const hubsUrl = `${getSignalRBaseUrl()}/hubs`;
  await loadScript(hubsUrl);
}

/**
 * Obtiene la modalidad asociada al equipo actualmente seleccionado.
 *
 * @returns {string} Modalidad activa o `hp` como fallback.
 */
function getSelectedModalidad() {
  const selected = getEquipoSeleccionado();
  if (!selected) return "hp";
  const [idComp] = selected.split("|");
  const eq = getEquiposLoyola().find((item) => String(item.idCompeticion) === String(idComp));
  return eq?.modalidad || "hp";
}

/**
 * Pide al hub unirse al grupo de la modalidad seleccionada.
 *
 * @returns {void}
 */
function joinSelectedModalidad() {
  const modalidad = getSelectedModalidad();
  const hubProxy = getHubProxy();
  console.log("[SignalR] Intentando unirse a modalidad", {
    modalidad,
    hasHubProxy: !!hubProxy,
    hasServer: !!hubProxy?.server,
    hasJoinGroup: !!hubProxy?.server?.joinGroup,
    state: $.connection?.hub?.state,
  });
  if (!hubProxy?.server?.joinGroup) {
    console.warn("[SignalR] joinGroup no disponible en hubProxy.server");
    return;
  }
  if ($.connection.hub.state !== $.signalR.connectionState.connected) {
    console.warn("[SignalR] No se puede unir a la modalidad, conexión no activa.");
    return;
  }
  hubProxy.server
    .joinGroup(modalidad)
    .done(() => {
      console.log(`[SignalR] Unido a la modalidad ${modalidad}`);
    })
    .fail((err) => {
      console.error("[SignalR] Error al unirse a la modalidad:", err);
    });
}

/**
 * Registra los handlers globales del hub y arranca la conexión con reconexión.
 *
 * @returns {Promise<void>} Promesa resuelta tras lanzar la conexión inicial.
 */
async function initSignalR() {
  if (!globalThis.$?.connection?.hub) {
    console.warn("[SignalR] jQuery SignalR no disponible.");
    return;
  }

  try {
    await ensureSignalRHubsLoaded();
  } catch (err) {
    console.warn("[SignalR] No se pudo cargar /hubs:", err);
    return;
  }

  if (!globalThis.$?.connection?.enDirecto) {
    console.warn("[SignalR] Hub enDirecto no disponible tras cargar /hubs.");
    return;
  }

  const signalrUrl = getSignalRBaseUrl();
  $.connection.hub.url = signalrUrl;
  globalThis.hubProxy = $.connection.enDirecto;

  const client = getHubProxy()?.client;
  if (!client) {
    console.warn("[SignalR] Cliente del hub no disponible.");
    return;
  }
  SIGNALR_EVENT_NAMES.forEach((eventName) => {
    client[eventName] = (payload, idpartido) => {
      console.log(`[SignalR] EVENT global: ${eventName} para partido ${idpartido}`, payload);
      emitPartidoHubEvent(eventName, payload, idpartido);
    };
  });

  let reconnectTimer = null;

  /**
   * Lanza la conexión inicial del hub y engancha la unión a modalidad.
   *
   * @returns {void}
   */
  function iniciarConexion() {
    $.connection.hub
      .start()
      .done(() => {
        console.log("[SignalR] Conectado a Servidor");
        joinSelectedModalidad();
      })
      .fail((err) => {
        console.warn("[SignalR] No se pudo conectar:", err);
        intentarReconectar();
      });
  }

  /**
   * Programa un único reintento diferido de conexión.
   *
   * @returns {void}
   */
  function intentarReconectar() {
    if (reconnectTimer) return;
    console.log("[SignalR] Reintento en 5 segundos...");
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      iniciarConexion();
    }, SIGNALR_RECONNECT_DELAY_MS);
  }

  $.connection.hub.disconnected(() => {
    console.warn("[SignalR] Conexión perdida.");
    intentarReconectar();
  });

  $.connection.hub.reconnecting(() => {
    console.log("[SignalR] Reconectando...");
  });

  $.connection.hub.reconnected(() => {
    console.log("[SignalR] Reconectado al servidor.");
    joinSelectedModalidad();
  });

  iniciarConexion();
}

/**
 * Arranca la aplicación cuando el DOM ya está disponible.
 */
globalThis.addEventListener("DOMContentLoaded", async () => {
  await initApp();
  await initSignalR();
});
