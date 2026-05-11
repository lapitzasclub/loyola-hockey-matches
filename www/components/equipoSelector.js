import { t } from "../i18n.js";
import { getCompetitionCatalog, getEquipoSeleccionado, persistEquipoSeleccionado } from "../state/equipos.js";

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

/**
 * Renderiza el selector reutilizable de equipo.
 *
 * @param {HTMLElement} container Contenedor de render.
 * @param {{ mode?: "onboarding" | "menu", onSelect?: (() => Promise<void>|void), compact?: boolean }} [options] Opciones de uso.
 * @returns {void}
 */
function bindTeamSelectorAccordions(container) {
  const accordionItems = Array.from(container.querySelectorAll(".team-selector-group"));

  const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const getScrollHost = () => document.querySelector("main");

  const scrollGroupIntoView = (detailsEl, animated = true) => {
    const scrollHost = getScrollHost();
    if (!scrollHost) return;

    const topOffset = 10;
    const detailsRect = detailsEl.getBoundingClientRect();
    const hostRect = scrollHost.getBoundingClientRect();
    const targetTop = Math.max(scrollHost.scrollTop + (detailsRect.top - hostRect.top) - topOffset, 0);

    scrollHost.scrollTo({
      top: targetTop,
      behavior: animated && !reduceMotion() ? "smooth" : "auto",
    });
  };

  const setExpandedState = (detailsEl, contentEl, expanded) => {
    detailsEl.open = expanded;
    detailsEl.classList.toggle("is-expanded", expanded);
    contentEl.style.height = expanded ? "auto" : "0px";
    contentEl.style.opacity = expanded ? "1" : "0";
    contentEl.style.overflow = expanded ? "visible" : "hidden";
  };

  const collapseItem = (detailsEl) => {
    const contentEl = detailsEl.querySelector(".team-selector-group-content");
    if (!contentEl || !detailsEl.open) return Promise.resolve();

    const runningAnimation = detailsEl._accordionAnimation;
    if (runningAnimation) runningAnimation.cancel();

    detailsEl.classList.remove("is-expanded");

    if (reduceMotion()) {
      setExpandedState(detailsEl, contentEl, false);
      return Promise.resolve();
    }

    const startHeight = `${contentEl.offsetHeight || contentEl.scrollHeight}px`;
    contentEl.style.overflow = "hidden";
    contentEl.style.height = startHeight;
    contentEl.style.opacity = "1";

    return new Promise((resolve) => {
      const animation = contentEl.animate(
        [
          { height: startHeight, opacity: 1 },
          { height: "0px", opacity: 0 },
        ],
        {
          duration: 260,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        },
      );

      detailsEl._accordionAnimation = animation;
      animation.onfinish = () => {
        setExpandedState(detailsEl, contentEl, false);
        detailsEl._accordionAnimation = null;
        resolve();
      };
      animation.oncancel = () => {
        detailsEl._accordionAnimation = null;
        resolve();
      };
    });
  };

  const expandItem = (detailsEl) => {
    const contentEl = detailsEl.querySelector(".team-selector-group-content");
    if (!contentEl) return Promise.resolve();

    const runningAnimation = detailsEl._accordionAnimation;
    if (runningAnimation) runningAnimation.cancel();

    detailsEl.open = true;
    detailsEl.classList.add("is-expanded");
    scrollGroupIntoView(detailsEl, true);

    if (reduceMotion()) {
      setExpandedState(detailsEl, contentEl, true);
      return Promise.resolve();
    }

    const endHeight = `${contentEl.scrollHeight}px`;
    contentEl.style.overflow = "hidden";
    contentEl.style.height = "0px";
    contentEl.style.opacity = "0";

    return new Promise((resolve) => {
      const animation = contentEl.animate(
        [
          { height: "0px", opacity: 0 },
          { height: endHeight, opacity: 1 },
        ],
        {
          duration: 320,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        },
      );

      detailsEl._accordionAnimation = animation;
      animation.onfinish = () => {
        setExpandedState(detailsEl, contentEl, true);
        detailsEl._accordionAnimation = null;
        resolve();
      };
      animation.oncancel = () => {
        detailsEl._accordionAnimation = null;
        resolve();
      };
    });
  };

  accordionItems.forEach((detailsEl) => {
    if (detailsEl.dataset.accordionBound === "true") return;
    detailsEl.dataset.accordionBound = "true";

    const summaryEl = detailsEl.querySelector(".team-selector-group-summary");
    const contentEl = detailsEl.querySelector(".team-selector-group-content");
    if (!summaryEl || !contentEl) return;

    setExpandedState(detailsEl, contentEl, detailsEl.open);

    summaryEl.addEventListener("click", async (event) => {
      event.preventDefault();
      if (container.dataset.accordionBusy === "true") return;

      const isOpening = !detailsEl.open;
      if (!isOpening) {
        container.dataset.accordionBusy = "true";
        await collapseItem(detailsEl);
        container.dataset.accordionBusy = "false";
        return;
      }

      container.dataset.accordionBusy = "true";
      const openedItem = accordionItems.find((itemEl) => itemEl !== detailsEl && itemEl.open);
      if (openedItem) {
        await collapseItem(openedItem);
      }
      await expandItem(detailsEl);
      container.dataset.accordionBusy = "false";
    });
  });
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

  container.innerHTML = `
    <section class="team-selector team-selector-${mode} ${compact ? "team-selector-compact" : ""}">
      <div class="team-selector-hero">
        <span class="team-selector-kicker">${mode === "onboarding" ? t("team_selector_first_time") : t("team_selector_change")}</span>
        <h2 class="team-selector-title">${t("team_selector_title")}</h2>
        <p class="team-selector-subtitle">${t("team_selector_subtitle")}</p>
      </div>
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
