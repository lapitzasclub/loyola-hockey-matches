import { describe, expect, it } from 'vitest';

import { fixturePartido } from '../fixtures';
import { incidenciaDirectoSchema, partidoDetalleSchema } from '../schemas';
import type { IncidenciaApi } from '../schemas';
import { incidenciaDirectoDesdeApi, partidoDetalleDesdeApi } from '.';

const api = partidoDetalleSchema.parse(fixturePartido('roja'));
const partido = partidoDetalleDesdeApi(api);

/** La misma incidencia como llega por el directo: sin dorsales ni nombres. */
function comoDirecto(i: IncidenciaApi) {
  return incidenciaDirectoSchema.parse({
    ...i,
    fechaCreacion: `${i.fechaCreacion}Z`,
    dorsal: null,
    nombre: null,
    atletaNombre: null,
    atletaNombreCorto: null,
  });
}

describe('incidenciaDirectoDesdeApi', () => {
  it('llega a la misma incidencia que REST', () => {
    const porId = new Map(partido.incidencias.map((i) => [i.id, i]));
    for (const i of api.incidencias) {
      const rest = porId.get(i.id);
      if (!rest) continue;
      expect(incidenciaDirectoDesdeApi(comoDirecto(i), partido)).toEqual(rest);
    }
    expect(porId.size).toBeGreaterThan(10);
  });

  it('quien no está en la alineación se queda sin dorsal ni nombre', () => {
    const gol = api.incidencias.find((i) => i.tipo === 'GOL');
    if (!gol) throw new Error('el fixture no tiene goles');
    const desconocido = '00000000-0000-4000-8000-000000000099';
    const incidencia = incidenciaDirectoDesdeApi(
      { ...comoDirecto(gol), plantillaEquipoId: desconocido },
      partido,
    );
    expect(incidencia).toMatchObject({
      tipo: 'GOL',
      autor: { plantillaEquipoId: desconocido, dorsal: null, nombre: null },
    });
  });

  it('descarta la de un equipo que no juega el partido', () => {
    const [primera] = api.incidencias;
    if (!primera) throw new Error('el fixture no tiene incidencias');
    expect(
      incidenciaDirectoDesdeApi(
        { ...comoDirecto(primera), equipoId: partido.id },
        partido,
      ),
    ).toBeNull();
  });
});
