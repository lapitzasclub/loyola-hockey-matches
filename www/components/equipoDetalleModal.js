import { t } from "../i18n.js";
import { syncMobileBackState } from "./partidoDetalleNavigation.js";
import { normalizarEquipoClasificacion } from "./partidoDetalleUtils.js";
import { loadEquipoDetalleMatches, renderEquipoDetalleMatches, renderEquipoDetalleSummary } from "./equipoDetalle.js";
import { createModalHandoffCover, removeModalHandoffCover } from "./modalHandoff.js";

function renderEquipoDetalleHeader(equipo) {
  return `
    <div class="team-detail-modal-topline">
      ${equipo.nombreGrupo ? `<span>${equipo.nombreGrupo}</span>` : ""}
    </div>
    <div class="team-detail-modal-title">${equipo.nombreEquipo}</div>
  `;
}

function renderEquipoDetalleBody(equipo, partidos, isLoading) {
  return `
    <div class="team-detail-view">
      ${renderEquipoDetalleSummary(equipo)}
      ${isLoading
        ? `<div class="team-detail-loading">${t("team_detail_loading")}</div>`
        : renderEquipoDetalleMatches(partidos, equipo.nombreEquipo || "")}
    </div>
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

  const modal = document.createElement("div");
  modal.className = "team-detail-modal";
  modal.innerHTML = `
    <div class="team-detail-shell">
      <div class="partido-detalle-grabber"></div>
      <div class="team-detail-header">
        <div class="team-detail-header-content">${renderEquipoDetalleHeader(equipo)}</div>
        <button class="team-detail-close" aria-label="Cerrar">&times;</button>
      </div>
      <div class="team-detail-body">${renderEquipoDetalleBody(equipo, [], true)}</div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.classList.add("modal-abierto");
  modal.addEventListener("click", closeOnBackdrop);
  modal.querySelector(".team-detail-close")?.addEventListener("click", () => closeEquipoDetalle());
  if (skipCloseExisting) {
    modal.classList.add("is-open");
  } else {
    requestAnimationFrame(() => modal.classList.add("is-open"));
  }
  syncMobileBackState();

  const bodyEl = modal.querySelector(".team-detail-body");
  if (!(bodyEl instanceof HTMLElement)) return;

  const partidos = await loadEquipoDetalleMatches(equipo);
  bodyEl.innerHTML = renderEquipoDetalleBody(equipo, partidos, false);

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
      const mod = await import("./partidoDetalle.js");
      mod.openPartidoDetalle(partido.IdPartido, { preserveBodyLock: true, skipCloseExisting: true });
      requestAnimationFrame(() => {
        currentModal?.remove();
        requestAnimationFrame(() => {
          removeModalHandoffCover(cover);
        });
      });
    });
  });
}
