import { t } from "../i18n.js";
import { emptyArray, escapeHtml, normalizarEquipoClasificacion } from "./partidoDetalleUtils.js";

function getTeamSideForMatch(partido, equipo) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized || !partido) return null;
  const ids = new Set([normalized.idEquipo, normalized.idEquipoComp].filter(Boolean).map(String));
  const isLocal = ids.has(String(partido?.IdEquipoLocal || ""));
  const isVisit = ids.has(String(partido?.IdEquipoVisit || ""));
  if (isLocal) return "local";
  if (isVisit) return "visitante";
  return null;
}

function getBucketKey(persona, role) {
  const licencia = String(persona?.IdLicencia || "").trim();
  if (licencia) return `${role}:lic:${licencia}`;

  const dorsal = String(persona?.Dorsal || "").trim();
  const nombre = String(persona?.ApellidosNombre || persona?.NombreApellidos || "").trim().toLowerCase();
  return `${role}:fallback:${dorsal}:${nombre}`;
}

function getStaffRoleLabel(entry) {
  const posMap = { 3: "ENT", 4: "ENT2", 5: "DEL", 6: "AUX" };
  return posMap[entry?.raw?.IdPosicion] || "TEC";
}

function buildPlayerPayload(entry) {
  return {
    role: entry.role,
    teamType: entry.teamType,
    source: "team-roster",
    dorsal: entry.dorsal ?? null,
    nombre: entry.nombre || "",
    idLicencia: entry.idLicencia ?? null,
    licenciaTipo: entry.role === "portero" ? "p" : "j",
    data: entry.raw || null,
  };
}

function mergeEntry(target, persona, role, teamType, partido) {
  target.role = role;
  target.teamType = target.teamType || teamType;
  target.idLicencia = target.idLicencia ?? persona?.IdLicencia ?? null;
  target.nombre = target.nombre || persona?.ApellidosNombre || persona?.NombreApellidos || "";
  target.dorsal = target.dorsal ?? persona?.Dorsal ?? null;
  target.raw = target.raw || persona;
  target.appearances = (target.appearances || 0) + 1;
  target.matches = target.matches || [];
  if (partido?.IdPartido && !target.matches.some((item) => String(item?.IdPartido || "") === String(partido.IdPartido))) {
    target.matches.push({
      IdPartido: partido.IdPartido,
      Fecha: partido.Fecha,
      NombreJornada: partido.NombreJornada,
    });
  }
}

export function buildRosterFromMatches(partidos, equipo) {
  const buckets = {
    jugador: new Map(),
    portero: new Map(),
    tecnico: new Map(),
  };

  for (const partido of emptyArray(partidos)) {
    const side = getTeamSideForMatch(partido, equipo);
    if (!side || !partido?.alineaciones) continue;

    const alineacion = partido.alineaciones;
    const groups = side === "local"
      ? [
          ["jugador", emptyArray(alineacion.JugLocal)],
          ["portero", emptyArray(alineacion.PortLocal)],
          ["tecnico", emptyArray(alineacion.TecnLocal)],
        ]
      : [
          ["jugador", emptyArray(alineacion.JugVisit)],
          ["portero", emptyArray(alineacion.PortVisit)],
          ["tecnico", emptyArray(alineacion.TecnVisit)],
        ];

    for (const [role, personas] of groups) {
      for (const persona of personas) {
        const key = getBucketKey(persona, role);
        const existing = buckets[role].get(key) || {
          role,
          teamType: side,
          idLicencia: null,
          nombre: "",
          dorsal: null,
          appearances: 0,
          matches: [],
          raw: null,
        };
        mergeEntry(existing, persona, role, side, partido);
        buckets[role].set(key, existing);
      }
    }
  }

  const sortEntries = (items) => items.sort((a, b) => {
    const dorsalA = Number(a?.dorsal);
    const dorsalB = Number(b?.dorsal);
    if (!Number.isNaN(dorsalA) && !Number.isNaN(dorsalB) && dorsalA !== dorsalB) return dorsalA - dorsalB;
    if ((b?.appearances || 0) !== (a?.appearances || 0)) return (b?.appearances || 0) - (a?.appearances || 0);
    return String(a?.nombre || "").localeCompare(String(b?.nombre || ""), "es");
  });

  return {
    jugadores: sortEntries(Array.from(buckets.jugador.values())),
    porteros: sortEntries(Array.from(buckets.portero.values())),
    tecnicos: sortEntries(Array.from(buckets.tecnico.values())),
  };
}

function renderRosterItem(entry) {
  const payload = buildPlayerPayload(entry);
  const canOpen = !!entry.idLicencia;
  const roleLabel = entry.role === "tecnico" ? getStaffRoleLabel(entry) : null;
  const content = `
    <div class="team-roster-item-main">
      <div class="team-roster-item-marker">${escapeHtml(entry.dorsal ?? roleLabel ?? "--")}</div>
      <div class="team-roster-item-info">
        <div class="team-roster-item-name">${escapeHtml(entry.nombre || t("team_detail_roster_unknown_player"))}</div>
        <div class="team-roster-item-meta">${escapeHtml(t("team_detail_roster_appearances", entry.appearances || 0))}${roleLabel ? ` · ${escapeHtml(roleLabel)}` : ""}</div>
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

function renderRosterBlock(title, entries) {
  if (!entries.length) return "";
  return `
    <section class="team-detail-section team-roster-block">
      <div class="team-detail-section-head">
        <div class="team-detail-section-title">${escapeHtml(title)}</div>
        <div class="team-roster-block-count">${escapeHtml(entries.length)}</div>
      </div>
      <div class="team-roster-list">
        ${entries.map(renderRosterItem).join("")}
      </div>
    </section>
  `;
}

export function renderEquipoDetalleRoster(roster) {
  const jugadores = emptyArray(roster?.jugadores);
  const porteros = emptyArray(roster?.porteros);
  const tecnicos = emptyArray(roster?.tecnicos);

  if (!jugadores.length && !porteros.length && !tecnicos.length) {
    return `
      <section class="team-detail-section">
        <div class="team-detail-section-title">${escapeHtml(t("team_detail_tab_roster"))}</div>
        <div class="team-detail-empty">${escapeHtml(t("team_detail_roster_empty_from_lineups"))}</div>
      </section>
    `;
  }

  return `
    <div class="team-roster-view">
      <div class="team-detail-inline-note">${escapeHtml(t("team_detail_roster_generated_from_loaded_lineups"))}</div>
      ${renderRosterBlock(t("detail_players"), jugadores)}
      ${renderRosterBlock(t("detail_goalkeepers"), porteros)}
      ${renderRosterBlock(t("detail_staff"), tecnicos)}
    </div>
  `;
}

export default {
  buildRosterFromMatches,
  renderEquipoDetalleRoster,
};
