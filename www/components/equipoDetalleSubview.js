import { t } from "../i18n.js";
import { nextFrame, syncMobileBackState, transitionDetalleView } from "./partidoDetalleNavigation.js";
import { getCurrentView, logoUrl, normalizarEquipoClasificacion, pushView, setCurrentView } from "./partidoDetalleUtils.js";
import { loadEquipoDetalleMatches, renderEquipoDetalleMatches, renderEquipoDetalleSummary } from "./equipoDetalle.js";

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

  return `
    <div class="team-detail-view subview-enter">
      ${renderEquipoDetalleSummary(equipo, state.teamMatches || [])}
      ${state.loadingTeam
        ? `<div class="team-detail-loading">${t("team_detail_loading")}</div>`
        : renderEquipoDetalleMatches(state.teamMatches || [], equipo.nombreEquipo || "")}
    </div>
  `;
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
}
