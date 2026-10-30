import { describe, expect, it } from 'vitest';
import { construirCatalogoLoyola } from './catalogo';
import type { Competicion, Division } from './competicion';
import {
  completarEquipo,
  esEquipoLoyola,
  fusionarEquipos,
  mismoEquipo,
} from './equipo';
import { equipo } from './test-utils';

describe('esEquipoLoyola', () => {
  it.each([
    ['LOYOLA INDAUTXU', 'LOY'],
    ['LOYOLA INDAUTXU B', 'LOY B'],
    ['Loyola Indautxu A', 'loy a'],
    ['OTRO NOMBRE', 'LOY'],
  ])('reconoce %s (%s)', (nombre, nombreAbrev) => {
    expect(esEquipoLoyola({ nombre, nombreAbrev })).toBe(true);
  });

  it.each([
    ['C.P. BURGOS', 'BUR'],
    ['ALLOY HOCKEY', 'ALLOY'],
    ['LOYU', 'LOYU'],
  ])('no confunde %s (%s)', (nombre, nombreAbrev) => {
    expect(esEquipoLoyola({ nombre, nombreAbrev })).toBe(false);
  });
});

describe('fusionarEquipos', () => {
  it('completa el equipoId que el árbol no trae, cruzando por nombre', () => {
    const arbol = [equipo('LOYOLA INDAUTXU A', { inscripcionId: 'ins-a' })];
    const agenda = [
      equipo('loyola indautxu a ', { equipoId: 'eq-a', clubId: 'club' }),
    ];
    expect(fusionarEquipos(arbol, agenda)).toEqual([
      { ...arbol[0], equipoId: 'eq-a', clubId: 'club' },
    ]);
  });

  it('respeta los datos de la primera fuente y añade los equipos que solo están en otra', () => {
    const a = [equipo('A', { inscripcionId: '1', logoUrl: 'a.webp' })];
    const b = [
      equipo('A', { inscripcionId: '2', logoUrl: 'b.webp' }),
      equipo('B'),
    ];
    const r = fusionarEquipos(a, b);
    expect(r.map((e) => [e.nombre, e.inscripcionId, e.logoUrl])).toEqual([
      ['A', '1', 'a.webp'],
      ['B', null, null],
    ]);
  });
});

describe('mismoEquipo', () => {
  it('casa el equipo del catálogo (solo equipoId) con el del árbol (solo inscripcionId) por nombre', () => {
    const catalogo = equipo('LOYOLA INDAUTXU A', { equipoId: 'eq-a' });
    expect(
      mismoEquipo(
        catalogo,
        equipo('loyola indautxu a', { inscripcionId: '1' }),
      ),
    ).toBe(true);
    expect(
      mismoEquipo(
        catalogo,
        equipo('LOYOLA INDAUTXU B', { inscripcionId: '2' }),
      ),
    ).toBe(false);
  });

  it('si los dos traen el mismo tipo de id, manda el id y no el nombre', () => {
    expect(
      mismoEquipo(
        equipo('A', { inscripcionId: '1' }),
        equipo('A', { inscripcionId: '2' }),
      ),
    ).toBe(false);
    expect(
      mismoEquipo(
        equipo('A', { equipoId: 'x' }),
        equipo('Otro nombre', { equipoId: 'x' }),
      ),
    ).toBe(true);
  });
});

describe('construirCatalogoLoyola', () => {
  const competicion = (id: string, nombre: string): Competicion => ({
    id,
    nombre,
    temporada: 'T2627',
  });
  const division = (id: string, competicionId: string): Division => ({
    id,
    competicionId,
    nombre: 'Infantil Escolar',
    categoria: null,
    genero: null,
    orden: 1,
  });

  it('incluye un Loyola que solo aparece en una de las fuentes', () => {
    const catalogo = construirCatalogoLoyola([
      {
        competicion: competicion('c1', 'LIGA ESCOLAR BENJAMÍN C'),
        division: division('d1', 'c1'),
        fuentes: [
          [equipo('C.P. BURGOS')],
          [],
          [equipo('LOYOLA INDAUTXU B', { inscripcionId: 'b' })],
        ],
      },
    ]);
    expect(catalogo.map((e) => e.equipo.nombre)).toEqual(['LOYOLA INDAUTXU B']);
  });

  it('ordena por competición y después por equipo', () => {
    const catalogo = construirCatalogoLoyola([
      {
        competicion: competicion('c2', 'LIGA NORTE'),
        division: division('d2', 'c2'),
        fuentes: [[equipo('LOYOLA INDAUTXU')]],
      },
      {
        competicion: competicion('c1', 'LIGA ESCOLAR INFANTIL R'),
        division: division('d1', 'c1'),
        fuentes: [[equipo('LOYOLA INDAUTXU B'), equipo('LOYOLA INDAUTXU A')]],
      },
    ]);
    expect(
      catalogo.map((e) => `${e.competicion.nombre} / ${e.equipo.nombre}`),
    ).toEqual([
      'LIGA ESCOLAR INFANTIL R / LOYOLA INDAUTXU A',
      'LIGA ESCOLAR INFANTIL R / LOYOLA INDAUTXU B',
      'LIGA NORTE / LOYOLA INDAUTXU',
    ]);
  });
});

describe('completarEquipo', () => {
  it('añade el equipoId de otras fuentes sin perder la inscripción', () => {
    const base = equipo('LOYOLA INDAUTXU A', { inscripcionId: 'ins-a' });
    const completo = completarEquipo(
      base,
      [equipo('OTRO', { equipoId: 'eq-otro' })],
      [equipo('loyola indautxu a ', { equipoId: 'eq-a', clubId: 'club' })],
    );
    expect(completo).toMatchObject({
      inscripcionId: 'ins-a',
      equipoId: 'eq-a',
      clubId: 'club',
    });
  });

  it('sin coincidencia devuelve el equipo tal cual', () => {
    const base = equipo('SOLO', { inscripcionId: 'ins' });
    expect(completarEquipo(base, [equipo('OTRO', { equipoId: 'x' })])).toEqual(
      base,
    );
  });
});
