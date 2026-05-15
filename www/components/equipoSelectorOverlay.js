import { t } from "../i18n.js";
import { renderEquipoSelector } from "./equipoSelector.js";
import { setTeamSelectorOverlayOpen } from "../core/layoutState.js";

const OVERLAY_CLOSE_ANIMATION_MS = 220;

/**
 * Desmonta por completo el overlay del selector de equipo.
 *
 * @param {HTMLElement} overlay Nodo raíz del overlay.
 * @returns {void}
 */
function teardownEquipoSelectorOverlay(overlay) {
  overlay.hidden = true;
  overlay.innerHTML = "";
  overlay.classList.remove("is-closing");
}

/**
 * Cierra el overlay del selector de equipo.
 *
 * @returns {void}
 */
export function closeEquipoSelectorOverlay() {
  const overlay = document.getElementById("teamSelectorOverlay");
  if (!overlay || overlay.hidden || overlay.classList.contains("is-closing")) return;

  overlay.classList.add("is-closing");
  setTeamSelectorOverlayOpen(false);
  globalThis.dispatchEvent(new CustomEvent("app:overlay-state-changed"));

  globalThis.setTimeout(() => {
    teardownEquipoSelectorOverlay(overlay);
  }, OVERLAY_CLOSE_ANIMATION_MS);
}

/**
 * Abre el overlay del selector de equipo.
 *
 * @param {{ onSelect?: (() => Promise<void>|void) }} [options] Callback de selección.
 * @returns {void}
 */
export function openEquipoSelectorOverlay(options = {}) {
  const { onSelect } = options;
  const overlay = document.getElementById("teamSelectorOverlay");
  if (!overlay) return;

  overlay.hidden = false;
  overlay.classList.remove("is-closing");
  setTeamSelectorOverlayOpen(true);
  overlay.innerHTML = `
    <div class="team-selector-overlay-backdrop" data-close-team-selector-overlay></div>
    <section class="team-selector-overlay-sheet" role="dialog" aria-modal="true" aria-label="${t("team_selector_change")}">
      <div class="team-selector-overlay-header">
        <div>
          <span class="team-selector-overlay-kicker">${t("team_selector_change")}</span>
          <h2 class="team-selector-overlay-title">${t("team_selector_title")}</h2>
        </div>
        <button type="button" class="team-selector-overlay-close" data-close-team-selector-overlay aria-label="${t("detail_match")}">×</button>
      </div>
      <div id="teamSelectorOverlayContent"></div>
    </section>
  `;

  const content = document.getElementById("teamSelectorOverlayContent");
  if (content) {
    renderEquipoSelector(content, {
      mode: "menu",
      onSelect: async () => {
        closeEquipoSelectorOverlay();
        if (typeof onSelect === "function") {
          await onSelect();
        }
      },
    });
  }

  overlay.querySelectorAll("[data-close-team-selector-overlay]").forEach((node) => {
    node.addEventListener("click", () => closeEquipoSelectorOverlay());
  });

  globalThis.dispatchEvent(new CustomEvent("app:overlay-state-changed"));
}
