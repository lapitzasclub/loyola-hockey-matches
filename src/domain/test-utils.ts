import type { LadoDetalle, PartidoDetalle } from './detalle';
import type { Equipo } from './equipo';
import type { Gol, Lado, Lanzamiento } from './incidencia';
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

function ladoDetalle(nombre: string): LadoDetalle {
  return {
    equipo: equipo(nombre, { equipoId: nombre }),
    puntaje: null,
    ganoDesempate: false,
    alineacion: { jugadores: [], staff: [] },
  };
}

/** Detalle de un partido programado a dos periodos sin reglas especiales. */
export function detalle(extra: Partial<PartidoDetalle> = {}): PartidoDetalle {
  return {
    id: 'p',
    competicionId: 'c',
    competicionNombre: 'Liga',
    divisionId: 'd',
    divisionNombre: 'División',
    faseId: 'f',
    jornada: null,
    fecha: '2026-10-03',
    hora: null,
    pista: null,
    coordenadas: null,
    arbitros: [],
    estado: 'programado',
    periodo: 0,
    reloj: null,
    local: ladoDetalle('loc'),
    visitante: ladoDetalle('vis'),
    incidencias: [],
    reglas: {
      marcadorACero: false,
      maxDiferenciaGoles: 0,
      puntuacionPorPeriodos: false,
      numeroPeriodos: 2,
      puntoBonus: false,
      desempatePenaltis: false,
    },
    duracionPeriodos: [25, 25],
    cronica: null,
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

let siguienteIncidencia = 0;

function baseIncidencia(lado: Lado, periodo: number) {
  siguienteIncidencia += 1;
  return {
    id: `i${siguienteIncidencia}`,
    lado,
    periodo,
    minuto: 10,
    segundo: 0,
    registro: '2026-10-03T18:00:00',
  };
}

export function gol(lado: Lado, periodo = 1, extra: Partial<Gol> = {}): Gol {
  return {
    ...baseIncidencia(lado, periodo),
    tipo: 'GOL',
    autor: null,
    asistente: null,
    portero: null,
    via: 'juego',
    ...extra,
  };
}

/** Penalti de la tanda (periodo 21) salvo que se diga otro periodo. */
export function penalti(
  lado: Lado,
  resultado: Lanzamiento['resultado'],
  extra: Partial<Lanzamiento> = {},
): Lanzamiento {
  return {
    ...baseIncidencia(lado, 21),
    tipo: 'PENALTI',
    lanzador: null,
    portero: null,
    resultado,
    ...extra,
  };
}
