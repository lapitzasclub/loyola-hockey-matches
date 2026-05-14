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
      <div class="initial-team-loading-card" aria-hidden="true">
        <span class="match-skeleton-block match-skeleton-text-lg"></span>
        <span class="match-skeleton-block match-skeleton-text-md"></span>
        <div class="initial-team-loading-list">
          <span class="match-skeleton-block match-skeleton-text-lg"></span>
          <span class="match-skeleton-block match-skeleton-text-lg"></span>
          <span class="match-skeleton-block match-skeleton-text-md"></span>
        </div>
      </div>
    </section>
  `;
}

/**
 * Renderiza skeletons de clasificación mientras llega la respuesta o se procesan datos auxiliares.
 *
 * @param {HTMLElement} matchesList Lista o contenedor donde pintar el estado.
 * @returns {void}
 */
export function renderClasificacionLoadingState(matchesList) {
  matchesList.innerHTML = `
    <li class="clas-card clas-skeleton-card" aria-hidden="true">
      <div class="clas-skeleton-head">
        <span class="clas-skeleton-block clas-skeleton-title"></span>
        <span class="clas-skeleton-block clas-skeleton-pill"></span>
      </div>
      <div class="clas-skeleton-table">
        <div class="clas-skeleton-row">
          <span class="clas-skeleton-block clas-skeleton-pos"></span>
          <span class="clas-skeleton-block clas-skeleton-team"></span>
          <span class="clas-skeleton-block clas-skeleton-num"></span>
          <span class="clas-skeleton-block clas-skeleton-num"></span>
          <span class="clas-skeleton-block clas-skeleton-num"></span>
        </div>
        <div class="clas-skeleton-row">
          <span class="clas-skeleton-block clas-skeleton-pos"></span>
          <span class="clas-skeleton-block clas-skeleton-team"></span>
          <span class="clas-skeleton-block clas-skeleton-num"></span>
          <span class="clas-skeleton-block clas-skeleton-num"></span>
          <span class="clas-skeleton-block clas-skeleton-num"></span>
        </div>
        <div class="clas-skeleton-row">
          <span class="clas-skeleton-block clas-skeleton-pos"></span>
          <span class="clas-skeleton-block clas-skeleton-team"></span>
          <span class="clas-skeleton-block clas-skeleton-num"></span>
          <span class="clas-skeleton-block clas-skeleton-num"></span>
          <span class="clas-skeleton-block clas-skeleton-num"></span>
        </div>
        <div class="clas-skeleton-row">
          <span class="clas-skeleton-block clas-skeleton-pos"></span>
          <span class="clas-skeleton-block clas-skeleton-team"></span>
          <span class="clas-skeleton-block clas-skeleton-num"></span>
          <span class="clas-skeleton-block clas-skeleton-num"></span>
          <span class="clas-skeleton-block clas-skeleton-num"></span>
        </div>
      </div>
    </li>
    <li class="match-skeleton-status">${t("loading")}</li>
  `;
}

/**
 * Renderiza un placeholder elegante cuando aún no hay equipo seleccionado.
 *
 * @param {HTMLElement} matchesList Lista o contenedor donde pintar el estado.
 * @returns {void}
 */
export function renderTeamSelectionPromptState(matchesList) {
  matchesList.innerHTML = `
    <li class="match-empty-card">
      <div class="match-empty-shell">
        <div class="match-empty-kicker">Loyola Hockey</div>
        <div class="match-empty-title">${t("team_selector_prompt_inline")}</div>
        <div class="match-empty-copy">Abre el selector y elige un equipo para ver partidos, clasificación y detalle.</div>
      </div>
    </li>
  `;
}

/**
 * Renderiza un estado vacío reutilizable en listas principales.
 *
 * @param {HTMLElement} matchesList Lista o contenedor donde pintar el estado.
 * @param {string} title Mensaje principal.
 * @param {string} [copy=""] Texto secundario opcional.
 * @returns {void}
 */
export function renderEmptyState(matchesList, title, copy = "") {
  matchesList.innerHTML = `
    <li class="match-empty-card">
      <div class="match-empty-shell">
        <div class="match-empty-kicker">Loyola Hockey</div>
        <div class="match-empty-title">${title}</div>
        ${copy ? `<div class="match-empty-copy">${copy}</div>` : ""}
      </div>
    </li>
  `;
}

/**
 * Renderiza un estado de error reutilizable en listas principales.
 *
 * @param {HTMLElement} matchesList Lista o contenedor donde pintar el estado.
 * @param {string} title Mensaje principal de error.
 * @param {string} [copy=""] Texto secundario opcional.
 * @returns {void}
 */
export function renderErrorState(matchesList, title, copy = "") {
  matchesList.innerHTML = `
    <li class="match-empty-card match-error-card">
      <div class="match-empty-shell match-error-shell">
        <div class="match-empty-kicker">Loyola Hockey</div>
        <div class="match-empty-title">${title}</div>
        ${copy ? `<div class="match-empty-copy">${copy}</div>` : ""}
      </div>
    </li>
  `;
}
