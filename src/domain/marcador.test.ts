import { describe, expect, it } from 'vitest';
import {
  marcadorConReglas,
  marcadorOficial,
  marcadorPorIncidencias,
  marcadorPorPeriodos,
  parcialesPorPeriodo,
  periodosJugados,
  reglaDelMarcador,
  tandaDePenaltis,
} from './marcador';
import type { ReglasPartido } from './marcador';
import { gol, penalti } from './test-utils';

const reglas: ReglasPartido = {
  marcadorACero: false,
  maxDiferenciaGoles: 0,
  puntuacionPorPeriodos: false,
  numeroPeriodos: 2,
  puntoBonus: false,
  desempatePenaltis: false,
};

function goles(local: number, visitante: number, periodo = 1) {
  return [
    ...Array.from({ length: local }, () => gol('local', periodo)),
    ...Array.from({ length: visitante }, () => gol('visitante', periodo)),
  ];
}

describe('marcadorPorIncidencias', () => {
  it('cuenta los GOL de cada lado, en cualquier periodo de juego o prórroga', () => {
    const incidencias = [
      ...goles(2, 1, 1),
      ...goles(0, 1, 2),
      gol('local', 11),
    ];
    expect(marcadorPorIncidencias(incidencias)).toEqual({
      local: 3,
      visitante: 2,
    });
  });

  it('no suma la tanda de penaltis ni los lanzamientos', () => {
    const incidencias = [
      ...goles(1, 1),
      gol('local', 21),
      penalti('local', 'gol'),
      penalti('visitante', 'gol', { periodo: 2 }),
    ];
    expect(marcadorPorIncidencias(incidencias)).toEqual({
      local: 1,
      visitante: 1,
    });
  });

  it('sin goles es 0-0', () => {
    expect(marcadorPorIncidencias([])).toEqual({ local: 0, visitante: 0 });
  });
});

describe('marcadorConReglas', () => {
  it('deja a cero las ligas escolares con marcadorACero', () => {
    expect(
      marcadorConReglas(
        { local: 12, visitante: 6 },
        { ...reglas, marcadorACero: true },
      ),
    ).toEqual({ local: 0, visitante: 0 });
  });

  it('capa la diferencia máxima a favor de quien gana', () => {
    const max5 = { ...reglas, maxDiferenciaGoles: 5 };
    expect(marcadorConReglas({ local: 1, visitante: 9 }, max5)).toEqual({
      local: 1,
      visitante: 6,
    });
    expect(marcadorConReglas({ local: 10, visitante: 0 }, max5)).toEqual({
      local: 5,
      visitante: 0,
    });
  });

  it('no toca una diferencia igual al máximo ni ligas sin tope', () => {
    expect(
      marcadorConReglas(
        { local: 1, visitante: 6 },
        { ...reglas, maxDiferenciaGoles: 5 },
      ),
    ).toEqual({ local: 1, visitante: 6 });
    expect(marcadorConReglas({ local: 15, visitante: 0 }, reglas)).toEqual({
      local: 15,
      visitante: 0,
    });
  });
});

describe('puntuación por periodos', () => {
  it.each([
    [2, 3, 0, 2],
    [30, 3, 1, 3],
    [0, 3, 0, 0],
    [9, 3, 1, 1],
    [21, 2, 0, 1],
    [11, 2, 5, 2],
  ])(
    'periodosJugados(periodo %i, %i periodos, último con incidencias %i) = %i',
    (periodo, numero, ultimo, esperado) => {
      expect(periodosJugados(periodo, numero, ultimo)).toBe(esperado);
    },
  );

  it('da 2 puntos al ganador de cada periodo y 1 a cada uno si empatan', () => {
    const incidencias = [
      ...goles(2, 1, 1),
      ...goles(1, 1, 2),
      ...goles(0, 3, 3),
    ];
    const parciales = parcialesPorPeriodo(incidencias, 30, 3);
    expect(parciales).toEqual([
      { local: 2, visitante: 1 },
      { local: 1, visitante: 1 },
      { local: 0, visitante: 3 },
    ]);
    expect(marcadorPorPeriodos(parciales)).toEqual({ local: 3, visitante: 3 });
  });

  it('en juego solo puntúan los periodos disputados', () => {
    const incidencias = [...goles(2, 1, 1), ...goles(0, 1, 2)];
    expect(parcialesPorPeriodo(incidencias, 2, 3)).toHaveLength(2);
    expect(marcadorPorPeriodos(parcialesPorPeriodo(incidencias, 2, 3))).toEqual(
      { local: 2, visitante: 2 },
    );
  });
});

describe('marcadorOficial', () => {
  it('manda el puntaje del acta aunque se salte la regla', () => {
    const incidencias = goles(10, 0);
    const max5 = { ...reglas, maxDiferenciaGoles: 5 };
    expect(
      marcadorOficial(incidencias, 30, max5, { local: 10, visitante: 0 }),
    ).toEqual({ local: 10, visitante: 0 });
    expect(marcadorOficial(incidencias, 30, max5, null)).toEqual({
      local: 5,
      visitante: 0,
    });
  });

  it('sin puntaje puntúa por periodos si la liga lo pide', () => {
    const incidencias = [...goles(3, 0, 1), ...goles(0, 1, 2)];
    expect(
      marcadorOficial(
        incidencias,
        2,
        { ...reglas, puntuacionPorPeriodos: true },
        null,
      ),
    ).toEqual({ local: 2, visitante: 2 });
  });
});

describe('reglaDelMarcador', () => {
  it('es null si el oficial son los goles', () => {
    expect(
      reglaDelMarcador(
        goles(3, 2),
        30,
        reglas,
        { local: 3, visitante: 2 },
        null,
      ),
    ).toBeNull();
  });

  it('es null con un puntaje fuera de regla que coincide con los goles', () => {
    expect(
      reglaDelMarcador(
        goles(10, 0),
        30,
        { ...reglas, maxDiferenciaGoles: 5 },
        { local: 10, visitante: 0 },
        null,
      ),
    ).toBeNull();
  });

  it('explica el marcador a cero solo si hubo goles', () => {
    const aCero = { ...reglas, marcadorACero: true };
    const cero = { local: 0, visitante: 0 };
    expect(reglaDelMarcador(goles(12, 6), 30, aCero, cero, null)).toEqual({
      tipo: 'a-cero',
    });
    expect(reglaDelMarcador([], 30, aCero, cero, null)).toBeNull();
  });

  it('explica la diferencia máxima', () => {
    expect(
      reglaDelMarcador(
        goles(1, 9),
        30,
        { ...reglas, maxDiferenciaGoles: 5 },
        { local: 1, visitante: 6 },
        null,
      ),
    ).toEqual({ tipo: 'diferencia-maxima', max: 5 });
  });

  it('da los parciales en ligas por periodos', () => {
    const incidencias = [...goles(1, 0, 1), ...goles(0, 2, 2)];
    expect(
      reglaDelMarcador(
        incidencias,
        30,
        { ...reglas, puntuacionPorPeriodos: true },
        { local: 2, visitante: 2 },
        null,
      ),
    ).toEqual({
      tipo: 'por-periodos',
      parciales: [
        { local: 1, visitante: 0 },
        { local: 0, visitante: 2 },
      ],
    });
  });

  it('distingue el desempate por penaltis del de prórroga', () => {
    const bonus = { ...reglas, puntoBonus: true };
    const oficial = { local: 3, visitante: 1 };
    const tanda = [...goles(1, 1), penalti('local', 'gol')];
    expect(reglaDelMarcador(tanda, 30, bonus, oficial, 'local')).toEqual({
      tipo: 'desempate',
      ganador: 'local',
      via: 'penaltis',
    });
    expect(
      reglaDelMarcador(
        [...goles(1, 1), gol('local', 11)],
        30,
        bonus,
        oficial,
        'local',
      ),
    ).toEqual({ tipo: 'desempate', ganador: 'local', via: 'prorroga' });
  });
});

describe('tandaDePenaltis', () => {
  it('es null si no hubo tanda, aunque hubiera penaltis en juego', () => {
    expect(
      tandaDePenaltis([penalti('local', 'fallo', { periodo: 2 })]),
    ).toBeNull();
  });

  it('agrupa en rondas, rellena hasta cinco y solo cuenta los goles', () => {
    const tanda = tandaDePenaltis([
      penalti('local', 'gol', { minuto: 0, registro: '1' }),
      penalti('visitante', 'fallo', { minuto: 0, registro: '2' }),
      penalti('local', 'fallo', { minuto: 0, registro: '3' }),
      penalti('visitante', 'gol', { minuto: 0, registro: '4' }),
      penalti('local', 'pendiente', { minuto: 0, registro: '5' }),
    ]);
    expect(tanda?.marcador).toEqual({ local: 1, visitante: 1 });
    expect(tanda?.rondas).toHaveLength(5);
    expect(tanda?.rondas[1]?.local?.resultado).toBe('fallo');
    expect(tanda?.rondas[2]?.visitante).toBeNull();
  });

  it('sigue más allá de cinco rondas en muerte súbita', () => {
    const lanzamientos = Array.from({ length: 6 }, (_, i) => [
      penalti('local', i < 5 ? 'gol' : 'fallo', { registro: `${i}a` }),
      penalti('visitante', 'gol', { registro: `${i}b` }),
    ]).flat();
    const tanda = tandaDePenaltis(lanzamientos);
    expect(tanda?.rondas).toHaveLength(6);
    expect(tanda?.marcador).toEqual({ local: 5, visitante: 6 });
  });
});
