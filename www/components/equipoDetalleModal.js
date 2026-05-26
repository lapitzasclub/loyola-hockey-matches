import { syncMobileBackState } from "./partidoDetalleNavigation.js";
import { normalizarEquipoClasificacion } from "./partidoDetalleUtils.js";
import { loadEquipoDetalleMatches, renderEquipoDetalleView } from "./equipoDetalle.js";
import { createModalHandoffCover, removeModalHandoffCover } from "./modalHandoff.js";
import { mountDetalleModalShell } from "./detalleModalShell.js";

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
  };

  const renderBody = () => {
    if (!(bodyEl instanceof HTMLElement)) return;
    bodyEl.innerHTML = renderEquipoDetalleView(equipo, viewState.partidos, {
      activeTab: viewState.tab,
      activeFilter: viewState.filter,
      isLoading: viewState.loading,
    });

    bodyEl.querySelectorAll("[data-team-tab]").forEach((node) => {
      node.addEventListener("click", () => {
        viewState.tab = node.getAttribute("data-team-tab") || "resumen";
        renderBody();
      });
    });

    bodyEl.querySelectorAll("[data-team-filter]").forEach((node) => {
      node.addEventListener("click", () => {
        viewState.filter = node.getAttribute("data-team-filter") || "all";
        viewState.tab = "partidos";
        renderBody();
      });
    });

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
}
