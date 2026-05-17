// clasificacion.js — clasificación en tabla estilo BeSoccer

import { getCalendarioTodosEquipos, getParametrosCompeticion } from "../services.js";
import { ENTITY_LOGO_BASE_URL } from "../servicesShared.js";
import { getEquipoLabel } from "../equipo.js";
import { t } from "../i18n.js";
import { calcularPosicionesPrevias, groupClasificacionData } from "../utils/clasificacionHelpers.js";
import { comparePartidosByScheduledDate, decodeApiRaw, safeStr } from "../utils/helpers.js";
import { renderClasificacionLoadingState, renderEmptyState, renderErrorState } from "./loadingStates.js";

const competitionLogoCache = new Map();

/**
 * Genera la clave de almacenamiento local para una clasificación concreta.
 * @param {string} grupo Nombre del grupo o competición.
 * @returns {string} Clave de localStorage.
 */
function getClasificacionStorageKey(grupo) {
  return `clasificacion:${grupo}`;
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
 * Resuelve el identificador estable del equipo presente en clasificación y calendario.
 *
 * @param {object} equipo Datos del equipo o fila de clasificación.
 * @returns {string} Identificador utilizable o cadena vacía.
 */
function getStableTeamId(equipo) {
  if (typeof equipo?.IdEquipo === "number" || (typeof equipo?.IdEquipo === "string" && equipo.IdEquipo !== "")) {
    return String(equipo.IdEquipo);
  }
  if (typeof equipo?.IdEquipoComp === "number" || (typeof equipo?.IdEquipoComp === "string" && equipo.IdEquipoComp !== "")) {
    return String(equipo.IdEquipoComp);
  }
  return "";
}

/**
 * Indica si un partido puede considerarse finalizado para calcular rachas.
 *
 * @param {object} partido Partido del calendario.
 * @returns {boolean} True cuando hay resultado final.
 */
function isFinishedMatch(partido) {
  return partido?.EstadoPartido == 2 && partido?.GolesLocal != null && partido?.GolesVisit != null;
}

/**
 * Carga y cachea el mapa de logos de la competición.
 *
 * @param {string|number|null} idCompeticion ID de competición.
 * @param {Array<object>} equipos Datos de clasificación como fallback.
 * @returns {Promise<Map<string, {entityId: string|null, hasLogo: boolean}>>} Mapa de logos por equipo.
 */
async function getCompetitionLogoMap(idCompeticion, equipos) {
  const competitionId = idCompeticion != null ? String(idCompeticion) : "";
  if (!competitionId) return new Map();
  if (competitionLogoCache.has(competitionId)) return competitionLogoCache.get(competitionId);

  const fallbackMap = new Map();
  for (const equipo of equipos) {
    const stableId = getStableTeamId(equipo);
    if (!stableId) continue;
    fallbackMap.set(stableId, {
      entityId: equipo?.IdEntidadEquipo != null ? String(equipo.IdEntidadEquipo) : null,
      hasLogo: !!equipo?.TieneLogo || !!equipo?.IdEntidadEquipo,
    });
  }

  try {
    const raw = await getParametrosCompeticion(competitionId);
    const parsed = decodeApiRaw(raw);
    const comp = Array.isArray(parsed) ? parsed[0] : null;
    const equiposComp = Array.isArray(comp?.Equipos) ? comp.Equipos : [];
    const logoMap = new Map();
    for (const equipo of equiposComp) {
      logoMap.set(String(equipo.IdEquipoComp), {
        entityId: equipo?.IdEntidadEquipo != null ? String(equipo.IdEntidadEquipo) : null,
        hasLogo: !!equipo?.TieneLogo,
      });
      if (equipo?.IdEquipo != null) {
        logoMap.set(String(equipo.IdEquipo), {
          entityId: equipo?.IdEntidadEquipo != null ? String(equipo.IdEntidadEquipo) : null,
          hasLogo: !!equipo?.TieneLogo,
        });
      }
    }
    competitionLogoCache.set(competitionId, logoMap);
    return logoMap;
  } catch {
    competitionLogoCache.set(competitionId, fallbackMap);
    return fallbackMap;
  }
}

/**
 * Construye un mapa con la racha reciente de cada equipo.
 *
 * @param {Array<object>} partidos Partidos de la competición.
 * @returns {Map<string, Array<"V"|"E"|"D">>} Racha por equipo.
 */
function buildRecentFormMap(partidos, equipos) {
  const formMap = new Map();
  const aliasMap = new Map();
  const groupTeamIds = new Set();

  for (const equipo of Array.isArray(equipos) ? equipos : []) {
    const ids = [equipo?.IdEquipo, equipo?.IdEquipoComp]
      .filter((value) => value != null && value !== "")
      .map((value) => String(value));
    for (const id of ids) {
      groupTeamIds.add(id);
      if (!aliasMap.has(id)) aliasMap.set(id, new Set());
      for (const otherId of ids) aliasMap.get(id).add(otherId);
    }
  }

  const pushResult = (teamId, result) => {
    const aliases = aliasMap.get(teamId);
    const targetIds = aliases && aliases.size ? Array.from(aliases) : [teamId];
    for (const targetId of targetIds) {
      if (!targetId || !groupTeamIds.has(targetId)) continue;
      if (!formMap.has(targetId)) formMap.set(targetId, []);
      formMap.get(targetId).push(result);
    }
  };

  const finishedMatches = partidos
    .filter((partido) => {
      if (!isFinishedMatch(partido)) return false;
      const localId = String(partido?.IdEquipoLocal || "");
      const visitId = String(partido?.IdEquipoVisit || "");
      return groupTeamIds.has(localId) && groupTeamIds.has(visitId);
    })
    .slice()
    .sort(comparePartidosByScheduledDate);

  for (const partido of finishedMatches) {
    const localId = String(partido?.IdEquipoLocal || "");
    const visitId = String(partido?.IdEquipoVisit || "");
    const golesLocal = Number(partido?.GolesLocal || 0);
    const golesVisit = Number(partido?.GolesVisit || 0);

    if (localId) {
      pushResult(localId, golesLocal > golesVisit ? "V" : golesLocal < golesVisit ? "D" : "E");
    }

    if (visitId) {
      pushResult(visitId, golesVisit > golesLocal ? "V" : golesVisit < golesLocal ? "D" : "E");
    }
  }

  for (const equipo of Array.isArray(equipos) ? equipos : []) {
    const ids = [equipo?.IdEquipo, equipo?.IdEquipoComp]
      .filter((value) => value != null && value !== "")
      .map((value) => String(value));
    for (const id of ids) {
      if (!formMap.has(id)) formMap.set(id, []);
    }
  }

  for (const [teamId, form] of formMap.entries()) {
    formMap.set(teamId, form.slice(-5));
  }

  return formMap;
}

/**
 * Devuelve el HTML de la racha reciente de un equipo.
 *
 * @param {Array<"V"|"E"|"D">} form Resultados recientes.
 * @returns {string} HTML de chips.
 */
function renderRecentForm(form) {
  if (!Array.isArray(form) || form.length === 0) return "";
  return `
    <div class="clas-team-form" aria-label="${t("clas_form_aria")}">
      ${form.map((result) => `
        <span class="clas-form-chip is-${result.toLowerCase()}" aria-label="${result === "V" ? t("clas_form_win") : result === "E" ? t("clas_form_draw") : t("clas_form_loss")}">${result}</span>
      `).join("")}
    </div>
  `;
}

/**
 * Devuelve el HTML del escudo de un equipo.
 *
 * @param {Map<string, {entityId: string|null, hasLogo: boolean}>} logoMap Mapa de logos.
 * @param {object} equipo Fila de equipo de clasificación.
 * @returns {string} HTML del escudo.
 */
function renderTeamLogo(logoMap, equipo) {
  const logoInfo = logoMap.get(getStableTeamId(equipo));
  const src = logoInfo?.hasLogo ? getEntityLogoUrl(logoInfo.entityId) : getEntityLogoUrl("sinescudo");
  return `<img class="clas-team-logo" src="${src}" alt="Escudo de ${safeStr(equipo?.NombreEquipo || "equipo")}" loading="lazy" decoding="async">`;
}

/**
 * Devuelve el HTML del indicador de posición con caret compacto.
 *
 * @param {object} equipo Fila de clasificación.
 * @param {Object} prevPosMap Mapa de posiciones previas.
 * @returns {string} HTML de posición.
 */
function renderPositionCell(equipo, prevPosMap) {
  const eqId = getStableTeamId(equipo);
  const prevPos = prevPosMap[eqId];
  let caretHtml = '<span class="clas-pos-caret-spacer" aria-hidden="true"></span>';

  if (typeof prevPos === "number") {
    if (Number(equipo?.Posicion) < prevPos) {
      caretHtml = `<span class="clas-pos-caret is-up" aria-label="${t("clas_pos_up")}">▲</span>`;
    } else if (Number(equipo?.Posicion) > prevPos) {
      caretHtml = `<span class="clas-pos-caret is-down" aria-label="${t("clas_pos_down")}">▼</span>`;
    }
  }

  return `
    <div class="clas-pos-stack">
      ${caretHtml}
      <span class="clas-pos-number">${safeStr(equipo?.Posicion)}</span>
    </div>
  `;
}

/**
 * Construye la celda completa de equipo con escudo, nombre y racha.
 *
 * @param {object} equipo Fila de clasificación.
 * @param {Map<string, {entityId: string|null, hasLogo: boolean}>} logoMap Mapa de logos.
 * @param {Map<string, Array<"V"|"E"|"D">>} formMap Mapa de rachas.
 * @returns {string} HTML de la celda.
 */
function renderTeamCell(equipo, logoMap, formMap) {
  const stableId = getStableTeamId(equipo);
  const recentForm = formMap.get(stableId) || [];
  return `
    <div class="clas-team-cell">
      <div class="clas-team-logo-wrap">${renderTeamLogo(logoMap, equipo)}</div>
      <div class="clas-team-copy">
        <span class="team-name">${safeStr(equipo?.NombreEquipo)}</span>
        ${renderRecentForm(recentForm)}
      </div>
    </div>
  `;
}

/**
 * Renderiza la clasificación. Si la API retorna vacío o error, muestra mensaje amigable.
 * @param {HTMLElement} matchesList - Elemento donde renderizar la clasificación.
 * @param {any} raw - Respuesta cruda de la API.
 */
export function renderClasificacion(matchesList, raw) {
  const renderToken = String(Date.now()) + Math.random().toString(36).slice(2);
  matchesList.dataset.clasRenderToken = renderToken;
  void renderClasificacionContent(matchesList, raw, renderToken);
}

/**
 * Orquesta el render asíncrono de la clasificación y de sus datos auxiliares.
 *
 * @param {HTMLElement} matchesList Elemento donde renderizar la clasificación.
 * @param {any} raw Respuesta cruda de la API.
 * @returns {Promise<void>} Promesa resuelta al terminar la preparación.
 */
async function renderClasificacionContent(matchesList, raw, renderToken) {
  renderClasificacionLoadingState(matchesList);

  const isRenderStillValid = () => {
    const navClas = document.getElementById("navClas");
    return matchesList.dataset.clasRenderToken === renderToken && !!navClas?.classList.contains("active");
  };
  const data = decodeApiRaw(raw);
  if (data?.__error) {
    renderErrorState(matchesList, t("error", data.__error));
    return;
  }
  if (!data || (Array.isArray(data) && data.length === 0)) {
    renderEmptyState(matchesList, t("no_clasificacion", getEquipoLabel()));
    return;
  }
  if (!Array.isArray(data)) {
    renderEmptyState(matchesList, t("no_clasificacion", getEquipoLabel()));
    return;
  }

  if (!isRenderStillValid()) return;

  const idCompeticion = data[0]?.IdCompeticion ?? null;
  let partidos = [];
  if (idCompeticion) {
    const idsEquipos = Array.from(new Set(data.map((eq) => eq.IdEquipo || eq.IdEquipoComp)));
    try {
      partidos = await getCalendarioTodosEquipos(idCompeticion, idsEquipos);
    } catch {}
  }
  if (!isRenderStillValid()) return;
  globalThis._partidosLoyola = partidos;

  const logoMap = await getCompetitionLogoMap(idCompeticion, data);
  if (!isRenderStillValid()) return;

  matchesList.innerHTML = "";
  const selectedInfo = getSelectedEquipoInfo();
  const grupos = groupClasificacionData(data);
  const gruposKeys = Object.keys(grupos);
  if (gruposKeys.length === 1) {
    const grupo = gruposKeys[0];
    const formMap = buildRecentFormMap(partidos, grupos[grupo]);
    const table = renderClasificacionTable(grupo, grupos[grupo], selectedInfo, logoMap, formMap);
    const tableWrap = document.createElement("div");
    tableWrap.className = "clas-table-wrap";
    tableWrap.appendChild(table);
    matchesList.appendChild(tableWrap);
  } else {
    renderClasificacionAccordion(matchesList, grupos, gruposKeys, selectedInfo, logoMap, partidos);
  }
}

/**
 * Renderiza la tabla de clasificación de equipos para un grupo.
 *
 * @param {string} grupo Nombre del grupo o competición.
 * @param {Array} equipos Array de objetos equipo de la clasificación.
 * @param {Object} selectedInfo Información del equipo seleccionado.
 * @param {Map<string, {entityId: string|null, hasLogo: boolean}>} logoMap Mapa de logos.
 * @param {Map<string, Array<"V"|"E"|"D">>} formMap Mapa de rachas.
 * @returns {HTMLTableElement} Tabla HTML con la clasificación.
 */
function renderClasificacionTable(grupo, equipos, selectedInfo, logoMap, formMap) {
  const currKey = getClasificacionStorageKey(grupo);
  let prevPosMap = {};
  try {
    const partidos = Array.isArray(globalThis._partidosLoyola) ? globalThis._partidosLoyola : [];
    prevPosMap = calcularPosicionesPrevias(equipos, partidos);
  } catch {}

  const table = document.createElement("table");
  table.className = "clas-table";
  table.setAttribute("role", "grid");
  table.setAttribute("aria-label", grupo);
  table.innerHTML = `
    <colgroup>
      <col class="col-pos-width" />
      <col class="col-team-width" />
      <col class="col-pts-width" />
      <col class="col-j-width" />
      <col class="col-g-width" />
      <col class="col-e-width" />
      <col class="col-p-width" />
      <col class="col-f-width" />
      <col class="col-c-width" />
      <col class="col-dif-width" />
    </colgroup>
    <thead>
      <tr>
        <th class="col-pos">#</th>
        <th class="col-team">${t("clas_team_header")}</th>
        <th class="col-pts">Pts</th>
        <th class="col-num">PJ</th>
        <th class="col-num">PG</th>
        <th class="col-num">PE</th>
        <th class="col-num">PP</th>
        <th class="col-num">GF</th>
        <th class="col-num">GC</th>
        <th class="col-num">DG</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  const currData = [];

  for (const eq of equipos) {
    const dg = Number(eq?.DiferenciaGoles ?? 0);
    const dgTxt = `${dg >= 0 ? "+" : ""}${dg}`;
    const tr = document.createElement("tr");
    const eqId = getStableTeamId(eq);
    const eqNombre = eq?.NombreEquipo?.toUpperCase();
    const eqAbrev = eq?.NombreEquipoAbrev?.toUpperCase();
    currData.push({ IdEquipo: eqId, Posicion: eq?.Posicion });

    if (isFav(eqId, eqNombre, eqAbrev, selectedInfo)) {
      tr.classList.add("fav");
    }

    tr.innerHTML = `
      <td class="col-pos">${renderPositionCell(eq, prevPosMap)}</td>
      <td class="col-team">${renderTeamCell(eq, logoMap, formMap)}</td>
      <td class="col-pts"><strong class="val">${safeStr(eq?.Puntos)}</strong></td>
      <td class="col-num">${safeStr(eq?.PartidosJugados)}</td>
      <td class="col-num">${safeStr(eq?.PartidosGanados)}</td>
      <td class="col-num">${safeStr(eq?.PartidosEmpatados)}</td>
      <td class="col-num">${safeStr(eq?.PartidosPerdidos)}</td>
      <td class="col-num">${safeStr(eq?.GolesAFavor)}</td>
      <td class="col-num">${safeStr(eq?.GolesEnContra)}</td>
      <td class="col-num">${safeStr(dgTxt)}</td>
    `;
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  try {
    localStorage.setItem(currKey, JSON.stringify(currData));
  } catch {}
  return table;
}

/**
 * Renderiza la vista de clasificación, incluyendo grupos y cálculo de flechas.
 *
 * @param {HTMLElement} matchesList Elemento contenedor donde se renderiza la tabla.
 * @param {Object} grupos Agrupación de equipos por grupo.
 * @param {Array<string>} gruposKeys Claves de grupos.
 * @param {Object} selectedInfo Información del equipo seleccionado.
 * @param {Map<string, {entityId: string|null, hasLogo: boolean}>} logoMap Mapa de logos.
 * @param {Map<string, Array<"V"|"E"|"D">>} formMap Mapa de rachas.
 * @returns {void}
 */
function renderClasificacionAccordion(matchesList, grupos, gruposKeys, selectedInfo, logoMap, partidos) {
  const openIdx = 0;
  for (let idx = 0; idx < gruposKeys.length; idx += 1) {
    const grupo = gruposKeys[idx];
    const accLi = document.createElement("li");
    accLi.className = "clas-card clas-accordion";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "clas-acc-btn";
    btn.setAttribute("aria-expanded", idx === openIdx ? "true" : "false");
    btn.innerHTML = `
      <span class="clas-acc-summary-main">
        <span class="clas-acc-title">${safeStr(grupo)}</span>
      </span>
      <span class="clas-acc-summary-side">
        <span class="clas-acc-chevron" aria-hidden="true"></span>
      </span>
    `;
    accLi.appendChild(btn);

    const content = document.createElement("div");
    content.className = "clas-acc-content";
    if (idx === openIdx) content.classList.add("open");

    const formMap = buildRecentFormMap(partidos, grupos[grupo]);
    const table = renderClasificacionTable(grupo, grupos[grupo], selectedInfo, logoMap, formMap);
    const tableWrap = document.createElement("div");
    tableWrap.className = "clas-table-wrap";
    tableWrap.appendChild(table);
    content.appendChild(tableWrap);
    accLi.appendChild(content);

    btn.addEventListener("click", () => {
      const allBtns = matchesList.querySelectorAll(".clas-acc-btn");
      const allContents = matchesList.querySelectorAll(".clas-acc-content");
      for (const otherBtn of allBtns) {
        if (otherBtn !== btn) otherBtn.setAttribute("aria-expanded", "false");
      }
      for (const otherContent of allContents) {
        if (otherContent !== content) otherContent.classList.remove("open");
      }
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", expanded ? "false" : "true");
      if (expanded) {
        content.classList.remove("open");
      } else {
        content.classList.add("open");
      }
    });

    matchesList.appendChild(accLi);
  }
}

/**
 * Determina si un equipo es el favorito/seleccionado.
 * @param {string} eqId - ID del equipo.
 * @param {string} eqNombre - Nombre del equipo.
 * @param {string} eqAbrev - Abreviatura del equipo.
 * @param {Object} selectedInfo - Info del equipo seleccionado.
 * @returns {boolean} True si es el equipo favorito.
 */
function isFav(eqId, eqNombre, eqAbrev, selectedInfo) {
  return (
    (selectedInfo.selectedIdEquipo && eqId === String(selectedInfo.selectedIdEquipo)) ||
    (selectedInfo.selectedNombre && eqNombre === selectedInfo.selectedNombre) ||
    (selectedInfo.selectedAbrev && eqAbrev && eqAbrev === selectedInfo.selectedAbrev)
  );
}

/**
 * Obtiene la información del equipo seleccionado desde localStorage.
 * @returns {{selectedIdEquipo: string|null, selectedNombre: string|null, selectedAbrev: string|null}}
 */
function getSelectedEquipoInfo() {
  let selectedIdEquipo = null;
  let selectedNombre = null;
  let selectedAbrev = null;
  try {
    const sel = localStorage.getItem("equipoLoyolaSel");
    if (sel) {
      const parts = sel.split("|");
      if (parts.length === 2) {
        selectedIdEquipo = parts[1];
        const equipos = globalThis._equiposLoyola ?? globalThis.getEquiposLoyola?.();
        if (Array.isArray(equipos)) {
          const eqSel = equipos.find((equipo) => String(equipo.idEquipoComp) === String(selectedIdEquipo));
          if (eqSel) {
            selectedNombre = eqSel.nombreEquipo?.toUpperCase();
            selectedAbrev = eqSel.nombreEquipoAbrev?.toUpperCase();
          }
        }
      }
    }
  } catch {}
  return { selectedIdEquipo, selectedNombre, selectedAbrev };
}
