import { callPartidoHubServerMethod, subscribePartidoHubEvents } from "../services.js";
import { parseApiArrayResponse } from "./partidoDetalleUtils.js";

const LINEUP_CACHE_PREFIX = "lineup_";
const LINEUP_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días — alineaciones de partidos finalizados son inmutables

function getLineupsFromStorage(idPartido) {
  try {
    const stored = localStorage.getItem(LINEUP_CACHE_PREFIX + idPartido);
    if (!stored) return null;
    const { t, v } = JSON.parse(stored);
    if (Date.now() - t < LINEUP_CACHE_TTL) return v;
    localStorage.removeItem(LINEUP_CACHE_PREFIX + idPartido);
  } catch {}
  return null;
}

function saveLineupsToStorage(idPartido, alineaciones) {
  try {
    localStorage.setItem(LINEUP_CACHE_PREFIX + idPartido, JSON.stringify({ t: Date.now(), v: alineaciones }));
  } catch {}
}

function parseLineupPayload(payload) {
  const parsed = parseApiArrayResponse(payload);
  if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === "object") return parsed[0];
  if (parsed && typeof parsed === "object") return parsed;
  return null;
}

function waitForLineupFromHub(idPartido, modalidad, timeoutMs = 2500) {
  return new Promise((resolve) => {
    let settled = false;
    const stop = subscribePartidoHubEvents(({ type, payload, idPartido: incomingId }) => {
      if (String(incomingId || "") !== String(idPartido)) return;
      if (type !== "alineacionPartido" && type !== "recibirAlinIniciales") return;
      const alineaciones = parseLineupPayload(payload);
      if (!alineaciones) return;
      settled = true;
      stop();
      resolve(alineaciones);
    });

    const finish = (value = null) => {
      if (settled) return;
      settled = true;
      stop();
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    try {
      const req = callPartidoHubServerMethod("unirseAPartido", String(idPartido), modalidad || "hp");
      if (req?.fail) {
        req.fail(() => {
          clearTimeout(timer);
          finish(null);
        });
      }
    } catch {
      clearTimeout(timer);
      finish(null);
    }
  });
}

/**
 * Obtiene las alineaciones de un partido. Para partidos finalizados consulta el
 * localStorage antes de ir al hub, y persiste el resultado al obtenerlo.
 *
 * @param {object} partido Objeto partido con IdPartido y EstadoPartido.
 * @param {string} modalidad Modalidad del deporte.
 * @returns {Promise<object|null>} Alineaciones o null si no se obtienen.
 */
async function fetchLineupForPartido(partido, modalidad) {
  if (partido.alineaciones) return partido.alineaciones;

  const idPartido = partido?.IdPartido;
  if (!idPartido) return null;

  const isFinished = partido.EstadoPartido == 2;

  if (isFinished) {
    const cached = getLineupsFromStorage(idPartido);
    if (cached) return cached;
  }

  const alineaciones = await waitForLineupFromHub(idPartido, modalidad, 2500);

  if (isFinished && alineaciones) {
    saveLineupsToStorage(idPartido, alineaciones);
  }

  return alineaciones;
}

/**
 * Hidrata en paralelo las alineaciones de los partidos dados via SignalR.
 * Los partidos finalizados se sirven desde caché localStorage cuando es posible,
 * evitando la llamada al hub y el timeout de 2.5s por partido.
 *
 * @param {object[]} partidos Lista de partidos a hidratar.
 * @param {string} [modalidad="hp"] Modalidad del deporte.
 * @param {number} [limit=12] Máximo de partidos a procesar.
 * @returns {Promise<object[]>} El mismo array con `.alineaciones` relleno donde se obtuvo respuesta.
 */
export async function hydrateMatchesWithHubLineups(partidos, modalidad = "hp", limit = 12) {
  const candidates = partidos.filter((p) => p?.IdPartido).slice(0, limit);
  await Promise.all(
    candidates.map(async (partido) => {
      partido.alineaciones = await fetchLineupForPartido(partido, modalidad);
    }),
  );
  return partidos;
}
