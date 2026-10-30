import { PERIODO_FINALIZADO } from './estado';
import type { EstadoPartido } from './estado';
import { ordenarIncidencias } from './incidencia';
import type { Incidencia, Lado, Lanzamiento } from './incidencia';
import type { Marcador } from './partido';
import {
  PERIODO_PENALTIS,
  PERIODO_PRORROGA_1,
  PERIODO_PRORROGA_2,
  esPeriodoDeJuego,
} from './periodo';

/** Reglas de la liga que convierten los goles en el resultado oficial. */
export interface ReglasMarcador {
  /** Ligas escolares donde el resultado oficial es siempre 0-0. */
  marcadorACero: boolean;
  /** Diferencia máxima que se refleja en el oficial; 0 = sin tope. */
  maxDiferenciaGoles: number;
  /** Cada periodo vale 2 puntos al ganador o 1-1 si empatan. */
  puntuacionPorPeriodos: boolean;
  /** Periodos reglamentarios (la API puede mandar 0; ver el mapper). */
  numeroPeriodos: number;
}

type Goles = Pick<Incidencia, 'tipo' | 'lado' | 'periodo'>;

function esGol(incidencia: Goles): boolean {
  return incidencia.tipo === 'GOL' && incidencia.periodo !== PERIODO_PENALTIS;
}

function contar(goles: readonly Goles[], lado: Lado): number {
  return goles.filter((g) => g.lado === lado).length;
}

/**
 * Marcador real, contando incidencias GOL por lado: es lo que vale en vivo,
 * cuando el `puntaje` aún es null. La tanda de penaltis no suma.
 */
export function marcadorPorIncidencias(
  incidencias: readonly Goles[],
): Marcador {
  const goles = incidencias.filter(esGol);
  return {
    local: contar(goles, 'local'),
    visitante: contar(goles, 'visitante'),
  };
}

/** `marcadorACero` y `maxDiferenciaGoles` sobre los goles reales. */
export function marcadorConReglas(
  goles: Marcador,
  reglas: Pick<ReglasMarcador, 'marcadorACero' | 'maxDiferenciaGoles'>,
): Marcador {
  if (reglas.marcadorACero) return { local: 0, visitante: 0 };
  const max = reglas.maxDiferenciaGoles;
  const { local, visitante } = goles;
  if (max <= 0 || Math.abs(local - visitante) <= max) return goles;
  return local > visitante
    ? { local: visitante + max, visitante }
    : { local, visitante: local + max };
}

/**
 * Periodos que cuentan para la puntuación por periodos. En juego, los
 * disputados hasta ahora; con el acta cerrada, todos; en pausa (descanso,
 * prórroga, tanda), el último con incidencias sin pasar de los reglamentarios.
 */
export function periodosJugados(
  periodo: number,
  numeroPeriodos: number,
  ultimoConIncidencias: number,
): number {
  if (esPeriodoDeJuego(periodo)) return periodo;
  if (periodo >= PERIODO_FINALIZADO) return numeroPeriodos;
  if (periodo <= 0) return 0;
  return Math.min(
    Math.max(ultimoConIncidencias, 1),
    Math.max(numeroPeriodos, 1),
  );
}

function ultimoPeriodoConIncidencias(
  incidencias: readonly Pick<Incidencia, 'periodo'>[],
): number {
  return incidencias.reduce(
    (max, i) =>
      esPeriodoDeJuego(i.periodo) && i.periodo > max ? i.periodo : max,
    0,
  );
}

/** Goles de cada periodo jugado, como pares local-visitante. */
export function parcialesPorPeriodo(
  incidencias: readonly Goles[],
  periodo: number,
  numeroPeriodos: number,
): Marcador[] {
  const goles = incidencias.filter(esGol);
  const jugados = periodosJugados(
    periodo,
    numeroPeriodos,
    ultimoPeriodoConIncidencias(incidencias),
  );
  return Array.from({ length: jugados }, (_, i) => {
    const delPeriodo = goles.filter((g) => g.periodo === i + 1);
    return {
      local: contar(delPeriodo, 'local'),
      visitante: contar(delPeriodo, 'visitante'),
    };
  });
}

/** 2 puntos por periodo ganado y 1 a cada uno por periodo empatado. */
export function marcadorPorPeriodos(parciales: readonly Marcador[]): Marcador {
  return parciales.reduce(
    (total, p) => ({
      local:
        total.local +
        (p.local > p.visitante ? 2 : p.local === p.visitante ? 1 : 0),
      visitante:
        total.visitante +
        (p.visitante > p.local ? 2 : p.local === p.visitante ? 1 : 0),
    }),
    { local: 0, visitante: 0 },
  );
}

/**
 * Resultado oficial calculado como lo hace la federación mientras no hay
 * `puntaje`. Con `puntaje` manda este: hay actas cerradas que se saltan la
 * regla (10-0 con diferencia máxima 5).
 */
export function marcadorOficial(
  incidencias: readonly Goles[],
  periodo: number,
  reglas: ReglasMarcador,
  puntaje: Marcador | null,
): Marcador {
  if (puntaje) return puntaje;
  if (reglas.puntuacionPorPeriodos) {
    return marcadorPorPeriodos(
      parcialesPorPeriodo(incidencias, periodo, reglas.numeroPeriodos),
    );
  }
  return marcadorConReglas(marcadorPorIncidencias(incidencias), reglas);
}

export interface ReglasPartido extends ReglasMarcador {
  /** Punto extra al ganador del desempate (prórroga o penaltis). */
  puntoBonus: boolean;
  /** El empate se resuelve con tanda de penaltis. */
  desempatePenaltis: boolean;
}

/** Por qué el resultado oficial no coincide con los goles. */
export type ReglaMarcador =
  | { tipo: 'por-periodos'; parciales: Marcador[] }
  | { tipo: 'desempate'; ganador: Lado; via: 'penaltis' | 'prorroga' }
  | { tipo: 'a-cero' }
  | { tipo: 'diferencia-maxima'; max: number };

/**
 * Regla que explica el resultado oficial, para mostrarla junto al marcador.
 * null si el oficial son los goles tal cual. El desempate se reconoce por
 * `ganoDesempate`: por penaltis si hubo tanda y nadie marcó en la prórroga.
 */
export function reglaDelMarcador(
  incidencias: readonly Goles[],
  periodo: number,
  reglas: Omit<ReglasPartido, 'desempatePenaltis'>,
  oficial: Marcador,
  ganadorDesempate: Lado | null,
): ReglaMarcador | null {
  if (reglas.puntuacionPorPeriodos) {
    const parciales = parcialesPorPeriodo(
      incidencias,
      periodo,
      reglas.numeroPeriodos,
    );
    return parciales.length > 0 ? { tipo: 'por-periodos', parciales } : null;
  }
  if (reglas.puntoBonus && ganadorDesempate) {
    const huboTanda = incidencias.some(
      (i) => i.tipo === 'PENALTI' && i.periodo === PERIODO_PENALTIS,
    );
    const golesEnProrroga = incidencias.some(
      (i) =>
        i.tipo === 'GOL' &&
        (i.periodo === PERIODO_PRORROGA_1 || i.periodo === PERIODO_PRORROGA_2),
    );
    return {
      tipo: 'desempate',
      ganador: ganadorDesempate,
      via: huboTanda && !golesEnProrroga ? 'penaltis' : 'prorroga',
    };
  }
  const goles = marcadorPorIncidencias(incidencias);
  if (goles.local === oficial.local && goles.visitante === oficial.visitante) {
    return null;
  }
  if (reglas.marcadorACero) {
    return goles.local + goles.visitante > 0 ? { tipo: 'a-cero' } : null;
  }
  const max = reglas.maxDiferenciaGoles;
  return max > 0 && Math.abs(goles.local - goles.visitante) > max
    ? { tipo: 'diferencia-maxima', max }
    : null;
}

export interface RondaTanda {
  numero: number;
  local: Lanzamiento | null;
  visitante: Lanzamiento | null;
}

export interface TandaPenaltis {
  /** Al menos cinco rondas, aunque falten lanzamientos por tirar. */
  rondas: RondaTanda[];
  marcador: Marcador;
}

/**
 * Tanda de penaltis (PENALTI en el periodo 21), en rondas. null si no la
 * hubo. Solo cuenta como marcado el resultado exactamente `gol`.
 */
export function tandaDePenaltis(
  incidencias: readonly Incidencia[],
): TandaPenaltis | null {
  const tanda = ordenarIncidencias(
    incidencias.filter(
      (i): i is Lanzamiento =>
        i.tipo === 'PENALTI' && i.periodo === PERIODO_PENALTIS,
    ),
  );
  if (tanda.length === 0) return null;
  const local = tanda.filter((p) => p.lado === 'local');
  const visitante = tanda.filter((p) => p.lado === 'visitante');
  const total = Math.max(5, local.length, visitante.length);
  const marcados = (lanzamientos: Lanzamiento[]) =>
    lanzamientos.filter((p) => p.resultado === 'gol').length;
  return {
    rondas: Array.from({ length: total }, (_, i) => ({
      numero: i + 1,
      local: local[i] ?? null,
      visitante: visitante[i] ?? null,
    })),
    marcador: { local: marcados(local), visitante: marcados(visitante) },
  };
}

/** Marcador de un partido empezado según `/marcadores`, sin incidencias. */
export interface MarcadorDirecto {
  partidoId: string;
  competicionId: string;
  estado: EstadoPartido;
  periodo: number;
  /** Goles reales. */
  goles: Marcador;
  /**
   * Oficial con las reglas de la liga; null si puntúa por periodos, que
   * necesita las incidencias del detalle.
   */
  oficial: Marcador | null;
  ganadorDesempate: Lado | null;
}
