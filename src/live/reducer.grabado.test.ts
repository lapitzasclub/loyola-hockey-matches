import { describe, expect, it } from 'vitest';

import { partidoDetalleDesdeApi } from '../api/mappers';
import { eventoDirectoSchema, partidoDetalleSchema } from '../api/schemas';
import { esGol } from '../domain';
import type { PartidoDetalle } from '../domain';
import { aplicarEvento } from './reducer';

/**
 * Partidos reales grabados con `scripts/grabar-directo.ts` (ver
 * `npm run directo:fixtures`): se aplican sus mensajes en orden sobre el
 * primer detalle y, en cada detalle REST grabado después, el reducer tiene que
 * llegar a lo mismo que la API, salvo que algún mensaje le haya pedido
 * refrescar: entonces el gestor habría pedido el detalle y se parte de él.
 */
const archivos = import.meta.glob<unknown>('./fixtures/*.json', {
  eager: true,
  import: 'default',
});

interface Grabacion {
  partidoId: string;
  eventos: { t: string; data: unknown }[];
  detalles: { t: string; detalle: unknown }[];
}

const detalle = (x: unknown) =>
  partidoDetalleDesdeApi(partidoDetalleSchema.parse(x));

/** Lo que se pinta del directo: estado, periodo, incidencias y goles. */
function huella(p: PartidoDetalle) {
  return {
    estado: p.estado,
    periodo: p.periodo,
    incidencias: p.incidencias.map((x) => x.id).sort(),
    goles: p.incidencias.filter(esGol).map((x) => x.lado),
  };
}

function reproducir(grabacion: Grabacion) {
  const [primero, ...resto] = grabacion.detalles;
  if (!primero) throw new Error('Grabación sin detalles');
  let partido = detalle(primero.detalle);
  let refrescar = false;
  let comprobados = 0;
  let celebrados = 0;
  const eventos = grabacion.eventos.filter((x) => x.t > primero.t);

  for (const punto of resto) {
    while (eventos[0] && eventos[0].t <= punto.t) {
      const { data } = eventos.shift()!;
      const r = aplicarEvento(partido, eventoDirectoSchema.parse(data));
      partido = r.partido;
      refrescar ||= r.refrescar;
      if (r.gol) celebrados++;
    }
    const api = detalle(punto.detalle);
    if (!refrescar) {
      expect(huella(partido), `detalle de ${punto.t}`).toEqual(huella(api));
      comprobados++;
    }
    partido = api;
    refrescar = false;
  }
  return { partido, comprobados, celebrados };
}

describe('reducer del directo con partidos grabados', () => {
  const claves = Object.keys(archivos);

  it('hay grabaciones', () => {
    expect(claves.length).toBeGreaterThan(0);
  });

  it.each(claves)('%s: llega a lo mismo que la API', (ruta) => {
    const grabacion = archivos[ruta] as Grabacion;
    const { partido, comprobados, celebrados } = reproducir(grabacion);
    // Sin al menos unos cuantos puntos comprobados, el test no prueba nada.
    expect(comprobados).toBeGreaterThanOrEqual(3);
    expect(celebrados).toBeGreaterThan(0);
    expect(partido.estado).toBe('finalizado');
  });

  it.each(claves)('%s: todos los mensajes pasan el esquema', (ruta) => {
    const { eventos } = archivos[ruta] as Grabacion;
    const tipos = new Set(
      eventos.map((x) => eventoDirectoSchema.parse(x.data).type),
    );
    expect(tipos).toContain('incidencia_creada');
    expect(tipos).toContain('incidencia_eliminada');
    expect(tipos).toContain('periodo_actualizado');
    expect(tipos).toContain('acta_cerrada');
  });
});
