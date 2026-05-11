import { t } from "../i18n.js";

/**
 * Renderiza un skeleton de carga para la lista de partidos.
 *
 * @param {HTMLElement} matchesList Lista o contenedor donde pintar el estado.
 * @returns {void}
 */
export function renderPartidosLoadingState(matchesList) {
  matchesList.innerHTML = `
    <li class="match-skeleton-card" aria-hidden="true">
      <div class="match-skeleton-shell">
        <div class="match-skeleton-header">
          <span class="match-skeleton-block match-skeleton-pill"></span>
          <span class="match-skeleton-block match-skeleton-text-sm"></span>
        </div>
        <div class="match-skeleton-duelo">
          <div class="match-skeleton-team">
            <span class="match-skeleton-block match-skeleton-logo"></span>
            <span class="match-skeleton-block match-skeleton-text-md"></span>
          </div>
          <div class="match-skeleton-center">
            <span class="match-skeleton-block match-skeleton-vs"></span>
            <span class="match-skeleton-block match-skeleton-score"></span>
          </div>
          <div class="match-skeleton-team">
            <span class="match-skeleton-block match-skeleton-logo"></span>
            <span class="match-skeleton-block match-skeleton-text-md"></span>
          </div>
        </div>
        <div class="match-skeleton-footer">
          <span class="match-skeleton-block match-skeleton-text-lg"></span>
        </div>
      </div>
    </li>
    <li class="match-skeleton-card" aria-hidden="true">
      <div class="match-skeleton-shell">
        <div class="match-skeleton-header">
          <span class="match-skeleton-block match-skeleton-pill"></span>
          <span class="match-skeleton-block match-skeleton-text-sm"></span>
        </div>
        <div class="match-skeleton-duelo">
          <div class="match-skeleton-team">
            <span class="match-skeleton-block match-skeleton-logo"></span>
            <span class="match-skeleton-block match-skeleton-text-md"></span>
          </div>
          <div class="match-skeleton-center">
            <span class="match-skeleton-block match-skeleton-vs"></span>
            <span class="match-skeleton-block match-skeleton-score"></span>
          </div>
          <div class="match-skeleton-team">
            <span class="match-skeleton-block match-skeleton-logo"></span>
            <span class="match-skeleton-block match-skeleton-text-md"></span>
          </div>
        </div>
        <div class="match-skeleton-footer">
          <span class="match-skeleton-block match-skeleton-text-lg"></span>
        </div>
      </div>
    </li>
    <li class="match-skeleton-status">${t("loading")}</li>
  `;
}

/**
 * Renderiza un spinner centrado a nivel de pantalla para la transición inicial.
 *
 * @param {HTMLElement} container Contenedor principal de pantalla.
 * @returns {void}
 */
export function renderInitialTeamLoadingState(container) {
  container.innerHTML = `
    <section class="initial-team-loading" aria-live="polite">
      <div class="spinner-container initial-team-loading-spinner-wrap">
        <div class="spinner" aria-label="${t("loading")}"></div>
      </div>
    </section>
  `;
}
