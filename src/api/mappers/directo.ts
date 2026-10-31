import { indiceAlineacion } from '../../domain';
import type { Incidencia, PartidoDetalle } from '../../domain';
import type { IncidenciaDirectoApi } from '../schemas';
import { incidenciaDesdeApi } from './partido';

/**
 * Incidencia del directo con las personas resueltas por la alineación del
 * detalle, que es de donde REST saca los mismos dorsales y nombres. Quien no
 * esté en la alineación queda sin dorsal ni nombre hasta el siguiente
 * refresco del detalle.
 */
export function incidenciaDirectoDesdeApi(
  i: IncidenciaDirectoApi,
  partido: Pick<PartidoDetalle, 'local' | 'visitante'>,
): Incidencia | null {
  const indice = indiceAlineacion(partido);
  const de = (id: string | null) => (id ? indice.get(id) : undefined);
  const principal = de(i.plantillaEquipoId);
  const secundaria = de(i.plantillaEquipoSecundariaId);
  const portero = de(i.porteroId);
  return incidenciaDesdeApi(
    {
      ...i,
      // REST la da sin zona; las dos son UTC.
      fechaCreacion: i.fechaCreacion.replace(/Z$/, ''),
      dorsal: principal?.dorsal ?? null,
      nombre: principal?.nombre ?? null,
      nombrePila: principal?.nombrePila ?? null,
      fotoUrl: principal?.fotoUrl ?? null,
      dorsalSecundario: secundaria?.dorsal ?? null,
      nombreSecundario: secundaria?.nombre ?? null,
      porteroDorsal: portero?.dorsal ?? null,
      porteroNombre: portero?.nombre ?? null,
    },
    {
      local: partido.local.equipo.equipoId ?? '',
      visitante: partido.visitante.equipo.equipoId ?? '',
    },
  );
}
