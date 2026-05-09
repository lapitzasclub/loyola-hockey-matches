
"use strict";
import { initApp } from "./init.js";
import { emitPartidoHubEvent } from "../signalrBus.js";
import { getEquipoSeleccionado, getEquiposLoyola } from "../state/equipos.js";
import { isNative } from "../utils/env.js";

function isLocalDev() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function getSignalRBaseUrl() {
  if (isNative()) {
    return "https://digitalsport.online/signalr";
  }
  if (isLocalDev()) {
    return "/signalr";
  }
  return window.location.href.includes("digitalsport.online")
    ? "https://ns.digitalsport.online/signalr"
    : "https://digitalsport.online/signalr";
}

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

async function ensureSignalRHubsLoaded() {
  if (window.$?.connection?.enDirecto) return;
  const hubsUrl = `${getSignalRBaseUrl()}/hubs`;
  await loadScript(hubsUrl);
}

function getSelectedModalidad() {
  const selected = getEquipoSeleccionado();
  if (!selected) return "hp";
  const [idComp] = selected.split("|");
  const eq = getEquiposLoyola().find((item) => String(item.idCompeticion) === String(idComp));
  return eq?.modalidad || "hp";
}

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
  client.marcadorPartido = (resultados, idpartido) => {
    console.log("[SignalR] EVENT global: marcadorPartido", { idpartido, resultados });
    emitPartidoHubEvent("marcadorPartido", resultados, idpartido);
  };
  client.eventosPartido = (resultados, idpartido) => {
    console.log("[SignalR] EVENT global: eventosPartido", { idpartido, resultados });
    emitPartidoHubEvent("eventosPartido", resultados, idpartido);
  };
  client.penaltisPartido = (resultados, idpartido) => {
    console.log("[SignalR] EVENT global: penaltisPartido", { idpartido, resultados });
    emitPartidoHubEvent("penaltisPartido", resultados, idpartido);
  };
  client.alineacionPartido = (resultados, idpartido) => {
    console.log("[SignalR] EVENT global: alineacionPartido", { idpartido, resultados });
    emitPartidoHubEvent("alineacionPartido", resultados, idpartido);
  };
  client.cronoPartido = (resultados, idpartido) => {
    console.log("[SignalR] EVENT global: cronoPartido", { idpartido, resultados });
    emitPartidoHubEvent("cronoPartido", resultados, idpartido);
  };
  client.recibirEventosIniciales = (datosActuales, idpartido) => {
    console.log(`[SignalR] EVENT global: recibirEventosIniciales para partido ${idpartido}`, datosActuales);
    emitPartidoHubEvent("recibirEventosIniciales", datosActuales, idpartido);
  };
  client.recibirPenaltisIniciales = (datosActuales, idpartido) => {
    console.log(`[SignalR] EVENT global: recibirPenaltisIniciales para partido ${idpartido}`, datosActuales);
    emitPartidoHubEvent("recibirPenaltisIniciales", datosActuales, idpartido);
  };
  client.recibirAlinIniciales = (datosActuales, idpartido) => {
    console.log(`[SignalR] EVENT global: recibirAlinIniciales para partido ${idpartido}`, datosActuales);
    emitPartidoHubEvent("recibirAlinIniciales", datosActuales, idpartido);
  };
  client.recibirMarcadorPartido = (resultados, idpartido) => {
    console.log(`[SignalR] EVENT global: recibirMarcadorPartido para partido ${idpartido}`, resultados);
    emitPartidoHubEvent("recibirMarcadorPartido", resultados, idpartido);
  };

  let reconnectTimer = null;

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

window.addEventListener("DOMContentLoaded", async () => {
  await initApp();
  await initSignalR();
});
