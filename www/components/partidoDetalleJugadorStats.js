import { t } from "../i18n.js";
import { emptyArray, escapeHtml } from "./partidoDetalleUtils.js";

export function getJugadorFotoUrl(foto) {
  const key = String(foto || "sinfoto").trim();
  if (!key || key === "sinfoto") {
    return "https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/licencias/foto/no_foto.png";
  }
  return `https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/licencias/foto/${encodeURIComponent(key)}.jpg`;
}

export function safeNumber(value) {
  return Number(value) || 0;
}

export function hasPositive(value) {
  return Number(value) > 0;
}

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

export function buildTotalsForColumns(rows, columns) {
  const totals = {};
  columns.forEach((column) => {
    const seed = ["FD", "Pen", "Save"].includes(column.key) ? {} : 0;
    totals[column.key] = emptyArray(rows).reduce((acc, row) => column.totalAdd(acc, row), seed);
  });
  return totals;
}

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
        ${rowHtml || `<div class="partido-detalle-empty small">${escapeHtml(t("detail_no_matches_available"))}</div>`}
      </div>
    </details>
  `;
}
