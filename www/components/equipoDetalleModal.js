import { syncMobileBackState } from "./partidoDetalleNavigation.js";
import { normalizarEquipoClasificacion } from "./partidoDetalleUtils.js";
import { hydrateEquipoDetalleRosterMatches, loadEquipoDetalleMatches, renderEquipoDetalleView } from "./equipoDetalle.js";
import { loadTeamAdvancedStats, mountTeamStatsCharts, unmountTeamStatsCharts } from "./equipoDetalleStats.js";
import { createModalHandoffCover, removeModalHandoffCover } from "./modalHandoff.js";
import { mountDetalleModalShell } from "./detalleModalShell.js";
import { animatePillTabSelection, animateTabContentSwap } from "./uiTabs.js";

function renderEquipoDetalleHeader(equipo) {
  return `
    <div class="team-detail-modal-topline">
      ${equipo.nombreGrupo ? `<span>${equipo.nombreGrupo}</span>` : ""}
    </div>
    <div class="team-detail-modal-title">${equipo.nombreEquipo}</div>
  `;
}

function closeOnBackdrop(event) {
  if (event.target?.classList?.contains("team-detail-modal")) {
    closeEquipoDetalle();
  }
}

export function closeEquipoDetalle(options = {}) {
  const { immediate = false, preserveBodyLock = false } = options;
  const modal = document.querySelector(".team-detail-modal");
  if (!modal) return;
  if (modal.dataset.closing === "true") return;

  const cleanup = () => {
    modal.remove();
    if (!preserveBodyLock) {
      document.body.classList.remove("modal-abierto");
    }
    syncMobileBackState();
  };

  if (immediate) {
    cleanup();
    return;
  }

  modal.dataset.closing = "true";
  modal.classList.remove("is-open");
  modal.classList.add("is-closing");
  window.setTimeout(cleanup, 280);
}

export async function openEquipoDetalle(equipoPayload, options = {}) {
  const { preserveBodyLock = false, skipCloseExisting = false } = options;
  const equipo = normalizarEquipoClasificacion(equipoPayload);
  if (!equipo) return;

  if (!skipCloseExisting) {
    closeEquipoDetalle({ immediate: true, preserveBodyLock });
  }

  const { modal, headerEl, bodyEl, closeBtn } = mountDetalleModalShell({
    rootClassName: "team-detail-modal",
    shellClassName: "team-detail-shell",
    headerClassName: "team-detail-header",
    bodyClassName: "team-detail-body",
    headerContentClassName: "team-detail-header-content",
    showBack: false,
    showClose: true,
    closeAriaLabel: "Cerrar",
    contentIdPrefix: "team-detail",
    instantOpen: skipCloseExisting,
  });

  const viewState = {
    tab: "resumen",
    filter: "all",
    partidos: [],
    loading: true,
    loadingRoster: true,
    loadingStats: false,
    teamStats: null,
  };

  const renderBody = () => {
    if (!(bodyEl instanceof HTMLElement)) return;
    unmountTeamStatsCharts(bodyEl);
    bodyEl.innerHTML = renderEquipoDetalleView(equipo, viewState.partidos, {
      activeTab: viewState.tab,
      activeFilter: viewState.filter,
      isLoading: viewState.loading,
      isLoadingRoster: viewState.loadingRoster,
      showRoster: true,
      showStats: true,
      teamStats: viewState.teamStats,
      loadingStats: viewState.loadingStats,
    });

    animatePillTabSelection(bodyEl, "[data-team-tab]", viewState.tab, "team-tab", "active");

    bodyEl.querySelectorAll("[data-team-tab]").forEach((node) => {
      node.addEventListener("click", () => {
        const nextTab = node.getAttribute("data-team-tab") || "resumen";
        if (nextTab === viewState.tab) return;
        viewState.tab = nextTab;
        const contentEl = bodyEl.querySelector('[data-team-tab-content]') || bodyEl;
        animateTabContentSwap(contentEl, () => {
          renderBody();
          if (viewState.tab === "estadisticas" && !viewState.teamStats && !viewState.loadingStats) {
            viewState.loadingStats = true;
            renderBody();
            loadTeamAdvancedStats(equipo, viewState.partidos)
              .then((stats) => {
                viewState.teamStats = stats;
                viewState.loadingStats = false;
                renderBody();
              })
              .catch(() => {
                viewState.loadingStats = false;
                renderBody();
              });
          }
        });
      });
    });

    bodyEl.querySelectorAll("[data-team-filter]").forEach((node) => {
      node.addEventListener("click", () => {
        viewState.filter = node.getAttribute("data-team-filter") || "all";
        viewState.tab = "partidos";
        const contentEl = bodyEl.querySelector('[data-team-tab-content]') || bodyEl;
        animateTabContentSwap(contentEl, () => renderBody());
      });
    });

    if (viewState.tab === "estadisticas" && viewState.teamStats && !viewState.loadingStats) {
      requestAnimationFrame(() => mountTeamStatsCharts(bodyEl, viewState.teamStats));
    }

    bodyEl.querySelectorAll("[data-team-match]").forEach((node) => {
      node.addEventListener("click", async () => {
        let partido;
        try {
          partido = JSON.parse(node.getAttribute("data-team-match") || "null");
        } catch {
          partido = null;
        }
        if (!partido?.IdPartido) return;
        window.__teamDetailReturnContext = {
          equipo,
        };
        const cover = createModalHandoffCover();
        const currentModal = document.querySelector(".team-detail-modal");
        const { openPartidoDetalle } = await import("./partidoDetalle.js");
        openPartidoDetalle(partido.IdPartido, { preserveBodyLock: true, skipCloseExisting: true });
        requestAnimationFrame(() => {
          currentModal?.remove();
          requestAnimationFrame(() => {
            removeModalHandoffCover(cover);
          });
        });
      });
    });
  };

  if (headerEl instanceof HTMLElement) {
    headerEl.innerHTML = renderEquipoDetalleHeader(equipo);
  }
  renderBody();

  modal.addEventListener("click", closeOnBackdrop);
  closeBtn?.addEventListener("click", () => closeEquipoDetalle());

  viewState.partidos = await loadEquipoDetalleMatches(equipo);
  viewState.loading = false;
  renderBody();

  hydrateEquipoDetalleRosterMatches(equipo, viewState.partidos)
    .then(() => {
      viewState.loadingRoster = false;
      renderBody();
    })
    .catch(() => {
      viewState.loadingRoster = false;
      renderBody();
    });
}
