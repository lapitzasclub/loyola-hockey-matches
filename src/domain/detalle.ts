import type { Alineacion } from './alineacion';
import type { Equipo } from './equipo';
import type { EstadoPartido } from './estado';
import type { Incidencia, Lado } from './incidencia';
import {
  marcadorOficial,
  marcadorPorIncidencias,
  reglaDelMarcador,
  tandaDePenaltis,
} from './marcador';
import type { ReglaMarcador, ReglasPartido, TandaPenaltis } from './marcador';
import type { Marcador } from './partido';

export interface LadoDetalle {
  equipo: Equipo;
  /** Resultado oficial del acta; null hasta cerrarla. */
  puntaje: number | null;
  ganoDesempate: boolean;
  alineacion: Alineacion;
}

export interface Cronica {
  titular: string;
  texto: string;
}

export interface PartidoDetalle {
  id: string;
  competicionId: string;
  competicionNombre: string;
  divisionId: string;
  divisionNombre: string;
  faseId: string;
  jornada: string | null;
  /** `YYYY-MM-DD`. */
  fecha: string;
  hora: string | null;
  pista: string | null;
  coordenadas: { latitud: number; longitud: number } | null;
  arbitros: string[];
  estado: EstadoPartido;
  /** Código de periodo de la federación (ver `periodoPartido`). */
  periodo: number;
  /** Reloj en el momento de la consulta; null si el acta no lo lleva. */
  reloj: { minuto: number; segundo: number; enMarcha: boolean } | null;
  local: LadoDetalle;
  visitante: LadoDetalle;
  /** En orden cronológico. */
  incidencias: Incidencia[];
  reglas: ReglasPartido;
  /** Minutos de cada periodo reglamentario. */
  duracionPeriodos: number[];
  cronica: { es: Cronica | null; eu: Cronica | null } | null;
}

export interface ResultadoPartido {
  /** Goles reales, contados por incidencias: es el marcador en vivo. */
  goles: Marcador;
  /** El `puntaje` del acta o, sin él, el calculado con las reglas de la liga. */
  oficial: Marcador;
  /** Por qué `oficial` difiere de `goles`; null si coinciden. */
  regla: ReglaMarcador | null;
  tanda: TandaPenaltis | null;
  ganadorDesempate: Lado | null;
}

type Desempate = { ganoDesempate: boolean };

export function ganadorDesempate(partido: {
  local: Desempate;
  visitante: Desempate;
}): Lado | null {
  if (partido.local.ganoDesempate) return 'local';
  if (partido.visitante.ganoDesempate) return 'visitante';
  return null;
}

/**
 * Marcadores del partido, derivados de las incidencias para que el directo
 * solo tenga que tocar incidencias y periodo. null si no ha empezado: un
 * partido programado no tiene marcador, ni siquiera 0-0.
 */
export function resultadoPartido(
  partido: PartidoDetalle,
): ResultadoPartido | null {
  if (partido.estado === 'programado') return null;
  const { incidencias, periodo, reglas, local, visitante } = partido;
  const puntaje =
    local.puntaje !== null && visitante.puntaje !== null
      ? { local: local.puntaje, visitante: visitante.puntaje }
      : null;
  const oficial = marcadorOficial(incidencias, periodo, reglas, puntaje);
  const ganador = ganadorDesempate(partido);
  return {
    goles: marcadorPorIncidencias(incidencias),
    oficial,
    regla: reglaDelMarcador(incidencias, periodo, reglas, oficial, ganador),
    tanda: tandaDePenaltis(incidencias),
    ganadorDesempate: ganador,
  };
}
