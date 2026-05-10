import { t } from "../i18n.js";
import {
  callPartidoHubServerMethod,
  getEstadisticaJugador,
  getEstadisticaPartido,
  getPartido,
  subscribePartidoHubEvents,
} from "../services.js";
import { renderAlineaciones } from "./partidoDetalleAlineaciones.js";
import { renderEventos } from "./partidoDetalleEventos.js";
import {
  createDetalleState,
  emptyArray,
  escapeHtml,
  formatFecha,
  formatHora,
  getCurrentTab,
  getCurrentView,
  getViewStack,
  logoUrl,
  normalizarPartido,
  parseApiArrayResponse,
  popView,
  pushView,
  setCurrentTab,
  setCurrentView,
} from "./partidoDetalleUtils.js";

function syncMobileBackState() {
  try {
    window.dispatchEvent(new CustomEvent("app:overlay-state-changed"));
  } catch {}
}

function setHeaderContent(headerEl, html, reason = "") {
  headerEl.innerHTML = html;
  console.log("[Detalle] Header actualizado", {
    reason,
    html,
    text: headerEl.textContent,
  });
}

function getPlayerStatsData(raw) {
  const parsed = parseApiArrayResponse(raw);
  if (Array.isArray(parsed)) return parsed[0] || null;
  return parsed && typeof parsed === "object" ? parsed : null;
}


export function openPartidoDetalle(idPartido) {
  closePartidoDetalle({ immediate: true });
  const modal = document.createElement("div");
  modal.className = "partido-detalle-modal";
  modal.innerHTML = `
    <div class="partido-detalle-shell">
      <div class="partido-detalle-grabber"></div>
      <div class="partido-detalle-header">
        <button class="partido-detalle-back" aria-label="Volver" hidden disabled>←</button>
        <div class="partido-detalle-header-content" id="partido-detalle-header-content"></div>
        <button class="partido-detalle-close" aria-label="Cerrar">&times;</button>
      </div>
      <div class="partido-detalle-body" id="partido-detalle-body"></div>
    </div>
  `;
  document.body.appendChild(modal);
  const shellEl = modal.querySelector(".partido-detalle-shell");
  const bodyScrollEl = modal.querySelector(".partido-detalle-body");
  if (shellEl) shellEl.scrollTop = 0;
  if (bodyScrollEl) bodyScrollEl.scrollTop = 0;
  requestAnimationFrame(() => modal.classList.add("is-open"));
  document.body.classList.add("modal-abierto");
  syncMobileBackState();
  modal.querySelector(".partido-detalle-close").onclick = () => closePartidoDetalle();
  modal.querySelector(".partido-detalle-back").onclick = async () => {
    const state = window.__partidoDetalleState;
    if (!getViewStack(state).length) return;
    const headerEl = document.getElementById("partido-detalle-header-content");
    const bodyEl = document.getElementById("partido-detalle-body");
    await transitionDetalleView(bodyEl, async () => {
      setCurrentView(state, popView(state) || "partido");
      renderAll(state, headerEl, bodyEl);
    }, "back");
    syncMobileBackState();
  };
  cargarDetallePartido(idPartido);
}

export function closePartidoDetalle(options = {}) {
  const { immediate = false } = options;
  const modal = document.querySelector(".partido-detalle-modal");
  if (!modal) return;
  if (modal.dataset.closing === "true") return;

  const cleanup = () => {
    modal.remove();
    document.body.classList.remove("modal-abierto");
    if (window.signalR?.enDirecto?.server?.salirDePartido && window.__partidoDetalleId) {
      callPartidoHubServerMethod("salirDePartido", window.__partidoDetalleId);
    }
    if (window.__partidoDetalleUnsub) {
      window.__partidoDetalleUnsub();
      window.__partidoDetalleUnsub = null;
    }
    window.__partidoDetalleId = null;
    window.__partidoDetalleState = null;
    syncMobileBackState();
  };

  if (immediate) {
    cleanup();
    return;
  }

  modal.dataset.closing = "true";
  modal.classList.remove("is-open");
  modal.classList.add("is-closing");

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduceMotion) {
    cleanup();
    return;
  }

  window.setTimeout(cleanup, 280);
}

async function waitForSignalRConnected(timeout = 4000) {
  const start = Date.now();
  while ($.connection.hub.state !== $.signalR.connectionState.connected) {
    if (Date.now() - start > timeout) {
      throw new Error("SignalR hub no conectado");
    }
    await new Promise((res) => setTimeout(res, 50));
  }
}

function ensureBaseLayout(bodyEl, state) {
  bodyEl.innerHTML = `
    <div class="partido-detalle-tabs" role="tablist" aria-label="Secciones del partido">
      <button class="tab-btn" data-tab="resumen">${escapeHtml(t("detail_summary"))}</button>
      <button class="tab-btn" data-tab="alineaciones">${escapeHtml(t("detail_lineups"))}</button>
      <button class="tab-btn" data-tab="eventos">${escapeHtml(t("detail_events"))}</button>
      <button class="tab-btn" data-tab="penaltis">${escapeHtml(t("detail_penalties"))}</button>
    </div>
    <section class="tab-content" id="tab-resumen"></section>
    <section class="tab-content" id="tab-alineaciones" hidden></section>
    <section class="tab-content" id="tab-eventos" hidden></section>
    <section class="tab-content" id="tab-penaltis" hidden></section>
  `;

  bodyEl.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.onclick = () => {
      setCurrentTab(state, btn.dataset.tab);
      updateTabVisibility(bodyEl, getCurrentTab(state));
    };
  });

  updateTabVisibility(bodyEl, getCurrentTab(state));
}

function updateTabVisibility(bodyEl, activeTab) {
  bodyEl.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === activeTab);
  });
  bodyEl.querySelectorAll(".tab-content").forEach((panel) => {
    panel.hidden = panel.id !== `tab-${activeTab}`;
  });
}

function updateChrome(state, modal) {
  const backBtn = modal?.querySelector(".partido-detalle-back");
  if (!backBtn) return;
  const canGoBack = !!getViewStack(state).length;
  backBtn.hidden = !canGoBack;
  backBtn.disabled = !canGoBack;
}

function renderAll(state, headerEl, bodyEl) {
  const modal = bodyEl.closest(".partido-detalle-modal");
  updateChrome(state, modal);
  if (state.partido) {
    const headerHtml = getCurrentView(state) === "jugador" ? renderJugadorHeader(state) : renderPartidoHeader(state);
    setHeaderContent(headerEl, headerHtml, "renderAll");
  }
  if (getCurrentView(state) !== "partido") {
    bodyEl.innerHTML = renderSubview(state);
    bindPlayerLinks(bodyEl, state, headerEl);
    bindPlayerAccordions(bodyEl);
    return;
  }
  if (!bodyEl.querySelector("#tab-resumen")) {
    ensureBaseLayout(bodyEl, state);
    scrollDetalleToTop(bodyEl);
  }
  bodyEl.querySelector("#tab-resumen").innerHTML = renderResumen(state);
  bodyEl.querySelector("#tab-alineaciones").innerHTML = renderAlineaciones(state);
  bodyEl.querySelector("#tab-eventos").innerHTML = renderEventos(state);
  bodyEl.querySelector("#tab-penaltis").innerHTML = renderPenaltis(state);
  updateTabVisibility(bodyEl, getCurrentTab(state));
  bindPlayerLinks(bodyEl, state, headerEl);
}

function bindPlayerLinks(rootEl, state, headerEl) {
  rootEl.querySelectorAll(".partido-detalle-player-link").forEach((btn) => {
    btn.onclick = async () => {
      let payload = null;
      try {
        payload = JSON.parse(btn.dataset.player || "null");
      } catch {
        payload = null;
      }
      state.selectedJugador = payload ? resolveJugadorDetalle(state, payload) : null;
      if (!state.selectedJugador) return;
      pushView(state, getCurrentView(state));
      state.selectedJugador.loading = true;
      const bodyEl = rootEl.closest("#partido-detalle-body") || rootEl;
      await transitionDetalleView(bodyEl, async () => {
        setCurrentView(state, "jugador");
        renderAll(state, headerEl, bodyEl);
      }, "forward");
      syncMobileBackState();
      await hydrateJugadorStats(state, headerEl, bodyEl);
    };
  });
}

function resolveJugadorDetalle(state, payload) {
  const nombre = String(payload?.nombre || "").trim().toLowerCase();
  const dorsal = String(payload?.dorsal || "").trim();
  const teamType = payload?.teamType;
  const alin = state.alineaciones || {};

  const groups = teamType === "local"
    ? [
        { role: "jugador", items: emptyArray(alin.JugLocal), licenciaTipo: "j" },
        { role: "portero", items: emptyArray(alin.PortLocal), licenciaTipo: "p" },
        { role: "tecnico", items: emptyArray(alin.TecnLocal), licenciaTipo: "j" },
      ]
    : teamType === "visitante"
      ? [
          { role: "jugador", items: emptyArray(alin.JugVisit), licenciaTipo: "j" },
          { role: "portero", items: emptyArray(alin.PortVisit), licenciaTipo: "p" },
          { role: "tecnico", items: emptyArray(alin.TecnVisit), licenciaTipo: "j" },
        ]
      : [];

  let match = null;
  let matchedGroup = null;
  for (const group of groups) {
    match = group.items.find((item) => {
      const itemDorsal = String(item?.Dorsal || "").trim();
      const itemNombre = String(item?.ApellidosNombre || item?.NombreApellidos || "").trim().toLowerCase();
      const itemLicencia = String(item?.IdLicencia || "").trim();
      const payloadLicencia = String(payload?.idLicencia || "").trim();
      return (payloadLicencia && itemLicencia === payloadLicencia) || (dorsal && itemDorsal === dorsal) || (nombre && itemNombre === nombre);
    });
    if (match) {
      matchedGroup = group;
      break;
    }
  }

  return {
    ...payload,
    role: match ? matchedGroup.role : payload.role,
    licenciaTipo: payload.licenciaTipo || matchedGroup?.licenciaTipo || "j",
    idLicencia: match?.IdLicencia ?? payload?.idLicencia ?? null,
    teamName: teamType === "local" ? state.partido?.local : teamType === "visitante" ? state.partido?.visit : "",
    teamLogo: teamType === "local" ? state.partido?.logoLocal : teamType === "visitante" ? state.partido?.logoVisit : null,
    nombre: match?.ApellidosNombre || match?.NombreApellidos || payload.nombre,
    dorsal: match?.Dorsal ?? payload.dorsal,
    partidoStats: match || null,
    eventos: getJugadorEventos(state.eventos, {
      dorsal: match?.Dorsal ?? dorsal,
      nombre: match?.ApellidosNombre || match?.NombreApellidos || nombre,
      teamType,
    }),
    statsGlobales: null,
    loading: false,
    error: "",
  };
}

function getJugadorEventos(eventos, jugadorRef) {
  const dorsal = String(jugadorRef?.dorsal || "").trim();
  const nombre = String(jugadorRef?.nombre || "").trim().toLowerCase();
  const teamType = jugadorRef?.teamType;
  return emptyArray(eventos).filter((ev) => {
    const sameTeam = teamType ? Number(ev.LocalVisit) === (teamType === "local" ? 1 : 2) : true;
    const dorsal1 = String(ev?.Dorsal1 || "").trim();
    const dorsal2 = String(ev?.Dorsal2 || "").trim();
    const nombre1 = String(ev?.Lic1 || "").trim().toLowerCase();
    const nombre2 = String(ev?.Lic2 || "").trim().toLowerCase();
    return sameTeam && (
      (dorsal && (dorsal1 === dorsal || dorsal2 === dorsal)) ||
      (nombre && (nombre1 === nombre || nombre2 === nombre))
    );
  });
}

function renderSubview(state) {
  if (getCurrentView(state) === "jugador") {
    return renderJugadorSubview(state);
  }
  return `
    <div class="partido-detalle-subview-placeholder">
      <div class="partido-detalle-empty">${escapeHtml(t("detail_loading_view"))}</div>
    </div>
  `;
}

function renderJugadorSubview(state) {
  const jugador = state.selectedJugador;
  if (!jugador) {
    return `
      <div class="partido-detalle-subview-placeholder subview-enter">
        <div class="partido-detalle-empty">${escapeHtml(t("detail_player_unavailable"))}</div>
      </div>
    `;
  }

  const partidoStats = jugador.partidoStats || {};
  const globales = jugador.statsGlobales;
  const foto = getJugadorFotoUrl(globales?.foto);
  const competicionesOrdenadas = emptyArray(globales?.competiciones)
    .slice()
    .sort((a, b) => safeNumber(b?.partidos || emptyArray(b?.filas).length) - safeNumber(a?.partidos || emptyArray(a?.filas).length));
  const allRows = competicionesOrdenadas.flatMap((comp) => emptyArray(comp?.filas));
  const headerChips = renderStatsChipsFromRows(allRows, jugador.licenciaTipo || "j", state.modalidad || "hp");
  const competicionesHtml = competicionesOrdenadas.length
    ? competicionesOrdenadas.map((comp, index) => renderJugadorCompeticion(comp, jugador.licenciaTipo || "j", state.modalidad || "hp", { open: index === 0 })).join("")
    : "";
  const timeline = emptyArray(jugador.eventos).map((ev) => {
    const period = escapeHtml(ev.CodPeriodo || "");
    const crono = escapeHtml(ev.Crono || "");
    const tipo = escapeHtml(ev.IdTipoEvento || ev.Descripcion || "Evento");
    return `<div class="partido-detalle-player-event"><span>${period} ${crono}</span><strong>${tipo}</strong></div>`;
  }).join("") || `<div class="partido-detalle-empty small">${escapeHtml(t("detail_player_no_events"))}</div>`;

  const partidoChips = [
    partidoStats.Goles != null ? `<span class="alineacion-chip">G <strong>${escapeHtml(partidoStats.Goles)}</strong></span>` : "",
    partidoStats.Asist != null ? `<span class="alineacion-chip">As <strong>${escapeHtml(partidoStats.Asist)}</strong></span>` : "",
    partidoStats.FaltaReal != null ? `<span class="alineacion-chip">F+ <strong>${escapeHtml(partidoStats.FaltaReal)}</strong></span>` : "",
    partidoStats.FaltaRec != null ? `<span class="alineacion-chip">F- <strong>${escapeHtml(partidoStats.FaltaRec)}</strong></span>` : "",
    partidoStats.Azules != null ? `<span class="alineacion-chip">Az <strong>${escapeHtml(partidoStats.Azules)}</strong></span>` : "",
    partidoStats.Rojas != null ? `<span class="alineacion-chip">Rj <strong>${escapeHtml(partidoStats.Rojas)}</strong></span>` : "",
    partidoStats.Minutos != null ? `<span class="alineacion-chip">Min <strong>${escapeHtml(partidoStats.Minutos)}</strong></span>` : "",
  ].filter(Boolean).join("");

  return `
    <div class="partido-detalle-player-sheet subview-enter">
      <section class="partido-detalle-section partido-detalle-player-card partido-detalle-player-card-hero">
        <div class="partido-detalle-player-hero partido-detalle-player-hero-lg">
          <img class="partido-detalle-player-photo" src="${foto}" alt="${escapeHtml(jugador.nombre || "Jugador")}">
          <div>
            <div class="partido-detalle-player-meta partido-detalle-player-meta-compact">${[globales?.nacionalidad ? `${escapeHtml(t("detail_player_nationality"))}: ${escapeHtml(globales.nacionalidad)}` : "", globales?.nacimiento ? `${escapeHtml(t("detail_player_birth"))}: ${escapeHtml(globales.nacimiento)}` : ""].filter(Boolean).join(" · ")}</div>
          </div>
        </div>
        ${jugador.loading ? `<div class="partido-detalle-empty small">${escapeHtml(t("loading"))}...</div>` : ""}
        ${jugador.error ? `<div class="partido-detalle-empty small">${escapeHtml(jugador.error)}</div>` : ""}
      </section>
      <section class="partido-detalle-section partido-detalle-player-events-card">
        <div class="partido-detalle-section-title">${escapeHtml(t("detail_match"))}</div>
        ${(partidoChips || timeline) ? `<div class="partido-detalle-player-section-body">${partidoChips ? `<div class="alineacion-chips partido-detalle-player-chips partido-detalle-player-chips-compact">${partidoChips}</div>` : ""}<div class="partido-detalle-player-events-list">${timeline}</div></div>` : `<div class="partido-detalle-empty small">${escapeHtml(t("detail_player_no_events"))}</div>`}
      </section>
      ${competicionesHtml ? `<section class="partido-detalle-section partido-detalle-player-events-card"><div class="partido-detalle-section-title">${escapeHtml(t("detail_player_statistics"))}</div><div class="partido-detalle-player-competitions">${competicionesHtml}</div></section>` : ""}
    </div>
  `;
}

function renderJugadorHeader(state) {
  const jugador = state.selectedJugador;
  if (!jugador) return `<div>${escapeHtml(t("detail_match"))}</div>`;
  const nombre = jugador.statsGlobales?.nombre || jugador.nombre || "Jugador";

  return `
    <div class="partido-detalle-subheader subview-enter">
      <div class="partido-detalle-subheader-top">${escapeHtml(jugador.teamName || jugador.teamType || t("detail_match"))}</div>
      <div class="partido-detalle-subheader-title">${escapeHtml(nombre)}</div>
      <div class="partido-detalle-subheader-meta">${jugador.dorsal ? `#${escapeHtml(jugador.dorsal)}` : ""}</div>
    </div>
  `;
}

async function hydrateJugadorStats(state, headerEl, bodyEl) {
  const jugador = state.selectedJugador;
  if (!jugador?.idLicencia) {
    jugador.loading = false;
    jugador.error = t("detail_player_no_license");
    renderAll(state, headerEl, bodyEl);
    return;
  }

  try {
    const statsRes = await getEstadisticaJugador(jugador.idLicencia);
    jugador.statsGlobales = getPlayerStatsData(statsRes);
    console.log("[Detalle jugador] statsGlobales", {
      idLicencia: jugador.idLicencia,
      nombre: jugador.statsGlobales?.nombre,
      competiciones: emptyArray(jugador.statsGlobales?.competiciones).length,
      filasPorCompeticion: emptyArray(jugador.statsGlobales?.competiciones).map((comp) => ({
        titulo: comp?.titulo,
        filas: emptyArray(comp?.filas).length,
      })),
      raw: jugador.statsGlobales,
    });
    jugador.error = jugador.statsGlobales ? "" : t("detail_player_load_error");
  } catch (error) {
    jugador.error = error?.message || t("detail_player_load_error");
  } finally {
    jugador.loading = false;
    renderAll(state, headerEl, bodyEl);
  }
}

function getJugadorFotoUrl(foto) {
  const key = String(foto || "sinfoto").trim();
  if (!key || key === "sinfoto") {
    return "https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/licencias/foto/no_foto.png";
  }
  return `https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/licencias/foto/${encodeURIComponent(key)}.jpg`;
}

function safeNumber(value) {
  return Number(value) || 0;
}

function hasPositive(value) {
  return Number(value) > 0;
}

function getJugadorStatColumns(tipo, modalidad) {
  const colPts = {
    key: "Pts",
    label: "Pts",
    cell: (row) => {
      const value = safeNumber(row?.gol) + safeNumber(row?.asist);
      return hasPositive(value) ? value : "";
    },
    totalAdd: (acc, row) => acc + safeNumber(row?.gol) + safeNumber(row?.asist),
    totalRender: (total) => total,
  };
  const colG = { key: "G", label: "G", cell: (row) => hasPositive(row?.gol) ? row.gol : "", totalAdd: (acc, row) => acc + safeNumber(row?.gol), totalRender: (total) => total };
  const colAs = { key: "As", label: "As", cell: (row) => hasPositive(row?.asist) ? row.asist : "", totalAdd: (acc, row) => acc + safeNumber(row?.asist), totalRender: (total) => total };
  const colFD = {
    key: "FD",
    label: "FD",
    cell: (row) => hasPositive(row?.FD) ? `${safeNumber(row?.FDGol)}/${safeNumber(row?.FD)}` : "",
    totalAdd: (acc, row) => ({ gol: (acc.gol || 0) + safeNumber(row?.FDGol), tot: (acc.tot || 0) + safeNumber(row?.FD) }),
    totalRender: (total) => total?.tot > 0 ? `${total.gol}/${total.tot}` : "",
  };
  const colPen = {
    key: "Pen",
    label: "Pen",
    cell: (row) => hasPositive(row?.Pen) ? `${safeNumber(row?.PenGol)}/${safeNumber(row?.Pen)}` : "",
    totalAdd: (acc, row) => ({ gol: (acc.gol || 0) + safeNumber(row?.PenGol), tot: (acc.tot || 0) + safeNumber(row?.Pen) }),
    totalRender: (total) => total?.tot > 0 ? `${total.gol}/${total.tot}` : "",
  };
  const colTA = { key: "TA", label: "TA", cell: (row) => hasPositive(row?.TA) ? row.TA : "", totalAdd: (acc, row) => acc + safeNumber(row?.TA), totalRender: (total) => total };
  const colTR = { key: "TR", label: "TR", cell: (row) => hasPositive(row?.TR) ? row.TR : "", totalAdd: (acc, row) => acc + safeNumber(row?.TR), totalRender: (total) => total };
  const colMin = { key: "Min", label: "Min", cell: (row) => hasPositive(row?.MinutosSancion) ? row.MinutosSancion : "", totalAdd: (acc, row) => acc + safeNumber(row?.MinutosSancion), totalRender: (total) => total };
  const colGR = { key: "GR", label: "GR", cell: (row) => hasPositive(row?.GolesRecibidos) ? row.GolesRecibidos : "", totalAdd: (acc, row) => acc + safeNumber(row?.GolesRecibidos), totalRender: (total) => total };
  const colTRec = {
    key: "TRec",
    label: "TirR",
    cell: (row) => {
      const value = safeNumber(row?.GolesRecibidos) + safeNumber(row?.Tiros);
      return hasPositive(value) ? value : "";
    },
    totalAdd: (acc, row) => acc + safeNumber(row?.GolesRecibidos) + safeNumber(row?.Tiros),
    totalRender: (total) => total,
  };
  const colSave = {
    key: "Save",
    label: "%Par",
    cell: (row) => {
      const shots = safeNumber(row?.GolesRecibidos) + safeNumber(row?.Tiros);
      if (!shots) return "";
      return `${((1 - safeNumber(row?.GolesRecibidos) / shots) * 100).toFixed(1)}%`;
    },
    totalAdd: (acc, row) => ({ gr: (acc.gr || 0) + safeNumber(row?.GolesRecibidos), shots: (acc.shots || 0) + safeNumber(row?.GolesRecibidos) + safeNumber(row?.Tiros) }),
    totalRender: (total) => total?.shots > 0 ? `${((1 - total.gr / total.shots) * 100).toFixed(1)}%` : "",
  };

  if (tipo === "p") {
    return modalidad === "hp"
      ? [colGR, colTRec, colSave, colTA, colTR]
      : [colGR, colTRec, colSave, colMin];
  }

  return modalidad === "hl"
    ? [colPts, colG, colAs, colMin]
    : [colG, colAs, colFD, colPen, colTA, colTR, colMin];
}

function buildTotalsForColumns(rows, columns) {
  const totals = {};
  columns.forEach((column) => {
    const seed = ["FD", "Pen", "Save"].includes(column.key) ? {} : 0;
    totals[column.key] = emptyArray(rows).reduce((acc, row) => column.totalAdd(acc, row), seed);
  });
  return totals;
}

function renderStatsChipsFromRows(rows, tipo, modalidad) {
  const columns = getJugadorStatColumns(tipo, modalidad);
  const totals = buildTotalsForColumns(rows, columns);
  return columns.map((column) => {
    const rendered = column.totalRender(totals[column.key], rows);
    return rendered !== "" && rendered !== 0
      ? `<span class="alineacion-chip">${escapeHtml(column.label)} <strong>${escapeHtml(rendered)}</strong></span>`
      : "";
  }).join("");
}

function scrollDetalleToTop(bodyEl) {
  const modal = bodyEl?.closest?.(".partido-detalle-modal");
  const shellEl = modal?.querySelector?.(".partido-detalle-shell");
  if (shellEl) shellEl.scrollTop = 0;
  if (bodyEl) bodyEl.scrollTop = 0;
}

async function transitionDetalleView(bodyEl, mutateAndRender, direction = "forward") {
  if (!bodyEl) {
    await mutateAndRender();
    return;
  }

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduceMotion) {
    await mutateAndRender();
    return;
  }

  const activeView = bodyEl.firstElementChild;
  if (activeView) {
    activeView.classList.remove("subview-enter", "subview-enter-back");
    activeView.classList.add(direction === "back" ? "subview-leave-back" : "subview-leave");
    await new Promise((resolve) => window.setTimeout(resolve, 180));
  }

  await mutateAndRender();
  scrollDetalleToTop(bodyEl);

  const nextView = bodyEl.firstElementChild;
  if (nextView) {
    nextView.classList.remove("subview-leave", "subview-leave-back");
    nextView.classList.add(direction === "back" ? "subview-enter-back" : "subview-enter");
  }
}

function bindPlayerAccordions(rootEl) {
  rootEl.querySelectorAll(".partido-detalle-player-competition").forEach((detailsEl) => {
    if (detailsEl.dataset.accordionBound === "true") return;
    detailsEl.dataset.accordionBound = "true";

    const summaryEl = detailsEl.querySelector(".partido-detalle-player-competition-bar");
    const contentEl = detailsEl.querySelector(".partido-detalle-player-history-list");
    if (!summaryEl || !contentEl) return;

    if (detailsEl.open) {
      contentEl.style.height = "auto";
      contentEl.style.opacity = "1";
    } else {
      contentEl.style.height = "0px";
      contentEl.style.opacity = "0";
    }

    let animation = null;

    summaryEl.addEventListener("click", (event) => {
      event.preventDefault();
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      if (reduceMotion) {
        detailsEl.open = !detailsEl.open;
        contentEl.style.height = detailsEl.open ? "auto" : "0px";
        contentEl.style.opacity = detailsEl.open ? "1" : "0";
        return;
      }

      const isOpening = !detailsEl.open;
      const startHeight = `${contentEl.offsetHeight}px`;

      if (animation) animation.cancel();

      if (isOpening) {
        detailsEl.open = true;
        const endHeight = `${contentEl.scrollHeight}px`;
        contentEl.style.overflow = "hidden";
        contentEl.style.height = startHeight === "0px" ? "0px" : startHeight;
        contentEl.style.opacity = "0";
        animation = contentEl.animate(
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
        animation.onfinish = () => {
          contentEl.style.height = "auto";
          contentEl.style.opacity = "1";
          contentEl.style.overflow = "visible";
          animation = null;
        };
      } else {
        const measuredStart = startHeight === "0px" ? `${contentEl.scrollHeight}px` : startHeight;
        contentEl.style.overflow = "hidden";
        contentEl.style.height = measuredStart;
        contentEl.style.opacity = "1";
        animation = contentEl.animate(
          [
            { height: measuredStart, opacity: 1 },
            { height: "0px", opacity: 0 },
          ],
          {
            duration: 280,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards",
          },
        );
        animation.onfinish = () => {
          detailsEl.open = false;
          contentEl.style.height = "0px";
          contentEl.style.opacity = "0";
          contentEl.style.overflow = "hidden";
          animation = null;
        };
      }
    });
  });
}

function renderJugadorCompeticion(competicion, tipo, modalidad, options = {}) {
  const filas = emptyArray(competicion?.filas);
  const columns = getJugadorStatColumns(tipo, modalidad);
  const totals = buildTotalsForColumns(filas, columns);
  const rowHtml = filas.map((fila) => {
    const statChips = columns.map((column) => {
      const value = column.cell(fila);
      return value !== "" && value !== 0
        ? `<span class="alineacion-chip">${escapeHtml(column.label)} <strong>${escapeHtml(value)}</strong></span>`
        : "";
    }).join("");

    return `
      <article class="partido-detalle-player-history-row partido-detalle-player-history-row-compact">
        <div class="partido-detalle-player-history-main">
          <div class="partido-detalle-player-history-date">${escapeHtml(fila.Fecha || "")}</div>
          <div class="partido-detalle-player-matchup">
            <span class="partido-detalle-player-teamside">${escapeHtml(fila.loc || "")}</span>
            <strong>${escapeHtml(fila.marcador || "-")}</strong>
            <span class="partido-detalle-player-teamside">${escapeHtml(fila.vis || "")}</span>
          </div>
        </div>
        ${statChips ? `<div class="alineacion-chips partido-detalle-player-history-inline-chips">${statChips}</div>` : ""}
      </article>
    `;
  }).join("");

  const compChips = columns.map((column) => {
    const rendered = column.totalRender(totals[column.key], filas);
    return rendered !== "" && rendered !== 0
      ? `<span class="alineacion-chip">${escapeHtml(column.label)} <strong>${escapeHtml(rendered)}</strong></span>`
      : "";
  }).join("");

  return `
    <details class="partido-detalle-player-competition"${options.open ? " open" : ""}>
      <summary class="partido-detalle-player-competition-bar">
        <div class="partido-detalle-player-competition-summary-main">
          <div class="partido-detalle-player-competition-title">${escapeHtml(competicion?.titulo || "Competición")}</div>
          <div class="partido-detalle-player-competition-meta">${escapeHtml(t("detail_matches_count", competicion?.partidos || filas.length))}</div>
        </div>
        <div class="partido-detalle-player-competition-summary-side">
          <div class="alineacion-chips partido-detalle-player-history-chips">${compChips}</div>
          <span class="partido-detalle-player-competition-chevron" aria-hidden="true"></span>
        </div>
      </summary>
      <div class="partido-detalle-player-history-list">
        ${rowHtml || `<div class="partido-detalle-empty small">${escapeHtml(t("detail_no_matches_available"))}</div>`}
      </div>
    </details>
  `;
}

function mergeTruthy(prev, next) {
  if (!prev) return next;
  if (!next) return prev;
  const merged = { ...prev };
  for (const [key, value] of Object.entries(next)) {
    if (Array.isArray(value)) {
      if (value.length) merged[key] = value;
      continue;
    }
    if (value !== undefined && value !== null && value !== "") {
      merged[key] = value;
    }
  }
  return merged;
}

function updatePartido(state, payload) {
  const normalizado = normalizarPartido(payload);
  if (!normalizado) return;
  state.partido = mergeTruthy(state.partido, normalizado);
  state.modalidad = normalizado.modalidad || state.modalidad;
  state.localKey = normalizado.idEquipoLocal || state.localKey;
  state.visitKey = normalizado.idEquipoVisit || state.visitKey;
}

function updateEstadisticaPayload(state, payload) {
  const parsed = parseApiArrayResponse(payload);
  if (!Array.isArray(parsed) || !parsed[0]) return;
  const block = parsed[0];
  if (Array.isArray(block.partido) && block.partido[0]) {
    updatePartido(state, block.partido[0]);
  }
  if (Array.isArray(block.stats)) {
    state.statsResumen = block.stats;
    if (!state.eventos.length) state.eventos = block.stats;
  }
  if (Array.isArray(block.eventos)) {
    state.eventos = block.eventos;
  }
  if (Array.isArray(block.alineaciones) && block.alineaciones.length) {
    state.alineaciones = block.alineaciones[0];
  }
}

function updateEventos(state, payload) {
  const parsed = parseApiArrayResponse(payload);
  state.eventos = Array.isArray(parsed) ? parsed : [];
}

function updatePenaltis(state, payload) {
  const parsed = parseApiArrayResponse(payload);
  state.penaltis = Array.isArray(parsed) ? parsed : [];
}

function updateAlineaciones(state, payload) {
  const parsed = parseApiArrayResponse(payload);
  if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === "object") {
    state.alineaciones = parsed[0];
  } else if (parsed && typeof parsed === "object") {
    state.alineaciones = parsed;
  } else {
    state.alineaciones = null;
  }
}

async function cargarDetallePartido(idPartido) {
  console.log("[SignalR] Esperando disponibilidad de window.hubProxy...");
  const start = Date.now();
  while (!window.hubProxy) {
    if (Date.now() - start > 4000) throw new Error("SignalR hubProxy no disponible");
    await new Promise((res) => setTimeout(res, 50));
  }

  console.log("[SignalR] hubProxy disponible:", window.hubProxy);
  console.log("[SignalR] Esperando conexión activa del hub...");
  await waitForSignalRConnected();
  console.log("[SignalR] Hub conectado:", $.connection.hub);

  const headerEl = document.getElementById("partido-detalle-header-content");
  const bodyEl = document.getElementById("partido-detalle-body");
  const state = createDetalleState(idPartido);
  window.__partidoDetalleId = String(idPartido);
  window.__partidoDetalleState = state;

  setHeaderContent(headerEl, escapeHtml(t("loading")), "init-loading");
  ensureBaseLayout(bodyEl, state);
  renderAll(state, headerEl, bodyEl);

  const partidoRes = await getPartido(idPartido);
  console.log("[API] getPartido", partidoRes);
  const partidoData = parseApiArrayResponse(partidoRes);
  if (Array.isArray(partidoData) && partidoData.length > 0) {
    updatePartido(state, partidoData[0]);
    setHeaderContent(headerEl, renderPartidoHeader(state), "getPartido");
  } else if (partidoRes?.error) {
    setHeaderContent(headerEl, `<div>${escapeHtml(t("error", partidoRes.message || t("detail_match_load_error")))}</div>`, "getPartido-error");
  } else {
    setHeaderContent(headerEl, `<div>${escapeHtml(t("detail_match_no_data"))}</div>`, "getPartido-empty");
  }

  const estadistica = await getEstadisticaPartido(idPartido);
  console.log("[API] getEstadisticaPartido", estadistica);
  updateEstadisticaPayload(state, estadistica);
  renderAll(state, headerEl, bodyEl);

  console.log("[SignalR] Suscribiendo modal al bus global del hub...");
  window.__partidoDetalleUnsub = subscribePartidoHubEvents(({ type, payload, idPartido: incomingId }) => {
    if (!incomingId || String(incomingId) !== String(idPartido)) return;
    console.log(`[SignalR] EVENT modal desde bus: ${type} para partido ${incomingId}`, payload);
    switch (type) {
      case "marcadorPartido":
      case "recibirMarcadorPartido":
      case "cronoPartido":
        updatePartido(state, payload);
        break;
      case "eventosPartido":
      case "recibirEventosIniciales":
        updateEventos(state, payload);
        break;
      case "penaltisPartido":
      case "recibirPenaltisIniciales":
        updatePenaltis(state, payload);
        break;
      case "alineacionPartido":
      case "recibirAlinIniciales":
        updateAlineaciones(state, payload);
        break;
      default:
        return;
    }
    renderAll(state, headerEl, bodyEl);
  });
  console.log("[SignalR] Modal suscrito al bus global del hub.");
  if (window.hubProxy.server.unirseAPartido) {
    try {
      console.log("[SignalR] Llamando a unirseAPartido en el hub:", idPartido);
      const modalidad = state.modalidad || "hp";
      window.hubProxy.server
        .unirseAPartido(idPartido, modalidad)
        .done((eventosActuales) => {
          console.log(`[SignalR] Unido al partido ${idPartido} con modalidad '${modalidad}'. Eventos actuales:`, eventosActuales);
        })
        .fail((err) => {
          console.error("[SignalR] Error al unirse al partido:", err);
        });
    } catch (err) {
      console.error("[SignalR] Error llamando a unirseAPartido:", err);
    }
  } else {
    console.error("[SignalR] Método unirseAPartido no disponible en hubProxy.server.");
  }
}

function renderPartidoHeader(state) {
  const p = state.partido;
  if (!p) return "<div>Error cargando datos de partido</div>";

  const bonusLocal = String(p.puntoBonus || "") === String(p.idEquipoLocal || "") ? "*" : "";
  const bonusVisit = String(p.puntoBonus || "") === String(p.idEquipoVisit || "") ? "*" : "";
  const fechaHora = [formatFecha(p.fecha), formatHora(p.hora)].filter(Boolean).join(" · ");
  const estado = p.estado || "";
  const arbitros = p.arbitros.length
    ? `<div class="partido-detalle-arbitros"><strong>${escapeHtml(t("detail_referees"))}:</strong><br>${p.arbitros.map(escapeHtml).join("<br>")}</div>`
    : "";

  return `
    <div class="partido-detalle-topline">
      <span>${escapeHtml(p.competicion)}${p.jornada ? ` - ${escapeHtml(p.jornada)}` : ""}</span>
      <span>${escapeHtml(fechaHora)}</span>
    </div>
    <div class="partido-detalle-scoreboard">
      <div class="partido-detalle-team partido-detalle-team-local">
        <div class="partido-detalle-team-name">${escapeHtml(p.local)}</div>
        <img class="partido-detalle-team-logo" src="${logoUrl(p.logoLocal)}" alt="${escapeHtml(p.local)}">
      </div>
      <div class="partido-detalle-score-center">
        <div class="partido-detalle-status">${escapeHtml(estado || t("detail_match"))}</div>
        <div class="partido-detalle-score-line">
          <span>${escapeHtml(p.golesLocal)}${bonusLocal}</span>
          <span>-</span>
          <span>${escapeHtml(p.golesVisit)}${bonusVisit}</span>
        </div>
      </div>
      <div class="partido-detalle-team partido-detalle-team-visit">
        <img class="partido-detalle-team-logo" src="${logoUrl(p.logoVisit)}" alt="${escapeHtml(p.visit)}">
        <div class="partido-detalle-team-name">${escapeHtml(p.visit)}</div>
      </div>
    </div>
    <div class="partido-detalle-meta">
      ${arbitros}
      <div class="partido-detalle-pista">${escapeHtml(p.instalacion)}</div>
    </div>
  `;
}

function renderResumen(state) {
  const p = state.partido;
  if (!p) return `<div class="partido-detalle-empty">${escapeHtml(t("detail_summary_title"))}</div>`;

  const resumen = buildStatsSummary(state.statsResumen);
  const rows = [
    { label: t("detail_goals"), local: resumen.golesLocal, visit: resumen.golesVisit },
    { label: t("detail_fouls"), local: resumen.faltasLocal, visit: resumen.faltasVisit },
    { label: t("detail_blue_cards"), local: resumen.azulesLocal, visit: resumen.azulesVisit },
    { label: t("detail_red_cards"), local: resumen.rojasLocal, visit: resumen.rojasVisit },
  ];

  return `
    <div class="partido-detalle-section">
      <div class="partido-detalle-section-title">${escapeHtml(t("detail_summary_title"))}</div>
      <div class="partido-detalle-summary-table-wrap">
        <table class="partido-detalle-summary-table">
          <thead>
            <tr>
              <th></th>
              <th>${escapeHtml(p.localAbrev || "LOC")}</th>
              <th>${escapeHtml(p.visitAbrev || "VIS")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <th scope="row">${escapeHtml(row.label)}</th>
                <td>${escapeHtml(row.local)}</td>
                <td>${escapeHtml(row.visit)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildStatsSummary(stats) {
  const pick = (type, side) => stats.find((s) => s.IdTipoEvento === type && Number(s.LocalVisit) === side)?.Total ?? 0;
  return {
    golesLocal: pick("gol", 1),
    golesVisit: pick("gol", 2),
    faltasLocal: pick("falta", 1) || pick("faltahl", 1),
    faltasVisit: pick("falta", 2) || pick("faltahl", 2),
    azulesLocal: pick("tarjetaazul", 1),
    azulesVisit: pick("tarjetaazul", 2),
    rojasLocal: pick("tarjetaroja", 1),
    rojasVisit: pick("tarjetaroja", 2),
  };
}

function renderPenaltis(state) {
  const penaltis = state.penaltis;
  if (!Array.isArray(penaltis) || !penaltis.length) {
    return `<div class="partido-detalle-empty">${escapeHtml(t("detail_penalty_shots_none"))}</div>`;
  }

  const localId = state.localKey != null ? String(state.localKey) : null;
  const visitId = state.visitKey != null ? String(state.visitKey) : null;
  const local = penaltis.filter((p) => localId && String(p.IdEquipo) === localId);
  const visit = penaltis.filter((p) => visitId && String(p.IdEquipo) === visitId);
  const rest = !localId && !visitId ? penaltis : [];

  return `
    <div class="penaltis-grid">
      ${renderPenaltisColumn(state.partido?.local || t("detail_local"), local.length ? local : rest)}
      ${visit.length ? renderPenaltisColumn(state.partido?.visit || t("detail_visitor"), visit) : ""}
    </div>
  `;
}

function renderPenaltisColumn(title, items) {
  return `
    <section class="partido-detalle-section">
      <div class="partido-detalle-section-title">${escapeHtml(title)}</div>
      <div class="penaltis-column">
        ${items.map((p) => {
          const icon = p.Gol === true ? "✔" : p.Gol === false ? "✘" : "□";
          const cls = p.Gol === true ? "ok" : p.Gol === false ? "bad" : "neutral";
          return `<div class="penalti-row"><span class="penalti-dorsal">${escapeHtml(p.Dorsal ?? "")}</span><span class="penalti-nombre">${escapeHtml(p.NombreApellidos ?? "")}</span><span class="penalti-estado ${cls}">${icon}</span></div>`;
        }).join("")}
      </div>
    </section>
  `;
}
