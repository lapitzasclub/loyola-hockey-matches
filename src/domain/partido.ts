import type { Fase } from './competicion';
import type { Equipo } from './equipo';
import type { EstadoPartido } from './estado';

export interface Marcador {
  local: number;
  visitante: number;
}

export interface PartidoResumen {
  id: string;
  competicionId: string;
  /** null si viene de la agenda, que no trae la fase. */
  faseId: string | null;
  jornada: string | null;
  /** `YYYY-MM-DD`. */
  fecha: string;
  /** `HH:MM`; null si la federación aún no la ha fijado. */
  hora: string | null;
  estado: EstadoPartido;
  /** null en un cruce de eliminatoria cuyo rival aún no se conoce. */
  local: Equipo | null;
  visitante: Equipo | null;
  /** Goles reales del acta; null hasta que el partido termina. */
  marcador: Marcador | null;
  /** Resultado oficial (`puntaje`), capado en ligas escolares (19-1 → 6-0). */
  marcadorOficial: Marcador | null;
  pista: string | null;
}

/** Calendario de una división: sus fases y todos sus partidos, por fecha y hora. */
export interface CalendarioDivision {
  fases: Fase[];
  partidos: PartidoResumen[];
}

/**
 * Marcador a partir de los dos lados; null si falta alguno. `puntaje` llega
 * como float (`3.00`), así que se redondea.
 */
export function crearMarcador(
  local: number | null | undefined,
  visitante: number | null | undefined,
): Marcador | null {
  if (local == null || visitante == null) return null;
  return { local: Math.round(local), visitante: Math.round(visitante) };
}

function comparar(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Orden cronológico por fecha y hora, nunca por jornada: los aplazados se
 * juegan fuera del orden de su jornada. Sin hora, al final del día.
 */
export function compararPorFechaHora(
  a: Pick<PartidoResumen, 'id' | 'fecha' | 'hora'>,
  b: Pick<PartidoResumen, 'id' | 'fecha' | 'hora'>,
): number {
  if (a.fecha !== b.fecha) return comparar(a.fecha, b.fecha);
  if (a.hora !== b.hora) {
    if (a.hora === null) return 1;
    if (b.hora === null) return -1;
    return comparar(a.hora, b.hora);
  }
  return comparar(a.id, b.id);
}

export function ordenarPartidos<
  T extends Pick<PartidoResumen, 'id' | 'fecha' | 'hora'>,
>(partidos: readonly T[]): T[] {
  return [...partidos].sort(compararPorFechaHora);
}

export function juega(partido: PartidoResumen, inscripcionId: string): boolean {
  return (
    partido.local?.inscripcionId === inscripcionId ||
    partido.visitante?.inscripcionId === inscripcionId
  );
}
