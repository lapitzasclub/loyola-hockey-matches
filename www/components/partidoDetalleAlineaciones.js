import { t } from "../i18n.js";
import { emptyArray, escapeHtml } from "./partidoDetalleUtils.js";

/**
 * Construye el payload mínimo necesario para abrir la subvista de jugador.
 *
 * @param {object} persona Datos crudos del jugador, portero o técnico.
 * @param {string} teamType Lado del partido al que pertenece.
 * @param {string} role Rol lógico dentro del detalle.
 * @returns {object} Payload serializable para `data-player`.
 */
function getJugadorPayload(persona, teamType, role) {
  return {
    role,
    teamType,
    dorsal: persona?.Dorsal ?? null,
    nombre: persona?.ApellidosNombre || persona?.NombreApellidos || "",
    idLicencia: persona?.IdLicencia ?? null,
    licenciaTipo: role === "portero" ? "p" : "j",
    data: persona,
  };
}

/**
 * Renderiza una tarjeta individual de alineación.
 *
 * @param {object} options Opciones de render.
 * @param {string} options.marker Dorsal o marcador visual principal.
 * @param {string} options.name Nombre visible de la persona.
 * @param {string} [options.tags=""] Etiquetas auxiliares ya renderizadas.
 * @param {string} [options.chips=""] Chips de estadísticas ya renderizados.
 * @param {string} [options.emptyText=t("detail_no_highlights")] Texto fallback si no hay chips.
 * @param {string} [options.extraClass=""] Clase CSS adicional para el artículo.
 * @param {object|null} [options.playerPayload=null] Payload clicable del jugador.
 * @returns {string} HTML de la tarjeta.
 */
function renderAlineacionItem({ marker, name, tags = "", chips = "", emptyText = t("detail_no_highlights"), extraClass = "", playerPayload = null }) {
  const content = `
    <div class="alineacion-item-main">
      <div class="alineacion-dorsal">${marker}</div>
      <div class="alineacion-info">
        <div class="alineacion-name-row">
          <div class="alineacion-name">${escapeHtml(name ?? "")}</div>
          ${tags ? `<div class="alineacion-tags">${tags}</div>` : ""}
        </div>
        ${chips ? `<div class="alineacion-chips">${chips}</div>` : `<div class="alineacion-muted">${escapeHtml(emptyText)}</div>`}
      </div>
    </div>
  `;

  return `
    <article class="alineacion-item ${extraClass}">
      ${playerPayload ? `<button type="button" class="alineacion-item-button partido-detalle-player-link" data-player='${escapeHtml(JSON.stringify(playerPayload))}'>${content}</button>` : content}
    </article>
  `;
}

/**
 * Convierte una lista de etiquetas en chips HTML, ignorando entradas vacías.
 *
 * @param {string[]} tags Etiquetas potenciales.
 * @returns {string} HTML concatenado de etiquetas.
 */
function renderTagList(tags) {
  return tags
    .filter(Boolean)
    .map((tag) => `<span class="alineacion-tag">${escapeHtml(tag)}</span>`)
    .join("");
}

/**
 * Renderiza un chip estadístico cuando el valor tiene contenido útil.
 *
 * @param {string} label Etiqueta corta del chip.
 * @param {string|number|null|undefined} value Valor de la estadística.
 * @param {string} [variant=""] Variante CSS opcional.
 * @returns {string} HTML del chip o cadena vacía.
 */
function renderStatChip(label, value, variant = "") {
  if (value === undefined || value === null || value === "" || value === 0 || value === "0/0") return "";
  return `<span class="alineacion-chip ${variant}">${escapeHtml(label)} <strong>${escapeHtml(value)}</strong></span>`;
}

/**
 * Renderiza el bloque de jugadores de pista de un equipo.
 *
 * @param {object[]} jugadores Jugadores a mostrar.
 * @param {string} modalidad Modalidad activa del partido.
 * @param {string} teamType Lado del partido.
 * @returns {string} HTML del bloque.
 */
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

/**
 * Renderiza el bloque de porteros de un equipo.
 *
 * @param {object[]} porteros Porteros a mostrar.
 * @param {string} modalidad Modalidad activa del partido.
 * @param {string} teamType Lado del partido.
 * @returns {string} HTML del bloque.
 */
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

/**
 * Renderiza el bloque de cuerpo técnico de un equipo.
 *
 * @param {object[]} tecnicos Técnicos a mostrar.
 * @param {string} modalidad Modalidad activa del partido.
 * @param {string} teamType Lado del partido.
 * @returns {string} HTML del bloque.
 */
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

/**
 * Renderiza la tarjeta completa de alineación de un equipo.
 *
 * @param {string} nombre Nombre visible del equipo.
 * @param {object[]} jugadores Jugadores de pista.
 * @param {object[]} porteros Porteros.
 * @param {object[]} tecnicos Cuerpo técnico.
 * @param {string} modalidad Modalidad activa.
 * @param {string} teamType Lado del partido.
 * @returns {string} HTML de la tarjeta del equipo.
 */
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

/**
 * Renderiza la pestaña de alineaciones del detalle de partido.
 *
 * @param {object} state Estado interno del detalle.
 * @returns {string} HTML de la pestaña.
 */
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
