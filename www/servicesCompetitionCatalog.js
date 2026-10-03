// servicesCompetitionCatalog.js
// Catálogo de competiciones Loyola construido sobre la API nueva DigitalSport.

import { CACHE_TTL_LONG } from "./utils/apiCache.js";
import { getEntityLogoUrl } from "./servicesShared.js";
import { discoverCompetitions, buildLegacyEquipos, isLoyolaName } from "./servicesFvp.js";

const CATALOG_STORAGE_KEY = "loyola_competition_catalog_v2";

/** Competiciones resueltas a la vez al construir el catálogo. */
const CATALOG_CONCURRENCY = 6;

const competitionCatalogCache = new Map();
const competitionCatalogInflight = new Map();

/**
 * Recorre una lista aplicando `fn` en paralelo pero con un tope de tareas simultáneas,
 * conservando el orden original. Evita encadenar una petición por competición (arranque
 * lento) sin llegar a lanzar decenas de peticiones a la vez desde el móvil.
 *
 * @template T, R
 * @param {T[]} items Elementos a procesar.
 * @param {number} limit Máximo de tareas concurrentes.
 * @param {(item: T) => Promise<R>} fn Trabajo por elemento.
 * @returns {Promise<R[]>} Resultados en el mismo orden que `items`.
 */
async function mapConConcurrencia(items, limit, fn) {
  const lista = Array.isArray(items) ? items : [];
  const resultados = new Array(lista.length);
  let siguiente = 0;

  const worker = async () => {
    while (siguiente < lista.length) {
      const indice = siguiente++;
      resultados[indice] = await fn(lista[indice]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, lista.length) }, worker));
  return resultados;
}

function loadCatalogFromStorage() {
  try {
    const stored = localStorage.getItem(CATALOG_STORAGE_KEY);
    if (!stored) return null;
    const { t, v } = JSON.parse(stored);
    if (Date.now() - t < CACHE_TTL_LONG) return v;
    localStorage.removeItem(CATALOG_STORAGE_KEY);
  } catch {}
  return null;
}

function saveCatalogToStorage(catalog) {
  try {
    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify({ t: Date.now(), v: catalog }));
  } catch {}
}

/**
 * Mapea un equipo legacy (de `buildLegacyEquipos`) al shape de catálogo que consume la UI.
 *
 * @param {object} equipo Equipo legacy.
 * @param {{id:string, nombre:string, temporada:string}} comp Competición.
 * @returns {object} Entrada de catálogo.
 */
function toCatalogTeam(equipo, comp) {
  const logoUrl = equipo.IdEntidadEquipo || "";
  return {
    idCompeticion: comp.id,
    nombreCompeticion: comp.nombre,
    temporada: comp.temporada,
    modalidad: "hp",
    idEquipoComp: equipo.IdEquipoComp,
    idEntidadEquipo: logoUrl,
    nombreEquipo: equipo.NombreEquipo,
    nombreEquipoAbrev: equipo.NombreEquipoAbrev,
    tieneLogo: !!equipo.TieneLogo,
    logoEquipoUrl: equipo.TieneLogo ? getEntityLogoUrl(logoUrl) : getEntityLogoUrl(""),
  };
}

/**
 * Obtiene y cachea el catálogo de competiciones con sus equipos Loyola.
 *
 * @returns {Promise<Array>} Catálogo visual agrupado por competición.
 */
export async function getLoyolaCompetitionCatalog() {
  const cacheKey = "hp";
  if (competitionCatalogCache.has(cacheKey)) return competitionCatalogCache.get(cacheKey);
  if (competitionCatalogInflight.has(cacheKey)) return competitionCatalogInflight.get(cacheKey);

  const stored = loadCatalogFromStorage();
  if (stored) {
    competitionCatalogCache.set(cacheKey, stored);
    return stored;
  }

  const requestPromise = (async () => {
    const competiciones = await discoverCompetitions();

    const entradas = await mapConConcurrencia(competiciones, CATALOG_CONCURRENCY, async (comp) => {
      let equipos;
      try {
        equipos = await buildLegacyEquipos(comp.id);
      } catch (error) {
        console.error("Error cargando equipos de competición:", comp.id, error);
        return null;
      }

      const equiposLoyola = equipos
        .filter((eq) => isLoyolaName(eq.NombreEquipo) || isLoyolaName(eq.NombreEquipoAbrev))
        .map((eq) => toCatalogTeam(eq, comp));

      if (!equiposLoyola.length) return null;

      return {
        idCompeticion: comp.id,
        nombreCompeticion: comp.nombre,
        nombreCompeticionAbrev: comp.nombre,
        temporada: comp.temporada,
        modalidad: "hp",
        tieneLogoComp: false,
        logoCompeticionUrl: getEntityLogoUrl(""),
        equipos: equiposLoyola,
      };
    });
    const catalog = entradas.filter(Boolean);

    saveCatalogToStorage(catalog);
    competitionCatalogCache.set(cacheKey, catalog);
    return catalog;
  })();

  competitionCatalogInflight.set(cacheKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    competitionCatalogInflight.delete(cacheKey);
  }
}

/**
 * Obtiene todos los equipos Loyola de todas las competiciones.
 *
 * @returns {Promise<Array>} Array de equipos Loyola.
 */
export async function getEquiposLoyolaTodasCompeticiones() {
  const catalog = await getLoyolaCompetitionCatalog();
  return catalog.flatMap((competition) => competition.equipos);
}
