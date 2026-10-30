import { crearMarcador, normalizarEstado } from '../../domain';
import type { Competicion, Equipo, PartidoResumen } from '../../domain';
import type { AgendaApi, EventoAgendaApi } from '../schemas';

function equipoDeAgenda(lado: EventoAgendaApi['local']): Equipo {
  return {
    inscripcionId: null,
    equipoId: lado.equipoId,
    clubId: lado.clubId,
    nombre: lado.nombre,
    nombreAbrev: lado.nombreAbrev,
    logoUrl: lado.logoUrl,
  };
}

export function partidoDesdeAgenda(evento: EventoAgendaApi): PartidoResumen {
  return {
    id: evento.id,
    competicionId: evento.competicionId,
    faseId: null,
    jornada: evento.jornadaNombre,
    fecha: evento.fecha,
    hora: evento.hora,
    estado: normalizarEstado(evento.estado),
    local: equipoDeAgenda(evento.local),
    visitante: equipoDeAgenda(evento.visitante),
    // La agenda no trae los goles del acta, solo el resultado oficial.
    marcador: null,
    marcadorOficial: crearMarcador(
      evento.local.puntaje,
      evento.visitante.puntaje,
    ),
    pista: evento.pista,
  };
}

/** No hay endpoint de competiciones: se descubren por sus partidos en la agenda. */
export function competicionesDeAgenda(agenda: AgendaApi): Competicion[] {
  const porId = new Map<string, Competicion>();
  for (const e of agenda.eventos) {
    if (!porId.has(e.competicionId)) {
      porId.set(e.competicionId, {
        id: e.competicionId,
        nombre: e.competicionNombre,
        temporada: e.temporada,
      });
    }
  }
  return [...porId.values()];
}

/**
 * Equipos que juegan en la ventana de la agenda en una competición. Si se
 * da `divisionNombre`, solo los de esa división.
 */
export function equiposDeAgenda(
  agenda: AgendaApi,
  competicionId: string,
  divisionNombre?: string,
): Equipo[] {
  const porId = new Map<string, Equipo>();
  for (const e of agenda.eventos) {
    if (e.competicionId !== competicionId) continue;
    if (divisionNombre !== undefined && e.divisionNombre !== divisionNombre) {
      continue;
    }
    for (const lado of [e.local, e.visitante]) {
      if (!porId.has(lado.equipoId)) {
        porId.set(lado.equipoId, equipoDeAgenda(lado));
      }
    }
  }
  return [...porId.values()];
}
