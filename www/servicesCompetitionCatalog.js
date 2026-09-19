// servicesCompetitionCatalog.js
// Catálogo de competiciones Loyola construido sobre la API nueva DigitalSport.

import { CACHE_TTL_LONG } from "./utils/apiCache.js";
import { getEntityLogoUrl } from "./servicesShared.js";
import { discoverCompetitions, buildLegacyEquipos, isLoyolaName } from "./servicesFvp.js";

const CATALOG_STORAGE_KEY = "loyola_competition_catalog_v2";

const competitionCatalogCache = new Map();
const competitionCatalogInflight = new Map();

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
    const catalog = [];

    for (const comp of competiciones) {
      let equipos;
      try {
        equipos = await buildLegacyEquipos(comp.id);
      } catch (error) {
        console.error("Error cargando equipos de competición:", comp.id, error);
        continue;
      }

      const equiposLoyola = equipos
        .filter((eq) => isLoyolaName(eq.NombreEquipo) || isLoyolaName(eq.NombreEquipoAbrev))
        .map((eq) => toCatalogTeam(eq, comp));

      if (!equiposLoyola.length) continue;

      catalog.push({
        idCompeticion: comp.id,
        nombreCompeticion: comp.nombre,
        nombreCompeticionAbrev: comp.nombre,
        temporada: comp.temporada,
        modalidad: "hp",
        tieneLogoComp: false,
        logoCompeticionUrl: getEntityLogoUrl(""),
        equipos: equiposLoyola,
      });
    }

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
