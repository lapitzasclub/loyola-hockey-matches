// helpers.js
// Utilidades generales extraídas de ui.js

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

export function getProximoPartidoIdx(partidos, now) {
  let proximoIdx = -1;
  let minDiff = Infinity;
  for (let i = 0; i < partidos.length; i++) {
    const dateObj = parseFecha(partidos[i].Fecha);
    if (dateObj && dateObj >= now) {
      const diff = dateObj.getTime() - now.getTime();
      if (diff < minDiff) {
        minDiff = diff;
        proximoIdx = i;
      }
    }
  }
  return proximoIdx;
}

export function decodeApiRaw(raw) {
  if (raw?.error) return { __error: raw.message };
  if (typeof raw === "string") {
    try {
      return JSON.parse(JSON.parse(raw).d);
    } catch (e) {
      return { __error: safeStr(e) };
    }
  }
  if (typeof raw === "object" && raw?.d) {
    try {
      return JSON.parse(raw.d);
    } catch (e) {
      return { __error: safeStr(e) };
    }
  }
  return raw ?? null;
}

export function extractPartidos(raw) {
  const data = decodeApiRaw(raw);
  if (data?.__error) return { error: data.__error, partidos: [] };
  const arr = Array.isArray(data) ? data : [];
  const partidos = Array.isArray(arr[0]?.Partidos) ? arr[0].Partidos : [];
  return { error: null, partidos };
}
// helpers.js
