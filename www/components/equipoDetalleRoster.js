import { t } from "../i18n.js";
import { emptyArray, escapeHtml } from "./partidoDetalleUtils.js";
import { getJugadorFotoUrl } from "./partidoDetalleJugadorStats.js";

const porPartidosYNombre = (a, b) =>
  (b?.partidosJugados || 0) - (a?.partidosJugados || 0) || String(a?.nombre || "").localeCompare(String(b?.nombre || ""), "es");

/**
 * Etiquetas abreviadas para los roles del cuerpo técnico que da `rolCuerpoTecnico`.
 * La API no documenta un enum cerrado: se usa el texto tal cual cuando no hay mapeo.
 */
const STAFF_ROLE_MAP = {
  ENTRENADOR: "ENT",
  "SEGUNDO ENTRENADOR": "ENT2",
  DELEGADO: "DEL",
  AUXILIAR: "AUX",
};

function getStaffRoleLabel(persona) {
  const rol = String(persona?.rolCuerpoTecnico || "").trim().toUpperCase();
  return STAFF_ROLE_MAP[rol] || rol || "TEC";
}

function buildPlayerPayload(persona, role) {
  return {
    role,
    teamType: null,
    source: "team-roster",
    dorsal: null,
    nombre: persona.nombre || "",
    idLicencia: persona.id ?? null,
    licenciaTipo: role === "portero" ? "p" : "j",
    data: persona,
  };
}

function renderChip(label, value) {
  if (value === null || value === undefined || value === "" || value === 0) return "";
  return `<span class="rank-chip">${escapeHtml(label)} <strong>${escapeHtml(value)}</strong></span>`;
}

function renderStatMeta(persona) {
  const pj = `<span class="rank-chip">PJ <strong>${escapeHtml(persona.partidosJugados || 0)}</strong></span>`;
  const resto = persona.esPortero
    ? [renderChip("GC", persona.golesEncajados), renderChip("Par", persona.paradas)]
    : [renderChip("G", persona.goles), renderChip("As", persona.asistencias)];
  return [pj, ...resto].filter(Boolean).join("");
}

function renderRosterItem(persona, role) {
  const payload = buildPlayerPayload(persona, role);
  const canOpen = !!persona.id;
  const roleLabel = role === "tecnico" ? getStaffRoleLabel(persona) : null;
  const fotoUrl = persona.fotoUrl ? getJugadorFotoUrl(persona.fotoUrl) : "";
  const marker = fotoUrl
    ? `<img class="rank-foto" src="${escapeHtml(fotoUrl)}" alt="" loading="lazy" decoding="async">`
    : `<div class="team-roster-item-marker">${escapeHtml(roleLabel || "--")}</div>`;

  const content = `
    <div class="team-roster-item-main">
      ${marker}
      <div class="team-roster-item-info">
        <div class="team-roster-item-name">${escapeHtml(persona.nombre || t("team_detail_roster_unknown_player"))}</div>
        <div class="team-roster-item-meta">${role === "tecnico" ? escapeHtml(roleLabel || "") : renderStatMeta(persona)}</div>
      </div>
      ${canOpen ? `<div class="team-roster-item-action" aria-hidden="true">↗</div>` : ""}
    </div>
  `;

  return `
    <article class="team-roster-item">
      ${canOpen
        ? `<button type="button" class="team-roster-item-button partido-detalle-player-link" data-player='${escapeHtml(JSON.stringify(payload))}'>${content}</button>`
        : content}
    </article>
  `;
}

function renderRosterBlock(title, entries, role) {
  if (!entries.length) return "";
  return `
    <section class="team-detail-section team-roster-block">
      <div class="team-detail-section-head">
        <div class="team-detail-section-title">${escapeHtml(title)}</div>
        <div class="team-roster-block-count">${escapeHtml(entries.length)}</div>
      </div>
      <div class="team-roster-list">
        ${entries.map((entry) => renderRosterItem(entry, role)).join("")}
      </div>
    </section>
  `;
}

/**
 * Renderiza la plantilla de un equipo a partir de `getPlantillaEquipo` (jugadores + cuerpo
 * técnico, con estadísticas de temporada). A diferencia del roster antiguo derivado de
 * alineaciones de partidos, incluye también a quienes aún no han debutado.
 *
 * @param {{jugadores:Array<object>, tecnicos:Array<object>}|null} plantilla Plantilla normalizada.
 * @returns {string} HTML de la vista de plantilla.
 */
export function renderEquipoDetalleRoster(plantilla) {
  const todos = emptyArray(plantilla?.jugadores);
  const jugadores = todos.filter((p) => !p.esPortero).sort(porPartidosYNombre);
  const porteros = todos.filter((p) => p.esPortero).sort(porPartidosYNombre);
  const tecnicos = emptyArray(plantilla?.tecnicos).sort((a, b) => String(a?.nombre || "").localeCompare(String(b?.nombre || ""), "es"));

  if (!jugadores.length && !porteros.length && !tecnicos.length) {
    return `
      <section class="team-detail-section">
        <div class="team-detail-section-title">${escapeHtml(t("team_detail_tab_roster"))}</div>
        <div class="team-detail-empty">${escapeHtml(t("team_detail_roster_empty"))}</div>
      </section>
    `;
  }

  return `
    <div class="team-roster-view">
      ${renderRosterBlock(t("detail_players"), jugadores, "jugador")}
      ${renderRosterBlock(t("detail_goalkeepers"), porteros, "portero")}
      ${renderRosterBlock(t("detail_staff"), tecnicos, "tecnico")}
    </div>
  `;
}

export default {
  renderEquipoDetalleRoster,
};
