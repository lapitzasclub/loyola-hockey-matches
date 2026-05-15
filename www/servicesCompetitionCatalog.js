import { getLegacyApiMode } from "./config/runtime.js";
import { getParametrosCompeticion } from "./services.js";
import { FVP_BASE_URL, HEADERS, ENTITY_LOGO_BASE_URL } from "./servicesShared.js";

const competitionCatalogCache = new Map();
const competitionCatalogInflight = new Map();

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

/**
 * Construye la URL pública de un logo de entidad o un fallback sin escudo.
 *
 * @param {string|number|null|undefined} entityId Identificador de entidad.
 * @returns {string} URL del recurso visual.
 */
function getEntityLogoUrl(entityId) {
  return `${ENTITY_LOGO_BASE_URL}/${entityId || "sinescudo"}.png`;
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
 * Normaliza respuestas legacy ASMX que pueden venir como string JSON, como objeto con `d`
 * o ya directamente como payload final.
 *
 * @param {any} raw Respuesta cruda.
 * @returns {any} Payload normalizado.
 */
function unwrapLegacyPayload(raw) {
  if (raw == null) return raw;

  if (typeof raw === "string") {
    const first = JSON.parse(raw);
    return typeof first?.d === "string" ? JSON.parse(first.d) : (first?.d ?? first);
  }

  if (typeof raw === "object") {
    if (typeof raw.d === "string") {
      return JSON.parse(raw.d);
    }
    if (raw.d !== undefined) {
      return raw.d;
    }
  }

  return raw;
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
        tieneLogoComp: !!competitionData?.LogoComp,
        logoCompeticionUrl: competitionData?.LogoComp && competitionData?.IdEntidad
          ? getEntityLogoUrl(competitionData.IdEntidad)
          : getEntityLogoUrl("sinescudo"),
        equipos: equiposLoyola,
      });
    }

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
