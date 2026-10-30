import type { Fase, Leyenda } from './competicion';
import type { Equipo } from './equipo';
import type { Racha } from './racha';

export interface FilaClasificacion {
  faseId: string;
  /** null en una fase sin grupos. */
  grupo: { id: string; nombre: string } | null;
  equipo: Equipo;
  puesto: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
  /** Puntos quitados o sumados por el comité, con su motivo. */
  ajustePuntos: number;
  ajusteNota: string | null;
  /** Racha que calcula la federación; null si no la manda. */
  racha: Racha | null;
}

export interface TablaClasificacion {
  faseId: string;
  grupo: { id: string; nombre: string } | null;
  /** Ordenadas por puesto. */
  filas: FilaClasificacion[];
  leyendas: Leyenda[];
}

/**
 * Parte las filas de una fase en una tabla por grupo, en el orden en que la
 * fase declara sus grupos. La API mezcla en la misma respuesta las filas de
 * todos los grupos, y un equipo sale una vez por cada grupo en el que está.
 */
export function agruparClasificacion(
  fase: Fase,
  filas: readonly FilaClasificacion[],
): TablaClasificacion[] {
  const tablas = new Map<string, TablaClasificacion>();
  for (const fila of filas) {
    if (fila.faseId !== fase.id) continue;
    const clave = fila.grupo?.id ?? '';
    let tabla = tablas.get(clave);
    if (!tabla) {
      const grupo = fase.grupos.find((g) => g.id === fila.grupo?.id);
      tabla = {
        faseId: fase.id,
        grupo: fila.grupo,
        filas: [],
        leyendas: fila.grupo ? (grupo?.leyendas ?? []) : fase.leyendas,
      };
      tablas.set(clave, tabla);
    }
    tabla.filas.push(fila);
  }
  const orden = (t: TablaClasificacion) => {
    const i = fase.grupos.findIndex((g) => g.id === t.grupo?.id);
    return i === -1 ? fase.grupos.length : i;
  };
  return [...tablas.values()]
    .sort((a, b) => orden(a) - orden(b))
    .map((t) => ({
      ...t,
      filas: [...t.filas].sort((a, b) => a.puesto - b.puesto),
    }));
}
