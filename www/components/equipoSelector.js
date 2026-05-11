import { t } from "../i18n.js";
import { getCompetitionCatalog, getEquipoSeleccionado, persistEquipoSeleccionado } from "../state/equipos.js";

/**
 * Renderiza el esqueleto de carga del selector de equipo.
 *
 * @param {HTMLElement} container Contenedor de render.
 * @param {"onboarding" | "menu"} [mode="onboarding"] Modo visual del selector.
 * @returns {void}
 */
export function renderEquipoSelectorSkeleton(container, mode = "onboarding") {
  container.innerHTML = `
    <section class="team-selector team-selector-${mode} is-loading">
      <div class="team-selector-hero">
        <span class="team-selector-kicker">${t(mode === "onboarding" ? "team_selector_first_time" : "team_selector_change")}</span>
        <h2 class="team-selector-title">${t("team_selector_title")}</h2>
        <p class="team-selector-subtitle">${t("team_selector_loading")}</p>
      </div>
      <div class="team-selector-grid">
        ${Array.from({ length: 3 }).map(() => `
          <article class="team-selector-competition-card team-selector-competition-card-skeleton">
            <div class="team-selector-competition-head">
              <span class="team-selector-skeleton team-selector-skeleton-logo"></span>
              <div class="team-selector-competition-copy">
                <span class="team-selector-skeleton team-selector-skeleton-line team-selector-skeleton-line-lg"></span>
                <span class="team-selector-skeleton team-selector-skeleton-line team-selector-skeleton-line-sm"></span>
              </div>
            </div>
            <div class="team-selector-team-list">
              <span class="team-selector-skeleton team-selector-skeleton-pill"></span>
              <span class="team-selector-skeleton team-selector-skeleton-pill"></span>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

/**
 * Construye el HTML de una tarjeta de competición con sus equipos Loyola.
 *
 * @param {object} competition Competición del catálogo.
 * @param {string|null} selectedValue Valor actualmente seleccionado.
 * @returns {string} HTML de la tarjeta.
 */
function renderCompetitionCard(competition, selectedValue) {
  const badge = t("team_selector_competition_badge");
  const teamsHtml = competition.equipos.map((team) => {
    const value = `${team.idCompeticion}|${team.idEquipoComp}`;
    const isSelected = value === selectedValue;
    return `
      <button
        type="button"
        class="team-selector-team-button ${isSelected ? "is-selected" : ""}"
        data-team-value="${value}"
        aria-label="${t("team_selector_choose_action")}: ${team.nombreEquipo}"
      >
        <img class="team-selector-team-logo" src="${team.logoEquipoUrl}" alt="Escudo de ${team.nombreEquipo}" loading="lazy" decoding="async">
        <span class="team-selector-team-texts">
          <span class="team-selector-team-name">${team.nombreEquipo}</span>
          <span class="team-selector-team-meta">${isSelected ? t("team_selector_selected") : t("team_selector_choose_action")}</span>
        </span>
      </button>
    `;
  }).join("");

  return `
    <article class="team-selector-competition-card">
      <div class="team-selector-competition-head">
        <img class="team-selector-competition-logo" src="${competition.logoCompeticionUrl}" alt="Logo de ${competition.nombreCompeticion}" loading="lazy" decoding="async">
        <div class="team-selector-competition-copy">
          <span class="team-selector-competition-badge">${badge}</span>
          <h3 class="team-selector-competition-title">${competition.nombreCompeticion}</h3>
          <p class="team-selector-competition-meta">${competition.temporada || ""}</p>
        </div>
      </div>
      <div class="team-selector-team-list">
        ${teamsHtml}
      </div>
    </article>
  `;
}

/**
 * Renderiza el selector reutilizable de equipo.
 *
 * @param {HTMLElement} container Contenedor de render.
 * @param {{ mode?: "onboarding" | "menu", onSelect?: (() => Promise<void>|void), compact?: boolean }} [options] Opciones de uso.
 * @returns {void}
 */
export function renderEquipoSelector(container, options = {}) {
  const { mode = "onboarding", onSelect, compact = false } = options;
  const catalog = getCompetitionCatalog();
  const selectedValue = getEquipoSeleccionado();

  if (!catalog.length) {
    container.innerHTML = `
      <section class="team-selector team-selector-${mode} ${compact ? "team-selector-compact" : ""}">
        <div class="team-selector-hero">
          <span class="team-selector-kicker">${t(mode === "onboarding" ? "team_selector_first_time" : "team_selector_change")}</span>
          <h2 class="team-selector-title">${t("team_selector_title")}</h2>
          <p class="team-selector-subtitle">${t("team_selector_empty")}</p>
        </div>
      </section>
    `;
    return;
  }

  container.innerHTML = `
    <section class="team-selector team-selector-${mode} ${compact ? "team-selector-compact" : ""}">
      <div class="team-selector-hero">
        <span class="team-selector-kicker">${mode === "onboarding" ? t("team_selector_first_time") : t("team_selector_change")}</span>
        <h2 class="team-selector-title">${t("team_selector_title")}</h2>
        <p class="team-selector-subtitle">${t("team_selector_subtitle")}</p>
      </div>
      <div class="team-selector-grid">
        ${catalog.map((competition) => renderCompetitionCard(competition, selectedValue)).join("")}
      </div>
    </section>
  `;

  container.querySelectorAll("[data-team-value]").forEach((button) => {
    button.addEventListener("click", async () => {
      persistEquipoSeleccionado(button.dataset.teamValue || null);
      if (typeof onSelect === "function") {
        await onSelect();
      }
    });
  });
}
