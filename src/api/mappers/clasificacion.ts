import type {
  Equipo,
  FilaClasificacion,
  Racha,
  ResultadoRacha,
} from '../../domain';
import type { FilaClasificacionApi } from '../schemas';

/** Ojo: en la API `D` es empate (draw), no derrota. */
const RESULTADOS: Record<'W' | 'D' | 'L', ResultadoRacha> = {
  W: 'victoria',
  D: 'empate',
  L: 'derrota',
};

export function rachaDesdeForm(form: readonly ('W' | 'D' | 'L')[]): Racha {
  return form.map((r) => RESULTADOS[r]);
}

function equipoDeFila(fila: FilaClasificacionApi): Equipo {
  return {
    inscripcionId: fila.inscripcionId,
    equipoId: null,
    clubId: fila.clubId,
    nombre: fila.equipoNombre,
    nombreAbrev: fila.equipoNombreAbrev,
    logoUrl: fila.clubLogoUrl,
  };
}

export function filaDesdeApi(fila: FilaClasificacionApi): FilaClasificacion {
  const { form, grupoId, grupoNombre } = fila.datosAdicionales;
  return {
    faseId: fila.faseId,
    grupo: grupoId ? { id: grupoId, nombre: grupoNombre ?? '' } : null,
    equipo: equipoDeFila(fila),
    puesto: fila.puesto,
    pj: fila.pj,
    pg: fila.pg,
    pe: fila.pe,
    pp: fila.pp,
    gf: fila.gf,
    gc: fila.gc,
    dg: fila.dg,
    pts: fila.pts,
    ajustePuntos: fila.ajustePuntos,
    ajusteNota: fila.ajusteNota,
    racha: form ? rachaDesdeForm(form) : null,
  };
}

/** Un equipo sale una vez por grupo; aquí se queda uno por inscripción. */
export function equiposDeClasificacion(
  filas: readonly FilaClasificacionApi[],
): Equipo[] {
  const porId = new Map<string, Equipo>();
  for (const fila of filas) {
    if (!porId.has(fila.inscripcionId)) {
      porId.set(fila.inscripcionId, equipoDeFila(fila));
    }
  }
  return [...porId.values()];
}
