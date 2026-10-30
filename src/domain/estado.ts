export type EstadoPartido = 'programado' | 'en_juego' | 'finalizado';

/** Periodo con el que la API marca el acta cerrada. */
export const PERIODO_FINALIZADO = 30;

const FINALIZADO = new Set(['FINISHED', 'FINALIZADO']);
const EN_JUEGO = new Set(['EN_JUEGO', 'IN_PROGRESS', 'PROGRESS']);

/**
 * Unifica los dos vocabularios de estado de la API: la agenda usa PROGRAMADO,
 * EN_JUEGO y FINALIZADO; el árbol y el detalle, SCHEDULED y FINISHED (y
 * PROGRAMADO en eliminatorias). Si llega el periodo, manda sobre el texto,
 * porque el detalle se queda en PROGRAMADO durante el partido: 30 es acta
 * cerrada y 1..29 es en juego. Un periodo de 0 o menos no dice nada (así
 * llegan en `/marcadores` los partidos sin empezar). Un estado desconocido
 * cuenta como programado.
 */
export function normalizarEstado(
  estado: string | null | undefined,
  periodo?: number | null,
): EstadoPartido {
  if (periodo === PERIODO_FINALIZADO) return 'finalizado';
  const texto = (estado ?? '').trim().toUpperCase();
  if (FINALIZADO.has(texto)) return 'finalizado';
  if (EN_JUEGO.has(texto)) return 'en_juego';
  if (periodo != null && periodo > 0 && periodo < PERIODO_FINALIZADO) {
    return 'en_juego';
  }
  return 'programado';
}

/**
 * Estado del detalle de partido. Su `estado` se queda en SCHEDULED durante el
 * juego, así que manda `periodo` (vía `normalizarEstado`); el acta finalizada
 * también lo cierra. Las incidencias no cuentan: hay cambios registrados en
 * el periodo 0, antes de empezar.
 */
export function estadoDetalle(
  estado: string,
  actaEstado: string | null,
  periodo: number,
): EstadoPartido {
  if ((actaEstado ?? '').trim().toUpperCase() === 'FINALIZADO') {
    return 'finalizado';
  }
  return normalizarEstado(estado, periodo);
}
