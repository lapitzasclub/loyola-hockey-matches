import { describe, expect, it } from 'vitest';
import { calcularRacha, resultadoPara } from './racha';
import { equipo, jugado, partido } from './test-utils';

describe('resultadoPara', () => {
  it('usa el resultado oficial, no los goles del acta', () => {
    const p = {
      ...jugado('p', '2026-10-03', 'loy', 'riv', [6, 0]),
      marcador: { local: 19, visitante: 1 },
    };
    expect(resultadoPara(p, 'loy')).toBe('victoria');
    expect(resultadoPara(p, 'riv')).toBe('derrota');
  });

  it('reconoce el empate y el lado visitante', () => {
    expect(
      resultadoPara(jugado('p', '2026-10-03', 'a', 'b', [2, 2]), 'b'),
    ).toBe('empate');
    expect(
      resultadoPara(jugado('p', '2026-10-03', 'a', 'b', [1, 3]), 'b'),
    ).toBe('victoria');
  });

  it('ignora partidos sin terminar o de otros equipos', () => {
    const pendiente = partido({
      estado: 'programado',
      local: equipo('A', { inscripcionId: 'a' }),
      marcadorOficial: { local: 0, visitante: 0 },
    });
    expect(resultadoPara(pendiente, 'a')).toBeNull();
    expect(
      resultadoPara(jugado('p', '2026-10-03', 'a', 'b', [1, 0]), 'c'),
    ).toBeNull();
  });
});

describe('calcularRacha', () => {
  const partidos = [
    jugado('3', '2026-10-17', 'loy', 'c', [0, 1]),
    jugado('1', '2026-10-03', 'loy', 'b', [3, 0]),
    jugado('2', '2026-10-10', 'b', 'loy', [2, 2]),
    jugado('x', '2026-10-24', 'b', 'c', [5, 0]),
  ];

  it('va de más antiguo a más reciente aunque la lista venga desordenada', () => {
    expect(calcularRacha('loy', partidos)).toEqual([
      'victoria',
      'empate',
      'derrota',
    ]);
  });

  it('con grupo, solo cuenta los partidos entre equipos del grupo', () => {
    expect(calcularRacha('loy', partidos, new Set(['loy', 'b']))).toEqual([
      'victoria',
      'empate',
    ]);
  });

  it('devuelve una racha vacía si aún no ha jugado', () => {
    expect(calcularRacha('nuevo', partidos)).toEqual([]);
  });
});
