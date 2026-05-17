// partidos.js
// Renderizado y lógica de partidos extraída de ui.js
import { getEquipoLabel, getEquipoNombreCompleto } from "../equipo.js";
import { getLang, t } from "../i18n.js";
import { getEquipoSeleccionado, getEquiposLoyola } from "../state/equipos.js";
import { getParametrosCompeticion } from "../services.js";
import { createCalendarButton } from "../utils/calendar.js";
import { comparePartidosByScheduledDate, extractPartidos, getProximoPartidoIdx, safeStr } from "../utils/helpers.js";
import { emphasizeTeam, formatFecha as formatFechaHelper, makeInstalacionHtml, scrollToProximo } from "../utils/partidosHelpers.js";
import { renderEmptyState, renderErrorState } from "./loadingStates.js";
import { openPartidoDetalle } from "./partidoDetalle.js";

const ENTITY_LOGO_BASE_URL = "https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/200x200";
const competitionLogoCache = new Map();
let partidoDetalleModulePromise = null;

/**
 * Precarga diferida del módulo pesado de detalle para mejorar la sensación de respuesta.
 *
 * @returns {Promise<typeof import("./partidoDetalle.js")>} Módulo de detalle de partido.
 */
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
function getSelectedCompetitionId() {
  const selected = getEquipoSeleccionado();
  if (!selected) return "";
  const [idCompeticion] = selected.split("|");
  return idCompeticion || "";
}

/**
 * Construye un mapa fallback de logos con los equipos ya cargados en memoria.
 *
 * @param {string} idCompeticion Identificador de competición.
 * @returns {Map<string, {entityId: string|null, hasLogo: boolean}>} Mapa base por equipo.
 */
function buildFallbackCompetitionLogoMap(idCompeticion) {
  const fallbackMap = new Map();
  const equipos = getEquiposLoyola();
  for (const eq of equipos) {
    if (String(eq.idCompeticion) !== String(idCompeticion)) continue;
    fallbackMap.set(String(eq.idEquipoComp), {
      entityId: eq.idEntidadEquipo ? String(eq.idEntidadEquipo) : null,
      hasLogo: !!eq.idEntidadEquipo,
    });
  }
  return fallbackMap;
}

/**
 * Normaliza la respuesta de parámetros de competición a un mapa de logos por `IdEquipoComp`.
 *
 * @param {any} raw Respuesta cruda del endpoint.
 * @returns {Map<string, {entityId: string|null, hasLogo: boolean}>} Mapa de logos.
 */
function parseCompetitionLogoMap(raw) {
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

  return logoMap;
}

/**
 * Carga y cachea el mapa de logos de la competición actualmente seleccionada.
 *
 * @returns {Promise<Map<string, {entityId: string|null, hasLogo: boolean}>>} Mapa por `IdEquipoComp`.
 */
async function getCompetitionLogoMap() {
  const idCompeticion = getSelectedCompetitionId();
  if (!idCompeticion) return new Map();
  if (competitionLogoCache.has(idCompeticion)) return competitionLogoCache.get(idCompeticion);

  const fallbackMap = buildFallbackCompetitionLogoMap(idCompeticion);

  try {
    const raw = await getParametrosCompeticion(idCompeticion);
    const logoMap = parseCompetitionLogoMap(raw);
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
  const partidosOrdenados = Array.isArray(partidos) ? partidos.slice().sort(comparePartidosByScheduledDate) : [];

  window._partidosLoyola = partidosOrdenados;

  if (error) {
    renderErrorState(matchesList, t("error", error));
    return;
  }

  if (!partidosOrdenados.length) {
    renderEmptyState(matchesList, t("no_matches", getEquipoLabel()));
    return;
  }

  matchesList.innerHTML = "";
  void preloadPartidoDetalleModule();

  const renderContext = {
    equipoSel: getEquipoNombreCompleto(),
    lang: getLang() === "eu" ? "eu" : "es",
    proximoIdx: getProximoPartidoIdx(partidosOrdenados, new Date()),
    logoMap: await getCompetitionLogoMap(),
  };

  const proximoLi = renderPartidosList(matchesList, partidosOrdenados, renderContext);
  scrollToProximo(proximoLi);
}

/**
 * Renderiza el resultado de un partido si está finalizado.
 * @param {Object} p - Objeto partido.
 * @returns {string} HTML del resultado o vacío.
 */
/**
 * Renderiza la pieza central del duelo: marcador final si existe, o estado compacto si aún no se ha jugado.
 *
 * @param {object} p Objeto partido.
 * @returns {string} HTML del bloque central.
 */
function renderResultado(p) {
  if (p.EstadoPartido == 2 && p.GolesLocal != null && p.GolesVisit != null) {
    return `<div class='partido-resultado-row'><span class="partido-resultado">${p.GolesLocal} - ${p.GolesVisit}</span></div>`;
  }

  const hora = p?.Hora ? String(p.Hora).slice(0, 5) : "";
  const estado = hora || t("detail_match").replace(/\s+/g, " ") || "Próximo";
  return `<div class='partido-resultado-row'><span class="partido-resultado partido-resultado-pendiente">${safeStr(estado)}</span></div>`;
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
          ${resultadoHtml}
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

/**
 * Vincula interacciones ligeras de precarga y apertura de detalle sobre una tarjeta.
 *
 * @param {HTMLLIElement} li Tarjeta del partido.
 * @param {object} partido Partido asociado.
 * @returns {void}
 */
function enrichTeamPayloadFromAvailableData(equipoPayload) {
  const competitionId = String(equipoPayload?.IdCompeticion || "");
  const teamId = String(equipoPayload?.IdEquipoComp || equipoPayload?.IdEquipo || "");

  const clasData = Array.isArray(window._clasificacionLoyola) ? window._clasificacionLoyola : [];
  const clasMatch = clasData.find((eq) => String(eq?.IdCompeticion || "") === competitionId && String(eq?.IdEquipoComp || eq?.IdEquipo || "") === teamId);
  if (clasMatch) {
    return { ...clasMatch, ...equipoPayload, IdCompeticion: equipoPayload.IdCompeticion || clasMatch.IdCompeticion };
  }

  const catalogMatch = getEquiposLoyola().find((eq) => String(eq?.idCompeticion || "") === competitionId && String(eq?.idEquipoComp || "") === teamId);
  if (catalogMatch) {
    return {
      ...equipoPayload,
      IdCompeticion: equipoPayload.IdCompeticion || catalogMatch.idCompeticion,
      IdEquipoComp: equipoPayload.IdEquipoComp || catalogMatch.idEquipoComp,
      IdEntidadEquipo: equipoPayload.IdEntidadEquipo || catalogMatch.idEntidadEquipo || null,
      NombreEquipo: equipoPayload.NombreEquipo || catalogMatch.nombreEquipo,
      NombreGrupo: equipoPayload.NombreGrupo || catalogMatch.nombreCompeticion || "",
    };
  }

  return equipoPayload;
}

async function openTeamDetailFromMatch(equipoPayload) {
  const enrichedPayload = enrichTeamPayloadFromAvailableData(equipoPayload);
  const utils = await import("./partidoDetalleUtils.js");
  const subview = await import("./equipoDetalleSubview.js");
  const initialState = utils.createDetalleState("team-detail-entry");
  initialState.selectedEquipo = utils.normalizarEquipoClasificacion(enrichedPayload);
  initialState.loadingTeam = true;
  initialState.navigation.currentView = "equipo";
  openPartidoDetalle("team-detail-entry", {
    initialState,
    initialHeaderHtml: subview.renderEquipoDetalleHeader(initialState.selectedEquipo),
  });
  requestAnimationFrame(async () => {
    const state = window.__partidoDetalleState;
    const headerEl = document.getElementById("partido-detalle-header-content");
    const bodyEl = document.getElementById("partido-detalle-body");
    const renderAll = window.__partidoDetalleRenderAll;
    if (!state || !headerEl || !bodyEl || typeof renderAll !== "function") return;
    state.selectedEquipo = initialState.selectedEquipo;
    state.loadingTeam = true;
    state.navigation.currentView = "equipo";
    await subview.openEquipoSubview(state, enrichedPayload, headerEl, bodyEl, renderAll);
  });
}

function bindPartidoInteractions(li, partido, logoMap) {
  const warmupDetalle = () => {
    void preloadPartidoDetalleModule();
    li.removeEventListener("pointerenter", warmupDetalle);
    li.removeEventListener("touchstart", warmupDetalle);
    li.removeEventListener("focusin", warmupDetalle);
  };

  li.addEventListener("pointerenter", warmupDetalle, { passive: true });
  li.addEventListener("touchstart", warmupDetalle, { passive: true, once: true });
  li.addEventListener("focusin", warmupDetalle, { once: true });

  li.querySelectorAll(".partido-team").forEach((teamEl) => {
    teamEl.addEventListener("click", async (event) => {
      event.stopPropagation();
      const isLocal = teamEl.classList.contains("partido-team-local");
      const teamCompId = String(isLocal ? partido.IdEquipoLocal : partido.IdEquipoVisit);
      const logoInfo = logoMap?.get(teamCompId);
      const equipoPayload = {
        IdEquipo: isLocal ? partido.IdEquipoLocal : partido.IdEquipoVisit,
        IdEquipoComp: isLocal ? partido.IdEquipoLocal : partido.IdEquipoVisit,
        IdEntidadEquipo: logoInfo?.entityId || null,
        NombreEquipo: isLocal ? partido.EquipoLocal : partido.EquipoVisit,
        IdCompeticion: getSelectedCompetitionId(),
        NombreGrupo: partido.NombreCompeticion || partido.NombreGrupo || "",
      };
      await openTeamDetailFromMatch(equipoPayload);
    });
  });

  li.onclick = () => {
    if (partido.IdPartido) {
      preloadPartidoDetalleModule().then((mod) => mod.openPartidoDetalle(partido.IdPartido));
    }
  };
}

/**
 * Renderiza secuencialmente la lista de partidos usando un contexto compartido.
 *
 * @param {HTMLElement} matchesList Contenedor destino.
 * @param {Array<object>} partidosOrdenados Lista ordenada de partidos.
 * @param {{equipoSel:string, lang:string, proximoIdx:number, logoMap:Map<string, {entityId: string|null, hasLogo: boolean}>}} renderContext Contexto estable de render.
 * @returns {HTMLLIElement|null} Nodo del próximo partido, si existe.
 */
function renderPartidosList(matchesList, partidosOrdenados, renderContext) {
  let proximoLi = null;

  for (let idx = 0; idx < partidosOrdenados.length; idx += 1) {
    const partido = partidosOrdenados[idx];
    const li = renderPartidoLi(
      partido,
      renderContext.equipoSel,
      renderContext.lang,
      renderContext.proximoIdx,
      idx,
      renderContext.logoMap,
    );

    if (idx === renderContext.proximoIdx) {
      proximoLi = li;
    }

    bindPartidoInteractions(li, partido, renderContext.logoMap);
    matchesList.appendChild(li);
  }

  return proximoLi;
}

