// api.js

const HEADERS = {
  accept: "application/json, text/javascript, */*; q=0.01",
  "content-type": "application/json; charset=UTF-8",
  "x-requested-with": "XMLHttpRequest",
};

console.log("Capacitor platform:", window.Capacitor?.getPlatform?.());
console.log(
  "isNative():",
  (function () {
    const C = window.Capacitor;
    if (C?.isNativePlatform?.()) return true;
    if (typeof C?.getPlatform === "function") {
      const p = C.getPlatform();
      if (p && p !== "web") return true;
    }
    if (C?.platform && C.platform !== "web") return true;
    if (window.location.protocol === "file:") return true;
    return false;
  })()
);
console.log("CapacitorHttp available:", !!window.CapacitorHttp?.request);

function isNative() {
  const C = window.Capacitor;
  if (C?.isNativePlatform?.()) return true;
  if (typeof C?.getPlatform === "function") {
    const p = C.getPlatform();
    if (p && p !== "web") return true;
  }
  if (C?.platform && C.platform !== "web") return true;
  if (window.location.protocol === "file:") return true; // fallback típico
  return false;
}

function getHttp() {
  // Preferencia: plugin oficial (@capacitor/http)
  if (window.CapacitorHttp?.request) return window.CapacitorHttp;
  // Compat: algunos entornos lo exponen en Plugins.Http
  const classic = window.Capacitor?.Plugins?.Http;
  if (classic?.request) return classic;
  // Legacy (muy antiguo)
  if (window.Http?.request) return window.Http;
  return null;
}

async function post({ url, body, preferNative }) {
  const nativo = isNative();
  const http = getHttp();
  // En nativo preferimos plugin; si no hay, caemos a fetch(real)
  if (preferNative && nativo && http) {
    try {
      const res = await http.request({
        method: "POST",
        url,
        headers: HEADERS,
        data: body, // string JSON va bien con el plugin oficial
      });
      return res.data;
    } catch (e) {
      // Si el error es de certificado, reintenta con fetch
      if (
        String(e?.message || e).includes("CertPathValidatorException") ||
        String(e?.message || e).includes(
          "Trust anchor for certification path not found"
        )
      ) {
        const r = await fetch(url, { method: "POST", headers: HEADERS, body });
        return await r.text();
      }
      throw e;
    }
  }
  const r = await fetch(url, { method: "POST", headers: HEADERS, body });
  return await r.text();
}

function ensureJsonOrThrow(raw) {
  if (typeof raw === "string" && raw.trim().startsWith("<")) {
    throw new Error(
      "La respuesta no es JSON, es HTML. Puede ser un error de CORS, login o endpoint."
    );
  }
  return raw;
}

/** Clasificación */
export async function getClasificacionLiga(idCompeticion) {
  const REAL =
    "https://fvpatinaje.eus/webservices/WSCompeticiones.asmx/GetClasificacionCompeticion";
  const PROXY = "/api/GetClasificacionCompeticion";
  const body = JSON.stringify({ idcompeticion: String(idCompeticion) });

  const url = isNative() ? REAL : PROXY;
  try {
    const raw = await post({ url, body, preferNative: true });
    return ensureJsonOrThrow(raw);
  } catch (e) {
    return { error: true, message: e.message };
  }
}

/** Calendario por equipo */
export async function getCalendarioLoyola(equipoId, idCompeticion) {
  const REAL =
    "https://fvpatinaje.eus/webservices/WSCompeticiones.asmx/GetCalendarioCompeticion";
  const PROXY = "/api/GetCalendarioCompeticion";
  const body = JSON.stringify({
    idcompeticion: String(idCompeticion),
    idequipocomp: String(equipoId),
  });

  const url = isNative() ? REAL : PROXY;
  try {
    const raw = await post({ url, body, preferNative: true });
    return ensureJsonOrThrow(raw);
  } catch (e) {
    return { error: true, message: e.message };
  }
}

/**
 * Obtener todos los equipos Loyola de todas las competiciones
 * Devuelve: Array de { idCompeticion, nombreCompeticion, idEquipoComp, nombreEquipo }
 */
export async function getEquiposLoyolaTodasCompeticiones() {
  // Usar proxy en web, URL real en nativo
  const isNativo = isNative();
  const COMP_URL = isNativo
    ? "https://fvpatinaje.eus/webservices/WSCompeticiones.asmx/GetCompeticiones"
    : "/api/GetCompeticiones";
  const PARAM_URL = isNativo
    ? "https://fvpatinaje.eus/webservices/WSCompeticiones.asmx/GetParametrosCompeticion"
    : "/api/GetParametrosCompeticion";

  // 1. Pedir todas las competiciones de hockey patines y temporada actual
  const compRes = await fetch(COMP_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ modalidad: "hp", temporada: "21" }), // O ajusta temporada si es necesario
  });
  const compJson = await compRes.json();
  const competiciones = JSON.parse(compJson.d);

  const equiposLoyola = [];

  // 2. Para cada competición, pedir los equipos
  for (const comp of competiciones) {
    const paramRes = await fetch(PARAM_URL, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ idcompeticion: String(comp.IdCompeticion) }),
    });
    const paramJson = await paramRes.json();
    const params = JSON.parse(paramJson.d);
    if (!params[0]?.Equipos) continue;
    for (const eq of params[0].Equipos) {
      if (
        eq.NombreEquipo?.toUpperCase().includes("LOYOLA") ||
        eq.NombreEquipoAbrev?.toUpperCase().includes("LOY")
      ) {
        equiposLoyola.push({
          idCompeticion: comp.IdCompeticion,
          nombreCompeticion: comp.DenoComp,
          idEquipoComp: eq.IdEquipoComp,
          nombreEquipo: eq.NombreEquipo,
          nombreEquipoAbrev: eq.NombreEquipoAbrev,
        });
      }
    }
  }
  return equiposLoyola;
}
