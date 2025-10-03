"use strict";

import { getEquipoLabel, getEquipoNombreCompleto } from "./equipo.js";
import { getLang, t } from "./i18n.js";

/* ============================================================================
   Utilidades generales (helpers para reducir complejidad)
   ============================================================================ */

/**
 * Convertir valor a cadena segura (evitar "[object Object]").
 * @param {unknown} v
 * @returns {string}
 */
function safeStr(v) {
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
 * Parsear string de fecha a Date. Aceptar "DD/MM/YYYY" o "YYYY-MM-DD".
 * @param {string} fechaStr
 * @returns {Date|null}
 */
function parseFecha(fechaStr) {
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
 * Encontrar índice del próximo partido (fecha futura más próxima).
 * @param {Array<{Fecha:string}>} partidos
 * @param {Date} now
 * @returns {number} índice o -1 si no hay futuros
 */
function getProximoPartidoIdx(partidos, now) {
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

/**
 * Deserializar payload crudo de la API (viene como string JSON o { d: string }).
 * @param {any} raw
 * @returns {any} objeto ya parseado o {__error:string} si falla
 */
function decodeApiRaw(raw) {
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

/**
 * Normalizar el payload y extraer array de partidos o un error.
 * @param {any} raw
 * @returns {{error:string|null, partidos:any[]}}
 */
function extractPartidos(raw) {
  const data = decodeApiRaw(raw);
  if (data?.__error) return { error: data.__error, partidos: [] };

  const arr = Array.isArray(data) ? data : [];
  const partidos = Array.isArray(arr[0]?.Partidos) ? arr[0].Partidos : [];
  return { error: null, partidos };
}

/**
 * Formatear fecha con día de la semana según idioma.
 * @param {string} fechaStr
 * @param {"es"|"eu"} lang
 * @returns {string} fecha formateada o la original si no valida
 */
function formatFecha(fechaStr, lang) {
  const dateObj = parseFecha(fechaStr);
  if (!dateObj || Number.isNaN(dateObj.getTime())) return fechaStr;

  if (lang === "eu") {
    // Euskera: YYYY/MM/DD, weekday (lista fija)
    const diasEu = [
      "igandea",
      "astelehena",
      "asteartea",
      "asteazkena",
      "osteguna",
      "ostirala",
      "larunbata",
    ];
    const weekday = diasEu[dateObj.getDay()];
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    return `${year}/${month}/${day}, ${weekday}`;
  }

  // Castellano: DD/MM/YYYY, Weekday capitalizado
  const locale = "es-ES";
  const weekday = dateObj.toLocaleDateString(locale, { weekday: "long" });
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}, ${
    weekday.charAt(0).toUpperCase() + weekday.slice(1)
  }`;
}

/**
 * Crear HTML clicable de instalación con enlace a mapa si hay coordenadas.
 * @param {{Instalacion?:string, CoordenadasGPS?:string}} p
 * @returns {string} HTML de instalación (enlace si posible)
 */
function makeInstalacionHtml(p) {
  const nombre = p.Instalacion || "";
  if (!p.CoordenadasGPS || !nombre) return safeStr(nombre);

  const [latRaw, lngRaw] = p.CoordenadasGPS.split(",");
  if (!latRaw || !lngRaw) return safeStr(nombre);

  const lat = latRaw.trim();
  const lng = lngRaw.trim();
  const label = encodeURIComponent(nombre);
  const geoUrl = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
  const gmapsUrl = `https://maps.google.com/?q=${lat},${lng}(${label})`;
  return `<a href="${geoUrl}" onclick="if(!window.navigator.userAgent.match(/Android|iPhone|iPad/i)){window.open('${gmapsUrl}','_blank');return false;}" style="color: var(--color-primary);text-decoration:underline;">${safeStr(
    nombre
  )}</a>`;
}

/**
 * Enfatizar el nombre cuando coincide con el equipo seleccionado.
 * @param {string} nombre
 * @param {string} equipoSel
 * @returns {string} HTML (posible <b>)
 */
function emphasizeTeam(nombre, equipoSel) {
  const val = nombre || t("equipo_pendiente");
  return val === equipoSel
    ? `<b class='equipo-remarcado'>${safeStr(val)}</b>`
    : safeStr(val);
}

/**
 * Escapar caracteres problemáticos para ICS (básico).
 * @param {unknown} s
 * @returns {string}
 */
function escICS(s) {
  return safeStr(s).replace(/([,;])/g, "\\$1");
}

/**
 * Formatear fecha a YYYYMMDDTHHMMSSZ (UTC) para Google Calendar.
 * @param {Date} dt
 * @returns {string}
 */
function toGCalUTC(dt) {
  return dt
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

/**
 * Obtener rango horario local por defecto (12:00–14:00) para un día concreto.
 * @param {Date|null} d
 * @returns {{startLocal:Date|null, endLocal:Date|null}}
 */
function defaultRangeForDay(d) {
  if (!d || Number.isNaN(d.getTime()))
    return { startLocal: null, endLocal: null };
  const startLocal = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    12,
    0,
    0
  );
  const endLocal = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    14,
    0,
    0
  );
  return { startLocal, endLocal };
}

/**
 * Detectar entorno nativo (Capacitor) de forma rápida.
 * @returns {boolean}
 */
function isNativePlatform() {
  const C = window.Capacitor;
  if (C?.isNativePlatform?.()) return true;
  if (typeof C?.getPlatform === "function") {
    const p = C.getPlatform();
    if (p && p !== "web") return true;
  }
  if (C?.platform && C.platform !== "web") return true;
  if (window.location.protocol === "file:") return true;
  return false;
}

/**
 * Crear botón de calendario con handler de click muy simple (delegar a helpers).
 * A) Intentar abrir Google Calendar (nativo, con fechas locales convertidas a UTC).
 * B) Si no, descargar un .ics (web/fallback).
 * @param {any} p - Partido
 * @returns {HTMLButtonElement}
 */
function createCalendarButton(p) {
  const btnCal = document.createElement("button");
  btnCal.className = "btn-calendario";
  btnCal.title = t("add_to_calendar") || "Añadir al calendario";
  btnCal.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="4"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

  // ↓↓↓ COMPLEJIDAD BAJA: delegar
  btnCal.addEventListener("click", () => handleCalendarClick(p));

  return btnCal;
}

/* ============================================================================
   Helpers específicos del flujo de calendario (separar para bajar complejidad)
   ============================================================================ */

/**
 * Construir título del evento (ej.: "Equipo A vs Equipo B").
 * @param {any} p
 * @returns {string}
 */
function buildEventTitle(p) {
  const equipos = `${safeStr(p?.EquipoLocal || "")} vs ${safeStr(
    p?.EquipoVisit || ""
  )}`.trim();
  return equipos || "Partido hockey";
}

/**
 * Construir descripción del evento (i18n + enlace a Google Maps si hay coordenadas).
 * @param {any} p
 * @returns {{desc:string, gmapsUrl:string}}
 */
function buildEventDescription(p) {
  let desc = "";
  if (p?.NombreCompeticion) {
    desc = t("ics_desc", p.NombreCompeticion);
  }

  let gmapsUrl = "";
  if (p?.CoordenadasGPS && p?.Instalacion) {
    const [lat, lng] = String(p.CoordenadasGPS).split(",");
    const label = encodeURIComponent(p.Instalacion);
    gmapsUrl = `https://maps.google.com/?q=${encodeURIComponent(
      lat
    )}%2C${encodeURIComponent(lng)}%20(${label})`;
    desc += `\n\nUbicación: ${safeStr(p.Instalacion)}\nMapa: ${gmapsUrl}`;
  }

  return { desc, gmapsUrl };
}

/**
 * Construir LOCATION del evento (URL a Google Maps si hay coordenadas).
 * @param {any} p
 * @returns {string}
 */
function buildEventLocation(p) {
  if (p?.CoordenadasGPS && p?.Instalacion) {
    const [lat, lng] = String(p.CoordenadasGPS).split(",");
    const label = encodeURIComponent(p.Instalacion);
    return `https://maps.google.com/?q=${encodeURIComponent(
      lat
    )}%2C${encodeURIComponent(lng)}%20(${label})`;
  }
  return p?.Instalacion || t("ics_location_unknown");
}

/**
 * Obtener rango horario local por defecto (12:00–14:00) y la fecha base.
 * @param {any} p
 * @returns {{dateObj:Date|null, startLocal:Date|null, endLocal:Date|null}}
 */
function buildEventTimes(p) {
  const dateObj = parseFecha(p?.Fecha);
  const { startLocal, endLocal } = defaultRangeForDay(dateObj);
  return { dateObj, startLocal, endLocal };
}

/**
 * Abrir Google Calendar con evento pre-relleno (usar si hay plataforma nativa).
 * @param {string} title
 * @param {Date} startLocal
 * @param {Date} endLocal
 * @param {string} desc
 * @param {string} loc
 * @returns {void}
 */
function openGoogleCalendar(title, startLocal, endLocal, desc, loc) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toGCalUTC(startLocal)}/${toGCalUTC(endLocal)}`,
    details: desc,
    location: loc,
  });
  const gcalUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
  try {
    window.open(gcalUrl, "_blank");
  } catch {
    location.href = gcalUrl;
  }
}

/**
 * Descargar fichero .ics como fallback web.
 * @param {string} title
 * @param {Date|null} startLocal
 * @param {Date|null} endLocal
 * @param {string} desc
 * @param {string} loc
 * @param {Date|null} dateObj
 * @returns {void}
 */
function downloadICS(title, startLocal, endLocal, desc, loc, dateObj) {
  let start = "",
    end = "";

  if (startLocal && endLocal) {
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(
        d.getHours()
      )}${pad(d.getMinutes())}00`;
    start = fmt(startLocal);
    end = fmt(endLocal);
  } else if (dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    start = `${y}${m}${d}T120000`;
    end = `${y}${m}${d}T140000`;
  }

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Loyola Hockey Matches//ES",
    "BEGIN:VEVENT",
    `SUMMARY:${escICS(title)}`,
    `DESCRIPTION:${escICS(desc)}`,
    start ? `DTSTART:${start}` : "",
    end ? `DTEND:${end}` : "",
    loc ? `LOCATION:${escICS(loc)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\n");

  const blob = new Blob([ics.replace(/\n/g, "\r\n")], {
    type: "text/calendar",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(title || "partido").replace(/\s+/g, "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}

/**
 * Orquestar el flujo del botón de calendario con baja complejidad.
 * @param {any} p
 * @returns {void}
 */
function handleCalendarClick(p) {
  const title = buildEventTitle(p);
  const { desc } = buildEventDescription(p);
  const loc = buildEventLocation(p);
  const { dateObj, startLocal, endLocal } = buildEventTimes(p);

  // Ruta A (nativo con horas resueltas) → abrir Google Calendar
  if (isNativePlatform() && startLocal && endLocal) {
    openGoogleCalendar(title, startLocal, endLocal, desc, loc);
    return;
  }

  // Ruta B (web/fallback) → descargar .ics
  downloadICS(title, startLocal, endLocal, desc, loc, dateObj);
}

/* ============================================================================
   Render de clasificación
   ============================================================================ */

/**
 * Renderizar la clasificación de la liga en el elemento dado.
 * Analizar la respuesta y crear los elementos de la lista.
 * @param {HTMLElement} matchesList - Elemento UL donde mostrar la clasificación.
 * @param {any} raw - Respuesta cruda de la API.
 */
export function renderClasificacion(matchesList, raw) {
  const data = decodeApiRaw(raw);
  if (data?.__error) {
    matchesList.innerHTML = `<li>${t("error", data.__error)}</li>`;
    return;
  }
  if (!Array.isArray(data) || data.length === 0) {
    matchesList.innerHTML = `<li>${t("no_matches", getEquipoLabel())}</li>`;
    return;
  }

  const myTeam = getEquipoNombreCompleto();

  data.forEach((eq) => {
    const li = document.createElement("li");
    li.className = "clas-row";
    if (eq?.NombreEquipo === myTeam) li.classList.add("fav");

    // Diferencia de goles con signo
    const dg = Number(eq?.DiferenciaGoles ?? 0);
    const dgTxt = (dg >= 0 ? "+" : "") + dg;

    li.innerHTML = `
      <div class="clas-pos">#${safeStr(eq?.Posicion)}</div>
      <div class="clas-team">${safeStr(eq?.NombreEquipo)}</div>
      <div class="clas-pts"><span class="pts">${safeStr(
        eq?.Puntos
      )}</span><span class="pts-label">pts</span></div>
      <div class="clas-meta">
        <span class="clas-chip">${safeStr(eq?.PartidosJugados)}J</span>
        <span class="clas-chip">${safeStr(eq?.PartidosGanados)}G</span>
        <span class="clas-chip">${safeStr(eq?.PartidosEmpatados)}E</span>
        <span class="clas-chip">${safeStr(eq?.PartidosPerdidos)}P</span>
        <span class="clas-chip">GF:${safeStr(eq?.GolesAFavor)}</span>
        <span class="clas-chip">GC:${safeStr(eq?.GolesEnContra)}</span>
        <span class="clas-chip">DG:${safeStr(dgTxt)}</span>
      </div>
    `;

    matchesList.appendChild(li);
  });
}

/* ============================================================================
   Render de partidos (refactor para S3776)
   ============================================================================ */

/**
 * Renderizar la lista de partidos en el elemento dado.
 * Analizar la respuesta y crear los elementos de la lista.
 * (Refactorizada para reducir complejidad cognitiva)
 * @param {HTMLElement} matchesList - Elemento UL donde mostrar los partidos.
 * @param {any} raw - Respuesta cruda de la API.
 */
export function renderPartidos(matchesList, raw) {
  const { error, partidos } = extractPartidos(raw);

  // 1) Errores desde API
  if (error) {
    matchesList.innerHTML = `<li>${t("error", error)}</li>`;
    return;
  }

  // 2) No hay estructura válida o lista vacía
  if (!partidos.length) {
    matchesList.innerHTML = `<li>${t("no_matches", getEquipoLabel())}</li>`;
    return;
  }

  // 3) Preparación de entorno
  matchesList.innerHTML = "";
  const equipoSel = getEquipoNombreCompleto();
  const lang = getLang() === "eu" ? "eu" : "es";
  const now = new Date();
  const proximoIdx = getProximoPartidoIdx(partidos, now);

  // 4) Render de items
  let proximoLi = null;

  for (let idx = 0; idx < partidos.length; idx++) {
    const p = partidos[idx];
    const li = document.createElement("li");

    const fechaFormateada = formatFecha(p.Fecha, lang);
    const instalacionHtml = makeInstalacionHtml(p);
    const local = emphasizeTeam(p.EquipoLocal || null, equipoSel);
    const visit = emphasizeTeam(p.EquipoVisit || null, equipoSel);

    li.innerHTML = `
      <div class="partido-header">
        <span class="partido-jornada">${safeStr(p?.NombreJornada || "")}</span>
        <span class="partido-fecha">${safeStr(fechaFormateada)}</span>
        <span class="partido-calendario"></span>
      </div>
      <div class="partido-equipos">
        <span class="partido-local">${local}</span>
        <span class="partido-vs">vs</span>
        <span class="partido-visit">${visit}</span>
      </div>
      <div class="partido-instalacion">${instalacionHtml}</div>
    `;

    // ⬇️ Corregido: ahora SOLO un argumento
    const btnCal = createCalendarButton(p);
    li.querySelector(".partido-calendario").appendChild(btnCal);

    if (idx === proximoIdx) {
      li.classList.add("proximo-partido");
      proximoLi = li;
    }

    matchesList.appendChild(li);
  }

  // 5) Scroll al próximo partido (si existe)
  if (proximoLi) {
    setTimeout(() => {
      proximoLi.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  }
}
