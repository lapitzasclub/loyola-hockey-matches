import { ordenPeriodo } from './periodo';

export type Lado = 'local' | 'visitante';

export function ladoContrario(lado: Lado): Lado {
  return lado === 'local' ? 'visitante' : 'local';
}

/**
 * Persona citada en una incidencia. En el directo puede llegar sin dorsal ni
 * nombre: se completan con la alineación por `plantillaEquipoId`.
 */
export interface PersonaIncidencia {
  plantillaEquipoId: string;
  dorsal: string | null;
  nombre: string | null;
}

interface IncidenciaBase {
  id: string;
  /** Equipo al que se apunta la incidencia (en lanzamientos, el que lanza). */
  lado: Lado;
  periodo: number;
  /** El reloj va hacia atrás: 24:59 es el principio de un periodo de 25. */
  minuto: number;
  segundo: number;
  /** Hora UTC de registro (sin zona); desempata incidencias del mismo segundo. */
  registro: string;
}

export type ViaGol = 'juego' | 'penalti' | 'falta-directa';

export interface Gol extends IncidenciaBase {
  tipo: 'GOL';
  autor: PersonaIncidencia | null;
  asistente: PersonaIncidencia | null;
  /** Portero batido, del equipo rival. */
  portero: PersonaIncidencia | null;
  via: ViaGol;
}

export interface Parada extends IncidenciaBase {
  tipo: 'PARADA';
  portero: PersonaIncidencia | null;
}

export interface Falta extends IncidenciaBase {
  tipo: 'FALTA' | 'FALTA-HL';
  /** null en las faltas de equipo sin jugador señalado (la mayoría). */
  jugador: PersonaIncidencia | null;
}

export type ResultadoLanzamiento = 'gol' | 'fallo' | 'pendiente';

/** Penalti o falta directa, dentro del partido o en la tanda. */
export interface Lanzamiento extends IncidenciaBase {
  tipo: 'PENALTI' | 'FALTADIRECTA';
  /** La API no lo trae nunca en juego; quizá sí en la tanda. */
  lanzador: PersonaIncidencia | null;
  /** Portero del equipo que defiende. */
  portero: PersonaIncidencia | null;
  resultado: ResultadoLanzamiento;
}

export interface TiempoMuerto extends IncidenciaBase {
  tipo: 'TM';
}

export interface Cambio extends IncidenciaBase {
  tipo: 'CAMBIO';
  entra: PersonaIncidencia | null;
  sale: PersonaIncidencia | null;
}

export interface Tarjeta extends IncidenciaBase {
  tipo: 'TARJETAAZUL' | 'TARJETAAMARILLA' | 'TARJETAROJA';
  /** Jugador o miembro del staff (este, sin dorsal). */
  persona: PersonaIncidencia | null;
  /** Segundos de exclusión (azul 120, roja 240); null en la amarilla. */
  sancionSegundos: number | null;
}

/** Unión discriminada por `tipo`, con los mismos literales que la API. */
export type Incidencia =
  Gol | Parada | Falta | Lanzamiento | TiempoMuerto | Cambio | Tarjeta;

export type TipoIncidencia = Incidencia['tipo'];

const TIPOS: Record<TipoIncidencia, true> = {
  GOL: true,
  PARADA: true,
  FALTA: true,
  'FALTA-HL': true,
  FALTADIRECTA: true,
  PENALTI: true,
  TM: true,
  CAMBIO: true,
  TARJETAAZUL: true,
  TARJETAAMARILLA: true,
  TARJETAROJA: true,
};

export const TIPOS_INCIDENCIA = Object.keys(TIPOS) as TipoIncidencia[];

export function esTipoIncidencia(tipo: string): tipo is TipoIncidencia {
  return Object.hasOwn(TIPOS, tipo);
}

/** Quien protagoniza la incidencia: el que marca, para, entra, lanza… */
export function protagonista(incidencia: Incidencia): PersonaIncidencia | null {
  switch (incidencia.tipo) {
    case 'GOL':
      return incidencia.autor;
    case 'PARADA':
      return incidencia.portero;
    case 'FALTA':
    case 'FALTA-HL':
      return incidencia.jugador;
    case 'PENALTI':
    case 'FALTADIRECTA':
      return incidencia.lanzador;
    case 'TM':
      return null;
    case 'CAMBIO':
      return incidencia.entra;
    case 'TARJETAAZUL':
    case 'TARJETAAMARILLA':
    case 'TARJETAROJA':
      return incidencia.persona;
  }
}

/**
 * Orden cronológico: por periodo (con el descanso en su sitio), reloj hacia
 * atrás dentro del periodo y, a igualdad de segundo, por hora de registro.
 */
export function compararIncidencias(
  a: Pick<Incidencia, 'periodo' | 'minuto' | 'segundo' | 'registro'>,
  b: Pick<Incidencia, 'periodo' | 'minuto' | 'segundo' | 'registro'>,
): number {
  return (
    ordenPeriodo(a.periodo) - ordenPeriodo(b.periodo) ||
    b.minuto * 60 + b.segundo - (a.minuto * 60 + a.segundo) ||
    (a.registro < b.registro ? -1 : a.registro > b.registro ? 1 : 0)
  );
}

export function ordenarIncidencias<T extends Incidencia>(
  incidencias: readonly T[],
): T[] {
  return [...incidencias].sort(compararIncidencias);
}
