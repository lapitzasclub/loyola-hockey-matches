import { formatFechaByLang } from "../utils/helpers.js";

/**
 * Normaliza respuestas legacy que pueden venir como objeto, JSON embebido o `response.d`.
 *
 * @param {unknown} raw Respuesta original del endpoint.
 * @returns {any|null} Payload parseado o null si no se puede interpretar.
 */
export function parseApiArrayResponse(raw) {
  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.d !== undefined) {
        return typeof parsed.d === "string" ? JSON.parse(parsed.d) : parsed.d;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  if (raw?.d !== undefined) {
    try {
      return typeof raw.d === "string" ? JSON.parse(raw.d) : raw.d;
    } catch {
      return null;
    }
  }

  return raw;
}

/**
 * Devuelve un array seguro cuando el valor entrante no lo es.
 *
 * @template T
 * @param {T[]|unknown} value Valor potencialmente iterable.
 * @returns {T[]} Array válido o vacío.
 */
export function emptyArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Convierte cualquier valor textual a string recortado.
 *
 * @param {unknown} value Valor original.
 * @returns {string} Texto normalizado.
 */
export function normText(value) {
  return value == null ? "" : String(value).trim();
}

/**
 * Escapa entidades HTML básicas para interpolación segura en plantillas.
 *
 * @param {unknown} value Valor a escapar.
 * @returns {string} Texto escapado.
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Construye la URL pública del escudo de una entidad.
 *
 * @param {string|number|null|undefined} id Identificador de entidad o fallback.
 * @param {number} [size=200] Tamaño cuadrado del recurso.
 * @returns {string} URL absoluta del escudo.
 */
export function logoUrl(id, size = 200) {
  const key = normText(id) || "sinescudo";
  return `https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/${size}x${size}/${key}.png`;
}

/**
 * Formatea una fecha de partido según el idioma activo.
 *
 * @param {string|number|null|undefined} fecha Valor original de fecha.
 * @returns {string} Fecha formateada o cadena vacía.
 */
export function formatFecha(fecha) {
  return formatFechaByLang(fecha);
}

/**
 * Reduce una hora a `HH:MM` cuando llega con mayor precisión.
 *
 * @param {string|number|null|undefined} hora Valor original de hora.
 * @returns {string} Hora formateada o cadena vacía.
 */
export function formatHora(hora) {
  if (!hora) return "";
  const text = String(hora);
  return text.length >= 5 ? text.slice(0, 5) : text;
}

/**
 * Unifica el shape de un partido procedente de endpoints legacy distintos.
 *
 * @param {object|object[]|null|undefined} input Payload de entrada.
 * @returns {object|null} Partido normalizado o null si no hay datos válidos.
 */
export function normalizarPartido(input) {
  const p = Array.isArray(input) ? input[0] : input;
  if (!p || typeof p !== "object") return null;
  return {
    raw: p,
    modalidad: p.IdModalidadComp || "hp",
    competicion: p.DenoComp || "",
    jornada: p.NombreJornada || "",
    fecha: p.Fecha || "",
    hora: p.Hora || "",
    instalacion: p.Instalacion || "",
    estado: p.Periodo || p.Estado || "",
    crono: p.Crono || "",
    local: p.Eq1 || p.Local || "Equipo local",
    visit: p.Eq2 || p.Visit || "Equipo visitante",
    localAbrev: p.LocalAbrev || "",
    visitAbrev: p.VisitAbrev || "",
    golesLocal: p.GolesLocal ?? "-",
    golesVisit: p.GolesVisit ?? "-",
    arbitros: [p.Arb1, p.Arb2].filter(Boolean),
    logoLocal: p.IdEntidadEq1 || p.IdEnt1 || p.IdEq1 || p.IdEquipoLocal || "sinescudo",
    logoVisit: p.IdEntidadEq2 || p.IdEnt2 || p.IdEq2 || p.IdEquipoVisit || "sinescudo",
    idEquipoLocal: p.IdEq1 || p.IdEquipoLocal || null,
    idEquipoVisit: p.IdEq2 || p.IdEquipoVisit || null,
    puntoBonus: p.PuntoBonus,
  };
}

/**
 * Crea el estado base del modal de detalle de partido.
 *
 * @param {string|number} idPartido Identificador del partido.
 * @returns {object} Estado inicial del detalle.
 */
export function createDetalleState(idPartido) {
  return {
    idPartido: String(idPartido),
    partido: null,
    modalidad: "hp",
    eventos: [],
    alineaciones: null,
    penaltis: [],
    statsResumen: [],
    localKey: null,
    visitKey: null,
    loadingMatch: true,
    loadingStats: true,
    selectedJugador: null,
    selectedEquipo: null,
    teamMatches: [],
    loadingTeam: false,
    loadingRoster: false,
    teamFilters: {
      tab: "resumen",
      matchFilter: "all",
    },
    parentView: null,
    teamCompetitionName: "",
    navigation: {
      currentView: "partido",
      currentTab: "resumen",
      viewStack: [],
    },
  };
}

/**
 * Lee la subvista actual del detalle.
 *
 * @param {object} state Estado interno del detalle.
 * @returns {string} Identificador de la vista activa.
 */
export function getCurrentView(state) {
  return state.navigation?.currentView || "partido";
}

/**
 * Lee la pestaña activa de la vista principal del partido.
 *
 * @param {object} state Estado interno del detalle.
 * @returns {string} Identificador de la pestaña activa.
 */
export function getCurrentTab(state) {
  return state.navigation?.currentTab || "resumen";
}

/**
 * Devuelve la pila de navegación interna del detalle.
 *
 * @param {object} state Estado interno del detalle.
 * @returns {string[]} Pila de vistas previas.
 */
export function getViewStack(state) {
  return state.navigation?.viewStack || [];
}

/**
 * Actualiza la subvista actual del detalle.
 *
 * @param {object} state Estado interno del detalle.
 * @param {string} view Nueva vista activa.
 * @returns {void}
 */
export function setCurrentView(state, view) {
  state.navigation.currentView = view;
}

/**
 * Actualiza la pestaña activa de la vista principal.
 *
 * @param {object} state Estado interno del detalle.
 * @param {string} tab Nueva pestaña activa.
 * @returns {void}
 */
export function setCurrentTab(state, tab) {
  state.navigation.currentTab = tab;
}

/**
 * Extrae la última vista guardada en la pila de navegación.
 *
 * @param {object} state Estado interno del detalle.
 * @returns {string|undefined} Vista previa recuperada.
 */
export function popView(state) {
  return state.navigation.viewStack.pop();
}

/**
 * Guarda una vista previa en la pila de navegación.
 *
 * @param {object} state Estado interno del detalle.
 * @param {string} view Vista a apilar.
 * @returns {void}
 */
export function pushView(state, view) {
  state.navigation.viewStack.push(view);
}

/**
 * Normaliza una fila de clasificación a un shape ligero reutilizable por el detalle de equipo.
 *
 * @param {object|null|undefined} equipo Fila original de clasificación.
 * @returns {object|null} Equipo normalizado o null.
 */
export function normalizarEquipoClasificacion(equipo) {
  if (!equipo || typeof equipo !== "object") return null;

  const pickNumber = (...values) => {
    for (const value of values) {
      if (value == null || value === "") continue;
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) return numeric;
    }
    return 0;
  };

  const idEquipo = equipo.IdEquipo ?? equipo.idEquipo ?? null;
  const idEquipoComp = equipo.IdEquipoComp ?? equipo.idEquipoComp ?? null;
  const goalDifference = pickNumber(equipo.DiferenciaGoles, equipo.diferenciaGoles);

  return {
    idCompeticion: equipo.IdCompeticion != null ? String(equipo.IdCompeticion) : equipo.idCompeticion != null ? String(equipo.idCompeticion) : null,
    idEquipo: idEquipo != null ? String(idEquipo) : null,
    idEquipoComp: idEquipoComp != null ? String(idEquipoComp) : null,
    idEntidadEquipo: equipo.IdEntidadEquipo != null ? String(equipo.IdEntidadEquipo) : equipo.idEntidadEquipo != null ? String(equipo.idEntidadEquipo) : null,
    nombreEquipo: equipo.NombreEquipo || equipo.nombreEquipo || equipo.Eq || equipo.Equipo || "",
    nombreEquipoAbrev: equipo.NombreEquipoAbrev || equipo.nombreEquipoAbrev || equipo.NombreCorto || equipo.EqAbrev || "",
    nombreGrupo: equipo.NombreGrupo || equipo.DenoComp || equipo.nombreGrupo || equipo.nombreCompeticion || equipo.NombreCompeticion || equipo.Competicion || "",
    posicion: pickNumber(equipo.Posicion, equipo.posicion),
    puntos: pickNumber(equipo.Puntos, equipo.puntos),
    partidosJugados: pickNumber(equipo.PartidosJugados, equipo.partidosJugados),
    partidosGanados: pickNumber(equipo.PartidosGanados, equipo.partidosGanados),
    partidosEmpatados: pickNumber(equipo.PartidosEmpatados, equipo.partidosEmpatados),
    partidosPerdidos: pickNumber(equipo.PartidosPerdidos, equipo.partidosPerdidos),
    golesAFavor: pickNumber(equipo.GolesAFavor, equipo.golesAFavor),
    golesEnContra: pickNumber(equipo.GolesEnContra, equipo.golesEnContra),
    diferenciaGoles: goalDifference,
  };
}
