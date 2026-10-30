import { describe, expect, it } from 'vitest';
import {
  disciplinaEquipo,
  lideres,
  rankingEquipos,
  rankingGoleadores,
  rankingJugadores,
  valorRanking,
} from './jugador';

function goleador(nombre: string, goles: number, asistencias = 0) {
  return { nombre, goles, asistencias };
}

describe('rankingGoleadores', () => {
  it('ordena por goles y deja fuera a quien no ha marcado', () => {
    const ranking = rankingGoleadores([
      goleador('Ane', 3),
      goleador('Bea', 0, 5),
      goleador('Carla', 7),
    ]);
    expect(ranking.map((r) => r.jugador.nombre)).toEqual(['Carla', 'Ane']);
  });

  it('comparte puesto a igualdad de goles y ordena por asistencias y nombre', () => {
    const ranking = rankingGoleadores([
      goleador('Zuri', 4, 1),
      goleador('Amaia', 4, 1),
      goleador('Leire', 4, 3),
      goleador('Nora', 2),
      goleador('Irati', 6),
    ]);
    expect(ranking.map((r) => [r.puesto, r.jugador.nombre])).toEqual([
      [1, 'Irati'],
      [2, 'Leire'],
      [2, 'Amaia'],
      [2, 'Zuri'],
      [5, 'Nora'],
    ]);
  });
});

describe('disciplinaEquipo', () => {
  it('suma las sanciones de todos los jugadores', () => {
    const j = (
      faltas: number,
      azules: number,
      amarillas: number,
      rojas: number,
    ) => ({
      faltas,
      azules,
      amarillas,
      rojas,
    });
    expect(disciplinaEquipo([j(3, 1, 0, 0), j(2, 0, 1, 1)])).toEqual({
      faltas: 5,
      azules: 1,
      amarillas: 1,
      rojas: 1,
    });
    expect(disciplinaEquipo([])).toEqual({
      faltas: 0,
      azules: 0,
      amarillas: 0,
      rojas: 0,
    });
  });
});

function ficha(
  nombre: string,
  extra: Partial<Parameters<typeof rankingJugadores>[0][number]> = {},
) {
  return {
    nombre,
    esPortero: false,
    partidosJugados: 3,
    goles: 0,
    asistencias: 0,
    azules: 0,
    rojas: 0,
    golesEncajados: 0,
    porcentajeParadas: 0,
    ...extra,
  };
}

describe('rankingJugadores', () => {
  it('los porteros solo salen en su ranking', () => {
    const jugadores = [
      ficha('Ane', { goles: 2 }),
      ficha('Portera', { esPortero: true, goles: 5, porcentajeParadas: 70 }),
    ];
    expect(
      rankingJugadores(jugadores, 'goles').map((r) => r.jugador.nombre),
    ).toEqual(['Ane']);
    expect(
      rankingJugadores(jugadores, 'porteros').map((r) => r.jugador.nombre),
    ).toEqual(['Portera']);
  });

  it('porteros: por % de paradas, desempata quien encaja menos y exige haber jugado', () => {
    const ranking = rankingJugadores(
      [
        ficha('A', {
          esPortero: true,
          porcentajeParadas: 80,
          golesEncajados: 5,
        }),
        ficha('B', {
          esPortero: true,
          porcentajeParadas: 80,
          golesEncajados: 2,
        }),
        ficha('C', {
          esPortero: true,
          porcentajeParadas: 90,
          partidosJugados: 0,
        }),
      ],
      'porteros',
    );
    expect(ranking.map((r) => [r.puesto, r.jugador.nombre])).toEqual([
      [1, 'B'],
      [1, 'A'],
    ]);
  });

  it('sanciones: la roja pesa el doble para ordenar y el valor es el recuento', () => {
    const jugadores = [
      ficha('Azules', { azules: 3 }),
      ficha('Roja', { rojas: 2 }),
      ficha('Limpio'),
    ];
    const ranking = rankingJugadores(jugadores, 'sanciones');
    expect(ranking.map((r) => r.jugador.nombre)).toEqual(['Roja', 'Azules']);
    expect(valorRanking(jugadores[1]!, 'sanciones')).toBe(2);
  });

  it('asistencias desempata por goles y el límite recorta sin cambiar puestos', () => {
    const ranking = rankingJugadores(
      [
        ficha('A', { asistencias: 2, goles: 1 }),
        ficha('B', { asistencias: 2, goles: 4 }),
        ficha('C', { asistencias: 1 }),
      ],
      'asistencias',
      2,
    );
    expect(ranking.map((r) => [r.puesto, r.jugador.nombre])).toEqual([
      [1, 'B'],
      [1, 'A'],
    ]);
  });
});

describe('lideres', () => {
  it('toma el primero de cada categoría que tiene alguien', () => {
    const resultado = lideres([
      ficha('Ane', { goles: 2, asistencias: 1 }),
      ficha('Bea', { goles: 1, asistencias: 3 }),
    ]);
    expect(
      resultado.map((l) => [l.categoria, l.jugador.nombre, l.valor]),
    ).toEqual([
      ['goles', 'Ane', 2],
      ['asistencias', 'Bea', 3],
    ]);
  });
});

describe('rankingEquipos', () => {
  const fila = (nombre: string, pj: number, gf: number, gc: number) => ({
    nombre,
    pj,
    gf,
    gc,
  });
  const filas = [
    fila('A', 3, 10, 4),
    fila('B', 3, 10, 2),
    fila('C', 0, 0, 0),
    fila('D', 3, 6, 2),
  ];

  it('ataque: más goles a favor, empatados comparten puesto y se ignora a quien no ha jugado', () => {
    expect(
      rankingEquipos(filas, 'ataque').map((r) => [r.puesto, r.fila.nombre]),
    ).toEqual([
      [1, 'A'],
      [1, 'B'],
      [3, 'D'],
    ]);
  });

  it('defensa: menos goles en contra', () => {
    expect(
      rankingEquipos(filas, 'defensa', 2).map((r) => [r.puesto, r.fila.nombre]),
    ).toEqual([
      [1, 'B'],
      [1, 'D'],
    ]);
  });
});
