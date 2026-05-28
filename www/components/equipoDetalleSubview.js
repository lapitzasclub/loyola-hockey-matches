import { nextFrame, syncMobileBackState, transitionDetalleView } from "./partidoDetalleNavigation.js";
import { getCurrentView, logoUrl, normalizarEquipoClasificacion, pushView, setCurrentView } from "./partidoDetalleUtils.js";
import {
  ensureTeamCompetitionClasificacion,
  getClasificacionMatch,
  hydrateEquipoDetalleRosterMatches,
  loadEquipoDetalleMatches,
  renderEquipoDetalleTabContent,
  renderEquipoDetalleView,
} from "./equipoDetalle.js";
import { loadTeamAdvancedStats, mountTeamStatsCharts, unmountTeamStatsCharts } from "./equipoDetalleStats.js";
import { animatePillTabSelection, animateTabContentSwap } from "./uiTabs.js";

function isTeamStatsTabPending(state, tab) {
  return tab === "estadisticas" && !state.teamStats && !state.loadingStats;
}

function loadSubviewTeamStats(state, renderContent) {
  state.loadingStats = true;
  renderContent();
  loadTeamAdvancedStats(state.selectedEquipo, state.teamMatches)
    .then((stats) => {
      state.teamStats = stats;
      state.loadingStats = false;
      renderContent();
    })
    .catch(() => {
      state.loadingStats = false;
      renderContent();
    });
}

/**
 * Renderiza la cabecera compacta del subview de equipo dentro del modal compartido.
 *
 * @param {object|null|undefined} equipo Equipo activo.
 * @param {string} [competitionName=""] Nombre de competición o grupo de apoyo.
 * @returns {string} HTML de cabecera.
 */
export function renderEquipoDetalleHeader(equipo, competitionName = "") {
  const logoSrc = logoUrl(equipo?.idEntidadEquipo || "sinescudo");
  const subtitle = equipo?.nombreGrupo || competitionName || "";
  return `
    <div class="team-detail-modal-hero">
      <img class="team-detail-modal-logo" src="${logoSrc}" alt="${equipo?.nombreEquipo || "Equipo"}">
      <div class="team-detail-modal-hero-copy">
        <div class="team-detail-modal-title">${equipo?.nombreEquipo || ""}</div>
        ${subtitle ? `<div class="team-detail-modal-subtitle">${subtitle}</div>` : ""}
      </div>
    </div>
  `;
}

/**
 * Renderiza el subview completo del detalle de equipo para el modal compartido.
 *
 * @param {object} state Estado global del detalle compartido.
 * @returns {string} HTML de la vista de equipo.
 */
export function renderEquipoSubview(state) {
  const equipo = state.selectedEquipo;
  if (!equipo) return "";

  return renderEquipoDetalleView(equipo, state.teamMatches || [], {
    activeTab: state.teamFilters?.tab || "resumen",
    activeFilter: state.teamFilters?.matchFilter || "all",
    isLoading: state.loadingTeam,
    isLoadingRoster: state.loadingRoster,
    showRoster: true,
    showStats: true,
    teamStats: state.teamStats || null,
    loadingStats: state.loadingStats || false,
  });
}

/**
 * Abre el subview de equipo dentro del modal compartido del detalle de partido.
 *
 * Primero rehidrata el payload con la fila real de clasificación si existe,
 * luego carga partidos, plantilla derivada y estadísticas bajo demanda.
 *
 * @param {object} state Estado global del detalle.
 * @param {object} equipoPayload Payload de entrada del equipo.
 * @param {HTMLElement} headerEl Nodo de cabecera.
 * @param {HTMLElement} bodyEl Nodo de cuerpo.
 * @param {Function} renderAll Callback de rerender total.
 * @returns {Promise<void>}
 */
export async function openEquipoSubview(state, equipoPayload, headerEl, bodyEl, renderAll) {
  let equipo = normalizarEquipoClasificacion(equipoPayload);
  if (!equipo) return;

  await ensureTeamCompetitionClasificacion(equipo);
  const clasMatch = getClasificacionMatch(equipoPayload) || getClasificacionMatch(equipo);
  if (clasMatch) {
    equipo = {
      ...equipo,
      ...normalizarEquipoClasificacion(clasMatch),
      nombreGrupo: equipo.nombreGrupo || clasMatch.NombreGrupo || clasMatch.DenoComp || "",
    };
  }

  const previousView = getCurrentView(state);
  const isInitialOpen = previousView === "equipo" && !state.teamMatches.length && state.loadingTeam;

  state.selectedEquipo = equipo;
  state.teamCompetitionName = equipo?.nombreGrupo || equipoPayload?.NombreGrupo || equipoPayload?.nombreGrupo || state.teamCompetitionName || "";
  state.loadingTeam = true;
  state.loadingRoster = true;
  state.teamMatches = [];
  state.teamFilters = {
    tab: "resumen",
    matchFilter: "all",
  };
  state.teamStats = null;
  state.loadingStats = false;

  if (!isInitialOpen) {
    state.parentView = previousView;
    pushView(state, previousView);

    await transitionDetalleView(bodyEl, async () => {
      setCurrentView(state, "equipo");
      renderAll(state, headerEl, bodyEl);
    }, "forward");

    syncMobileBackState();
    await nextFrame();
    await nextFrame();
  } else {
    setCurrentView(state, "equipo");
    renderAll(state, headerEl, bodyEl);
  }

  state.teamMatches = await loadEquipoDetalleMatches(equipo);
  state.loadingTeam = false;
  renderAll(state, headerEl, bodyEl);

  hydrateEquipoDetalleRosterMatches(equipo, state.teamMatches)
    .then(() => {
      state.loadingRoster = false;
      renderAll(state, headerEl, bodyEl);
    })
    .catch(() => {
      state.loadingRoster = false;
      renderAll(state, headerEl, bodyEl);
    });
}

/**
 * Vincula interacciones del subview de equipo dentro del modal compartido.
 *
 * @param {HTMLElement} rootEl Nodo raíz renderizado.
 * @param {object} state Estado global del detalle.
 * @param {HTMLElement} headerEl Nodo de cabecera.
 * @param {HTMLElement} bodyEl Nodo de cuerpo.
 * @param {Function} renderAll Callback de rerender total.
 * @param {Function} openMatchInSharedModal Navegación al detalle de partido.
 * @returns {void}
 */
export function bindEquipoMatchLinks(rootEl, state, headerEl, bodyEl, renderAll, openMatchInSharedModal) {
  if (bodyEl instanceof HTMLElement) {
    unmountTeamStatsCharts(bodyEl);
    if (state.teamFilters?.tab === "estadisticas" && state.teamStats && !state.loadingStats) {
      requestAnimationFrame(() => mountTeamStatsCharts(bodyEl, state.teamStats));
    }
  }
  rootEl.querySelectorAll("[data-team-match]").forEach((node) => {
    node.onclick = async () => {
      let partido;
      try {
        partido = JSON.parse(node.getAttribute("data-team-match") || "null");
      } catch {
        partido = null;
      }
      if (!partido?.IdPartido) return;
      await openMatchInSharedModal(state, partido, headerEl, bodyEl, renderAll);
    };
  });

  const renderTeamContentOnly = () => {
    const contentEl = rootEl.querySelector('[data-team-tab-content]') || bodyEl.querySelector('[data-team-tab-content]');
    if (!(contentEl instanceof HTMLElement)) return;

    unmountTeamStatsCharts(bodyEl);
    contentEl.innerHTML = renderEquipoDetalleTabContent(state.selectedEquipo, state.teamMatches || [], {
      activeTab: state.teamFilters?.tab || 'resumen',
      activeFilter: state.teamFilters?.matchFilter || 'all',
      isLoading: state.loadingTeam,
      isLoadingRoster: state.loadingRoster,
      showRoster: true,
      showStats: true,
      teamStats: state.teamStats || null,
      loadingStats: state.loadingStats || false,
    });

    if (state.teamFilters?.tab === 'estadisticas' && state.teamStats && !state.loadingStats) {
      requestAnimationFrame(() => mountTeamStatsCharts(bodyEl, state.teamStats));
    }

    rootEl.querySelectorAll('[data-team-match]').forEach((node) => {
      node.onclick = async () => {
        let partido;
        try {
          partido = JSON.parse(node.getAttribute('data-team-match') || 'null');
        } catch {
          partido = null;
        }
        if (!partido?.IdPartido) return;
        await openMatchInSharedModal(state, partido, headerEl, bodyEl, renderAll);
      };
    });

    rootEl.querySelectorAll('[data-team-filter]').forEach((node) => {
      node.onclick = () => {
        const filter = node.getAttribute('data-team-filter') || 'all';
        if (!state.teamFilters) state.teamFilters = { tab: 'resumen', matchFilter: 'all' };
        console.log('[team-detail-subview] summary filter click', {
          nextFilter: filter,
          beforeTab: state.teamFilters.tab,
          beforeFilter: state.teamFilters.matchFilter,
          hasContent: !!(rootEl.querySelector('[data-team-tab-content]') || bodyEl.querySelector('[data-team-tab-content]')),
        });
        state.teamFilters.matchFilter = filter;
        state.teamFilters.tab = 'partidos';
        animatePillTabSelection(rootEl, '[data-team-tab]', 'partidos', 'team-tab', 'active');
        requestAnimationFrame(() => {
          console.log('[team-detail-subview] rendering filtered matches', {
            activeTab: state.teamFilters.tab,
            activeFilter: state.teamFilters.matchFilter,
          });
          renderTeamContentOnly();
        });
      };
    });
  };

  const viewEl = rootEl.querySelector('.team-detail-view') || rootEl;
  animatePillTabSelection(viewEl, '[data-team-tab]', state.teamFilters?.tab || 'resumen', 'team-tab', 'active', { animate: false });
  renderTeamContentOnly();

  rootEl.querySelectorAll('[data-team-tab]').forEach((node) => {
    node.onclick = () => {
      const tab = node.getAttribute('data-team-tab') || 'resumen';
      if (!state.teamFilters) state.teamFilters = { tab: 'resumen', matchFilter: 'all' };
      if (state.teamFilters.tab === tab) return;
      state.teamFilters.tab = tab;
      animatePillTabSelection(viewEl, '[data-team-tab]', tab, 'team-tab', 'active');
      animateTabContentSwap(rootEl, () => {
        renderTeamContentOnly();
        if (isTeamStatsTabPending(state, tab)) {
          loadSubviewTeamStats(state, renderTeamContentOnly);
        }
      }, (root) => root.querySelector('[data-team-tab-content]'));
    };
  });
}
