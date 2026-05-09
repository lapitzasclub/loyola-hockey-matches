import {
  callPartidoHubServerMethod,
  getEstadisticaPartido,
  getPartido,
  subscribePartidoHubEvents,
} from "../services.js";

function parseApiArrayResponse(raw) {
  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.d !== undefined) {
        return typeof parsed.d === "string" ? JSON.parse(parsed.d) : parsed.d;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  if (raw?.d !== undefined) {
    try {
      return typeof raw.d === "string" ? JSON.parse(raw.d) : raw.d;
    } catch {
      return null;
    }
  }

  return raw;
}

function setHeaderContent(headerEl, html, reason = "") {
  headerEl.innerHTML = html;
  console.log("[Detalle] Header actualizado", {
    reason,
    html,
    text: headerEl.textContent,
  });
}

function emptyArray(value) {
  return Array.isArray(value) ? value : [];
}

function normText(value) {
  return value == null ? "" : String(value).trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function logoUrl(id, size = 200) {
  const key = normText(id) || "sinescudo";
  return `https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/${size}x${size}/${key}.png`;
}

function formatFecha(fecha) {
  if (!fecha) return "";
  const text = String(fecha);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }
  return text;
}

function formatHora(hora) {
  if (!hora) return "";
  const text = String(hora);
  return text.length >= 5 ? text.slice(0, 5) : text;
}

function normalizarPartido(input) {
  const p = Array.isArray(input) ? input[0] : input;
  if (!p || typeof p !== "object") return null;
  return {
    raw: p,
    modalidad: p.IdModalidadComp || "hp",
    competicion: p.DenoComp || "",
    jornada: p.NombreJornada || "",
    fecha: p.Fecha || "",
    hora: p.Hora || "",
    instalacion: p.Instalacion || "",
    estado: p.Periodo || p.Estado || "",
    crono: p.Crono || "",
    local: p.Eq1 || p.Local || "Equipo local",
    visit: p.Eq2 || p.Visit || "Equipo visitante",
    localAbrev: p.LocalAbrev || "",
    visitAbrev: p.VisitAbrev || "",
    golesLocal: p.GolesLocal ?? "-",
    golesVisit: p.GolesVisit ?? "-",
    arbitros: [p.Arb1, p.Arb2].filter(Boolean),
    logoLocal: p.IdEntidadEq1 || p.IdEnt1 || p.IdEq1 || p.IdEquipoLocal || "sinescudo",
    logoVisit: p.IdEntidadEq2 || p.IdEnt2 || p.IdEq2 || p.IdEquipoVisit || "sinescudo",
    idEquipoLocal: p.IdEq1 || p.IdEquipoLocal || null,
    idEquipoVisit: p.IdEq2 || p.IdEquipoVisit || null,
    puntoBonus: p.PuntoBonus,
  };
}

function createDetalleState(idPartido) {
  return {
    idPartido: String(idPartido),
    partido: null,
    modalidad: "hp",
    eventos: [],
    alineaciones: null,
    penaltis: [],
    statsResumen: [],
    localKey: null,
    visitKey: null,
    currentView: "partido",
    currentTab: "resumen",
    viewStack: [],
  };
}

export function openPartidoDetalle(idPartido) {
  closePartidoDetalle();
  const modal = document.createElement("div");
  modal.className = "partido-detalle-modal";
  modal.innerHTML = `
    <div class="partido-detalle-shell">
      <div class="partido-detalle-grabber"></div>
      <div class="partido-detalle-header">
        <button class="partido-detalle-back" aria-label="Volver" hidden>←</button>
        <div class="partido-detalle-header-content" id="partido-detalle-header-content"></div>
        <button class="partido-detalle-close" aria-label="Cerrar">&times;</button>
      </div>
      <div class="partido-detalle-body" id="partido-detalle-body"></div>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.classList.add("modal-abierto");
  modal.querySelector(".partido-detalle-close").onclick = closePartidoDetalle;
  modal.querySelector(".partido-detalle-back").onclick = () => {
    const state = window.__partidoDetalleState;
    if (!state?.viewStack?.length) return;
    state.currentView = state.viewStack.pop() || "partido";
    const headerEl = document.getElementById("partido-detalle-header-content");
    const bodyEl = document.getElementById("partido-detalle-body");
    renderAll(state, headerEl, bodyEl);
  };
  cargarDetallePartido(idPartido);
}

export function closePartidoDetalle() {
  const modal = document.querySelector(".partido-detalle-modal");
  if (modal) {
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
  }
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
    <div class="partido-detalle-view-header">
      <div>
        <div class="partido-detalle-view-kicker">Detalle</div>
        <div class="partido-detalle-view-title">Partido</div>
      </div>
    </div>
    <div class="partido-detalle-tabs" role="tablist" aria-label="Secciones del partido">
      <button class="tab-btn" data-tab="resumen">Resumen</button>
      <button class="tab-btn" data-tab="alineaciones">Alineaciones</button>
      <button class="tab-btn" data-tab="eventos">Eventos</button>
      <button class="tab-btn" data-tab="penaltis">Penaltis</button>
    </div>
    <section class="tab-content" id="tab-resumen"></section>
    <section class="tab-content" id="tab-alineaciones" hidden></section>
    <section class="tab-content" id="tab-eventos" hidden></section>
    <section class="tab-content" id="tab-penaltis" hidden></section>
  `;

  bodyEl.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.onclick = () => {
      state.currentTab = btn.dataset.tab;
      updateTabVisibility(bodyEl, state.currentTab);
    };
  });

  updateTabVisibility(bodyEl, state.currentTab || "resumen");
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
  backBtn.hidden = !state.viewStack.length;
}

function renderAll(state, headerEl, bodyEl) {
  const modal = bodyEl.closest(".partido-detalle-modal");
  updateChrome(state, modal);
  if (state.partido) {
    setHeaderContent(headerEl, renderPartidoHeader(state), "renderAll");
  }
  if (state.currentView !== "partido") {
    bodyEl.innerHTML = `
      <div class="partido-detalle-subview-placeholder">
        <div class="partido-detalle-empty">Vista en preparación.</div>
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
  updateTabVisibility(bodyEl, state.currentTab || "resumen");
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

  setHeaderContent(headerEl, "Cargando...", "init-loading");
  ensureBaseLayout(bodyEl, state);
  renderAll(state, headerEl, bodyEl);

  const partidoRes = await getPartido(idPartido);
  console.log("[API] getPartido", partidoRes);
  const partidoData = parseApiArrayResponse(partidoRes);
  if (Array.isArray(partidoData) && partidoData.length > 0) {
    updatePartido(state, partidoData[0]);
    setHeaderContent(headerEl, renderPartidoHeader(state), "getPartido");
  } else if (partidoRes?.error) {
    setHeaderContent(headerEl, `<div>Error: ${partidoRes.message || "No se pudo cargar el partido"}</div>`, "getPartido-error");
  } else {
    setHeaderContent(headerEl, "<div>No se encontraron datos del partido</div>", "getPartido-empty");
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
    ? `<div class="partido-detalle-arbitros"><strong>Árbitros:</strong><br>${p.arbitros.map(escapeHtml).join("<br>")}</div>`
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
        <div class="partido-detalle-status">${escapeHtml(estado || "PARTIDO")}</div>
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
  if (!p) return '<div class="partido-detalle-empty">Sin resumen disponible.</div>';

  const resumen = buildStatsSummary(state.statsResumen);
  return `
    <div class="partido-detalle-section">
      <div class="partido-detalle-section-title">Resumen del partido</div>
      <div class="partido-detalle-summary-grid">
        ${renderSummaryCell(p.localAbrev || "LOC", resumen.golesLocal, "Goles")}
        ${renderSummaryCell(p.visitAbrev || "VIS", resumen.golesVisit, "Goles")}
        ${renderSummaryCell(p.localAbrev || "LOC", resumen.faltasLocal, "Faltas")}
        ${renderSummaryCell(p.visitAbrev || "VIS", resumen.faltasVisit, "Faltas")}
        ${renderSummaryCell(p.localAbrev || "LOC", resumen.azulesLocal, "Azules")}
        ${renderSummaryCell(p.visitAbrev || "VIS", resumen.azulesVisit, "Azules")}
        ${renderSummaryCell(p.localAbrev || "LOC", resumen.rojasLocal, "Rojas")}
        ${renderSummaryCell(p.visitAbrev || "VIS", resumen.rojasVisit, "Rojas")}
      </div>
    </div>
  `;
}

function renderSummaryCell(team, value, label) {
  return `
    <div class="partido-detalle-summary-cell">
      <div class="partido-detalle-summary-team">${escapeHtml(team)}</div>
      <div class="partido-detalle-summary-value">${escapeHtml(value)}</div>
      <div class="partido-detalle-summary-label">${escapeHtml(label)}</div>
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

function renderAlineaciones(state) {
  const alin = state.alineaciones;
  if (!alin) {
    return '<div class="partido-detalle-empty">No hay alineaciones disponibles.</div>';
  }

  const local = renderAlineacionEquipo(
    state.partido?.local || "Equipo local",
    emptyArray(alin.JugLocal),
    emptyArray(alin.PortLocal),
    emptyArray(alin.TecnLocal),
    state.modalidad,
  );
  const visit = renderAlineacionEquipo(
    state.partido?.visit || "Equipo visitante",
    emptyArray(alin.JugVisit),
    emptyArray(alin.PortVisit),
    emptyArray(alin.TecnVisit),
    state.modalidad,
  );

  return `<div class="alineaciones-grid">${local}${visit}</div>`;
}

function renderAlineacionEquipo(nombre, jugadores, porteros, tecnicos, modalidad) {
  return `
    <section class="partido-detalle-section alineacion-card">
      <div class="alineacion-team-title">${escapeHtml(nombre)}</div>
      ${renderJugadoresTable(jugadores, modalidad)}
      ${renderPorterosTable(porteros, modalidad)}
      ${renderTecnicosTable(tecnicos, modalidad)}
    </section>
  `;
}

function renderJugadoresTable(jugadores, modalidad) {
  if (!jugadores.length) return '<div class="partido-detalle-empty small">Sin jugadores.</div>';
  const isHp = modalidad !== "hl";
  const head = isHp
    ? "<tr><th>Nº</th><th>5i</th><th>Nombre</th><th>G</th><th>As</th><th>Pe</th><th>FD</th><th>F-></th><th>F<-</th><th>Az</th><th>Rj</th><th>Min.</th></tr>"
    : "<tr><th>Nº</th><th>Pos</th><th>6i</th><th>Nombre</th><th>G</th><th>As</th><th>F-></th><th>F<-</th><th>Min.</th></tr>";

  const rows = jugadores.map((j) => {
    const inicial = j.Inicial ? "●" : "";
    const cap = j.Capitan ? " (C)" : "";
    if (isHp) {
      const pe = j.TirosPenalti ? `${j.GolPenalti || 0}/${j.TirosPenalti}` : "";
      const fd = j.TirosFD ? `${j.GolFD || 0}/${j.TirosFD}` : "";
      return `<tr><td>${escapeHtml(j.Dorsal)}</td><td>${escapeHtml(inicial)}</td><td>${escapeHtml((j.ApellidosNombre || "") + cap)}</td><td>${escapeHtml(j.Goles ?? "")}</td><td>${escapeHtml(j.Asist ?? "")}</td><td>${escapeHtml(pe)}</td><td>${escapeHtml(fd)}</td><td>${escapeHtml(j.FaltaReal ?? "")}</td><td>${escapeHtml(j.FaltaRec ?? "")}</td><td>${escapeHtml(j.Azules ?? "")}</td><td>${escapeHtml(j.Rojas ?? "")}</td><td>${escapeHtml(j.Minutos || "")}</td></tr>`;
    }
    const pos = `${j.Capitan ? "C" : ""}${j.AsistCap ? "A" : ""}`;
    return `<tr><td>${escapeHtml(j.Dorsal)}</td><td>${escapeHtml(pos)}</td><td>${escapeHtml(inicial)}</td><td>${escapeHtml(j.ApellidosNombre ?? "")}</td><td>${escapeHtml(j.Goles ?? "")}</td><td>${escapeHtml(j.Asist ?? "")}</td><td>${escapeHtml(j.FaltaReal ?? "")}</td><td>${escapeHtml(j.FaltaRec ?? "")}</td><td>${escapeHtml(j.Minutos || "")}</td></tr>`;
  }).join("");

  return `<div class="table-wrap"><table class="detalle-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
}

function renderPorterosTable(porteros, modalidad) {
  if (!porteros.length) return "";
  const isHp = modalidad !== "hl";
  const head = isHp
    ? "<tr><th colspan='3'>Porteros/as</th><th>G</th><th>Tir</th><th>%</th><th>F-></th><th>F<-</th><th>Az</th><th>Rj</th><th>Min.</th></tr>"
    : "<tr><th colspan='3'>Porteros/as</th><th>G</th><th>Tir</th><th>%</th><th>F-></th><th>F<-</th><th>Min.</th></tr>";

  const rows = porteros.map((p) => {
    const goles = Number(p.Goles || 0);
    const paradasBase = Number(p.Paradas || 0);
    const tiros = paradasBase + goles;
    const pct = tiros ? `${((1 - goles / tiros) * 100).toFixed(2)}%` : "";
    const inicial = p.Inicial ? "●" : "";
    const cap = p.Capitan ? " (C)" : "";
    if (isHp) {
      return `<tr><td>${escapeHtml(p.Dorsal)}</td><td>${escapeHtml(inicial)}</td><td>${escapeHtml((p.ApellidosNombre || "") + cap)}</td><td>${escapeHtml(goles || "")}</td><td>${escapeHtml(tiros || "")}</td><td>${escapeHtml(pct)}</td><td>${escapeHtml(p.FaltaReal ?? "")}</td><td>${escapeHtml(p.FaltaRec ?? "")}</td><td>${escapeHtml(p.Azules ?? "")}</td><td>${escapeHtml(p.Rojas ?? "")}</td><td>${escapeHtml(p.Minutos || "")}</td></tr>`;
    }
    return `<tr><td>${escapeHtml(p.Dorsal)}</td><td>${escapeHtml(inicial)}</td><td>${escapeHtml(p.ApellidosNombre ?? "")}</td><td>${escapeHtml(goles || "")}</td><td>${escapeHtml(tiros || "")}</td><td>${escapeHtml(pct)}</td><td>${escapeHtml(p.FaltaReal ?? "")}</td><td>${escapeHtml(p.FaltaRec ?? "")}</td><td>${escapeHtml(p.Minutos || "")}</td></tr>`;
  }).join("");

  return `<div class="table-wrap"><table class="detalle-table detalle-table-sub"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
}

function renderTecnicosTable(tecnicos, modalidad) {
  if (!tecnicos.length) return "";
  const isHp = modalidad !== "hl";
  const head = isHp
    ? "<tr><th colspan='2'>Cuerpo técnico</th><th>Az</th><th>Rj</th></tr>"
    : "<tr><th colspan='2'>Cuerpo técnico</th></tr>";

  const rows = tecnicos.map((t) => {
    const posMap = { 3: "ENT", 4: "ENT2", 5: "DEL", 6: "AUX" };
    const pos = posMap[t.IdPosicion] || t.IdPosicion || "TEC";
    if (isHp) {
      return `<tr><td><span class="staff-badge">${escapeHtml(pos)}</span></td><td>${escapeHtml(t.ApellidosNombre ?? "")}</td><td>${escapeHtml(t.Azules ?? "")}</td><td>${escapeHtml(t.Rojas ?? "")}</td></tr>`;
    }
    return `<tr><td><span class="staff-badge">${escapeHtml(pos)}</span></td><td>${escapeHtml(t.ApellidosNombre ?? "")}</td></tr>`;
  }).join("");

  return `<div class="table-wrap"><table class="detalle-table detalle-table-sub"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
}

function renderPenaltis(state) {
  const penaltis = state.penaltis;
  if (!Array.isArray(penaltis) || !penaltis.length) {
    return '<div class="partido-detalle-empty">No hay lanzamientos de penalti.</div>';
  }

  const localId = state.localKey != null ? String(state.localKey) : null;
  const visitId = state.visitKey != null ? String(state.visitKey) : null;
  const local = penaltis.filter((p) => localId && String(p.IdEquipo) === localId);
  const visit = penaltis.filter((p) => visitId && String(p.IdEquipo) === visitId);
  const rest = !localId && !visitId ? penaltis : [];

  return `
    <div class="penaltis-grid">
      ${renderPenaltisColumn(state.partido?.local || "Local", local.length ? local : rest)}
      ${visit.length ? renderPenaltisColumn(state.partido?.visit || "Visitante", visit) : ""}
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
