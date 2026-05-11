import { t } from "../i18n.js";
import { getCompetitionCatalog, getEquipoSeleccionado } from "../state/equipos.js";

/**
 * Obtiene los datos del equipo actualmente seleccionado dentro del catálogo.
 *
 * @returns {object|null} Equipo seleccionado o null.
 */
function getSelectedTeamData() {
  const selectedValue = getEquipoSeleccionado();
  if (!selectedValue) return null;
  const [idCompeticion, idEquipoComp] = selectedValue.split("|");
  const catalog = getCompetitionCatalog();
  for (const competition of catalog) {
    if (String(competition.idCompeticion) !== String(idCompeticion)) continue;
    const team = competition.equipos.find((item) => String(item.idEquipoComp) === String(idEquipoComp));
    if (team) {
      return {
        ...team,
        nombreCompeticion: competition.nombreCompeticion,
        temporada: competition.temporada,
      };
    }
  }
  return null;
}

/**
 * Renderiza el bloque resumido del equipo actual y el CTA de cambio.
 *
 * @param {HTMLElement} container Contenedor destino.
 * @param {{ onOpen?: (() => void) }} [options] Callbacks opcionales.
 * @returns {void}
 */
export function renderEquipoSelectorLauncher(container, options = {}) {
  const { onOpen } = options;
  const selectedTeam = getSelectedTeamData();

  container.innerHTML = `
    <div class="team-selector-launcher">
      <div class="team-selector-launcher-current">
        <span class="team-selector-launcher-label">${t("team_selector_current_team")}</span>
        ${selectedTeam ? `
          <div class="team-selector-launcher-card">
            <img class="team-selector-launcher-logo" src="${selectedTeam.logoEquipoUrl}" alt="Escudo de ${selectedTeam.nombreEquipo}" loading="lazy" decoding="async">
            <div class="team-selector-launcher-copy">
              <strong class="team-selector-launcher-team">${selectedTeam.nombreEquipo}</strong>
              <span class="team-selector-launcher-comp">${selectedTeam.nombreCompeticion}</span>
            </div>
          </div>
        ` : `
          <p class="team-selector-launcher-empty">${t("team_selector_empty")}</p>
        `}
      </div>
      <button type="button" class="team-selector-launcher-button" id="openTeamSelectorButton">
        ${selectedTeam ? t("team_selector_change") : t("team_selector_title")}
      </button>
    </div>
  `;

  const button = container.querySelector("#openTeamSelectorButton");
  if (button && typeof onOpen === "function") {
    button.addEventListener("click", onOpen);
  }
}
