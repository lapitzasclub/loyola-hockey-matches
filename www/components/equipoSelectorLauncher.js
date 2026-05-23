import { t } from "../i18n.js";
import { getCompetitionCatalog, getEquipoSeleccionado, getEquiposLoyola } from "../state/equipos.js";

const LOYOLA_SHIELD_LIGHT_SRC = "assets/sidebar-loyola/escudo/escudo_loyola_indautxu_fondo_claro.png";
const LOYOLA_SHIELD_DARK_SRC = "assets/sidebar-loyola/escudo/escudo_loyola_indautxu_fondo_oscuro.png";

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

  const fallbackTeam = getEquiposLoyola().find(
    (team) => String(team.idCompeticion) === String(idCompeticion)
      && String(team.idEquipoComp) === String(idEquipoComp),
  );

  if (!fallbackTeam) return null;

  return {
    ...fallbackTeam,
    logoEquipoUrl: fallbackTeam.logoEquipoUrl || "https://www.fvpatinaje.eus/media/upload/fvpatinaje/escudos/sinescudo.png",
  };
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
    <div class="team-selector-launcher team-selector-launcher-sidepanel">
      ${selectedTeam ? `
        <div class="team-selector-launcher-hero-shell">
          <img class="team-selector-launcher-logo team-selector-launcher-logo-hero team-selector-launcher-logo-hero-light" src="${LOYOLA_SHIELD_LIGHT_SRC}" alt="Escudo de Loyola Indautxu" loading="lazy" decoding="async">
          <img class="team-selector-launcher-logo team-selector-launcher-logo-hero team-selector-launcher-logo-hero-dark" src="${LOYOLA_SHIELD_DARK_SRC}" alt="Escudo de Loyola Indautxu" loading="lazy" decoding="async">
          <div class="team-selector-launcher-copy team-selector-launcher-copy-hero">
            <strong class="team-selector-launcher-team">${selectedTeam.nombreEquipo}</strong>
            <span class="team-selector-launcher-underline" aria-hidden="true"></span>
            <span class="team-selector-launcher-comp">${selectedTeam.nombreCompeticion}${selectedTeam.temporada ? ` · ${selectedTeam.temporada}` : ""}</span>
          </div>
        </div>
      ` : `
        <p class="team-selector-launcher-empty">${t("team_selector_empty")}</p>
      `}
      <button type="button" class="team-selector-launcher-button team-selector-launcher-button-loyola" id="openTeamSelectorButton">
        <span class="team-selector-launcher-button-icon" aria-hidden="true"></span>
        <span class="team-selector-launcher-button-text">${selectedTeam ? t("team_selector_change") : t("team_selector_title")}</span>
        <span class="team-selector-launcher-button-chevron" aria-hidden="true"></span>
      </button>
    </div>
  `;

  const button = container.querySelector("#openTeamSelectorButton");
  if (button && typeof onOpen === "function") {
    button.addEventListener("click", onOpen);
  }
}
