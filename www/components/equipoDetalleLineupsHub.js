import { getEstadisticaPartido } from "../services.js";
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

/**
 * Obtiene las alineaciones de un partido desde la API REST.
 *
 * La plataforma nueva ya devuelve las alineaciones en el detalle del partido, así que no hace
 * falta pasar por el canal de tiempo real: antes se pedía `unirseAPartido` y se esperaba un
 * evento del hub con un timeout de 2,5 s por partido, lo que dejaba el roster y las
 * estadísticas de equipo vacíos si el directo no estaba disponible.
 *
 * @param {string|number} idPartido Identificador del partido.
 * @returns {Promise<object|null>} Alineaciones legacy o null.
 */
async function fetchLineupFromRest(idPartido) {
  try {
    const parsed = parseApiArrayResponse(await getEstadisticaPartido(idPartido));
    const block = Array.isArray(parsed) ? parsed[0] : parsed;
    const alineaciones = Array.isArray(block?.alineaciones) ? block.alineaciones[0] : null;
    return alineaciones || null;
  } catch {
    return null;
  }
}

/**
 * Obtiene las alineaciones de un partido. Para partidos finalizados consulta el
 * localStorage antes de ir a la API, y persiste el resultado al obtenerlo.
 *
 * @param {object} partido Objeto partido con IdPartido y EstadoPartido.
 * @returns {Promise<object|null>} Alineaciones o null si no se obtienen.
 */
async function fetchLineupForPartido(partido) {
  if (partido.alineaciones) return partido.alineaciones;

  const idPartido = partido?.IdPartido;
  if (!idPartido) return null;

  const isFinished = partido.EstadoPartido == 2;

  if (isFinished) {
    const cached = getLineupsFromStorage(idPartido);
    if (cached) return cached;
  }

  const alineaciones = await fetchLineupFromRest(idPartido);

  if (isFinished && alineaciones) {
    saveLineupsToStorage(idPartido, alineaciones);
  }

  return alineaciones;
}

/**
 * Hidrata en paralelo las alineaciones de los partidos dados.
 * Los partidos finalizados se sirven desde caché localStorage cuando es posible.
 *
 * @param {object[]} partidos Lista de partidos a hidratar.
 * @param {string} [_modalidad="hp"] Modalidad (ya no se usa; se mantiene por compatibilidad).
 * @param {number} [limit=12] Máximo de partidos a procesar.
 * @returns {Promise<object[]>} El mismo array con `.alineaciones` relleno donde hubo datos.
 */
export async function hydrateMatchesWithHubLineups(partidos, _modalidad = "hp", limit = 12) {
  const candidates = partidos.filter((p) => p?.IdPartido).slice(0, limit);
  await Promise.all(
    candidates.map(async (partido) => {
      partido.alineaciones = await fetchLineupForPartido(partido);
    }),
  );
  return partidos;
}
