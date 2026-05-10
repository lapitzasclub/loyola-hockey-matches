import { t } from "../i18n.js";
import { escapeHtml, logoUrl, normText } from "./partidoDetalleUtils.js";

function renderEventoIcon(ev, golesLocal, golesVisit, faltasLocal, faltasVisit) {
  switch (ev.IdTipoEvento) {
    case "gol":
      return `<div class="evento-icon-score">${golesLocal}-${golesVisit}</div>`;
    case "falta":
      return `<div class="evento-icon-score evento-icon-score-falta">${Number(ev.LocalVisit) === 1 ? faltasLocal : faltasVisit}</div>`;
    case "penalti":
    case "faltadirecta":
    case "falta-hl":
      return '<div class="evento-icon-whistle">•</div>';
    case "tm":
      return '<div class="evento-icon-generic">TM</div>';
    default:
      return `<div class="evento-icon-generic">${escapeHtml((ev.IdTipoEvento || "EV").slice(0, 3).toUpperCase())}</div>`;
  }
}

function buildEventPlayerPayload(ev, slot = 1) {
  const dorsal = normText(slot === 1 ? ev.Dorsal1 : ev.Dorsal2);
  const nombre = normText(slot === 1 ? ev.Lic1 : ev.Lic2);
  if (!dorsal && !nombre) return null;
  return {
    role: "evento",
    teamType: Number(ev.LocalVisit) === 1 ? "local" : Number(ev.LocalVisit) === 2 ? "visitante" : null,
    dorsal: dorsal || null,
    nombre,
    eventSlot: slot,
    data: ev,
  };
}

function renderPlayerRef(prefix, payload) {
  if (!payload) return "";
  return `${prefix}<button type="button" class="partido-detalle-player-link" data-player='${escapeHtml(JSON.stringify(payload))}'>#${escapeHtml(payload.dorsal || "")} ${escapeHtml(payload.nombre || "")}</button>`;
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
        <div class="evento-title evento-title-goal">GOL${dorsal1 ? `: ${renderPlayerRef("", buildEventPlayerPayload(ev, 1))}` : ""}</div>
        ${dorsal2 ? `<div class="evento-subtitle">${renderPlayerRef("Asiste: ", buildEventPlayerPayload(ev, 2))}</div>` : ""}
      `;
    case "falta":
      return `
        <div class="evento-title evento-title-fault">FALTA${dorsal1 ? `: ${renderPlayerRef("", buildEventPlayerPayload(ev, 1))}` : ""}</div>
        ${dorsal2 ? `<div class="evento-subtitle">${renderPlayerRef("Recibe: ", buildEventPlayerPayload(ev, 2))}</div>` : ""}
      `;
    case "penalti":
      return `<div class="evento-title evento-title-fault">PENALTI${dorsal1 ? ` · ${renderPlayerRef("", buildEventPlayerPayload(ev, 1))}` : ""}</div>${codigo ? `<div class="evento-subtitle">${escapeHtml(codigo)}</div>` : ""}`;
    case "faltadirecta":
      return `<div class="evento-title evento-title-fault">FALTA DIRECTA${dorsal1 ? ` · ${renderPlayerRef("", buildEventPlayerPayload(ev, 1))}` : ""}</div>${codigo ? `<div class="evento-subtitle">${escapeHtml(codigo)}</div>` : ""}`;
    case "falta-hl":
      return `<div class="evento-title evento-title-fault">FALTA${dorsal1 ? ` · ${renderPlayerRef("", buildEventPlayerPayload(ev, 1))}` : ""}</div>${codigo || mins ? `<div class="evento-subtitle">${escapeHtml([codigo, mins ? `${mins} min.` : ""].filter(Boolean).join(" · "))}</div>` : ""}`;
    case "tm":
      return '<div class="evento-title">TIEMPO MUERTO</div>';
    default:
      return `<div class="evento-title">${escapeHtml(ev.Descripcion || ev.IdTipoEvento || "Evento")}</div>`;
  }
}

export function renderEventos(state) {
  if (!Array.isArray(state.eventos) || !state.eventos.length) {
    return `<div class="partido-detalle-empty">${escapeHtml(t("detail_no_events"))}</div>`;
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

  return `<div class="partido-detalle-section"><div class="partido-detalle-section-title">${escapeHtml(t("detail_events_title"))}</div><div class="eventos-board">${rows}</div></div>`;
}
