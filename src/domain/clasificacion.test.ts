import { describe, expect, it } from 'vitest';
import {
  agruparClasificacion,
  faseInicial,
  filaDeEquipo,
  rachasDeTabla,
} from './clasificacion';
import type { FilaClasificacion } from './clasificacion';
import { colorHex, leyendaDePuesto, parsearPuestos } from './competicion';
import type { Fase, Leyenda } from './competicion';
import { equipo, jugado } from './test-utils';

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

describe('rachasDeTabla', () => {
  const tablaDe = (ids: string[], grupo: FilaClasificacion['grupo']) => ({
    faseId: 'f',
    grupo,
    leyendas: [],
    filas: ids.map((id, i) => fila(id, i + 1, grupo)),
  });
  const deLaFase = (id: string, fecha: string, l: string, v: string) => ({
    ...jugado(id, fecha, l, v, [2, 1]),
    faseId: 'f',
  });

  it('calcula la racha con los últimos partidos de la fase', () => {
    const partidos = ['1', '2', '3', '4', '5', '6'].map((n) =>
      deLaFase(`p${n}`, `2026-10-0${n}`, 'a', 'b'),
    );
    const rachas = rachasDeTabla(tablaDe(['a', 'b'], null), partidos);
    expect(rachas.get('a')).toHaveLength(5);
    expect(rachas.get('a')?.every((r) => r === 'victoria')).toBe(true);
    expect(rachas.get('b')?.every((r) => r === 'derrota')).toBe(true);
  });

  it('en un grupo ignora los partidos contra rivales de fuera', () => {
    const grupo = { id: 'g', nombre: 'Sector' };
    const partidos = [
      deLaFase('p1', '2026-10-03', 'a', 'b'),
      deLaFase('p2', '2026-10-10', 'a', 'fuera'),
    ];
    const rachas = rachasDeTabla(tablaDe(['a', 'b'], grupo), partidos);
    expect(rachas.get('a')).toEqual(['victoria']);
  });

  it('no cuenta partidos de otra fase', () => {
    const otra = { ...deLaFase('p', '2026-10-03', 'a', 'b'), faseId: 'otra' };
    expect(rachasDeTabla(tablaDe(['a', 'b'], null), [otra]).get('a')).toEqual(
      [],
    );
  });
});

describe('filaDeEquipo y faseInicial', () => {
  it('busca la fila en la primera tabla donde sale el equipo', () => {
    const g1 = { id: 'g1', nombre: 'A' };
    const g2 = { id: 'g2', nombre: 'B' };
    const tablas = [
      { faseId: 'f', grupo: g1, leyendas: [], filas: [fila('a', 1, g1)] },
      {
        faseId: 'f',
        grupo: g2,
        leyendas: [],
        filas: [fila('b', 1, g2), fila('a', 2, g2)],
      },
    ];
    expect(filaDeEquipo(tablas, 'a')?.grupo?.id).toBe('g1');
    expect(filaDeEquipo(tablas, 'b')?.puesto).toBe(1);
    expect(filaDeEquipo(tablas, 'z')).toBeNull();
  });

  it('la fase inicial es la primera de liga', () => {
    const f = (id: string, formato: Fase['formato']): Fase => ({
      id,
      nombre: id,
      orden: 1,
      formato,
      grupos: [],
      leyendas: [],
    });
    expect(
      faseInicial([f('copa', 'eliminatoria'), f('liga', 'liga')])?.id,
    ).toBe('liga');
    expect(faseInicial([f('copa', 'eliminatoria')])?.id).toBe('copa');
    expect(faseInicial([])).toBeNull();
  });
});
