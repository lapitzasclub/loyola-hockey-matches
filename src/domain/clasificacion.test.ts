import { describe, expect, it } from 'vitest';
import { agruparClasificacion } from './clasificacion';
import type { FilaClasificacion } from './clasificacion';
import { colorHex, leyendaDePuesto, parsearPuestos } from './competicion';
import type { Fase, Leyenda } from './competicion';
import { equipo } from './test-utils';

const leyenda = (puestos: number[], descripcion: string): Leyenda => ({
  puestos,
  descripcion,
  color: '#dcfce7',
  colorTexto: '#22c55e',
});

function fila(
  inscripcionId: string,
  puesto: number,
  grupo: FilaClasificacion['grupo'] = null,
): FilaClasificacion {
  return {
    faseId: 'f',
    grupo,
    equipo: equipo(inscripcionId, { inscripcionId }),
    puesto,
    pj: 0,
    pg: 0,
    pe: 0,
    pp: 0,
    gf: 0,
    gc: 0,
    dg: 0,
    pts: 0,
    ajustePuntos: 0,
    ajusteNota: null,
    racha: null,
  };
}

describe('agruparClasificacion', () => {
  const sector = { id: 'g-sector', nombre: 'Sector' };
  const general = { id: 'g-general', nombre: 'General' };
  const fase: Fase = {
    id: 'f',
    nombre: 'FASE REGULAR',
    orden: 1,
    formato: 'liga',
    grupos: [
      {
        ...sector,
        inscripcionIds: ['a', 'b'],
        leyendas: [leyenda([1, 2], 'Plazas sector')],
      },
      { ...general, inscripcionIds: ['a', 'b', 'c'], leyendas: [] },
    ],
    leyendas: [],
  };

  it('saca una tabla por grupo, en el orden de la fase y con el equipo repetido si está en dos', () => {
    const tablas = agruparClasificacion(fase, [
      fila('c', 3, general),
      fila('a', 1, general),
      fila('b', 1, sector),
      fila('b', 2, general),
      fila('a', 2, sector),
    ]);
    expect(tablas.map((t) => t.grupo?.nombre)).toEqual(['Sector', 'General']);
    expect(
      tablas.map((t) => t.filas.map((f) => f.equipo.inscripcionId)),
    ).toEqual([
      ['b', 'a'],
      ['a', 'b', 'c'],
    ]);
    expect(tablas[0]?.leyendas.map((l) => l.descripcion)).toEqual([
      'Plazas sector',
    ]);
  });

  it('en una fase sin grupos usa una sola tabla con las leyendas de la fase', () => {
    const sinGrupos: Fase = {
      ...fase,
      grupos: [],
      leyendas: [leyenda([1], 'Ascenso')],
    };
    const tablas = agruparClasificacion(sinGrupos, [
      fila('b', 2),
      fila('a', 1),
    ]);
    expect(tablas).toHaveLength(1);
    expect(tablas[0]?.grupo).toBeNull();
    expect(tablas[0]?.filas.map((f) => f.puesto)).toEqual([1, 2]);
    expect(tablas[0]?.leyendas.map((l) => l.descripcion)).toEqual(['Ascenso']);
  });

  it('descarta filas de otra fase', () => {
    expect(
      agruparClasificacion(fase, [{ ...fila('a', 1), faseId: 'otra' }]),
    ).toEqual([]);
  });
});

describe('leyendas', () => {
  it('parsea listas y rangos de puestos', () => {
    expect(parsearPuestos('1')).toEqual([1]);
    expect(parsearPuestos('2,3,4')).toEqual([2, 3, 4]);
    expect(parsearPuestos(' 1-3 , 8')).toEqual([1, 2, 3, 8]);
    expect(parsearPuestos('')).toEqual([]);
    expect(parsearPuestos('a,2')).toEqual([2]);
  });

  it('solo acepta colores hex', () => {
    expect(colorHex('#dcfce7')).toBe('#dcfce7');
    expect(colorHex('#FFF')).toBe('#FFF');
    expect(colorHex('var(--color-ds-ok-bg)')).toBeNull();
    expect(colorHex('red; background:url(x)')).toBeNull();
    expect(colorHex(null)).toBeNull();
  });

  it('encuentra la franja de un puesto', () => {
    const leyendas = [
      leyenda([1], 'Ascenso'),
      leyenda([2, 3, 4], 'Final four'),
    ];
    expect(leyendaDePuesto(leyendas, 3)?.descripcion).toBe('Final four');
    expect(leyendaDePuesto(leyendas, 5)).toBeNull();
  });
});
