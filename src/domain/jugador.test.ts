import { describe, expect, it } from 'vitest';
import { rankingGoleadores } from './jugador';

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
