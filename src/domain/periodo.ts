import { PERIODO_FINALIZADO } from './estado';

/**
 * Códigos de `periodo` de la federación, además de 1..4 (periodos de juego)
 * y 30 (acta cerrada, en `estado.ts`).
 */
export const PERIODO_PREVIA = 0;
export const PERIODO_DESCANSO = 9;
export const PERIODO_PRORROGA_1 = 11;
export const PERIODO_PRORROGA_2 = 12;
export const PERIODO_PENALTIS = 21;

/** Último periodo de juego reglamentario que contempla la federación. */
export const MAX_PERIODOS_JUEGO = 4;

export type PeriodoPartido =
  | { tipo: 'previa' }
  | { tipo: 'juego'; numero: number }
  | { tipo: 'descanso' }
  | { tipo: 'prorroga'; numero: 1 | 2 }
  | { tipo: 'penaltis' }
  | { tipo: 'final' }
  | { tipo: 'desconocido'; codigo: number };

export function esPeriodoDeJuego(codigo: number): boolean {
  return codigo >= 1 && codigo <= MAX_PERIODOS_JUEGO;
}

export function periodoPartido(codigo: number): PeriodoPartido {
  if (codigo <= PERIODO_PREVIA) return { tipo: 'previa' };
  if (esPeriodoDeJuego(codigo)) return { tipo: 'juego', numero: codigo };
  switch (codigo) {
    case PERIODO_DESCANSO:
      return { tipo: 'descanso' };
    case PERIODO_PRORROGA_1:
      return { tipo: 'prorroga', numero: 1 };
    case PERIODO_PRORROGA_2:
      return { tipo: 'prorroga', numero: 2 };
    case PERIODO_PENALTIS:
      return { tipo: 'penaltis' };
    case PERIODO_FINALIZADO:
      return { tipo: 'final' };
  }
  return { tipo: 'desconocido', codigo };
}

/**
 * Posición cronológica del periodo. El código 9 no sigue el orden numérico:
 * es el descanso entre el primer y el segundo periodo (solo se ha visto en
 * partidos de dos periodos, con los cambios hechos en el descanso).
 */
export function ordenPeriodo(codigo: number): number {
  return codigo === PERIODO_DESCANSO ? 1.5 : codigo;
}
