// partidos.js
// Renderizado y lógica de partidos extraída de ui.js
import { getEquipoLabel, getEquipoNombreCompleto } from "../equipo.js";
import { getLang, t } from "../i18n.js";
import { createCalendarButton } from "../utils/calendar.js";
import {
  extractPartidos,
  getProximoPartidoIdx,
  parseFecha,
  safeStr,
} from "../utils/helpers.js";

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

export function emphasizeTeam(nombre, equipoSel) {
  const val = nombre || t("equipo_pendiente");
  return val === equipoSel
    ? `<b class='equipo-remarcado'>${safeStr(val)}</b>`
    : safeStr(val);
}

export function renderPartidos(matchesList, raw) {
  const { error, partidos } = extractPartidos(raw);
  if (error) {
    matchesList.innerHTML = `<li>${t("error", error)}</li>`;
    return;
  }
  if (!partidos.length) {
    matchesList.innerHTML = `<li>${t("no_matches", getEquipoLabel())}</li>`;
    return;
  }
  matchesList.innerHTML = "";
  const equipoSel = getEquipoNombreCompleto();
  const lang = getLang() === "eu" ? "eu" : "es";
  const now = new Date();
  const proximoIdx = getProximoPartidoIdx(partidos, now);
  let proximoLi = null;
  for (let idx = 0; idx < partidos.length; idx++) {
    const p = partidos[idx];
    const li = renderPartidoLi(p, equipoSel, lang, proximoIdx, idx);
    if (idx === proximoIdx) proximoLi = li;
    matchesList.appendChild(li);
  }
  scrollToProximo(proximoLi);
}

function renderResultado(p) {
  if (p.EstadoPartido == 2 && p.GolesLocal != null && p.GolesVisit != null) {
    return `<div class='partido-resultado-row'><span class="partido-resultado">${p.GolesLocal} - ${p.GolesVisit}</span></div>`;
  }
  return "";
}

function renderPartidoLi(p, equipoSel, lang, proximoIdx, idx) {
  const fechaFormateada = formatFecha(p.Fecha, lang);
  const hora = p.Hora ? p.Hora.slice(0, 5) : "";
  const instalacionHtml = makeInstalacionHtml(p);
  const local = emphasizeTeam(p.EquipoLocal || null, equipoSel);
  const visit = emphasizeTeam(p.EquipoVisit || null, equipoSel);
  const resultadoHtml = renderResultado(p);
  const li = document.createElement("li");
  li.innerHTML = `
    <div class="partido-header">
      <span class="partido-jornada">${safeStr(p?.NombreJornada || "")}</span>
      <span class="partido-fecha">${safeStr(fechaFormateada)}${
    hora ? " · " + hora : ""
  }</span>
      <span class="partido-calendario"></span>
    </div>
    <div class="partido-equipos">
      <span class="partido-local">${local}</span>
      <span class="partido-vs">vs</span>
      <span class="partido-visit">${visit}</span>
    </div>
    ${resultadoHtml}
    <div class="partido-instalacion">${instalacionHtml}</div>
  `;
  const btnCal = createCalendarButton(p);
  li.querySelector(".partido-calendario").appendChild(btnCal);
  if (idx === proximoIdx) {
    li.classList.add("proximo-partido");
  }
  return li;
}

function scrollToProximo(proximoLi) {
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
