// realtime.js
// Capa de tiempo real sobre Centrifugo (reemplaza el SignalR muerto de la plataforma antigua).
//
// La plataforma nueva expone:
//   GET /api/auth/config                              -> { centrifugoWsUrl }
//   GET /api/auth/centrifugo-token-public?channels=…  -> token público de conexión
//   WS  wss://fvpatinaje.eus/connection/websocket     -> Centrifugo
//
// Los mensajes de un partido en directo (marcador, eventos, penaltis, alineaciones) se
// reemiten sobre el bus interno vía `emitPartidoHubEvent`, de modo que el detalle de partido
// los consume igual que antes.
//
// Estado: el arranque nunca bloquea ni rompe la UI. La conexión sólo se activa si está
// disponible el cliente `Centrifuge` (global o dependencia). El nombre exacto del canal por
// partido y el esquema de los mensajes deben confirmarse con un partido en juego (la
// temporada T2627 acaba de empezar), y se ajustan en `channelForMatch`/`mapCentrifugoMessage`.

import { emitPartidoHubEvent } from "../services.js";
import { getApiBaseUrl } from "../servicesShared.js";

let client = null;
const subscriptions = new Map();

/**
 * Devuelve el cliente Centrifuge disponible en el entorno, si lo hay.
 *
 * @returns {any|null} Constructor `Centrifuge` o null.
 */
function getCentrifugeCtor() {
  return globalThis.Centrifuge || null;
}

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
 * Pide un token público de conexión para los canales indicados.
 *
 * @param {string[]} [channels=[]] Canales solicitados.
 * @returns {Promise<string|null>} Token o null.
 */
async function fetchToken(channels = []) {
  try {
    const query = channels.length ? `?channels=${encodeURIComponent(channels.join(","))}` : "";
    const res = await fetch(`${getApiBaseUrl()}/auth/centrifugo-token-public${query}`, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data === "string" ? data : data?.token || null;
  } catch {
    return null;
  }
}

/**
 * Construye el nombre de canal Centrifugo de un partido.
 * Pendiente de confirmar con un partido en juego; se ajusta aquí en un único punto.
 *
 * @param {string} idPartido Identificador del partido.
 * @returns {string} Nombre de canal.
 */
function channelForMatch(idPartido) {
  return `partido:${idPartido}`;
}

/**
 * Traduce un mensaje Centrifugo al par (tipo, payload) del bus interno.
 * Pendiente de confirmar el esquema real con datos en directo.
 *
 * @param {any} data Datos publicados en el canal.
 * @returns {{type:string, payload:any}|null}
 */
function mapCentrifugoMessage(data) {
  if (!data || typeof data !== "object") return null;
  const type = data.type || data.evento || data.kind;
  if (!type) return null;
  return { type, payload: data.payload ?? data.data ?? data };
}

/**
 * Inicializa la conexión de tiempo real. No bloquea ni lanza si no hay soporte.
 *
 * @returns {Promise<void>}
 */
export async function initRealtime() {
  globalThis.__fvpRealtime = {
    registerHandlers: () => {},
    callServerMethod: (method, ...args) => callServerMethod(method, ...args),
  };

  const Ctor = getCentrifugeCtor();
  if (!Ctor) {
    console.info("[Realtime] Cliente Centrifuge no disponible; el directo permanece inactivo (los datos REST siguen funcionando).");
    return;
  }

  const config = await fetchConfig();
  if (!config?.centrifugoWsUrl) {
    console.warn("[Realtime] Sin configuración de Centrifugo; directo inactivo.");
    return;
  }

  try {
    client = new Ctor(config.centrifugoWsUrl, {
      getToken: () => fetchToken(),
    });
    client.connect();
  } catch (error) {
    console.warn("[Realtime] No se pudo conectar a Centrifugo:", error);
    client = null;
  }
}

/**
 * Se suscribe al canal de un partido y reemite sus mensajes sobre el bus interno.
 *
 * @param {string} idPartido Identificador del partido.
 * @returns {void}
 */
function joinMatch(idPartido) {
  if (!client || subscriptions.has(idPartido)) return;
  try {
    const channel = channelForMatch(idPartido);
    const sub = client.newSubscription(channel);
    sub.on("publication", (ctx) => {
      const mapped = mapCentrifugoMessage(ctx?.data);
      if (mapped) emitPartidoHubEvent(mapped.type, mapped.payload, idPartido);
    });
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
  const sub = subscriptions.get(idPartido);
  if (!sub) return;
  try {
    sub.unsubscribe();
    sub.removeAllListeners?.();
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
