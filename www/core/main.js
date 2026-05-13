"use strict";
import { initApp } from "./init.js";
import { emitPartidoHubEvent } from "../services.js";
import { getEquipoSeleccionado, getEquiposLoyola } from "../state/equipos.js";
import { isNative } from "../utils/env.js";

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
 * Indica si la app se está ejecutando en desarrollo local web.
 *
 * @returns {boolean} True cuando el host es localhost o loopback.
 */
function isLocalDev() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

/**
 * Resuelve la URL base de SignalR según el entorno actual.
 *
 * @returns {string} URL base del hub SignalR.
 */
function getSignalRBaseUrl() {
  if (isNative()) {
    return "https://digitalsport.online/signalr";
  }
  if (isLocalDev()) {
    return "/signalr";
  }
  return "/signalr";
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
 * @returns {Promise<void>} Promesa resuelta cuando `window.$.connection.enDirecto` existe.
 */
async function ensureSignalRHubsLoaded() {
  if (window.$?.connection?.enDirecto) return;
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
  console.log("[SignalR] Intentando unirse a modalidad", {
    modalidad,
    hasHubProxy: !!window.hubProxy,
    hasServer: !!window.hubProxy?.server,
    hasJoinGroup: !!window.hubProxy?.server?.joinGroup,
    state: $.connection?.hub?.state,
  });
  if (!window.hubProxy?.server?.joinGroup) {
    console.warn("[SignalR] joinGroup no disponible en hubProxy.server");
    return;
  }
  if ($.connection.hub.state !== $.signalR.connectionState.connected) {
    console.warn("[SignalR] No se puede unir a la modalidad, conexión no activa.");
    return;
  }
  window.hubProxy.server
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
  if (!window.$?.connection?.hub) {
    console.warn("[SignalR] jQuery SignalR no disponible.");
    return;
  }

  try {
    await ensureSignalRHubsLoaded();
  } catch (err) {
    console.warn("[SignalR] No se pudo cargar /hubs:", err);
    return;
  }

  if (!window.$?.connection?.enDirecto) {
    console.warn("[SignalR] Hub enDirecto no disponible tras cargar /hubs.");
    return;
  }

  const signalrUrl = getSignalRBaseUrl();
  $.connection.hub.url = signalrUrl;
  window.hubProxy = $.connection.enDirecto;

  const client = window.hubProxy.client;
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
    }, 5000);
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
window.addEventListener("DOMContentLoaded", async () => {
  await initApp();
  await initSignalR();
});
