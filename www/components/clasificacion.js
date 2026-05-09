// clasificacion.js — clasificación en tabla estilo BeSoccer

import { getCalendarioTodosEquipos } from "../services.js";
import { getEquipoLabel } from "../equipo.js";
import { t } from "../i18n.js";
import { calcularPosicionesPrevias, groupClasificacionData } from "../utils/clasificacionHelpers.js";
import { decodeApiRaw, safeStr } from "../utils/helpers.js";

/**
 * Renderiza la clasificación. Si la API retorna vacío o error, muestra mensaje amigable.
 * @param {HTMLElement} matchesList - Elemento donde renderizar la clasificación.
 * @param {any} raw - Respuesta cruda de la API.
 */
export function renderClasificacion(matchesList, raw) {
  // Mostrar spinner mientras se procesa la carga (útil si tarda en calcular flechas)
  matchesList.innerHTML = `<li><div class='spinner-container'><div class='spinner' aria-label='Cargando'></div></div></li>`;
  (async () => {
    const data = decodeApiRaw(raw);
    if (data?.__error) {
      matchesList.innerHTML = `<li>${t("error", data.__error)}</li>`;
      return;
    }
    // Si la API retorna {d: ""} o similar, decodeApiRaw devuelve null o string vacío
    if (!data || (Array.isArray(data) && data.length === 0)) {
      matchesList.innerHTML = `<li>${t("no_clasificacion", getEquipoLabel())}</li>`;
      return;
    }
    if (!Array.isArray(data)) {
      matchesList.innerHTML = `<li>${t("no_clasificacion", getEquipoLabel())}</li>`;
      return;
    }


    // Obtener el calendario de todos los equipos de la competición para calcular flechas
    let idCompeticion = null;
    if (data[0]?.IdCompeticion) idCompeticion = data[0].IdCompeticion;
    let partidos = [];
    if (idCompeticion) {
      // Obtener todos los ids de equipo de la competición (de todos los grupos)
      const idsEquipos = Array.from(new Set(data.map(eq => eq.IdEquipo || eq.IdEquipoComp)));
      try {
        partidos = await getCalendarioTodosEquipos(idCompeticion, idsEquipos);
      } catch {}
    }
    window._partidosLoyola = partidos;

    matchesList.innerHTML = "";
    const selectedInfo = getSelectedEquipoInfo();
    const grupos = groupClasificacionData(data);
    const gruposKeys = Object.keys(grupos);
    if (gruposKeys.length === 1) {
      const grupo = gruposKeys[0];
      const table = renderClasificacionTable(grupo, grupos[grupo], selectedInfo);
      matchesList.appendChild(table);
    } else {
      renderClasificacionAccordion(matchesList, grupos, gruposKeys, selectedInfo);
    }
  })();
}

/**
 * Renderiza la tabla de clasificación de equipos para un grupo.
 * Calcula las posiciones previas para mostrar flechas de subida/bajada.
 * @param {string} grupo - Nombre del grupo o competición.
 * @param {Array} equipos - Array de objetos equipo de la clasificación.
 * @param {Object} selectedInfo - Información del equipo seleccionado.
 * @returns {HTMLTableElement} Tabla HTML con la clasificación.
 */
function renderClasificacionTable(grupo, equipos, selectedInfo) {
  // Detect jornada actual (máximo Orden en equipos)
  const ordenActual = Math.max(...equipos.map((eq) => Number(eq?.Orden ?? 0)));
  // Calcular posiciones previas usando helper modularizado
  let prevPosMap = {};
  try {
    const partidos = Array.isArray(window._partidosLoyola) ? window._partidosLoyola : [];
    prevPosMap = calcularPosicionesPrevias(equipos, partidos);
  } catch {}
  // Render tabla
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
        <th class="col-team">${t("team") || "Equipo"}</th>
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
  // Para guardar la clasificación actual
  const currData = [];
  for (const eq of equipos) {
    const dg = Number(eq?.DiferenciaGoles ?? 0);
    const dgTxt = (dg >= 0 ? "+" : "") + dg;
    const tr = document.createElement("tr");
    // Usar IdEquipo si existe y es válido, si no IdEquipoComp
    let eqId = null;
    if (
      typeof eq?.IdEquipo === "number" ||
      (typeof eq?.IdEquipo === "string" && eq.IdEquipo !== "")
    ) {
      eqId = String(eq.IdEquipo);
    } else {
      eqId = String(eq?.IdEquipoComp);
    }
    const eqNombre = eq?.NombreEquipo?.toUpperCase();
    const eqAbrev = eq?.NombreEquipoAbrev?.toUpperCase();
    currData.push({ IdEquipo: eqId, Posicion: eq?.Posicion });
    // Caret logic
    let caret = "&nbsp;";
    const prevPos = prevPosMap[eqId];
    if (typeof prevPos === "number") {
      if (Number(eq?.Posicion) < prevPos) {
        caret = `<span class='caret-up' title='Sube'>&#9650;</span>`;
      } else if (Number(eq?.Posicion) > prevPos) {
        caret = `<span class='caret-down' title='Baja'>&#9660;</span>`;
      }
    }
    if (isFav(eqId, eqNombre, eqAbrev, selectedInfo)) {
      tr.classList.add("fav");
    }
    tr.innerHTML = `
      <td class="col-pos"><span class="caret-space">${caret}</span>${safeStr(
      eq?.Posicion
    )}</td>
      <td class="col-team"><span class="team-name">${safeStr(
        eq?.NombreEquipo
      )}</span></td>
      <td class="col-pts"><strong class="val">${safeStr(
        eq?.Puntos
      )}</strong></td>
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
  // Guardar la clasificación actual para la próxima jornada
  try {
    localStorage.setItem(currKey, JSON.stringify(currData));
  } catch {}
  return table;
}

/**
 * Renderiza la vista de clasificación, incluyendo grupos y cálculo de flechas.
 * @param {HTMLElement} matchesList - Elemento contenedor donde se renderiza la tabla.
 * @param {any} raw - Datos crudos de la API (JSON o string).
 */
function renderClasificacionAccordion(
  matchesList,
  grupos,
  gruposKeys,
  selectedInfo
) {
  let openIdx = 0;
  for (let idx = 0; idx < gruposKeys.length; idx++) {
    const grupo = gruposKeys[idx];
    const accLi = document.createElement("li");
    accLi.className = "clas-card clas-accordion";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "clas-acc-btn";
    btn.textContent = grupo;
    btn.setAttribute("aria-expanded", idx === openIdx ? "true" : "false");
    accLi.appendChild(btn);

    const content = document.createElement("div");
    content.className = "clas-acc-content";
    if (idx === openIdx) content.classList.add("open");

    const table = renderClasificacionTable(grupo, grupos[grupo], selectedInfo);
    content.appendChild(table);
    accLi.appendChild(content);

    btn.addEventListener("click", () => {
      const allBtns = matchesList.querySelectorAll(".clas-acc-btn");
      const allContents = matchesList.querySelectorAll(".clas-acc-content");
      for (const b of allBtns) {
        if (b !== btn) b.setAttribute("aria-expanded", "false");
      }
      for (const c of allContents) {
        if (c !== content) c.classList.remove("open");
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
    (selectedInfo.selectedIdEquipo &&
      eqId === String(selectedInfo.selectedIdEquipo)) ||
    (selectedInfo.selectedNombre && eqNombre === selectedInfo.selectedNombre) ||
    (selectedInfo.selectedAbrev &&
      eqAbrev &&
      eqAbrev === selectedInfo.selectedAbrev)
  );
}

/**
 * Obtiene la información del equipo seleccionado desde localStorage.
 * @returns {{selectedIdEquipo: string|null, selectedNombre: string|null, selectedAbrev: string|null}}
 */
function getSelectedEquipoInfo() {
  let selectedIdEquipo = null,
    selectedNombre = null,
    selectedAbrev = null;
  try {
    const sel = localStorage.getItem("equipoLoyolaSel");
    if (sel) {
      const parts = sel.split("|");
      if (parts.length === 2) {
        selectedIdEquipo = parts[1];
        const equipos =
          globalThis._equiposLoyola ?? globalThis.getEquiposLoyola?.();
        if (Array.isArray(equipos)) {
          const eqSel = equipos.find(
            (e) => String(e.idEquipoComp) === String(selectedIdEquipo)
          );
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
