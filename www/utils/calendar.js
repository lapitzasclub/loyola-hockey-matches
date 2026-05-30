// calendar.js
// Funciones relacionadas con el calendario extraídas de ui.js

import { safeStr, parseFecha } from "./helpers.js";
import { t } from "../i18n.js";

/** Hora de inicio por defecto cuando el partido no tiene hora confirmada. */
const DEFAULT_EVENT_START_HOUR = 12;
/** Hora de fin por defecto (duración estimada de 2 horas). */
const DEFAULT_EVENT_END_HOUR = 14;
/** Duración estándar de un partido en milisegundos (2 horas). */
const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;
/** Retardo para liberar la URL de objeto del ICS una vez iniciada la descarga. */
const URL_REVOKE_DELAY_MS = 500;

/**
 * Escapa caracteres especiales para el formato ICS de calendario.
 * @param {string} s - Cadena a escapar.
 * @returns {string} Cadena escapada para ICS.
 */
export function escICS(s) {
  // Use String.raw for escaping and replaceAll for all matches
  return safeStr(s)
    .replaceAll(",", String.raw`\,`)
    .replaceAll(";", String.raw`\;`);
}

/**
 * Convierte una fecha a formato UTC compatible con Google Calendar.
 * @param {Date} dt - Fecha a convertir.
 * @returns {string} Fecha en formato UTC para Google Calendar.
 */
export function toGCalUTC(dt) {
  return dt
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
}

/**
 * Devuelve el rango horario por defecto (12:00-14:00) para un día dado.
 * @param {Date} d - Fecha base.
 * @returns {{startLocal: Date|null, endLocal: Date|null}} Rango horario local.
 */
export function defaultRangeForDay(d) {
  if (!d || Number.isNaN(d.getTime()))
    return { startLocal: null, endLocal: null };
  const startLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate(), DEFAULT_EVENT_START_HOUR, 0, 0);
  const endLocal   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), DEFAULT_EVENT_END_HOUR,   0, 0);
  return { startLocal, endLocal };
}

/**
 * Parsea una hora en formato habitual de partido (HH:mm o HH:mm:ss).
 * @param {string} horaStr - Hora en texto.
 * @returns {{hours: number, minutes: number}|null}
 */
export function parseHora(horaStr) {
  if (!horaStr) return null;
  const match = String(horaStr).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

/**
 * Detecta si la plataforma es nativa (no web).
 * @returns {boolean} True si es plataforma nativa, false si es web.
 */
export function isNativePlatform() {
  const C = globalThis.Capacitor;
  if (C?.isNativePlatform?.()) return true;
  if (typeof C?.getPlatform === "function") {
    const p = C.getPlatform();
    if (p && p !== "web") return true;
  }
  if (C?.platform && C.platform !== "web") return true;
  if (globalThis.location?.protocol === "file:") return true;
  return false;
}

/**
 * Crea un botón para añadir un evento al calendario.
 * @param {object} p - Objeto partido con datos del evento.
 * @returns {HTMLButtonElement} Botón de calendario.
 */
export function createCalendarButton(p) {
  const btnCal = document.createElement("button");
  btnCal.className = "btn-calendario";
  btnCal.title = t("add_to_calendar") || "Añadir al calendario";
  btnCal.innerHTML = `<img src="assets/sidebar-loyola/iconos_svg/calendar-plus.svg" alt="" aria-hidden="true">`;
  btnCal.addEventListener("click", () => handleCalendarClick(p));
  return btnCal;
}

/**
 * Construye el título del evento para el calendario.
 * @param {object} p - Objeto partido.
 * @returns {string} Título del evento.
 */
export function buildEventTitle(p) {
  const equipos = `${safeStr(p?.EquipoLocal || "")} vs ${safeStr(
    p?.EquipoVisit || ""
  )}`.trim();
  return equipos || "Partido hockey";
}

/**
 * Construye la descripción y el enlace de mapa para el evento.
 * @param {object} p - Objeto partido.
 * @returns {{desc: string, gmapsUrl: string}} Descripción y URL de Google Maps.
 */
export function buildEventDescription(p) {
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
 * Construye la localización del evento para el calendario.
 * @param {object} p - Objeto partido.
 * @returns {string} Localización o enlace de Google Maps.
 */
export function buildEventLocation(p) {
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
 * Calcula las fechas y horas de inicio y fin del evento.
 * Usa la hora real del partido cuando está disponible.
 * Si no existe, usa el rango por defecto 12:00-14:00.
 *
 * @param {object} p - Objeto partido.
 * @returns {{dateObj: Date, startLocal: Date|null, endLocal: Date|null}} Fechas y horas del evento.
 */
export function buildEventTimes(p) {
  const dateObj = parseFecha(p?.Fecha);
  if (!dateObj || Number.isNaN(dateObj.getTime())) {
    return { dateObj: null, startLocal: null, endLocal: null };
  }

  const hora = parseHora(p?.Hora);
  if (!hora) {
    const { startLocal, endLocal } = defaultRangeForDay(dateObj);
    return { dateObj, startLocal, endLocal };
  }

  const startLocal = new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate(),
    hora.hours,
    hora.minutes,
    0
  );
  const endLocal = new Date(startLocal.getTime() + DEFAULT_EVENT_DURATION_MS);
  return { dateObj, startLocal, endLocal };
}

/**
 * Abre Google Calendar con los datos del evento pre-rellenados.
 * @param {string} title - Título del evento.
 * @param {Date} startLocal - Fecha/hora de inicio.
 * @param {Date} endLocal - Fecha/hora de fin.
 * @param {string} desc - Descripción del evento.
 * @param {string} loc - Localización del evento.
 */
export function openGoogleCalendar(title, startLocal, endLocal, desc, loc) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toGCalUTC(startLocal)}/${toGCalUTC(endLocal)}`,
    details: desc,
    location: loc,
  });
  const gcalUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
  try {
    globalThis.open(gcalUrl, "_blank");
  } catch {
    globalThis.location.href = gcalUrl;
  }
}

/**
 * Descarga un archivo ICS con los datos del evento para añadir al calendario.
 * @param {string} title - Título del evento.
 * @param {Date} startLocal - Fecha/hora de inicio.
 * @param {Date} endLocal - Fecha/hora de fin.
 * @param {string} desc - Descripción del evento.
 * @param {string} loc - Localización del evento.
 * @param {Date} dateObj - Fecha base del evento.
 */
export function downloadICS(title, startLocal, endLocal, desc, loc, dateObj) {
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
    start = `${y}${m}${d}T${String(DEFAULT_EVENT_START_HOUR).padStart(2, "0")}0000`;
    end   = `${y}${m}${d}T${String(DEFAULT_EVENT_END_HOUR).padStart(2, "0")}0000`;
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
  const blob = new Blob([ics.replaceAll("\n", "\r\n")], {
    type: "text/calendar",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(title || "partido").replaceAll(" ", "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, URL_REVOKE_DELAY_MS);
}

/**
 * Maneja el click en el botón de calendario, eligiendo entre Google Calendar o descarga ICS.
 * @param {object} p - Objeto partido con los datos del evento.
 */
export function handleCalendarClick(p) {
  const title = buildEventTitle(p);
  const { desc } = buildEventDescription(p);
  const loc = buildEventLocation(p);
  const { dateObj, startLocal, endLocal } = buildEventTimes(p);
  if (isNativePlatform() && startLocal && endLocal) {
    openGoogleCalendar(title, startLocal, endLocal, desc, loc);
    return;
  }
  downloadICS(title, startLocal, endLocal, desc, loc, dateObj);
}
