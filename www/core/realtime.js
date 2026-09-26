// realtime.js
// Capa de tiempo real sobre Centrifugo (reemplaza el SignalR muerto de la plataforma antigua).
//
// Contrato confirmado en vivo (2026-09-26, partido de la Copa Liga Norte en juego):
//   GET /api/auth/config                                 -> { centrifugoWsUrl }
//   GET /api/auth/centrifugo-token-public                -> token de CONEXIÓN (sub:"")
//   GET /api/auth/centrifugo-sub-token?channel=<canal>   -> token de SUSCRIPCIÓN por canal (claim `channel`)
//   WS  wss://fvpatinaje.eus/connection/websocket        -> Centrifugo
//
// El canal de un partido es `acta_<idPartido>` (namespace por defecto: exige token de suscripción;
// sin él Centrifugo responde 103 permission denied). Las publicaciones tienen forma
// `{ type, ...campos }`. Ante cualquier evento relevante refrescamos el detalle vía REST y lo
// reemitimos por el bus interno (`emitLivePartidoRefresh`), de modo que el detalle de partido lo
// consume igual que antes. Refrescar sobre REST evita mantener estado incremental frágil y
// garantiza consistencia con el marcador (que se calcula contando incidencias GOL).

import { Centrifuge } from "centrifuge";
import { emitLivePartidoRefresh } from "../services.js";
import { getApiBaseUrl } from "../servicesShared.js";

let client = null;
const subscriptions = new Map();
const refreshTimers = new Map();

// Tipos de mensaje que implican un cambio en marcador/eventos/alineaciones del partido.
const TIPOS_RELEVANTES = new Set([
  "incidencia_creada",
  "incidencia_eliminada",
  "periodo_actualizado",
  "acta_cerrada",
  "acta_reabierta",
  "alineacion_actualizada",
  "atleta_verificado",
]);

/**
 * Obtiene la configuración pública de Centrifugo.
 *
 * @returns {Promise<{centrifugoWsUrl:string}|null>}
 */
async function fetchConfig() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/config`, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Pide el token público de CONEXIÓN (sin canal).
 *
 * @returns {Promise<string|null>} Token o null.
 */
async function fetchConnectionToken() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/centrifugo-token-public`, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data === "string" ? data : data?.token || null;
  } catch {
    return null;
  }
}

/**
 * Pide el token de SUSCRIPCIÓN para un canal concreto (obligatorio en el namespace por defecto).
 *
 * @param {string} channel Nombre del canal.
 * @returns {Promise<string>} Token de suscripción.
 */
async function fetchSubscriptionToken(channel) {
  const res = await fetch(`${getApiBaseUrl()}/auth/centrifugo-sub-token?channel=${encodeURIComponent(channel)}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Token de suscripción rechazado para ${channel}`);
  const data = await res.json();
  const token = typeof data === "string" ? data : data?.token;
  if (!token) throw new Error(`Token de suscripción vacío para ${channel}`);
  return token;
}

/**
 * Construye el nombre de canal Centrifugo de un partido.
 *
 * @param {string} idPartido Identificador del partido.
 * @returns {string} Nombre de canal.
 */
function channelForMatch(idPartido) {
  return `acta_${idPartido}`;
}

/**
 * Programa un refresco del detalle del partido, coalesciendo ráfagas de eventos
 * (p. ej. muchas incidencias seguidas) en una única petición REST.
 *
 * @param {string} idPartido Identificador del partido.
 * @returns {void}
 */
function scheduleRefresh(idPartido) {
  if (refreshTimers.has(idPartido)) return;
  const timer = setTimeout(() => {
    refreshTimers.delete(idPartido);
    emitLivePartidoRefresh(idPartido);
  }, 800);
  refreshTimers.set(idPartido, timer);
}

/**
 * Inicializa la conexión de tiempo real. No bloquea ni lanza si la config no está disponible.
 *
 * @returns {Promise<void>}
 */
export async function initRealtime() {
  globalThis.__fvpRealtime = {
    registerHandlers: () => {},
    callServerMethod: (method, ...args) => callServerMethod(method, ...args),
  };

  const config = await fetchConfig();
  if (!config?.centrifugoWsUrl) {
    console.warn("[Realtime] Sin configuración de Centrifugo; directo inactivo (los datos REST siguen funcionando).");
    return;
  }

  try {
    client = new Centrifuge(config.centrifugoWsUrl, {
      getToken: () => fetchConnectionToken(),
    });
    client.on("error", (ctx) => console.warn("[Realtime] Error de cliente Centrifugo:", ctx?.error?.message || ctx));
    client.connect();
  } catch (error) {
    console.warn("[Realtime] No se pudo conectar a Centrifugo:", error);
    client = null;
  }
}

/**
 * Se suscribe al canal de un partido y refresca el detalle ante cada evento relevante.
 *
 * @param {string} idPartido Identificador del partido.
 * @returns {void}
 */
function joinMatch(idPartido) {
  if (!client || subscriptions.has(idPartido)) return;
  try {
    const channel = channelForMatch(idPartido);
    const sub = client.newSubscription(channel, {
      getToken: () => fetchSubscriptionToken(channel),
    });
    sub.on("publication", (ctx) => {
      const type = ctx?.data?.type;
      if (typeof type === "string" && TIPOS_RELEVANTES.has(type)) {
        scheduleRefresh(idPartido);
      }
    });
    sub.on("subscribed", () => scheduleRefresh(idPartido));
    sub.on("error", (ctx) => console.warn(`[Realtime] Error en canal ${channel}:`, ctx?.error?.message || ctx));
    sub.subscribe();
    subscriptions.set(idPartido, sub);
  } catch (error) {
    console.warn("[Realtime] No se pudo unir al partido:", error);
  }
}

/**
 * Cancela la suscripción al canal de un partido.
 *
 * @param {string} idPartido Identificador del partido.
 * @returns {void}
 */
function leaveMatch(idPartido) {
  const timer = refreshTimers.get(idPartido);
  if (timer) {
    clearTimeout(timer);
    refreshTimers.delete(idPartido);
  }
  const sub = subscriptions.get(idPartido);
  if (!sub) return;
  try {
    sub.unsubscribe();
    sub.removeAllListeners?.();
    client?.removeSubscription?.(sub);
  } catch {}
  subscriptions.delete(idPartido);
}

/**
 * Implementa los métodos que la UI invoca (unirse/salir de partido).
 *
 * @param {string} method Nombre del método.
 * @param {...any} args Argumentos.
 * @returns {void}
 */
function callServerMethod(method, ...args) {
  const idPartido = args[0] != null ? String(args[0]) : "";
  if (!idPartido) return;
  if (method === "unirseAPartido") joinMatch(idPartido);
  else if (method === "salirDePartido") leaveMatch(idPartido);
}
