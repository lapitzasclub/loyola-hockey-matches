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
  if (!p) return "<div>Error cargando datos de partido</div>";

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
