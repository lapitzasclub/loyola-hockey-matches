import { t } from "../i18n.js";
import { escapeHtml, formatFecha, formatHora, getCurrentTab, logoUrl } from "./partidoDetalleUtils.js";

/**
 * Renderiza la cabecera skeleton del detalle de partido durante la primera carga.
 *
 * @returns {string} HTML skeleton de la cabecera.
 */
export function renderPartidoHeaderSkeleton() {
  return `
    <div class="partido-detalle-topline partido-detalle-skeleton-lines">
      <span class="partido-detalle-skeleton skeleton-line skeleton-line-sm"></span>
      <span class="partido-detalle-skeleton skeleton-line skeleton-line-xs"></span>
    </div>
    <div class="partido-detalle-scoreboard partido-detalle-scoreboard-skeleton">
      <div class="partido-detalle-team partido-detalle-team-local">
        <span class="partido-detalle-skeleton skeleton-logo"></span>
        <span class="partido-detalle-skeleton skeleton-line skeleton-line-md"></span>
      </div>
      <div class="partido-detalle-score-center">
        <span class="partido-detalle-skeleton skeleton-chip"></span>
        <div class="partido-detalle-score-line partido-detalle-score-line-skeleton">
          <span class="partido-detalle-skeleton skeleton-score"></span>
        </div>
      </div>
      <div class="partido-detalle-team partido-detalle-team-visit">
        <span class="partido-detalle-skeleton skeleton-logo"></span>
        <span class="partido-detalle-skeleton skeleton-line skeleton-line-md"></span>
      </div>
    </div>
    <div class="partido-detalle-meta partido-detalle-skeleton-lines">
      <span class="partido-detalle-skeleton skeleton-line skeleton-line-lg"></span>
    </div>
  `;
}

/**
 * Renderiza los skeletons de todas las pestañas del detalle durante la carga inicial.
 *
 * @param {HTMLElement} bodyEl Contenedor principal del modal.
 * @returns {void}
 */
export function renderDetalleSkeleton(bodyEl) {
  bodyEl.querySelector("#tab-resumen").innerHTML = `
    <div class="partido-detalle-section partido-detalle-section-skeleton">
      <div class="partido-detalle-section-title">${escapeHtml(t("detail_summary_title"))}</div>
      <div class="partido-detalle-skeleton-card">
        <span class="partido-detalle-skeleton skeleton-line skeleton-line-lg"></span>
        <span class="partido-detalle-skeleton skeleton-line skeleton-line-md"></span>
        <span class="partido-detalle-skeleton skeleton-line skeleton-line-lg"></span>
        <span class="partido-detalle-skeleton skeleton-line skeleton-line-sm"></span>
      </div>
    </div>
  `;
  bodyEl.querySelector("#tab-alineaciones").innerHTML = `
    <div class="partido-detalle-section partido-detalle-section-skeleton">
      <div class="partido-detalle-section-title">${escapeHtml(t("detail_lineups"))}</div>
      <div class="partido-detalle-skeleton-card"><span class="partido-detalle-skeleton skeleton-line skeleton-line-lg"></span><span class="partido-detalle-skeleton skeleton-line skeleton-line-lg"></span></div>
    </div>
  `;
  bodyEl.querySelector("#tab-eventos").innerHTML = `
    <div class="partido-detalle-section partido-detalle-section-skeleton">
      <div class="partido-detalle-section-title">${escapeHtml(t("detail_events_title"))}</div>
      <div class="partido-detalle-skeleton-card"><span class="partido-detalle-skeleton skeleton-line skeleton-line-lg"></span><span class="partido-detalle-skeleton skeleton-line skeleton-line-md"></span></div>
    </div>
  `;
  bodyEl.querySelector("#tab-penaltis").innerHTML = `
    <div class="partido-detalle-section partido-detalle-section-skeleton">
      <div class="partido-detalle-section-title">${escapeHtml(t("detail_penalties"))}</div>
      <div class="partido-detalle-skeleton-card"><span class="partido-detalle-skeleton skeleton-line skeleton-line-md"></span></div>
    </div>
  `;
  updateTabVisibility(bodyEl, getCurrentTab(window.__partidoDetalleState || {}));
}

/**
 * Actualiza la visibilidad de pestañas y paneles del detalle de partido.
 *
 * @param {HTMLElement} bodyEl Contenedor principal del modal.
 * @param {string} activeTab Identificador de la pestaña activa.
 * @returns {void}
 */
export function updateTabVisibility(bodyEl, activeTab) {
  bodyEl.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === activeTab);
  });
  bodyEl.querySelectorAll(".tab-content").forEach((panel) => {
    panel.hidden = panel.id !== `tab-${activeTab}`;
  });
}

/**
 * Renderiza la cabecera completa del partido con marcador, meta e instalación.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @returns {string} HTML de la cabecera del partido.
 */
export function renderPartidoHeader(state) {
  const p = state.partido;
  if (!p) return `<div class="partido-detalle-empty">${escapeHtml(t("detail_loading_view"))}</div>`;

  const bonusLocal = String(p.puntoBonus || "") === String(p.idEquipoLocal || "") ? "*" : "";
  const bonusVisit = String(p.puntoBonus || "") === String(p.idEquipoVisit || "") ? "*" : "";
  const fechaHora = [formatFecha(p.fecha), formatHora(p.hora)].filter(Boolean).join(" · ");
  const estado = p.estado || "";
  const arbitros = p.arbitros.length
    ? `<div class="partido-detalle-arbitros"><strong>${escapeHtml(t("detail_referees"))}:</strong><br>${p.arbitros.map(escapeHtml).join("<br>")}</div>`
    : "";

  return `
    <div class="partido-detalle-topline">
      <span>${escapeHtml(p.competicion)}${p.jornada ? ` - ${escapeHtml(p.jornada)}` : ""}</span>
      <span>${escapeHtml(fechaHora)}</span>
    </div>
    <div class="partido-detalle-scoreboard">
      <div class="partido-detalle-team partido-detalle-team-local">
        <div class="partido-detalle-team-name">${escapeHtml(p.local)}</div>
        <img class="partido-detalle-team-logo" src="${logoUrl(p.logoLocal)}" alt="${escapeHtml(p.local)}">
      </div>
      <div class="partido-detalle-score-center">
        <div class="partido-detalle-status">${escapeHtml(estado || t("detail_match"))}</div>
        <div class="partido-detalle-score-line">
          <span>${escapeHtml(p.golesLocal)}${bonusLocal}</span>
          <span>-</span>
          <span>${escapeHtml(p.golesVisit)}${bonusVisit}</span>
        </div>
      </div>
      <div class="partido-detalle-team partido-detalle-team-visit">
        <img class="partido-detalle-team-logo" src="${logoUrl(p.logoVisit)}" alt="${escapeHtml(p.visit)}">
        <div class="partido-detalle-team-name">${escapeHtml(p.visit)}</div>
      </div>
    </div>
    <div class="partido-detalle-meta">
      ${arbitros}
      <div class="partido-detalle-pista">${escapeHtml(p.instalacion)}</div>
    </div>
  `;
}

/**
 * Renderiza el bloque de resumen del partido a partir de las estadísticas agregadas.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @returns {string} HTML del resumen del partido.
 */
export function renderResumen(state) {
  const p = state.partido;
  if (!p) return `<div class="partido-detalle-empty">${escapeHtml(t("detail_summary_title"))}</div>`;

  const resumen = buildStatsSummary(state.statsResumen);
  const rows = [
    { label: t("detail_goals"), local: resumen.golesLocal, visit: resumen.golesVisit },
    { label: t("detail_fouls"), local: resumen.faltasLocal, visit: resumen.faltasVisit },
    { label: t("detail_blue_cards"), local: resumen.azulesLocal, visit: resumen.azulesVisit },
    { label: t("detail_red_cards"), local: resumen.rojasLocal, visit: resumen.rojasVisit },
  ];

  return `
    <div class="partido-detalle-section">
      <div class="partido-detalle-section-title">${escapeHtml(t("detail_summary_title"))}</div>
      <div class="partido-detalle-summary-table-wrap">
        <table class="partido-detalle-summary-table">
          <thead>
            <tr>
              <th></th>
              <th>${escapeHtml(p.localAbrev || "LOC")}</th>
              <th>${escapeHtml(p.visitAbrev || "VIS")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <th scope="row">${escapeHtml(row.label)}</th>
                <td>${escapeHtml(row.local)}</td>
                <td>${escapeHtml(row.visit)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Renderiza el bloque de tanda de penaltis del partido.
 *
 * @param {object} state Estado interno del detalle de partido.
 * @returns {string} HTML de la sección de penaltis.
 */
export function renderPenaltis(state) {
  const penaltis = state.penaltis;
  if (!Array.isArray(penaltis) || !penaltis.length) {
    return `<div class="partido-detalle-empty">${escapeHtml(t("detail_penalty_shots_none"))}</div>`;
  }

  const localId = state.localKey != null ? String(state.localKey) : null;
  const visitId = state.visitKey != null ? String(state.visitKey) : null;
  const local = penaltis.filter((p) => localId && String(p.IdEquipo) === localId);
  const visit = penaltis.filter((p) => visitId && String(p.IdEquipo) === visitId);
  const rest = !localId && !visitId ? penaltis : [];

  return `
    <div class="penaltis-grid">
      ${renderPenaltisColumn(state.partido?.local || t("detail_local"), local.length ? local : rest)}
      ${visit.length ? renderPenaltisColumn(state.partido?.visit || t("detail_visitor"), visit) : ""}
    </div>
  `;
}

function buildStatsSummary(stats) {
  const pick = (type, side) => stats.find((s) => s.IdTipoEvento === type && Number(s.LocalVisit) === side)?.Total ?? 0;
  return {
    golesLocal: pick("gol", 1),
    golesVisit: pick("gol", 2),
    faltasLocal: pick("falta", 1) || pick("faltahl", 1),
    faltasVisit: pick("falta", 2) || pick("faltahl", 2),
    azulesLocal: pick("tarjetaazul", 1),
    azulesVisit: pick("tarjetaazul", 2),
    rojasLocal: pick("tarjetaroja", 1),
    rojasVisit: pick("tarjetaroja", 2),
  };
}

function renderPenaltisColumn(title, items) {
  return `
    <section class="partido-detalle-section">
      <div class="partido-detalle-section-title">${escapeHtml(title)}</div>
      <div class="penaltis-column">
        ${items.map((p) => {
          const icon = p.Gol === true ? "✔" : p.Gol === false ? "✘" : "□";
          const cls = p.Gol === true ? "ok" : p.Gol === false ? "bad" : "neutral";
          return `<div class="penalti-row"><span class="penalti-dorsal">${escapeHtml(p.Dorsal ?? "")}</span><span class="penalti-nombre">${escapeHtml(p.NombreApellidos ?? "")}</span><span class="penalti-estado ${cls}">${icon}</span></div>`;
        }).join("")}
      </div>
    </section>
  `;
}
