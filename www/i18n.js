"use strict";

/**
 * @callback I18nFormatter
 * @param {...string} args Argumentos de interpolación ya saneados.
 * @returns {string}
 */

/**
 * Diccionario de internacionalización para la app.
 * Contener los textos en español (es) y euskera (eu).
 * Las claves cuyo valor es función admiten argumentos (e.g. mensajes con variables).
 * @type {{
 *  es: Record<string, string|I18nFormatter>;
 *  eu: Record<string, string|I18nFormatter>;
 * }}
 */
export const i18n = {
  es: {
    title: "Partidos Loyola Indautxu",
    refresh: "Refrescar partidos",
    select_team: "Selecciona equipo",
    select_lang: "Idioma",
    loyA: "Loyola Indautxu A",
    loyB: "Loyola Indautxu B",
    loading: "Cargando partidos...",
    ptr_pull_hint: "Desliza para refrescar...",
    ptr_pull_more: "Sigue tirando para refrescar...",
    ptr_release: "Suelta para refrescar...",
    ptr_refreshing: "Actualizando...",
    clas_team_header: "Equipo",
    clas_form_aria: "Últimos cinco partidos",
    clas_form_win: "Victoria",
    clas_form_draw: "Empate",
    clas_form_loss: "Derrota",
    clas_pos_up: "Sube",
    clas_pos_down: "Baja",
    no_matches: (_equipo) => `No hay partidos para Loyola Indautxu ${_equipo}.`,
    no_clasificacion: (_equipo) => `Este equipo no se encuentra dentro de ninguna clasificación.`,
    select_theme: "Tema",
    // Nota: 'error' recibirá argumentos "stringificados" de forma segura por t()
    error: (e) => `Error: ${e}`,
    nav_matches: "Partidos",
    nav_clas: "Clasificación",
    side_menu_aria: "Menú lateral",
    side_menu_title: "Menú",
    side_menu_close: "Cerrar menú",
    app_short_name: "Loyola Hockey",
    team_selector_prompt_copy: "Abre el selector y elige un equipo para ver partidos, clasificación y detalle.",
    bottom_nav_aria: "Navegación principal",
    equipo_pendiente: "🕒 Pendiente",
    ics_desc: (competicion) => `Partido de hockey de la competición ${competicion}`,
    ics_location_unknown: "Ubicación desconocida",
    theme_auto: "Automático",
    theme_light: "Claro",
    theme_dark: "Oscuro",
    detail_summary: "Resumen",
    detail_lineups: "Alineaciones",
    detail_events: "Eventos",
    detail_penalties: "Penaltis",
    detail_loading_view: "Vista en preparación.",
    detail_match_load_error: "No se pudo cargar el partido",
    detail_match_no_data: "No se encontraron datos del partido",
    detail_referees: "Árbitros",
    detail_match: "Partido",
    detail_summary_title: "Resumen del partido",
    detail_goals: "Goles",
    detail_fouls: "Faltas",
    detail_blue_cards: "Azules",
    detail_red_cards: "Rojas",
    detail_no_events: "No hay eventos disponibles.",
    detail_events_title: "Eventos del partido",
    detail_goal: "Gol",
    detail_assist: "Asiste",
    detail_foul: "Falta",
    detail_receive: "Recibe",
    detail_direct_foul: "Falta directa",
    detail_timeout: "Tiempo muerto",
    detail_no_lineups: "No hay alineaciones disponibles.",
    detail_players: "Jugadores",
    detail_goalkeepers: "Portería",
    detail_staff: "Cuerpo técnico",
    detail_starter: "Titular",
    detail_captain: "Capitán",
    detail_assistant_captain: "As. cap.",
    detail_no_highlights: "Sin estadísticas destacadas",
    detail_no_incidents: "Sin incidencias registradas",
    detail_penalty_shots_none: "No hay lanzamientos de penalti.",
    detail_local: "Local",
    detail_visitor: "Visitante",
    detail_player_unavailable: "Jugador no disponible.",
    detail_player_no_license: "No hay licencia disponible para consultar sus estadísticas.",
    detail_player_load_error: "No se pudieron cargar las estadísticas del jugador.",
    detail_player_no_events: "Sin eventos registrados en este partido.",
    detail_player_statistics: "Estadísticas del jugador",
    detail_player_birth: "Nacimiento",
    detail_player_nationality: "Nacionalidad",
    detail_matches_count: (count) => `${count} partidos`,
    detail_no_matches_available: "Sin partidos disponibles.",
    team_selector_title: "Elige tu equipo",
    team_selector_subtitle: "Selecciona una competición y el equipo del Loyola que quieres seguir.",
    team_selector_loading: "Cargando competiciones y equipos...",
    team_selector_empty: "No se encontraron equipos disponibles.",
    team_selector_change: "Cambiar equipo",
    team_selector_first_time: "Primera selección",
    team_selector_selected: "Equipo actual",
    team_selector_current_team: "Equipo seguido",
    team_selector_prompt_inline: "Selecciona un equipo Loyola",
    team_selector_competition_badge: "Competición",
    team_selector_group_leagues: "Ligas",
    team_selector_group_tournaments: "Torneos",
    team_selector_choose_action: "Elegir este equipo",
    global_error_kicker: "Ups",
    global_error_title: "Ha habido un problema al cargar la app",
    global_error_message: "No hemos podido completar la carga inicial. Puedes intentarlo de nuevo o recargar la aplicación.",
    global_error_retry: "Reintentar",
    global_error_retrying: "Reintentando...",
    global_error_reload: "Recargar app",
    global_error_details: "Ver detalles técnicos",
  },
  eu: {
    title: "Loyola Indautxu Partidak",
    refresh: "Partidak freskatu",
    select_team: "Taldea aukeratu",
    select_lang: "Hizkuntza",
    loyA: "Loyola Indautxu A",
    loyB: "Loyola Indautxu B",
    loading: "Partidak kargatzen...",
    ptr_pull_hint: "Irristatu freskatzeko...",
    ptr_pull_more: "Jarraitu tira freskatzeko...",
    ptr_release: "Askatu freskatzeko...",
    ptr_refreshing: "Eguneratzen...",
    clas_team_header: "Taldea",
    clas_form_aria: "Azken bost partidak",
    clas_form_win: "Garaipena",
    clas_form_draw: "Berdinketa",
    clas_form_loss: "Porrota",
    clas_pos_up: "Igo da",
    clas_pos_down: "Jaitsi da",
    no_matches: (_equipo) => `Ez dago partidarik Loyola Indautxu ${_equipo} taldearentzat.`,
    no_clasificacion: (_equipo) => `Talde hau ez dago sailkapen batean.`,
    select_theme: "Gaia",
    // Nota: 'error' recibirá argumentos "stringificados" de forma segura por t()
    error: (e) => `Errorea: ${e}`,
    nav_matches: "Partidak",
    nav_clas: "Sailkapena",
    side_menu_aria: "Alboko menua",
    side_menu_title: "Menua",
    side_menu_close: "Itxi menua",
    app_short_name: "Loyola Hockey",
    team_selector_prompt_copy: "Ireki hautatzailea eta aukeratu talde bat partidak, sailkapena eta xehetasunak ikusteko.",
    bottom_nav_aria: "Nabigazio nagusia",
    equipo_pendiente: "🕒 Zehaztu gabe",
    ics_desc: (competicion) => `Hockey partida ${competicion} txapelketan`,
    ics_location_unknown: "Kokaleku ezezaguna",
    theme_auto: "Automatikoa",
    theme_light: "Argia",
    theme_dark: "Iluna",
    detail_summary: "Laburpena",
    detail_lineups: "Hamaikakoak",
    detail_events: "Gertaerak",
    detail_penalties: "Penaltiak",
    detail_loading_view: "Ikuspegia prestatzen.",
    detail_match_load_error: "Ezin izan da partida kargatu",
    detail_match_no_data: "Ez da partidaren daturik aurkitu",
    detail_referees: "Arbitroak",
    detail_match: "Partida",
    detail_summary_title: "Partidaren laburpena",
    detail_goals: "Golak",
    detail_fouls: "Faltak",
    detail_blue_cards: "Txartel urdinak",
    detail_red_cards: "Txartel gorriak",
    detail_no_events: "Ez dago gertaerarik eskuragarri.",
    detail_events_title: "Partidaren gertaerak",
    detail_goal: "Gola",
    detail_assist: "Asistentzia",
    detail_foul: "Falta",
    detail_receive: "Jasotzen du",
    detail_direct_foul: "Zuzeneko falta",
    detail_timeout: "Hutsartea",
    detail_no_lineups: "Ez dago hamaikakorik eskuragarri.",
    detail_players: "Jokalariak",
    detail_goalkeepers: "Atezainak",
    detail_staff: "Talde teknikoa",
    detail_starter: "Hasierakoa",
    detail_captain: "Kapitaina",
    detail_assistant_captain: "Kap. lag.",
    detail_no_highlights: "Ez dago estatistika nabarmenik",
    detail_no_incidents: "Ez dago gorabeherarik erregistratuta",
    detail_penalty_shots_none: "Ez dago penalti jaurtiketarik.",
    detail_local: "Etxekoa",
    detail_visitor: "Kanpokoa",
    detail_player_unavailable: "Jokalaria ez dago erabilgarri.",
    detail_player_no_license: "Ez dago lizentziarik haren estatistikak kontsultatzeko.",
    detail_player_load_error: "Ezin izan dira jokalariaren estatistikak kargatu.",
    detail_player_no_events: "Ez dago partida honetako gertaerarik erregistratuta.",
    detail_player_statistics: "Jokalariaren estatistikak",
    detail_player_birth: "Jaiotza",
    detail_player_nationality: "Nazionalitatea",
    detail_matches_count: (count) => `${count} partida`,
    detail_no_matches_available: "Ez dago partidarik erabilgarri.",
    team_selector_title: "Aukeratu zure taldea",
    team_selector_subtitle: "Hautatu jarraitu nahi duzun Loyola taldea eta txapelketa.",
    team_selector_loading: "Txapelketak eta taldeak kargatzen...",
    team_selector_empty: "Ez da talderik aurkitu.",
    team_selector_change: "Taldea aldatu",
    team_selector_first_time: "Lehen hautaketa",
    team_selector_selected: "Uneko taldea",
    team_selector_current_team: "Jarraitzen duzun taldea",
    team_selector_prompt_inline: "Aukeratu Loyola talde bat",
    team_selector_competition_badge: "Txapelketa",
    team_selector_group_leagues: "Ligak",
    team_selector_group_tournaments: "Txapelketak",
    team_selector_choose_action: "Aukeratu talde hau",
    global_error_kicker: "Aupa",
    global_error_title: "Arazo bat egon da aplikazioa kargatzean",
    global_error_message: "Hasierako karga ezin izan da osatu. Berriro saia zaitezke edo aplikazioa berriz kargatu.",
    global_error_retry: "Berriz saiatu",
    global_error_retrying: "Berriz saiatzen...",
    global_error_reload: "Aplikazioa berriz kargatu",
    global_error_details: "Ikusi xehetasun teknikoak",
  },
};

/**
 * Obtener el idioma actual desde localStorage o devolver 'es' por defecto.
 * @returns {string} Código de idioma ('es' o 'eu').
 */
export function getLang() {
  return localStorage.getItem("langLoyola") || "es";
}

/**
 * Guardar el idioma seleccionado en localStorage.
 * @param {string} lang - Código de idioma a guardar.
 * @returns {void}
 */
export function setLang(lang) {
  localStorage.setItem("langLoyola", lang);
}

/**
 * Formatear un Error a texto útil.
 * @param {Error} err - Error capturado.
 * @returns {string}
 */
function formatErrorForI18n(err) {
  return err.message || err.stack || Object.prototype.toString.call(err);
}

/**
 * Convertir objetos a cadena de forma segura para i18n.
 * Intentar JSON.stringify y, si no es posible, devolver el tag toString explícito.
 * @param {object} obj
 * @returns {string}
 */
function stringifyObjectForI18n(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    // Devolver etiqueta explícita, p. ej., "[object Object]" / "[object Map]"
    // (esto es intencional y no se considera "stringificación por defecto" del llamador).
    return Object.prototype.toString.call(obj);
  }
}

/**
 * Convertir un valor a cadena de forma segura para i18n.
 * Evitar "[object Object]" y ofrecer info útil para Error/objetos.
 * No usar String(v) sobre valores no primitivos.
 * @param {unknown} v
 * @returns {string}
 */
function stringifyForI18n(v) {
  // Tratar primero los errores
  if (v instanceof Error) {
    return formatErrorForI18n(v);
  }

  // Clasificar por typeof para reducir complejidad y dejar rutas claras
  switch (typeof v) {
    case "string":
      return /** @type {string} */ (v);

    case "number": {
      const n = /** @type {number} */ (v);
      return Number.isNaN(n) ? "NaN" : n.toString();
    }

    case "boolean":
      return /** @type {boolean} */ (v) ? "true" : "false";

    case "bigint":
      return /** @type {bigint} */ (v).toString();

    case "symbol": {
      const s = /** @type {symbol} */ (v);
      return s.description ? `Symbol(${s.description})` : "Symbol()";
    }

    case "function": {
      const f = /** @type {Function} */ (v);
      const name = f.name || "anonymous";
      return `[function ${name}]`;
    }

    case "undefined":
      return "undefined";

    // "object"
    default: {
      if (v === null) return "null";
      // A partir de aquí es un objeto no nulo
      return stringifyObjectForI18n(/** @type {object} */ (v));
    }
  }
}

/**
 * Traducir una clave usando el idioma actual.
 * Si el valor es función, ejecutarla con argumentos "stringificados" de forma segura.
 * Si el valor es cadena, devolverlo tal cual.
 * Si fuera otro tipo, convertir con stringifyForI18n.
 * @param {string} key - Clave de traducción.
 * @param {...any} args - Argumentos para funciones de traducción.
 * @returns {string}
 */
export function t(key, ...args) {
  const lang = getLang();
  const pack = i18n[lang] || i18n.es;
  const val = pack[key];

  if (typeof val === "function") {
    const formatter = /** @type {I18nFormatter} */ (val);
    const safeArgs = args.map(stringifyForI18n);
    return formatter(...safeArgs);
  }

  if (typeof val === "string") return val;

  // Evitar String(val) → usar conversión segura para no disparar S6551
  return val == null ? "" : stringifyForI18n(val);
}

/* ============================================================================
   Actualización de textos del DOM (refactor para reducir Cognitive Complexity)
   ============================================================================ */

/**
 * Establecer el textContent de un selector si existe.
 * @param {string} selector - Selector CSS del elemento.
 * @param {string} text - Texto a fijar.
 * @returns {void}
 */
function setText(selector, text) {
  const el = document.querySelector(selector);
  if (el) el.textContent = text;
}

/**
 * Establecer un aria-label de un selector si existe.
 * @param {string} selector - Selector CSS del elemento.
 * @param {string} label - Texto del aria-label.
 * @returns {void}
 */
function setAria(selector, label) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute("aria-label", label);
}

/**
 * Establecer value para inputs/selects si existen.
 * @param {string} selector - Selector CSS del elemento.
 * @param {string} value - Valor a aplicar.
 * @returns {void}
 */
function setValue(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.value = value;
}

/**
 * Actualizar etiquetas de opciones del selector de tema, si existe.
 * @param {HTMLSelectElement|null} themeSelect - Select de tema.
 * @returns {void}
 */
function updateThemeOptions(themeSelect) {
  if (!themeSelect) return;
  const optAuto = themeSelect.querySelector('[data-i18n="theme_auto"]');
  if (optAuto) optAuto.textContent = t("theme_auto");
  const optLight = themeSelect.querySelector('[data-i18n="theme_light"]');
  if (optLight) optLight.textContent = t("theme_light");
  const optDark = themeSelect.querySelector('[data-i18n="theme_dark"]');
  if (optDark) optDark.textContent = t("theme_dark");
}

/**
 * Actualizar los textos de la interfaz según el idioma actual.
 * Modificar los elementos del DOM con los textos traducidos.
 * (Refactorizada para reducir complejidad cognitiva: helpers y agrupación de setters).
 * @returns {void}
 */
export function updateTexts() {
  // 1) Título principal (mantener el primer nodo de texto y un espacio)
  const headerTitle = document.getElementById("headerTitle");
  if (headerTitle?.childNodes[0]) {
    headerTitle.childNodes[0].textContent = `${t("title")} `;
  }

  // 2) Botón de refresco
  setText("#fetchBtn", t("refresh"));

  // 3) Textos simples identificados por data-i18n
  setText('[data-i18n="select_team"]', t("select_team"));
  setText('[data-i18n="select_lang"]', t("select_lang"));
  setText('.equipoOpt[data-equipo="A"]', t("loyA"));
  setText('.equipoOpt[data-equipo="B"]', t("loyB"));
  setText('[data-i18n="select_theme"]', t("select_theme"));
  setText('[data-i18n="nav_matches"]', t("nav_matches"));
  setText('[data-i18n="nav_clas"]', t("nav_clas"));
  setText('[data-i18n="app_short_name"]', t("app_short_name"));
  setText('[data-i18n="side_menu_title"]', t("side_menu_title"));

  // 4) Selectores de idioma/tema (valor actual)
  setValue("#langSelect", getLang());
  const themeSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById("themeSelect"));
  updateThemeOptions(themeSelect);

  // 5) Atributos aria dinámicos
  setAria('[data-i18n-aria="side_menu_aria"]', t("side_menu_aria"));
  setAria('[data-i18n-aria="side_menu_close"]', t("side_menu_close"));
  setAria('[data-i18n-aria="bottom_nav_aria"]', t("bottom_nav_aria"));
}
