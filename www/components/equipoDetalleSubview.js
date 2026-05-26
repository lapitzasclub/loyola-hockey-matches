import { nextFrame, syncMobileBackState, transitionDetalleView } from "./partidoDetalleNavigation.js";
import { getCurrentView, logoUrl, normalizarEquipoClasificacion, pushView, setCurrentView } from "./partidoDetalleUtils.js";
import { loadEquipoDetalleMatches, renderEquipoDetalleView } from "./equipoDetalle.js";

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

export function renderEquipoSubview(state) {
  const equipo = state.selectedEquipo;
  if (!equipo) return "";

  return renderEquipoDetalleView(equipo, state.teamMatches || [], {
    activeTab: state.teamFilters?.tab || "resumen",
    activeFilter: state.teamFilters?.matchFilter || "all",
    isLoading: state.loadingTeam,
  });
}

export async function openEquipoSubview(state, equipoPayload, headerEl, bodyEl, renderAll) {
  const equipo = normalizarEquipoClasificacion(equipoPayload);
  if (!equipo) return;

  const previousView = getCurrentView(state);
  const isInitialOpen = previousView === "equipo" && !state.teamMatches.length && state.loadingTeam;

  state.selectedEquipo = equipo;
  state.teamCompetitionName = equipo?.nombreGrupo || equipoPayload?.NombreGrupo || equipoPayload?.nombreGrupo || state.teamCompetitionName || "";
  state.loadingTeam = true;
  state.teamMatches = [];
  state.teamFilters = {
    tab: "resumen",
    matchFilter: "all",
  };

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
}

export function bindEquipoMatchLinks(rootEl, state, headerEl, bodyEl, renderAll, openMatchInSharedModal) {
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

  rootEl.querySelectorAll("[data-team-tab]").forEach((node) => {
    node.onclick = () => {
      const tab = node.getAttribute("data-team-tab") || "resumen";
      if (!state.teamFilters) state.teamFilters = { tab: "resumen", matchFilter: "all" };
      state.teamFilters.tab = tab;
      renderAll(state, headerEl, bodyEl);
    };
  });

  rootEl.querySelectorAll("[data-team-filter]").forEach((node) => {
    node.onclick = () => {
      const filter = node.getAttribute("data-team-filter") || "all";
      if (!state.teamFilters) state.teamFilters = { tab: "resumen", matchFilter: "all" };
      state.teamFilters.matchFilter = filter;
      state.teamFilters.tab = "partidos";
      renderAll(state, headerEl, bodyEl);
    };
  });
}
