import type { Equipo, MarcadorDirecto, PartidoResumen } from '../../domain';

/** Lo que cada sección del detalle necesita saber del equipo abierto. */
export interface DatosEquipo {
  /** Con los ids de todas las fuentes que se hayan podido cruzar. */
  equipo: Equipo;
  inscripcionId: string;
  divisionId: string;
  /** Sus partidos, por fecha y hora. */
  partidos: PartidoResumen[];
  /** Todos los de la división: de ahí salen los de cada jornada. */
  calendario: readonly PartidoResumen[];
  /** `YYYY-MM-DD`. */
  hoy: string;
  /** Marcadores de `/marcadores` por partido, para el directo en las listas. */
  directos: ReadonlyMap<string, MarcadorDirecto>;
}
