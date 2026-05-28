import { callPartidoHubServerMethod, subscribePartidoHubEvents } from "../services.js";
import { parseApiArrayResponse } from "./partidoDetalleUtils.js";

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

export async function hydrateMatchesWithHubLineups(partidos, modalidad = "hp", limit = 12) {
  const candidateMatches = partidos.filter((partido) => partido?.IdPartido).slice(0, limit);
  for (const partido of candidateMatches) {
    partido.alineaciones = await waitForLineupFromHub(partido.IdPartido, modalidad, 2500);
  }
  return partidos;
}
