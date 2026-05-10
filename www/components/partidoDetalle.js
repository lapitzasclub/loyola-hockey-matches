import { t } from "../i18n.js";
import {
  callPartidoHubServerMethod,
  getEstadisticaPartido,
  getPartido,
  subscribePartidoHubEvents,
} from "../services.js";
import { renderAlineaciones } from "./partidoDetalleAlineaciones.js";
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
  normText,
  normalizarPartido,
  parseApiArrayResponse,
  popView,
  setCurrentTab,
  setCurrentView,
} from "./partidoDetalleUtils.js";

function setHeaderContent(headerEl, html, reason = "") {
  headerEl.innerHTML = html;
  console.log("[Detalle] Header actualizado", {
    reason,
    html,
    text: headerEl.textContent,
  });
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
  requestAnimationFrame(() => modal.classList.add("is-open"));
  document.body.classList.add("modal-abierto");
  modal.querySelector(".partido-detalle-close").onclick = () => closePartidoDetalle();
  modal.querySelector(".partido-detalle-back").onclick = () => {
    const state = window.__partidoDetalleState;
    if (!getViewStack(state).length) return;
    setCurrentView(state, popView(state) || "partido");
    const headerEl = document.getElementById("partido-detalle-header-content");
    const bodyEl = document.getElementById("partido-detalle-body");
    renderAll(state, headerEl, bodyEl);
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
    setHeaderContent(headerEl, renderPartidoHeader(state), "renderAll");
  }
  if (getCurrentView(state) !== "partido") {
    bodyEl.innerHTML = `
      <div class="partido-detalle-subview-placeholder">
        <div class="partido-detalle-empty">${escapeHtml(t("detail_loading_view"))}</div>
      </div>
    `;
    return;
  }
  if (!bodyEl.querySelector("#tab-resumen")) {
    ensureBaseLayout(bodyEl, state);
  }
  bodyEl.querySelector("#tab-resumen").innerHTML = renderResumen(state);
  bodyEl.querySelector("#tab-alineaciones").innerHTML = renderAlineaciones(state);
  bodyEl.querySelector("#tab-eventos").innerHTML = renderEventos(state);
  bodyEl.querySelector("#tab-penaltis").innerHTML = renderPenaltis(state);
  updateTabVisibility(bodyEl, getCurrentTab(state));
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

function renderEventos(state) {
  if (!Array.isArray(state.eventos) || !state.eventos.length) {
    return '<div class="partido-detalle-empty">No hay eventos disponibles.</div>';
  }

  let golesLocal = 0;
  let golesVisit = 0;
  let faltasLocal = 0;
  let faltasVisit = 0;

  const rows = state.eventos.map((ev) => {
    if (ev.IdTipoEvento === "gol") {
      if (Number(ev.LocalVisit) === 1) golesLocal += 1;
      if (Number(ev.LocalVisit) === 2) golesVisit += 1;
    }
    if (ev.IdTipoEvento === "falta") {
      if (Number(ev.LocalVisit) === 1) faltasLocal += 1;
      if (Number(ev.LocalVisit) === 2) faltasVisit += 1;
    }

    const period = escapeHtml(ev.CodPeriodo || "");
    const crono = escapeHtml(ev.Crono || "");
    const logo = logoUrl(ev.IdEntidadEquipo || "sinescudo", 36);
    const eq = escapeHtml(ev.Eq || "");
    const icon = renderEventoIcon(ev, golesLocal, golesVisit, faltasLocal, faltasVisit);
    const text = renderEventoTexto(ev);

    return `
      <div class="evento-row">
        <div class="evento-time"><span>${period}</span><span>${crono}</span></div>
        <div class="evento-icon">${icon}</div>
        <div class="evento-team"><img src="${logo}" alt="${eq}"><span>${eq}</span></div>
        <div class="evento-text">${text}</div>
      </div>
    `;
  }).reverse().join("");

  return `<div class="partido-detalle-section"><div class="partido-detalle-section-title">Eventos del partido</div><div class="eventos-board">${rows}</div></div>`;
}

function renderEventoIcon(ev, golesLocal, golesVisit, faltasLocal, faltasVisit) {
  switch (ev.IdTipoEvento) {
    case "gol":
      return `<div class="evento-icon-score">${golesLocal}-${golesVisit}</div>`;
    case "falta":
      return `<div class="evento-icon-score evento-icon-score-falta">${Number(ev.LocalVisit) === 1 ? faltasLocal : faltasVisit}</div>`;
    case "penalti":
    case "faltadirecta":
    case "falta-hl":
      return "<div class=\"evento-icon-whistle\">•</div>";
    case "tm":
      return "<div class=\"evento-icon-generic\">TM</div>";
    default:
      return `<div class="evento-icon-generic">${escapeHtml((ev.IdTipoEvento || "EV").slice(0, 3).toUpperCase())}</div>`;
  }
}

function renderEventoTexto(ev) {
  const dorsal1 = normText(ev.Dorsal1);
  const dorsal2 = normText(ev.Dorsal2);
  const lic1 = normText(ev.Lic1);
  const lic2 = normText(ev.Lic2);
  const codigo = normText(ev.Codigo);
  const mins = normText(ev.MinSancion);

  switch (ev.IdTipoEvento) {
    case "gol":
      return `
        <div class="evento-title evento-title-goal">GOL${dorsal1 ? `: #${escapeHtml(dorsal1)} ${escapeHtml(lic1)}` : ""}</div>
        ${dorsal2 ? `<div class="evento-subtitle">Asiste: #${escapeHtml(dorsal2)} ${escapeHtml(lic2)}</div>` : ""}
      `;
    case "falta":
      return `
        <div class="evento-title evento-title-fault">FALTA${dorsal1 ? `: #${escapeHtml(dorsal1)} ${escapeHtml(lic1)}` : ""}</div>
        ${dorsal2 ? `<div class="evento-subtitle">Recibe: #${escapeHtml(dorsal2)} ${escapeHtml(lic2)}</div>` : ""}
      `;
    case "penalti":
      return `<div class="evento-title evento-title-fault">PENALTI${dorsal1 ? ` · #${escapeHtml(dorsal1)} ${escapeHtml(lic1)}` : ""}</div>${codigo ? `<div class="evento-subtitle">${escapeHtml(codigo)}</div>` : ""}`;
    case "faltadirecta":
      return `<div class="evento-title evento-title-fault">FALTA DIRECTA${dorsal1 ? ` · #${escapeHtml(dorsal1)} ${escapeHtml(lic1)}` : ""}</div>${codigo ? `<div class="evento-subtitle">${escapeHtml(codigo)}</div>` : ""}`;
    case "falta-hl":
      return `<div class="evento-title evento-title-fault">FALTA${dorsal1 ? ` · #${escapeHtml(dorsal1)} ${escapeHtml(lic1)}` : ""}</div>${codigo || mins ? `<div class="evento-subtitle">${escapeHtml([codigo, mins ? `${mins} min.` : ""].filter(Boolean).join(" · "))}</div>` : ""}`;
    case "tm":
      return `<div class="evento-title">TIEMPO MUERTO</div>`;
    default:
      return `<div class="evento-title">${escapeHtml(ev.Descripcion || ev.IdTipoEvento || "Evento")}</div>`;
  }
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
