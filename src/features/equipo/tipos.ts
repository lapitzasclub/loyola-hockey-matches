import type { Equipo, PartidoResumen } from '../../domain';

/** Lo que cada sección del detalle necesita saber del equipo abierto. */
export interface DatosEquipo {
  /** Con los ids de todas las fuentes que se hayan podido cruzar. */
  equipo: Equipo;
  inscripcionId: string;
  divisionId: string;
  /** Sus partidos, por fecha y hora. */
  partidos: PartidoResumen[];
  /** `YYYY-MM-DD`. */
  hoy: string;
}
