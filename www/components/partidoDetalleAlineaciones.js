import { t } from "../i18n.js";
import { emptyArray, escapeHtml } from "./partidoDetalleUtils.js";

function getJugadorPayload(persona, teamType, role) {
  return {
    role,
    teamType,
    dorsal: persona?.Dorsal ?? null,
    nombre: persona?.ApellidosNombre || persona?.NombreApellidos || "",
    data: persona,
  };
}

function renderAlineacionItem({ marker, name, tags = "", chips = "", emptyText = t("detail_no_highlights"), extraClass = "", playerPayload = null }) {
  return `
    <article class="alineacion-item ${extraClass}">
      <div class="alineacion-item-main">
        <div class="alineacion-dorsal">${marker}</div>
        <div class="alineacion-info">
          <div class="alineacion-name-row">
            <div class="alineacion-name">${playerPayload ? `<button type="button" class="partido-detalle-player-link" data-player='${escapeHtml(JSON.stringify(playerPayload))}'>${escapeHtml(name ?? "")}</button>` : escapeHtml(name ?? "")}</div>
            ${tags ? `<div class="alineacion-tags">${tags}</div>` : ""}
          </div>
          ${chips ? `<div class="alineacion-chips">${chips}</div>` : `<div class="alineacion-muted">${escapeHtml(emptyText)}</div>`}
        </div>
      </div>
    </article>
  `;
}

function renderTagList(tags) {
  return tags
    .filter(Boolean)
    .map((tag) => `<span class="alineacion-tag">${escapeHtml(tag)}</span>`)
    .join("");
}

function renderStatChip(label, value, variant = "") {
  if (value === undefined || value === null || value === "" || value === 0 || value === "0/0") return "";
  return `<span class="alineacion-chip ${variant}">${escapeHtml(label)} <strong>${escapeHtml(value)}</strong></span>`;
}

function renderJugadoresCards(jugadores, modalidad, teamType) {
  if (!jugadores.length) return `<div class="partido-detalle-empty small">${escapeHtml(t("detail_players"))}: 0</div>`;
  const isHp = modalidad !== "hl";
  const items = jugadores.map((j) => {
    const tags = renderTagList([
      j.Inicial ? t("detail_starter") : "",
      j.Capitan ? t("detail_captain") : "",
      j.AsistCap ? t("detail_assistant_captain") : "",
    ]);
    const pe = j.TirosPenalti ? `${j.GolPenalti || 0}/${j.TirosPenalti}` : "";
    const fd = j.TirosFD ? `${j.GolFD || 0}/${j.TirosFD}` : "";
    const chips = [
      renderStatChip("G", j.Goles),
      renderStatChip("As", j.Asist),
      isHp ? renderStatChip("Pe", pe) : "",
      isHp ? renderStatChip("FD", fd) : "",
      renderStatChip("F+", j.FaltaReal),
      renderStatChip("F-", j.FaltaRec),
      isHp ? renderStatChip("Az", j.Azules) : "",
      isHp ? renderStatChip("Rj", j.Rojas) : "",
      renderStatChip("Min", j.Minutos),
    ].filter(Boolean).join("");

    return renderAlineacionItem({
      marker: escapeHtml(j.Dorsal ?? "--"),
      name: j.ApellidosNombre,
      tags,
      chips,
      playerPayload: getJugadorPayload(j, teamType, "jugador"),
    });
  }).join("");

  return `<div class="alineacion-block"><div class="alineacion-block-title">${escapeHtml(t("detail_players"))}</div><div class="alineacion-list">${items}</div></div>`;
}

function renderPorterosCards(porteros, modalidad, teamType) {
  if (!porteros.length) return "";
  const isHp = modalidad !== "hl";
  const items = porteros.map((p) => {
    const goles = Number(p.Goles || 0);
    const paradasBase = Number(p.Paradas || 0);
    const tiros = paradasBase + goles;
    const pct = tiros ? `${((1 - goles / tiros) * 100).toFixed(2)}%` : "";
    const tags = renderTagList([
      p.Inicial ? t("detail_starter") : "",
      p.Capitan ? t("detail_captain") : "",
    ]);
    const chips = [
      renderStatChip("GC", goles),
      renderStatChip("Tir", tiros),
      renderStatChip("%", pct),
      renderStatChip("F+", p.FaltaReal),
      renderStatChip("F-", p.FaltaRec),
      isHp ? renderStatChip("Az", p.Azules) : "",
      isHp ? renderStatChip("Rj", p.Rojas) : "",
      renderStatChip("Min", p.Minutos),
    ].filter(Boolean).join("");

    return renderAlineacionItem({
      marker: escapeHtml(p.Dorsal ?? "--"),
      name: p.ApellidosNombre,
      tags,
      chips,
      extraClass: "alineacion-item-goalie",
      playerPayload: getJugadorPayload(p, teamType, "portero"),
    });
  }).join("");

  return `<div class="alineacion-block"><div class="alineacion-block-title">${escapeHtml(t("detail_goalkeepers"))}</div><div class="alineacion-list">${items}</div></div>`;
}

function renderTecnicosCards(tecnicos, modalidad, teamType) {
  if (!tecnicos.length) return "";
  const isHp = modalidad !== "hl";
  const items = tecnicos.map((tecnico) => {
    const posMap = { 3: "ENT", 4: "ENT2", 5: "DEL", 6: "AUX" };
    const pos = posMap[tecnico.IdPosicion] || tecnico.IdPosicion || "TEC";
    const chips = [
      isHp ? renderStatChip("Az", tecnico.Azules) : "",
      isHp ? renderStatChip("Rj", tecnico.Rojas) : "",
      renderStatChip("Min", tecnico.Minutos),
    ].filter(Boolean).join("");
    return renderAlineacionItem({
      marker: `<span class="alineacion-dorsal-role">${escapeHtml(pos)}</span>`,
      name: tecnico.ApellidosNombre,
      chips,
      emptyText: t("detail_no_incidents"),
      extraClass: "alineacion-item-staff",
      playerPayload: getJugadorPayload(tecnico, teamType, "tecnico"),
    });
  }).join("");

  return `<div class="alineacion-block"><div class="alineacion-block-title">${escapeHtml(t("detail_staff"))}</div><div class="alineacion-list">${items}</div></div>`;
}

function renderAlineacionEquipo(nombre, jugadores, porteros, tecnicos, modalidad, teamType) {
  return `
    <section class="partido-detalle-section alineacion-card">
      <div class="alineacion-team-title">${escapeHtml(nombre)}</div>
      ${renderJugadoresCards(jugadores, modalidad, teamType)}
      ${renderPorterosCards(porteros, modalidad, teamType)}
      ${renderTecnicosCards(tecnicos, modalidad, teamType)}
    </section>
  `;
}

export function renderAlineaciones(state) {
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
    "local",
  );
  const visit = renderAlineacionEquipo(
    state.partido?.visit || "Equipo visitante",
    emptyArray(alin.JugVisit),
    emptyArray(alin.PortVisit),
    emptyArray(alin.TecnVisit),
    state.modalidad,
    "visitante",
  );

  return `<div class="alineaciones-grid">${local}${visit}</div>`;
}
