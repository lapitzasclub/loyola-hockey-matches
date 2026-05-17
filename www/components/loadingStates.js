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
          <div class="match-skeleton-header-copy">
            <span class="match-skeleton-block match-skeleton-pill"></span>
            <span class="match-skeleton-block match-skeleton-text-sm"></span>
          </div>
          <span class="match-skeleton-block match-skeleton-calendar"></span>
        </div>
        <div class="match-skeleton-duelo">
          <div class="match-skeleton-team">
            <span class="match-skeleton-block match-skeleton-logo"></span>
            <span class="match-skeleton-block match-skeleton-text-md"></span>
            <span class="match-skeleton-block match-skeleton-text-xs"></span>
          </div>
          <div class="match-skeleton-center">
            <span class="match-skeleton-block match-skeleton-vs"></span>
            <span class="match-skeleton-block match-skeleton-score"></span>
          </div>
          <div class="match-skeleton-team">
            <span class="match-skeleton-block match-skeleton-logo"></span>
            <span class="match-skeleton-block match-skeleton-text-md is-short"></span>
            <span class="match-skeleton-block match-skeleton-text-xs is-tiny"></span>
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
          <div class="match-skeleton-header-copy">
            <span class="match-skeleton-block match-skeleton-pill"></span>
            <span class="match-skeleton-block match-skeleton-text-sm is-short"></span>
          </div>
          <span class="match-skeleton-block match-skeleton-calendar"></span>
        </div>
        <div class="match-skeleton-duelo">
          <div class="match-skeleton-team">
            <span class="match-skeleton-block match-skeleton-logo"></span>
            <span class="match-skeleton-block match-skeleton-text-md is-short"></span>
            <span class="match-skeleton-block match-skeleton-text-xs"></span>
          </div>
          <div class="match-skeleton-center">
            <span class="match-skeleton-block match-skeleton-vs"></span>
            <span class="match-skeleton-block match-skeleton-score"></span>
          </div>
          <div class="match-skeleton-team">
            <span class="match-skeleton-block match-skeleton-logo"></span>
            <span class="match-skeleton-block match-skeleton-text-md"></span>
            <span class="match-skeleton-block match-skeleton-text-xs is-short"></span>
          </div>
        </div>
        <div class="match-skeleton-footer">
          <span class="match-skeleton-block match-skeleton-text-lg is-wide"></span>
        </div>
      </div>
    </li>
    <li class="match-skeleton-card" aria-hidden="true">
      <div class="match-skeleton-shell match-skeleton-shell-proximo">
        <div class="match-skeleton-header">
          <div class="match-skeleton-header-copy">
            <span class="match-skeleton-block match-skeleton-pill"></span>
            <span class="match-skeleton-block match-skeleton-text-sm"></span>
          </div>
          <span class="match-skeleton-block match-skeleton-calendar"></span>
        </div>
        <div class="match-skeleton-duelo">
          <div class="match-skeleton-team">
            <span class="match-skeleton-block match-skeleton-logo"></span>
            <span class="match-skeleton-block match-skeleton-text-md"></span>
            <span class="match-skeleton-block match-skeleton-text-xs is-short"></span>
          </div>
          <div class="match-skeleton-center">
            <span class="match-skeleton-block match-skeleton-vs"></span>
            <span class="match-skeleton-block match-skeleton-score match-skeleton-score-pending"></span>
          </div>
          <div class="match-skeleton-team">
            <span class="match-skeleton-block match-skeleton-logo"></span>
            <span class="match-skeleton-block match-skeleton-text-md is-short"></span>
            <span class="match-skeleton-block match-skeleton-text-xs is-tiny"></span>
          </div>
        </div>
        <div class="match-skeleton-footer">
          <span class="match-skeleton-block match-skeleton-text-lg"></span>
        </div>
      </div>
    </li>
  `;
}

/**
 * Renderiza un spinner centrado a nivel de pantalla para la transición inicial.
 *
 * @param {HTMLElement} container Contenedor principal de pantalla.
 * @returns {void}
 */
export function renderInitialTeamLoadingState(container) {
  container.innerHTML = '<ul id="matches"></ul>';
  const matchesList = container.querySelector("#matches");
  if (matchesList instanceof HTMLElement) {
    renderPartidosLoadingState(matchesList);
  }
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
      <div class="clas-skeleton-competition-head">
        <span class="clas-skeleton-block clas-skeleton-competition-title"></span>
        <span class="clas-skeleton-block clas-skeleton-chevron"></span>
      </div>
      <div class="clas-skeleton-table-shell">
        <div class="clas-skeleton-table-head">
          <span class="clas-skeleton-block clas-skeleton-th clas-skeleton-th-pos"></span>
          <span class="clas-skeleton-block clas-skeleton-th clas-skeleton-th-team"></span>
          <span class="clas-skeleton-block clas-skeleton-th clas-skeleton-th-pts"></span>
          <span class="clas-skeleton-block clas-skeleton-th clas-skeleton-th-num"></span>
          <span class="clas-skeleton-block clas-skeleton-th clas-skeleton-th-num"></span>
          <span class="clas-skeleton-block clas-skeleton-th clas-skeleton-th-num"></span>
          <span class="clas-skeleton-block clas-skeleton-th clas-skeleton-th-num"></span>
          <span class="clas-skeleton-block clas-skeleton-th clas-skeleton-th-num"></span>
        </div>
        <div class="clas-skeleton-table-body">
          <div class="clas-skeleton-row">
            <span class="clas-skeleton-block clas-skeleton-pos"></span>
            <div class="clas-skeleton-team-cell">
              <span class="clas-skeleton-block clas-skeleton-logo"></span>
              <div class="clas-skeleton-team-copy">
                <span class="clas-skeleton-block clas-skeleton-team-name"></span>
                <div class="clas-skeleton-form">
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                </div>
              </div>
            </div>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
          </div>
          <div class="clas-skeleton-row">
            <span class="clas-skeleton-block clas-skeleton-pos"></span>
            <div class="clas-skeleton-team-cell">
              <span class="clas-skeleton-block clas-skeleton-logo"></span>
              <div class="clas-skeleton-team-copy">
                <span class="clas-skeleton-block clas-skeleton-team-name is-short"></span>
                <div class="clas-skeleton-form">
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                </div>
              </div>
            </div>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
          </div>
          <div class="clas-skeleton-row is-fav">
            <span class="clas-skeleton-block clas-skeleton-pos"></span>
            <div class="clas-skeleton-team-cell">
              <span class="clas-skeleton-block clas-skeleton-logo"></span>
              <div class="clas-skeleton-team-copy">
                <span class="clas-skeleton-block clas-skeleton-team-name"></span>
                <div class="clas-skeleton-form">
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                </div>
              </div>
            </div>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
          </div>
          <div class="clas-skeleton-row">
            <span class="clas-skeleton-block clas-skeleton-pos"></span>
            <div class="clas-skeleton-team-cell">
              <span class="clas-skeleton-block clas-skeleton-logo"></span>
              <div class="clas-skeleton-team-copy">
                <span class="clas-skeleton-block clas-skeleton-team-name is-tiny"></span>
                <div class="clas-skeleton-form">
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                </div>
              </div>
            </div>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
          </div>
          <div class="clas-skeleton-row">
            <span class="clas-skeleton-block clas-skeleton-pos"></span>
            <div class="clas-skeleton-team-cell">
              <span class="clas-skeleton-block clas-skeleton-logo"></span>
              <div class="clas-skeleton-team-copy">
                <span class="clas-skeleton-block clas-skeleton-team-name is-short"></span>
                <div class="clas-skeleton-form">
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                  <span class="clas-skeleton-block clas-skeleton-form-chip"></span>
                </div>
              </div>
            </div>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
            <span class="clas-skeleton-block clas-skeleton-num"></span>
          </div>
        </div>
      </div>
    </li>
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
        <div class="match-empty-kicker">${t("app_short_name")}</div>
        <div class="match-empty-title">${t("team_selector_prompt_inline")}</div>
        <div class="match-empty-copy">${t("team_selector_prompt_copy")}</div>
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
        <div class="match-empty-kicker">${t("app_short_name")}</div>
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
        <div class="match-empty-kicker">${t("app_short_name")}</div>
        <div class="match-empty-title">${title}</div>
        ${copy ? `<div class="match-empty-copy">${copy}</div>` : ""}
      </div>
    </li>
  `;
}
