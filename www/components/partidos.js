// partidos.js
// Renderizado y lógica de partidos extraída de ui.js
import { getEquipoLabel, getEquipoNombreCompleto } from "../equipo.js";
import { getLang, t } from "../i18n.js";
import { createCalendarButton } from "../utils/calendar.js";
import { extractPartidos, getProximoPartidoIdx, safeStr } from "../utils/helpers.js";
import { emphasizeTeam, formatFecha as formatFechaHelper, makeInstalacionHtml, scrollToProximo } from "../utils/partidosHelpers.js";

let partidoDetalleModulePromise = null;

export function preloadPartidoDetalleModule() {
  if (!partidoDetalleModulePromise) {
    partidoDetalleModulePromise = import("./partidoDetalle.js");
  }
  return partidoDetalleModulePromise;
}

/**
 * Renderiza la lista de partidos en el elemento dado.
 * Expone el histórico de partidos en window._partidosLoyola para la clasificación.
 * @param {HTMLElement} matchesList - Elemento donde se renderiza la lista.
 * @param {any} raw - Datos crudos de la API (JSON o string).
 */
export function renderPartidos(matchesList, raw) {
  const { error, partidos } = extractPartidos(raw);
  // Exponer el histórico de partidos para la clasificación
  if (Array.isArray(partidos)) {
    window._partidosLoyola = partidos;
  }
  if (error) {
    matchesList.innerHTML = `<li>${t("error", error)}</li>`;
    return;
  }
  if (!partidos.length) {
    matchesList.innerHTML = `<li>${t("no_matches", getEquipoLabel())}</li>`;
    return;
  }
  matchesList.innerHTML = "";
  void preloadPartidoDetalleModule();
  const equipoSel = getEquipoNombreCompleto();
  const lang = getLang() === "eu" ? "eu" : "es";
  const now = new Date();
  const proximoIdx = getProximoPartidoIdx(partidos, now);
  let proximoLi = null;
  for (let idx = 0; idx < partidos.length; idx++) {
    const p = partidos[idx];
    const li = renderPartidoLi(p, equipoSel, lang, proximoIdx, idx);
    if (idx === proximoIdx) proximoLi = li;
    // Abrir detalle de partido al hacer click
    const warmupDetalle = () => {
      void preloadPartidoDetalleModule();
      li.removeEventListener("pointerenter", warmupDetalle);
      li.removeEventListener("touchstart", warmupDetalle);
      li.removeEventListener("focusin", warmupDetalle);
    };
    li.addEventListener("pointerenter", warmupDetalle, { passive: true });
    li.addEventListener("touchstart", warmupDetalle, { passive: true, once: true });
    li.addEventListener("focusin", warmupDetalle, { once: true });
    li.onclick = () => {
      if (p.IdPartido) {
        preloadPartidoDetalleModule().then(mod => mod.openPartidoDetalle(p.IdPartido));
      }
    };
    matchesList.appendChild(li);
  }
  scrollToProximo(proximoLi);
}

/**
 * Renderiza el resultado de un partido si está finalizado.
 * @param {Object} p - Objeto partido.
 * @returns {string} HTML del resultado o vacío.
 */
function renderResultado(p) {
  if (p.EstadoPartido == 2 && p.GolesLocal != null && p.GolesVisit != null) {
    return `<div class='partido-resultado-row'><span class="partido-resultado">${p.GolesLocal} - ${p.GolesVisit}</span></div>`;
  }
  return "";
}

/**
 * Renderiza un elemento <li> para un partido.
 * @param {Object} p - Objeto partido.
 * @param {string} equipoSel - Nombre del equipo seleccionado.
 * @param {string} lang - Idioma ('es' o 'eu').
 * @param {number} proximoIdx - Índice del próximo partido.
 * @param {number} idx - Índice actual en la lista.
 * @returns {HTMLLIElement} Elemento <li> del partido.
 */
function renderPartidoLi(p, equipoSel, lang, proximoIdx, idx) {
  const fechaFormateada = formatFechaHelper(p.Fecha, lang);
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

