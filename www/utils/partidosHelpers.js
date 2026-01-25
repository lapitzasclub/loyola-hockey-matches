// partidosHelpers.js
// Helpers para formateo, instalación y scroll en partidos.js

import { t } from "../i18n.js";
import { parseFecha, safeStr } from "./helpers.js";

/**
 * Formatea una fecha de partido según el idioma.
 * @param {string} fechaStr - Fecha en string.
 * @param {string} lang - Idioma ('es' o 'eu').
 * @returns {string} Fecha formateada.
 */
export function formatFecha(fechaStr, lang) {
  const dateObj = parseFecha(fechaStr);
  if (!dateObj || Number.isNaN(dateObj.getTime())) return fechaStr;
  if (lang === "eu") {
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
 * Genera el HTML de la instalación del partido, con enlace a mapas si hay coordenadas.
 * @param {Object} p - Objeto partido.
 * @returns {string} HTML de la instalación.
 */
export function makeInstalacionHtml(p) {
  const nombre = p.Instalacion || "";
  if (!p.CoordenadasGPS || !nombre) return safeStr(nombre);
  const [latRaw, lngRaw] = p.CoordenadasGPS.split(",");
  if (!latRaw || !lngRaw) return safeStr(nombre);
  const lat = latRaw.trim();
  const lng = lngRaw.trim();
  const label = encodeURIComponent(nombre);
  const geoUrl = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
  const gmapsUrl = `https://maps.google.com/?q=${lat},${lng}(${label})`;
  return `<a href="${geoUrl}" onclick="if(!window.navigator.userAgent.match(/Android|iPhone|iPad/i)){window.open('${gmapsUrl}','_blank');return false;}" class="partido-instalacion-link">${safeStr(
    nombre
  )}</a>`;
}

/**
 * Resalta el nombre del equipo si es el seleccionado.
 * @param {string} nombre - Nombre del equipo.
 * @param {string} equipoSel - Nombre del equipo seleccionado.
 * @returns {string} HTML seguro del nombre.
 */
export function emphasizeTeam(nombre, equipoSel) {
  const val = nombre || t("equipo_pendiente");
  return val === equipoSel
    ? `<b class='equipo-remarcado'>${safeStr(val)}</b>`
    : safeStr(val);
}

/**
 * Hace scroll automático al próximo partido en la lista.
 * @param {HTMLElement|null} proximoLi - Elemento <li> del próximo partido.
 */
export function scrollToProximo(proximoLi) {
  // 1) Localiza el contenedor con overflow (main en tu layout)
  const container =
    document.querySelector("main") ||
    document.scrollingElement ||
    document.documentElement;

  // Si no tenemos target, intenta buscarlo por clase
  const target =
    proximoLi || document.querySelector("#matches li.proximo-partido");
  if (!target || !container) return;

  // 2) Calcula la posición del target dentro del contenedor
  const getOffsetWithin = (el, ancestor) => {
    let y = 0,
      node = el;
    while (node && node !== ancestor) {
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return y;
  };

  const doScroll = () => {
    const topWithin = getOffsetWithin(target, container);
    const centerTop =
      topWithin - (container.clientHeight / 2 - target.clientHeight / 2);
    container.scrollTo({
      top: Math.max(0, centerTop),
      behavior: "smooth",
    });
  };

  // 3) Espera a que el DOM “asiente” (fonts/SVG), luego desplaza
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(doScroll, 50);
    });
  });

  // Respaldo por si algo retrasa el layout final
  window.addEventListener("load", doScroll, { once: true });
}
