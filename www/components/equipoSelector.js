import { t } from "../i18n.js";
import { getCompetitionCatalog, getEquipoSeleccionado, persistEquipoSeleccionado } from "../state/equipos.js";
import { bindTeamSelectorAccordions } from "./equipoSelectorAccordion.js";

/**
 * Indica si una competición debe considerarse liga.
 *
 * @param {object} competition Competición del catálogo.
 * @returns {boolean} True cuando el nombre apunta a una liga.
 */
function isLeagueCompetition(competition) {
  return String(competition?.nombreCompeticion || "").toLowerCase().includes("liga");
}

/**
 * Agrupa las competiciones entre ligas y torneos.
 *
 * @param {Array<object>} catalog Catálogo completo.
 * @returns {{ leagues: Array<object>, tournaments: Array<object> }} Grupos visuales.
 */
function groupCompetitions(catalog) {
  return {
    leagues: catalog.filter(isLeagueCompetition),
    tournaments: catalog.filter((competition) => !isLeagueCompetition(competition)),
  };
}

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
  const teamsHtml = competition.equipos.map((team) => {
    const value = `${team.idCompeticion}|${team.idEquipoComp}`;
    const isSelected = value === selectedValue;
    return `
      <button
        type="button"
        class="team-selector-team-button ${isSelected ? "is-selected" : ""}"
        data-team-value="${value}"
        aria-label="${isSelected ? t("team_selector_selected") : t("team_selector_choose_action")}: ${team.nombreEquipo}"
      >
        <img class="team-selector-team-logo" src="${team.logoEquipoUrl}" alt="Escudo de ${team.nombreEquipo}" loading="lazy" decoding="async">
        <span class="team-selector-team-texts">
          <span class="team-selector-team-name">${team.nombreEquipo}</span>
        </span>
        <span class="team-selector-team-action" aria-hidden="true">${isSelected ? "✓" : "→"}</span>
      </button>
    `;
  }).join("");

  return `
    <article class="team-selector-competition-card">
      <div class="team-selector-competition-head">
        <div class="team-selector-competition-logo-wrap">
          <img class="team-selector-competition-logo" src="${competition.logoCompeticionUrl}" alt="Logo de ${competition.nombreCompeticion}" loading="lazy" decoding="async">
        </div>
        <div class="team-selector-competition-copy">
          <h3 class="team-selector-competition-title">${competition.nombreCompeticion}</h3>
        </div>
      </div>
      <div class="team-selector-team-list-wrap">
        <div class="team-selector-team-list">
          ${teamsHtml}
        </div>
      </div>
    </article>
  `;
}

/**
 * Renderiza un grupo plegable de competiciones.
 *
 * @param {string} title Título del grupo.
 * @param {Array<object>} competitions Competiciones a renderizar.
 * @param {string|null} selectedValue Valor actualmente seleccionado.
 * @param {boolean} expanded Indica si debe arrancar abierto.
 * @returns {string} HTML del grupo.
 */
function renderCompetitionGroup(title, competitions, selectedValue, expanded) {
  if (!competitions.length) return "";

  return `
    <details class="team-selector-group" ${expanded ? "open" : ""}>
      <summary class="team-selector-group-summary">
        <span class="team-selector-group-summary-main">
          <span class="team-selector-group-title">${title}</span>
          <span class="team-selector-group-count">${competitions.length}</span>
        </span>
        <span class="team-selector-group-caret" aria-hidden="true"></span>
      </summary>
      <div class="team-selector-group-content">
        <div class="team-selector-grid">
          ${competitions.map((competition) => renderCompetitionCard(competition, selectedValue)).join("")}
        </div>
      </div>
    </details>
  `;
}

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

  const groups = groupCompetitions(catalog);

  const heroHtml = mode === "onboarding"
    ? `
      <div class="team-selector-intro">${t("team_selector_onboarding_intro")}</div>
    `
    : "";

  container.innerHTML = `
    <section class="team-selector team-selector-${mode} ${compact ? "team-selector-compact" : ""}">
      ${heroHtml}
      <div class="team-selector-groups">
        ${renderCompetitionGroup(t("team_selector_group_leagues"), groups.leagues, selectedValue, true)}
        ${renderCompetitionGroup(t("team_selector_group_tournaments"), groups.tournaments, selectedValue, groups.leagues.length === 0)}
      </div>
    </section>
  `;

  bindTeamSelectorAccordions(container);

  container.querySelectorAll("[data-team-value]").forEach((button) => {
    button.addEventListener("click", async () => {
      persistEquipoSeleccionado(button.dataset.teamValue || null);
      if (typeof onSelect === "function") {
        await onSelect();
      }
    });
  });
}
