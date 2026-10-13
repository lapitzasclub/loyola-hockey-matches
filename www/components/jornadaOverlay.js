// jornadaOverlay.js
// Overlay ligero con todos los enfrentamientos de una jornada. Deliberadamente independiente
// de la máquina de navegación del modal compartido (equipo/partido/jugador) en detalleModalShell.js:
// solo lista partidos y, al tocar uno, delega en el detalle de partido ya existente.
// Importa de partidos.js en top-level (y partidos.js importa de aquí): es un ciclo seguro porque
// ninguno de los dos usa el export del otro durante la evaluación inicial del módulo, solo dentro
// de callbacks que se ejecutan después de que ambos módulos ya están completamente cargados.
import { t, getLang } from "../i18n.js";
import { getPartidosJornada } from "../services.js";
import { comparePartidosByScheduledDate, extractPartidos, safeStr } from "../utils/helpers.js";
import { formatFecha as formatFechaHelper } from "../utils/partidosHelpers.js";
import { setJornadaOverlayOpen } from "../core/layoutState.js";
import { getCompetitionLogoMap, openPartidoDetalleLazy, renderTeamLogo } from "./partidos.js";

const OVERLAY_CLOSE_ANIMATION_MS = 220;

/**
 * Desmonta por completo el overlay de jornada.
 *
 * @param {HTMLElement} overlay Nodo raíz del overlay.
 * @returns {void}
 */
function teardownJornadaOverlay(overlay) {
  overlay.hidden = true;
  overlay.innerHTML = "";
  overlay.classList.remove("is-closing");
}

/**
 * Cierra el overlay de jornada.
 *
 * @returns {void}
 */
export function closeJornadaOverlay() {
  const overlay = document.getElementById("jornadaOverlay");
  if (!overlay || overlay.hidden || overlay.classList.contains("is-closing")) return;

  overlay.classList.add("is-closing");
  setJornadaOverlayOpen(false);
  globalThis.dispatchEvent(new CustomEvent("app:overlay-state-changed"));

  globalThis.setTimeout(() => {
    teardownJornadaOverlay(overlay);
  }, OVERLAY_CLOSE_ANIMATION_MS);
}

/**
 * Renderiza la fila de un enfrentamiento dentro del overlay de jornada.
 *
 * @param {object} p Partido en shape legacy.
 * @param {Map<string, {entityId: string|null, hasLogo: boolean}>} logoMap Mapa de escudos.
 * @param {string|number|null} idPartidoActual Partido desde el que se abrió el overlay, para resaltarlo.
 * @returns {HTMLLIElement} Fila lista para insertar.
 */
function renderJornadaRow(p, logoMap, idPartidoActual) {
  const lang = getLang() === "eu" ? "eu" : "es";
  const fechaFormateada = formatFechaHelper(p.Fecha, lang);
  const hora = p.Hora ? String(p.Hora).slice(0, 5) : "";
  const esActual = idPartidoActual != null && String(p.IdPartido) === String(idPartidoActual);
  const resultadoHtml =
    p.EstadoPartido == 2 && p.GolesLocal != null && p.GolesVisit != null
      ? `<span class="jornada-overlay-resultado">${safeStr(p.GolesLocal)} - ${safeStr(p.GolesVisit)}</span>`
      : `<span class="jornada-overlay-resultado jornada-overlay-resultado-pendiente">${safeStr(hora || t("detail_match"))}</span>`;

  const row = document.createElement("li");
  row.className = `jornada-overlay-row${esActual ? " is-actual" : ""}`;
  row.innerHTML = `
    <button type="button" class="jornada-overlay-match">
      <span class="jornada-overlay-fecha">${safeStr(fechaFormateada)}</span>
      <span class="jornada-overlay-duelo">
        <span class="jornada-overlay-team">${renderTeamLogo(logoMap, p.IdEquipoLocal, p.EquipoLocal)}<span class="jornada-overlay-team-name">${safeStr(p.EquipoLocal || t("equipo_pendiente"))}</span></span>
        ${resultadoHtml}
        <span class="jornada-overlay-team">${renderTeamLogo(logoMap, p.IdEquipoVisit, p.EquipoVisit)}<span class="jornada-overlay-team-name">${safeStr(p.EquipoVisit || t("equipo_pendiente"))}</span></span>
      </span>
    </button>
  `;

  row.querySelector(".jornada-overlay-match").addEventListener("click", () => {
    closeJornadaOverlay();
    if (p.IdPartido) void openPartidoDetalleLazy(p.IdPartido);
  });

  return row;
}

/**
 * Abre el overlay con todos los enfrentamientos de una jornada.
 *
 * @param {object} options Opciones de apertura.
 * @param {string} options.idCompeticion ID de la competición.
 * @param {string} [options.idDivision] ID de la división/categoría del partido de origen.
 * @param {string} options.nombreJornada Nombre de la jornada a mostrar.
 * @param {string|number} [options.idPartidoActual] Partido de origen, para resaltarlo en la lista.
 * @param {Map<string, {entityId: string|null, hasLogo: boolean}>} [options.logoMap] Mapa de escudos ya cargado.
 * @returns {Promise<void>}
 */
export async function openJornadaOverlay({ idCompeticion, idDivision, nombreJornada, idPartidoActual, logoMap } = {}) {
  const overlay = document.getElementById("jornadaOverlay");
  if (!overlay || !idCompeticion || !nombreJornada) return;

  overlay.hidden = false;
  overlay.classList.remove("is-closing");
  setJornadaOverlayOpen(true);
  overlay.innerHTML = `
    <div class="jornada-overlay-backdrop" data-close-jornada-overlay></div>
    <section class="jornada-overlay-sheet" role="dialog" aria-modal="true" aria-label="${safeStr(nombreJornada)}">
      <div class="jornada-overlay-header">
        <div>
          <span class="jornada-overlay-kicker">${safeStr(t("jornada_overlay_kicker"))}</span>
          <h2 class="jornada-overlay-title">${safeStr(nombreJornada)}</h2>
        </div>
        <button type="button" class="jornada-overlay-close" data-close-jornada-overlay aria-label="${safeStr(t("jornada_overlay_close"))}">×</button>
      </div>
      <ul id="jornadaOverlayContent" class="jornada-overlay-list">
        <li class="jornada-overlay-loading">${safeStr(t("loading"))}</li>
      </ul>
    </section>
  `;

  overlay.querySelectorAll("[data-close-jornada-overlay]").forEach((node) => {
    node.addEventListener("click", () => closeJornadaOverlay());
  });

  globalThis.dispatchEvent(new CustomEvent("app:overlay-state-changed"));

  const [resolvedLogoMap, raw] = await Promise.all([
    logoMap || getCompetitionLogoMap(),
    getPartidosJornada(idCompeticion, idDivision, nombreJornada),
  ]);

  const content = document.getElementById("jornadaOverlayContent");
  if (!content) return; // El overlay se cerró mientras cargaban los datos.

  const { error, partidos } = extractPartidos(raw);
  content.innerHTML = "";

  if (error || !partidos.length) {
    content.innerHTML = `<li class="jornada-overlay-empty">${safeStr(t("jornada_overlay_empty"))}</li>`;
    return;
  }

  partidos
    .slice()
    .sort(comparePartidosByScheduledDate)
    .forEach((p) => content.appendChild(renderJornadaRow(p, resolvedLogoMap, idPartidoActual)));
}
