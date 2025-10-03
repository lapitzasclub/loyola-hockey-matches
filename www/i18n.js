"use strict";

/**
 * Diccionario de internacionalización para la app.
 * Contener los textos en español (es) y euskera (eu).
 * Las claves cuyo valor es función admiten argumentos (e.g. mensajes con variables).
 * @type {{
 *  es: Record<string, string|((...a:any[])=>string)>;
 *  eu: Record<string, string|((...a:any[])=>string)>;
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
    no_matches: (equipo) => `No hay partidos para Loyola Indautxu ${equipo}.`,
    select_theme: "Tema",
    // Nota: 'error' recibirá argumentos "stringificados" de forma segura por t()
    error: (e) => `Error: ${e}`,
    nav_matches: "Partidos",
    nav_clas: "Clasificación",
    side_menu_aria: "Menú lateral",
    bottom_nav_aria: "Navegación principal",
    equipo_pendiente: "🕒 Pendiente",
    ics_desc: (competicion) => `Partido de hockey de la competición ${competicion}`,
    ics_location_unknown: "Ubicación desconocida",
    theme_auto: "Automático",
    theme_light: "Claro",
    theme_dark: "Oscuro",
  },
  eu: {
    title: "Loyola Indautxu Partidak",
    refresh: "Partidak freskatu",
    select_team: "Taldea aukeratu",
    select_lang: "Hizkuntza",
    loyA: "Loyola Indautxu A",
    loyB: "Loyola Indautxu B",
    loading: "Partidak kargatzen...",
    no_matches: (equipo) => `Ez dago partidarik Loyola Indautxu ${equipo} taldearentzat.`,
    select_theme: "Gaia",
    // Nota: 'error' recibirá argumentos "stringificados" de forma segura por t()
    error: (e) => `Errorea: ${e}`,
    nav_matches: "Partidak",
    nav_clas: "Sailkapena",
    side_menu_aria: "Alboko menua",
    bottom_nav_aria: "Nabigazio nagusia",
    equipo_pendiente: "🕒 Zehaztu gabe",
    ics_desc: (competicion) => `Hockey partida ${competicion} txapelketan`,
    ics_location_unknown: "Kokaleku ezezaguna",
    theme_auto: "Automatikoa",
    theme_light: "Argia",
    theme_dark: "Iluna",
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
    // Pasar argumentos formateados de forma segura
    const safeArgs = args.map(stringifyForI18n);
    // @ts-ignore - val es función en este branch
    return val(...safeArgs);
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

  // 4) Selectores de idioma/tema (valor actual)
  setValue("#langSelect", getLang());
  const themeSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById("themeSelect"));
  updateThemeOptions(themeSelect);

  // 5) Atributos aria dinámicos
  setAria('[data-i18n-aria="side_menu_aria"]', t("side_menu_aria"));
  setAria('[data-i18n-aria="bottom_nav_aria"]', t("bottom_nav_aria"));
}
