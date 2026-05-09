// helpers.js
// Utilidades generales extraídas de ui.js

/**
 * Devuelve una representación segura en string de cualquier valor.
 * @param {any} v - Valor a convertir.
 * @returns {string}
 */
export function safeStr(v) {
  if (v == null) return "";
  if (v instanceof Error) return v.message || v.stack || "Error";
  switch (typeof v) {
    case "string":
      return v;
    case "number":
      return Number.isNaN(v) ? "NaN" : v.toString();
    case "boolean":
      return v ? "true" : "false";
    case "bigint":
      return v.toString();
    case "symbol":
      return v.description ? `Symbol(${v.description})` : "Symbol()";
    case "function":
      return `[function ${v.name || "anonymous"}]`;
    default: {
      try {
        return JSON.stringify(v);
      } catch {
        return Object.prototype.toString.call(v);
      }
    }
  }
}

/**
 * Parsea una fecha en formato string a objeto Date.
 * @param {string} fechaStr - Fecha en formato 'dd/mm/yyyy' o 'yyyy-mm-dd'.
 * @returns {Date|null}
 */
export function parseFecha(fechaStr) {
  if (!fechaStr) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaStr)) {
    const [d, m, y] = fechaStr.split("/");
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    const [y, m, d] = fechaStr.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return null;
}

/**
 * Devuelve el índice del próximo partido relevante para hacer scroll.
 *
 * Regla de negocio:
 * - Un partido pasado sin resultado final puede ser aplazado o suspendido, así que no debe
 *   considerarse automáticamente como el próximo.
 * - Se prioriza el primer partido de hoy o futuro.
 * - Si no existe ninguno, se resalta el último partido no finalizado; si todos terminaron,
 *   se resalta el último de la lista.
 *
 * @param {Array} partidos - Lista de partidos.
 * @param {Date} now - Fecha actual.
 * @returns {number} Índice del próximo partido.
 */
export function getProximoPartidoIdx(partidos, now) {
  if (!Array.isArray(partidos) || partidos.length === 0) return -1;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let ultimoNoFinalizadoPasado = -1;

  for (let i = 0; i < partidos.length; i++) {
    const p = partidos[i];
    const dateObj = parseFecha(p.Fecha);
    const estaFinalizado =
      p.EstadoPartido == 2 && p.GolesLocal != null && p.GolesVisit != null;

    if (!dateObj) continue;

    if (dateObj < today) {
      if (!estaFinalizado) ultimoNoFinalizadoPasado = i;
      continue;
    }

    return i;
  }

  if (ultimoNoFinalizadoPasado !== -1) return ultimoNoFinalizadoPasado;
  return partidos.length - 1;
}

/**
 * Decodifica la respuesta cruda de la API a objeto JSON.
 * @param {any} raw - Respuesta cruda (string o JSON).
 * @returns {any} Objeto decodificado.
 */
export function decodeApiRaw(raw) {
  if (raw?.error) return { __error: raw.message };
  if (typeof raw === "string") {
    try {
      const d = JSON.parse(raw).d;
      if (!d || (typeof d === "string" && d.trim() === "")) return null;
      return JSON.parse(d);
    } catch (e) {
      return { __error: safeStr(e) };
    }
  }
  if (typeof raw === "object" && raw?.d !== undefined) {
    if (!raw.d || (typeof raw.d === "string" && raw.d.trim() === "")) return null;
    try {
      return JSON.parse(raw.d);
    } catch (e) {
      return { __error: safeStr(e) };
    }
  }
  return raw ?? null;
}

/**
 * Extrae el array de partidos de la respuesta de la API.
 * @param {any} raw - Respuesta cruda de la API.
 * @returns {{ error?: string, partidos: Array }}
 */
export function extractPartidos(raw) {
  const data = decodeApiRaw(raw);
  if (data?.__error) return { error: data.__error, partidos: [] };
  const arr = Array.isArray(data) ? data : [];
  const partidos = Array.isArray(arr[0]?.Partidos) ? arr[0].Partidos : [];
  return { error: null, partidos };
}
// helpers.js
