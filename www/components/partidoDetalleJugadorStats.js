import { t } from "../i18n.js";
import { emptyArray, escapeHtml, parseApiArrayResponse } from "./partidoDetalleUtils.js";

/**
 * Normaliza la respuesta cruda del endpoint de estadísticas de jugador.
 *
 * @param {unknown} raw Payload devuelto por la API o por el proxy.
 * @returns {object|null} Bloque principal de estadísticas del jugador o null.
 */
export function getPlayerStatsData(raw) {
  const parsed = parseApiArrayResponse(raw);
  if (Array.isArray(parsed)) return parsed[0] || null;
  return parsed && typeof parsed === "object" ? parsed : null;
}

/**
 * Construye la URL pública de la foto del jugador.
 *
 * @param {string} foto Identificador de foto devuelto por la API.
 * @returns {string} URL absoluta de la imagen del jugador.
 */
export function getJugadorFotoUrl(foto) {
  const rawKey = String(foto || "sinfoto").trim();
  if (!rawKey || rawKey === "sinfoto") {
    return "https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/licencias/foto/no_foto.png";
  }

  const hasKnownExtension = /\.(jpe?g|png|webp|gif)$/i.test(rawKey);
  const normalizedKey = hasKnownExtension ? rawKey : `${rawKey}.jpg`;
  return `https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/licencias/foto/${encodeURIComponent(normalizedKey)}`;
}

/**
 * Convierte un valor potencialmente vacío o no numérico a número seguro.
 *
 * @param {unknown} value Valor de entrada.
 * @returns {number} Número normalizado, o 0 si no es válido.
 */
export function safeNumber(value) {
  return Number(value) || 0;
}

/**
 * Indica si un valor numérico es estrictamente positivo.
 *
 * @param {unknown} value Valor de entrada.
 * @returns {boolean} True si el valor es mayor que cero.
 */
export function hasPositive(value) {
  return Number(value) > 0;
}

/**
 * Devuelve la configuración de columnas de estadísticas según tipo de licencia y modalidad.
 *
 * @param {string} tipo Tipo de licencia, por ejemplo j o p.
 * @param {string} modalidad Modalidad de hockey activa.
 * @returns {Array<object>} Definición de columnas y acumuladores para render.
 */
export function getJugadorStatColumns(tipo, modalidad) {
  const colPts = {
    key: "Pts",
    label: "Pts",
    cell: (row) => {
      const value = safeNumber(row?.gol) + safeNumber(row?.asist);
      return hasPositive(value) ? value : "";
    },
    totalAdd: (acc, row) => acc + safeNumber(row?.gol) + safeNumber(row?.asist),
    totalRender: (total) => total,
  };
  const colG = { key: "G", label: "G", cell: (row) => hasPositive(row?.gol) ? row.gol : "", totalAdd: (acc, row) => acc + safeNumber(row?.gol), totalRender: (total) => total };
  const colAs = { key: "As", label: "As", cell: (row) => hasPositive(row?.asist) ? row.asist : "", totalAdd: (acc, row) => acc + safeNumber(row?.asist), totalRender: (total) => total };
  const colFD = {
    key: "FD",
    label: "FD",
    cell: (row) => hasPositive(row?.FD) ? `${safeNumber(row?.FDGol)}/${safeNumber(row?.FD)}` : "",
    totalAdd: (acc, row) => ({ gol: (acc.gol || 0) + safeNumber(row?.FDGol), tot: (acc.tot || 0) + safeNumber(row?.FD) }),
    totalRender: (total) => total?.tot > 0 ? `${total.gol}/${total.tot}` : "",
  };
  const colPen = {
    key: "Pen",
    label: "Pen",
    cell: (row) => hasPositive(row?.Pen) ? `${safeNumber(row?.PenGol)}/${safeNumber(row?.Pen)}` : "",
    totalAdd: (acc, row) => ({ gol: (acc.gol || 0) + safeNumber(row?.PenGol), tot: (acc.tot || 0) + safeNumber(row?.Pen) }),
    totalRender: (total) => total?.tot > 0 ? `${total.gol}/${total.tot}` : "",
  };
  const colTA = { key: "TA", label: "TA", cell: (row) => hasPositive(row?.TA) ? row.TA : "", totalAdd: (acc, row) => acc + safeNumber(row?.TA), totalRender: (total) => total };
  const colTR = { key: "TR", label: "TR", cell: (row) => hasPositive(row?.TR) ? row.TR : "", totalAdd: (acc, row) => acc + safeNumber(row?.TR), totalRender: (total) => total };
  const colMin = { key: "Min", label: "Min", cell: (row) => hasPositive(row?.MinutosSancion) ? row.MinutosSancion : "", totalAdd: (acc, row) => acc + safeNumber(row?.MinutosSancion), totalRender: (total) => total };
  const colGR = { key: "GR", label: "GR", cell: (row) => hasPositive(row?.GolesRecibidos) ? row.GolesRecibidos : "", totalAdd: (acc, row) => acc + safeNumber(row?.GolesRecibidos), totalRender: (total) => total };
  const colTRec = {
    key: "TRec",
    label: "TirR",
    cell: (row) => {
      const value = safeNumber(row?.GolesRecibidos) + safeNumber(row?.Tiros);
      return hasPositive(value) ? value : "";
    },
    totalAdd: (acc, row) => acc + safeNumber(row?.GolesRecibidos) + safeNumber(row?.Tiros),
    totalRender: (total) => total,
  };
  const colSave = {
    key: "Save",
    label: "%Par",
    cell: (row) => {
      const shots = safeNumber(row?.GolesRecibidos) + safeNumber(row?.Tiros);
      if (!shots) return "";
      return `${((1 - safeNumber(row?.GolesRecibidos) / shots) * 100).toFixed(1)}%`;
    },
    totalAdd: (acc, row) => ({ gr: (acc.gr || 0) + safeNumber(row?.GolesRecibidos), shots: (acc.shots || 0) + safeNumber(row?.GolesRecibidos) + safeNumber(row?.Tiros) }),
    totalRender: (total) => total?.shots > 0 ? `${((1 - total.gr / total.shots) * 100).toFixed(1)}%` : "",
  };

  if (tipo === "p") {
    return modalidad === "hp"
      ? [colGR, colTRec, colSave, colTA, colTR]
      : [colGR, colTRec, colSave, colMin];
  }

  return modalidad === "hl"
    ? [colPts, colG, colAs, colMin]
    : [colG, colAs, colFD, colPen, colTA, colTR, colMin];
}

/**
 * Acumula los totales de una colección de filas en base a la definición de columnas.
 *
 * @param {Array<object>} rows Filas de estadísticas de una competición.
 * @param {Array<object>} columns Configuración de columnas calculadas.
 * @returns {object} Mapa de acumulados por clave de columna.
 */
export function buildTotalsForColumns(rows, columns) {
  const totals = {};
  columns.forEach((column) => {
    const seed = ["FD", "Pen", "Save"].includes(column.key) ? {} : 0;
    totals[column.key] = emptyArray(rows).reduce((acc, row) => column.totalAdd(acc, row), seed);
  });
  return totals;
}

/**
 * Genera chips agregados de estadísticas a partir de una colección de filas.
 *
 * @param {Array<object>} rows Filas históricas de la competición.
 * @param {string} tipo Tipo de licencia del jugador.
 * @param {string} modalidad Modalidad del partido.
 * @returns {string} HTML con chips de resumen.
 */
export function renderStatsChipsFromRows(rows, tipo, modalidad) {
  const columns = getJugadorStatColumns(tipo, modalidad);
  const totals = buildTotalsForColumns(rows, columns);
  return columns.map((column) => {
    const rendered = column.totalRender(totals[column.key], rows);
    return rendered !== "" && rendered !== 0
      ? `<span class="alineacion-chip">${escapeHtml(column.label)} <strong>${escapeHtml(rendered)}</strong></span>`
      : "";
  }).join("");
}

/**
 * Renderiza el timeline de eventos del partido relacionados con el jugador.
 *
 * @param {Array<object>} eventos Eventos ya filtrados del jugador.
 * @returns {string} HTML del timeline o del estado vacío.
 */
export function renderJugadorTimeline(eventos) {
  return emptyArray(eventos).map((ev) => {
    const period = escapeHtml(ev.CodPeriodo || "");
    const crono = escapeHtml(ev.Crono || "");
    const tipo = escapeHtml(ev.IdTipoEvento || ev.Descripcion || "Evento");
    return `<div class="partido-detalle-player-event"><span>${period} ${crono}</span><strong>${tipo}</strong></div>`;
  }).join("") || `<div class="partido-detalle-empty small cardish">${escapeHtml(t("detail_player_no_events"))}</div>`;
}

/**
 * Renderiza los chips rápidos del bloque del partido actual para el jugador.
 *
 * @param {object} [partidoStats={}] Estadísticas del jugador en el partido actual.
 * @returns {string} HTML con chips del partido.
 */
export function renderPartidoJugadorChips(partidoStats = {}) {
  return [
    partidoStats.Goles != null ? `<span class="alineacion-chip">G <strong>${escapeHtml(partidoStats.Goles)}</strong></span>` : "",
    partidoStats.Asist != null ? `<span class="alineacion-chip">As <strong>${escapeHtml(partidoStats.Asist)}</strong></span>` : "",
    partidoStats.FaltaReal != null ? `<span class="alineacion-chip">F+ <strong>${escapeHtml(partidoStats.FaltaReal)}</strong></span>` : "",
    partidoStats.FaltaRec != null ? `<span class="alineacion-chip">F- <strong>${escapeHtml(partidoStats.FaltaRec)}</strong></span>` : "",
    partidoStats.Azules != null ? `<span class="alineacion-chip">Az <strong>${escapeHtml(partidoStats.Azules)}</strong></span>` : "",
    partidoStats.Rojas != null ? `<span class="alineacion-chip">Rj <strong>${escapeHtml(partidoStats.Rojas)}</strong></span>` : "",
    partidoStats.Minutos != null ? `<span class="alineacion-chip">Min <strong>${escapeHtml(partidoStats.Minutos)}</strong></span>` : "",
  ].filter(Boolean).join("");
}

/**
 * Renderiza una competición histórica del jugador en formato acordeón.
 *
 * @param {object} competicion Datos de una competición histórica.
 * @param {string} tipo Tipo de licencia del jugador.
 * @param {string} modalidad Modalidad del partido.
 * @param {object} [options={}] Opciones de render.
 * @param {boolean} [options.open=false] Indica si el acordeón debe abrirse inicialmente.
 * @returns {string} HTML de la competición.
 */
export function renderJugadorCompeticion(competicion, tipo, modalidad, options = {}) {
  const filas = emptyArray(competicion?.filas);
  const columns = getJugadorStatColumns(tipo, modalidad);
  const totals = buildTotalsForColumns(filas, columns);
  const rowHtml = filas.map((fila) => {
    const statChips = columns.map((column) => {
      const value = column.cell(fila);
      return value !== "" && value !== 0
        ? `<span class="alineacion-chip">${escapeHtml(column.label)} <strong>${escapeHtml(value)}</strong></span>`
        : "";
    }).join("");

    return `
      <article class="partido-detalle-player-history-row partido-detalle-player-history-row-compact">
        <div class="partido-detalle-player-history-main">
          <div class="partido-detalle-player-history-date">${escapeHtml(fila.Fecha || "")}</div>
          <div class="partido-detalle-player-matchup">
            <span class="partido-detalle-player-teamside">${escapeHtml(fila.loc || "")}</span>
            <strong>${escapeHtml(fila.marcador || "-")}</strong>
            <span class="partido-detalle-player-teamside">${escapeHtml(fila.vis || "")}</span>
          </div>
        </div>
        ${statChips ? `<div class="alineacion-chips partido-detalle-player-history-inline-chips">${statChips}</div>` : ""}
      </article>
    `;
  }).join("");

  const compChips = columns.map((column) => {
    const rendered = column.totalRender(totals[column.key], filas);
    return rendered !== "" && rendered !== 0
      ? `<span class="alineacion-chip">${escapeHtml(column.label)} <strong>${escapeHtml(rendered)}</strong></span>`
      : "";
  }).join("");

  return `
    <details class="partido-detalle-player-competition"${options.open ? " open" : ""}>
      <summary class="partido-detalle-player-competition-bar">
        <div class="partido-detalle-player-competition-summary-main">
          <div class="partido-detalle-player-competition-title">${escapeHtml(competicion?.titulo || "Competición")}</div>
          <div class="partido-detalle-player-competition-meta">${escapeHtml(t("detail_matches_count", competicion?.partidos || filas.length))}</div>
        </div>
        <div class="partido-detalle-player-competition-summary-side">
          <div class="alineacion-chips partido-detalle-player-history-chips">${compChips}</div>
          <span class="partido-detalle-player-competition-chevron" aria-hidden="true"></span>
        </div>
      </summary>
      <div class="partido-detalle-player-history-list">
        ${rowHtml || `<div class="partido-detalle-empty small cardish">${escapeHtml(t("detail_no_matches_available"))}</div>`}
      </div>
    </details>
  `;
}
