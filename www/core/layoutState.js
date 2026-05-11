let _isOnboardingActive = false;
let _isTeamSelectorOverlayOpen = false;
let _isInitialTeamLoadActive = false;

/**
 * Aplica las clases globales de layout según el estado actual.
 *
 * @returns {void}
 */
function syncLayoutState() {
  document.body.classList.toggle("is-onboarding-active", _isOnboardingActive);
  document.body.classList.toggle("is-team-selector-overlay-open", _isTeamSelectorOverlayOpen);
  document.body.classList.toggle("is-initial-team-load-active", _isInitialTeamLoadActive);
}

/**
 * Activa o desactiva el modo onboarding.
 *
 * @param {boolean} active Estado deseado.
 * @returns {void}
 */
export function setOnboardingActive(active) {
  _isOnboardingActive = !!active;
  syncLayoutState();
}

/**
 * Indica si el onboarding está activo.
 *
 * @returns {boolean} True cuando el onboarding está visible.
 */
export function isOnboardingActive() {
  return _isOnboardingActive;
}

/**
 * Activa o desactiva el overlay de selector de equipo.
 *
 * @param {boolean} open Estado deseado.
 * @returns {void}
 */
export function setTeamSelectorOverlayOpen(open) {
  _isTeamSelectorOverlayOpen = !!open;
  syncLayoutState();
}

/**
 * Indica si el overlay del selector está abierto.
 *
 * @returns {boolean} True cuando el overlay está visible.
 */
export function isTeamSelectorOverlayOpen() {
  return _isTeamSelectorOverlayOpen;
}

/**
 * Activa o desactiva la transición inicial de carga tras elegir equipo.
 *
 * @param {boolean} active Estado deseado.
 * @returns {void}
 */
export function setInitialTeamLoadActive(active) {
  _isInitialTeamLoadActive = !!active;
  syncLayoutState();
}

/**
 * Indica si está activa la transición inicial de carga tras elegir equipo.
 *
 * @returns {boolean} True cuando la transición está activa.
 */
export function isInitialTeamLoadActive() {
  return _isInitialTeamLoadActive;
}
