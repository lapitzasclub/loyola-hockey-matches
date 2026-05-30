import { getLegacyApiMode } from "./config/runtime.js";
import { getParametrosCompeticion } from "./services.js";
import { CACHE_TTL_LONG } from "./utils/apiCache.js";
import { FVP_BASE_URL, HEADERS, getEntityLogoUrl, unwrapLegacyPayload } from "./servicesShared.js";

const CATALOG_STORAGE_KEY = "loyola_competition_catalog_v1";

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
 * Construye la URL del endpoint de competiciones según el runtime actual.
 *
 * @returns {string} URL final para `GetCompeticiones`.
 */
function getCompeticionesUrl() {
  return getLegacyApiMode() === "direct"
    ? `${FVP_BASE_URL}/GetCompeticiones`
    : "/api/GetCompeticiones";
}

/** URL base de los logos de competición en S3 (formato .jpg, tamaño 400×400). */
const COMPETITION_LOGO_BASE_URL = "https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/logocompeticion/400x400";

/**
 * Construye la URL pública del logo de una competición.
 *
 * @param {string|number} idCompeticion Identificador de la competición.
 * @returns {string} URL del logo de competición.
 */
function getCompeticionLogoUrl(idCompeticion) {
  return `${COMPETITION_LOGO_BASE_URL}/${idCompeticion}.jpg`;
}

/**
 * Devuelve true si un equipo pertenece al universo Loyola mostrado por la app.
 *
 * @param {object} equipo Equipo de competición.
 * @returns {boolean} True si debe incluirse en el selector propio.
 */
function isLoyolaTeam(equipo) {
  return (
    equipo?.NombreEquipo?.toUpperCase().includes("LOYOLA") ||
    equipo?.NombreEquipoAbrev?.toUpperCase().includes("LOY")
  );
}


/**
 * Obtiene y cachea el catálogo de competiciones con sus equipos Loyola y logos.
 *
 * @returns {Promise<Array>} Catálogo visual agrupado por competición.
 */
export async function getLoyolaCompetitionCatalog() {
  const cacheKey = "hp:21";
  if (competitionCatalogCache.has(cacheKey)) {
    return competitionCatalogCache.get(cacheKey);
  }
  if (competitionCatalogInflight.has(cacheKey)) {
    return competitionCatalogInflight.get(cacheKey);
  }

  const stored = loadCatalogFromStorage();
  if (stored) {
    competitionCatalogCache.set(cacheKey, stored);
    return stored;
  }

  const requestPromise = (async () => {
    const compRes = await fetch(getCompeticionesUrl(), {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ modalidad: "hp", temporada: "21" }),
    });

    if (!compRes.ok) {
      throw new Error(`Error cargando competiciones (${compRes.status})`);
    }

    let compJson;
    try {
      compJson = await compRes.json();
    } catch (error) {
      console.error("Error parseando JSON de competiciones:", error);
      throw new Error("No se pudo interpretar la respuesta de competiciones", { cause: error });
    }

    if (compJson?.error) {
      throw new Error(compJson.message || "Error remoto cargando competiciones");
    }

    let competiciones;
    try {
      competiciones = compJson.d ? JSON.parse(compJson.d) : [];
    } catch (error) {
      console.error("Error parseando compJson.d:", compJson.d, error);
      throw new Error("Formato inválido en competiciones", { cause: error });
    }

    const catalog = [];
    for (const comp of competiciones) {
      const rawParams = await getParametrosCompeticion(comp.IdCompeticion);
      if (rawParams?.error) {
        console.error("Error remoto cargando parametros de competición:", comp.IdCompeticion, rawParams.message);
        continue;
      }

      let params;
      try {
        params = unwrapLegacyPayload(rawParams);
      } catch (error) {
        console.error("Error parseando parametros de competición:", comp.IdCompeticion, error);
        continue;
      }

      const competitionData = Array.isArray(params) ? params[0] : null;
      const equipos = Array.isArray(competitionData?.Equipos) ? competitionData.Equipos : [];
      const equiposLoyola = equipos
        .filter(isLoyolaTeam)
        .map((equipo) => ({
          idCompeticion: comp.IdCompeticion,
          nombreCompeticion: comp.DenoComp,
          temporada: comp.Temporada || competitionData?.Temporada || "",
          modalidad: comp.IdModalidadComp || competitionData?.IdModalidadComp || "hp",
          idEquipoComp: equipo.IdEquipoComp,
          idEntidadEquipo: equipo.IdEntidadEquipo,
          nombreEquipo: equipo.NombreEquipo,
          nombreEquipoAbrev: equipo.NombreEquipoAbrev,
          tieneLogo: !!equipo.TieneLogo,
          logoEquipoUrl: equipo.TieneLogo ? getEntityLogoUrl(equipo.IdEntidadEquipo) : getEntityLogoUrl("sinescudo"),
        }));

      if (!equiposLoyola.length) continue;

      catalog.push({
        idCompeticion: comp.IdCompeticion,
        nombreCompeticion: comp.DenoComp,
        nombreCompeticionAbrev: comp.DenoAbrevComp || comp.DenoComp,
        temporada: comp.Temporada || competitionData?.Temporada || "",
        modalidad: comp.IdModalidadComp || competitionData?.IdModalidadComp || "hp",
        tieneLogoComp: !!comp.LogoComp,
        logoCompeticionUrl: comp.LogoComp
          ? getCompeticionLogoUrl(comp.IdCompeticion)
          : getEntityLogoUrl(comp.IdEntidad),
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
