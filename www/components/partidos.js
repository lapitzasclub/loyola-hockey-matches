// partidos.js
// Renderizado y lógica de partidos extraída de ui.js
import { getEquipoLabel, getEquipoNombreCompleto } from "../equipo.js";
import { getLang, t } from "../i18n.js";
import { getEquipoSeleccionado, getEquiposLoyola } from "../state/equipos.js";
import { getParametrosCompeticion } from "../services.js";
import { createCalendarButton } from "../utils/calendar.js";
import { extractPartidos, getProximoPartidoIdx, safeStr } from "../utils/helpers.js";
import { emphasizeTeam, formatFecha as formatFechaHelper, makeInstalacionHtml, scrollToProximo } from "../utils/partidosHelpers.js";

const ENTITY_LOGO_BASE_URL = "https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200";
const competitionLogoCache = new Map();
let partidoDetalleModulePromise = null;

export function preloadPartidoDetalleModule() {
  if (!partidoDetalleModulePromise) {
    partidoDetalleModulePromise = import("./partidoDetalle.js");
  }
  return partidoDetalleModulePromise;
}

/**
 * Obtiene una URL de escudo a partir del identificador de entidad.
 *
 * @param {string|number|null|undefined} entityId Identificador de entidad.
 * @returns {string} URL pública del escudo.
 */
function getEntityLogoUrl(entityId) {
  return `${ENTITY_LOGO_BASE_URL}/${entityId || "sinescudo"}.png`;
}

/**
 * Carga y cachea el mapa de logos de la competición actualmente seleccionada.
 *
 * @returns {Promise<Map<string, {entityId: string|null, hasLogo: boolean}>>} Mapa por `IdEquipoComp`.
 */
async function getCompetitionLogoMap() {
  const selected = getEquipoSeleccionado();
  if (!selected) return new Map();

  const [idCompeticion] = selected.split("|");
  if (!idCompeticion) return new Map();
  if (competitionLogoCache.has(idCompeticion)) return competitionLogoCache.get(idCompeticion);

  const fallbackMap = new Map();
  const equipos = getEquiposLoyola();
  for (const eq of equipos) {
    if (String(eq.idCompeticion) !== String(idCompeticion)) continue;
    fallbackMap.set(String(eq.idEquipoComp), {
      entityId: eq.idEntidadEquipo ? String(eq.idEntidadEquipo) : null,
      hasLogo: !!eq.idEntidadEquipo,
    });
  }

  try {
    const raw = await getParametrosCompeticion(idCompeticion);
    const parsed = typeof raw === "string" ? JSON.parse(JSON.parse(raw).d) : raw?.d ? JSON.parse(raw.d) : raw;
    const comp = Array.isArray(parsed) ? parsed[0] : null;
    const equiposComp = Array.isArray(comp?.Equipos) ? comp.Equipos : [];
    const logoMap = new Map();
    for (const equipo of equiposComp) {
      logoMap.set(String(equipo.IdEquipoComp), {
        entityId: equipo?.IdEntidadEquipo != null ? String(equipo.IdEntidadEquipo) : null,
        hasLogo: !!equipo?.TieneLogo,
      });
    }
    competitionLogoCache.set(idCompeticion, logoMap);
    return logoMap;
  } catch {
    competitionLogoCache.set(idCompeticion, fallbackMap);
    return fallbackMap;
  }
}

/**
 * Resuelve el HTML del escudo de un equipo del partido.
 *
 * @param {Map<string, {entityId: string|null, hasLogo: boolean}>} logoMap Mapa de equipos de competición a entidad.
 * @param {string|number|null|undefined} equipoCompId ID del equipo en la competición.
 * @param {string} nombre Nombre del equipo para accesibilidad.
 * @returns {string} HTML del escudo.
 */
function renderTeamLogo(logoMap, equipoCompId, nombre) {
  const logoInfo = logoMap.get(String(equipoCompId || ""));
  const src = logoInfo?.hasLogo ? getEntityLogoUrl(logoInfo.entityId) : getEntityLogoUrl("sinescudo");
  return `<img class="partido-team-logo" src="${src}" alt="Escudo de ${safeStr(nombre || "equipo")}" loading="lazy" decoding="async">`;
}

/**
 * Renderiza la lista de partidos en el elemento dado.
 * Expone el histórico de partidos en window._partidosLoyola para la clasificación.
 * @param {HTMLElement} matchesList - Elemento donde se renderiza la lista.
 * @param {any} raw - Datos crudos de la API (JSON o string).
 */
export async function renderPartidos(matchesList, raw) {
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
  const logoMap = await getCompetitionLogoMap();
  let proximoLi = null;
  for (let idx = 0; idx < partidos.length; idx++) {
    const p = partidos[idx];
    const li = renderPartidoLi(p, equipoSel, lang, proximoIdx, idx, logoMap);
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
function renderPartidoLi(p, equipoSel, lang, proximoIdx, idx, logoMap) {
  const fechaFormateada = formatFechaHelper(p.Fecha, lang);
  const hora = p.Hora ? p.Hora.slice(0, 5) : "";
  const instalacionHtml = makeInstalacionHtml(p);
  const local = emphasizeTeam(p.EquipoLocal || null, equipoSel);
  const visit = emphasizeTeam(p.EquipoVisit || null, equipoSel);
  const localLogo = renderTeamLogo(logoMap, p.IdEquipoLocal, p.EquipoLocal);
  const visitLogo = renderTeamLogo(logoMap, p.IdEquipoVisit, p.EquipoVisit);
  const resultadoHtml = renderResultado(p);
  const li = document.createElement("li");
  li.innerHTML = `
    <div class="partido-card-shell">
      <div class="partido-header">
        <span class="partido-jornada">${safeStr(p?.NombreJornada || "")}</span>
        <span class="partido-fecha">${safeStr(fechaFormateada)}${
    hora ? " · " + hora : ""
  }</span>
        <span class="partido-calendario"></span>
      </div>
      <div class="partido-duelo">
        <div class="partido-team partido-team-local">
          ${localLogo}
          <span class="partido-local">${local}</span>
        </div>
        <div class="partido-centro">
          <span class="partido-vs">vs</span>
          ${resultadoHtml || "<div class='partido-estado-placeholder'></div>"}
        </div>
        <div class="partido-team partido-team-visit">
          ${visitLogo}
          <span class="partido-visit">${visit}</span>
        </div>
      </div>
      <div class="partido-footer">
        <div class="partido-instalacion">${instalacionHtml}</div>
      </div>
    </div>
  `;
  const btnCal = createCalendarButton(p);
  li.querySelector(".partido-calendario").appendChild(btnCal);
  if (idx === proximoIdx) {
    li.classList.add("proximo-partido");
  }
  return li;
}

