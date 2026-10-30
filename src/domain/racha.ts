import { juega, ordenarPartidos } from './partido';
import type { PartidoResumen } from './partido';

export type ResultadoRacha = 'victoria' | 'empate' | 'derrota';

/** Resultados de más antiguo a más reciente. */
export type Racha = ResultadoRacha[];

/** Resultado oficial del partido para un equipo; null si no lo jugó o no ha terminado. */
export function resultadoPara(
  partido: PartidoResumen,
  inscripcionId: string,
): ResultadoRacha | null {
  const m = partido.marcadorOficial;
  if (partido.estado !== 'finalizado' || !m || !juega(partido, inscripcionId)) {
    return null;
  }
  const esLocal = partido.local?.inscripcionId === inscripcionId;
  const propios = esLocal ? m.local : m.visitante;
  const ajenos = esLocal ? m.visitante : m.local;
  if (propios > ajenos) return 'victoria';
  if (propios < ajenos) return 'derrota';
  return 'empate';
}

/**
 * Racha de un equipo con los partidos de una fase. Usa el resultado oficial,
 * que es el que cuenta para la clasificación (no los goles del acta). Si la
 * tabla es de un grupo, solo cuentan los partidos entre equipos del grupo:
 * los grupos se solapan y un equipo juega también contra rivales de fuera.
 * Así coincide con la racha que calcula la federación.
 */
export function calcularRacha(
  inscripcionId: string,
  partidosDeLaFase: readonly PartidoResumen[],
  equiposDelGrupo?: ReadonlySet<string>,
): Racha {
  const delGrupo = (p: PartidoResumen) =>
    !equiposDelGrupo ||
    [p.local, p.visitante].every(
      (e) => e?.inscripcionId != null && equiposDelGrupo.has(e.inscripcionId),
    );
  return ordenarPartidos(partidosDeLaFase.filter(delGrupo)).flatMap((p) => {
    const resultado = resultadoPara(p, inscripcionId);
    return resultado ? [resultado] : [];
  });
}
