import { emptyArray } from "./partidoDetalleUtils.js";

/**
 * Resuelve el contexto completo de un jugador seleccionado dentro del detalle de partido.
 * Combina el payload clicable con la alineación actual y con los eventos del partido.
 *
 * @param {object} state Estado interno del modal de detalle de partido.
 * @param {object} payload Datos mínimos serializados en el enlace pulsable del jugador.
 * @returns {object} Objeto enriquecido del jugador listo para render e hidratación.
 */
export function resolveJugadorDetalle(state, payload) {
  const nombre = String(payload?.nombre || "").trim().toLowerCase();
  const dorsal = String(payload?.dorsal || "").trim();
  const teamType = payload?.teamType;
  const alin = state.alineaciones || {};

  const groups = teamType === "local"
    ? [
        { role: "jugador", items: emptyArray(alin.JugLocal), licenciaTipo: "j" },
        { role: "portero", items: emptyArray(alin.PortLocal), licenciaTipo: "p" },
        { role: "tecnico", items: emptyArray(alin.TecnLocal), licenciaTipo: "j" },
      ]
    : teamType === "visitante"
      ? [
          { role: "jugador", items: emptyArray(alin.JugVisit), licenciaTipo: "j" },
          { role: "portero", items: emptyArray(alin.PortVisit), licenciaTipo: "p" },
          { role: "tecnico", items: emptyArray(alin.TecnVisit), licenciaTipo: "j" },
        ]
      : [];

  let match = null;
  let matchedGroup = null;
  for (const group of groups) {
    match = group.items.find((item) => {
      const itemDorsal = String(item?.Dorsal || "").trim();
      const itemNombre = String(item?.ApellidosNombre || item?.NombreApellidos || "").trim().toLowerCase();
      const itemLicencia = String(item?.IdLicencia || "").trim();
      const payloadLicencia = String(payload?.idLicencia || "").trim();
      return (payloadLicencia && itemLicencia === payloadLicencia) || (dorsal && itemDorsal === dorsal) || (nombre && itemNombre === nombre);
    });
    if (match) {
      matchedGroup = group;
      break;
    }
  }

  return {
    ...payload,
    role: match ? matchedGroup.role : payload.role,
    licenciaTipo: payload.licenciaTipo || matchedGroup?.licenciaTipo || "j",
    idLicencia: match?.IdLicencia ?? payload?.idLicencia ?? null,
    teamName: teamType === "local" ? state.partido?.local : teamType === "visitante" ? state.partido?.visit : "",
    teamLogo: teamType === "local" ? state.partido?.logoLocal : teamType === "visitante" ? state.partido?.logoVisit : null,
    nombre: match?.ApellidosNombre || match?.NombreApellidos || payload.nombre,
    dorsal: match?.Dorsal ?? payload.dorsal,
    partidoStats: match || null,
    eventos: getJugadorEventos(state.eventos, {
      dorsal: match?.Dorsal ?? dorsal,
      nombre: match?.ApellidosNombre || match?.NombreApellidos || nombre,
      teamType,
    }),
    statsGlobales: null,
    loading: false,
    error: "",
  };
}

/**
 * Filtra los eventos del partido que afectan al jugador indicado.
 *
 * @param {Array<object>} eventos Eventos del partido actual.
 * @param {object} jugadorRef Referencia mínima del jugador, dorsal, nombre y lado.
 * @returns {Array<object>} Lista de eventos relacionados con el jugador.
 */
export function getJugadorEventos(eventos, jugadorRef) {
  const dorsal = String(jugadorRef?.dorsal || "").trim();
  const nombre = String(jugadorRef?.nombre || "").trim().toLowerCase();
  const teamType = jugadorRef?.teamType;
  return emptyArray(eventos).filter((ev) => {
    const sameTeam = teamType ? Number(ev.LocalVisit) === (teamType === "local" ? 1 : 2) : true;
    const dorsal1 = String(ev?.Dorsal1 || "").trim();
    const dorsal2 = String(ev?.Dorsal2 || "").trim();
    const nombre1 = String(ev?.Lic1 || "").trim().toLowerCase();
    const nombre2 = String(ev?.Lic2 || "").trim().toLowerCase();
    return sameTeam && (
      (dorsal && (dorsal1 === dorsal || dorsal2 === dorsal)) ||
      (nombre && (nombre1 === nombre || nombre2 === nombre))
    );
  });
}
