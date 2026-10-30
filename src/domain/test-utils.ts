import type { Equipo } from './equipo';
import type { PartidoResumen } from './partido';

/** Constructores mínimos para tests del dominio. */
export function equipo(nombre: string, extra: Partial<Equipo> = {}): Equipo {
  return {
    inscripcionId: null,
    equipoId: null,
    clubId: null,
    nombre,
    nombreAbrev: nombre.slice(0, 3),
    logoUrl: null,
    ...extra,
  };
}

export function partido(extra: Partial<PartidoResumen> = {}): PartidoResumen {
  return {
    id: 'p',
    competicionId: 'c',
    faseId: 'f',
    jornada: null,
    fecha: '2026-10-03',
    hora: null,
    estado: 'programado',
    local: null,
    visitante: null,
    marcador: null,
    marcadorOficial: null,
    pista: null,
    ...extra,
  };
}

/** Partido finalizado entre dos inscripciones con su resultado oficial. */
export function jugado(
  id: string,
  fecha: string,
  local: string,
  visitante: string,
  goles: [number, number],
): PartidoResumen {
  return partido({
    id,
    fecha,
    estado: 'finalizado',
    local: equipo(local, { inscripcionId: local }),
    visitante: equipo(visitante, { inscripcionId: visitante }),
    marcadorOficial: { local: goles[0], visitante: goles[1] },
  });
}
