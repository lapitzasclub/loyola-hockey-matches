import { describe, expect, it } from 'vitest';
import {
  TIPOS_INCIDENCIA,
  esTipoIncidencia,
  ordenarIncidencias,
  protagonista,
} from './incidencia';
import type { Incidencia } from './incidencia';
import { ordenPeriodo, periodoPartido } from './periodo';
import { gol, penalti } from './test-utils';

const ana = { plantillaEquipoId: 'ana', dorsal: '7', nombre: 'Ana' };
const bea = { plantillaEquipoId: 'bea', dorsal: '1', nombre: 'Bea' };

describe('periodoPartido', () => {
  it.each([
    [0, { tipo: 'previa' }],
    [-1, { tipo: 'previa' }],
    [1, { tipo: 'juego', numero: 1 }],
    [4, { tipo: 'juego', numero: 4 }],
    [9, { tipo: 'descanso' }],
    [11, { tipo: 'prorroga', numero: 1 }],
    [12, { tipo: 'prorroga', numero: 2 }],
    [21, { tipo: 'penaltis' }],
    [30, { tipo: 'final' }],
    [7, { tipo: 'desconocido', codigo: 7 }],
  ] as const)('traduce el código %i', (codigo, esperado) => {
    expect(periodoPartido(codigo)).toEqual(esperado);
  });

  it('coloca el descanso (9) entre el primer y el segundo periodo', () => {
    expect(ordenPeriodo(1)).toBeLessThan(ordenPeriodo(9));
    expect(ordenPeriodo(9)).toBeLessThan(ordenPeriodo(2));
  });
});

describe('esTipoIncidencia', () => {
  it('reconoce los once tipos y nada más', () => {
    expect(TIPOS_INCIDENCIA).toHaveLength(11);
    expect(TIPOS_INCIDENCIA.every(esTipoIncidencia)).toBe(true);
    expect(esTipoIncidencia('TARJETA')).toBe(false);
    expect(esTipoIncidencia('AMONESTACIONVERBAL')).toBe(false);
    expect(esTipoIncidencia('toString')).toBe(false);
  });
});

describe('protagonista', () => {
  const base = {
    id: 'x',
    lado: 'local',
    periodo: 1,
    minuto: 5,
    segundo: 0,
    registro: '',
  } as const;

  const casos: [Incidencia, string | null][] = [
    [
      {
        ...base,
        tipo: 'GOL',
        autor: ana,
        asistente: bea,
        portero: null,
        via: 'juego',
      },
      'ana',
    ],
    [{ ...base, tipo: 'PARADA', portero: bea }, 'bea'],
    [{ ...base, tipo: 'FALTA', jugador: null }, null],
    [{ ...base, tipo: 'FALTA-HL', jugador: ana }, 'ana'],
    [
      {
        ...base,
        tipo: 'PENALTI',
        lanzador: null,
        portero: bea,
        resultado: 'fallo',
      },
      null,
    ],
    [
      {
        ...base,
        tipo: 'FALTADIRECTA',
        lanzador: ana,
        portero: bea,
        resultado: 'gol',
      },
      'ana',
    ],
    [{ ...base, tipo: 'TM' }, null],
    [{ ...base, tipo: 'CAMBIO', entra: ana, sale: bea }, 'ana'],
    [
      { ...base, tipo: 'TARJETAAZUL', persona: ana, sancionSegundos: 120 },
      'ana',
    ],
    [
      { ...base, tipo: 'TARJETAAMARILLA', persona: bea, sancionSegundos: null },
      'bea',
    ],
    [
      { ...base, tipo: 'TARJETAROJA', persona: ana, sancionSegundos: 240 },
      'ana',
    ],
  ];

  it.each(
    casos.map(([incidencia, esperado]) => ({
      tipo: incidencia.tipo,
      incidencia,
      esperado,
    })),
  )('$tipo', ({ incidencia, esperado }) => {
    expect(protagonista(incidencia)?.plantillaEquipoId ?? null).toBe(esperado);
  });

  it('cubre todos los tipos', () => {
    expect(new Set(casos.map(([i]) => i.tipo))).toEqual(
      new Set(TIPOS_INCIDENCIA),
    );
  });
});

describe('ordenarIncidencias', () => {
  it('ordena por periodo y, dentro, con el reloj hacia atrás', () => {
    const tarde = gol('local', 1, { minuto: 3, segundo: 10 });
    const pronto = gol('visitante', 1, { minuto: 24, segundo: 50 });
    const segunda = gol('local', 2, { minuto: 24, segundo: 59 });
    const descanso = gol('local', 9, { minuto: 0, segundo: 0 });
    const tanda = penalti('local', 'gol', { minuto: 0, segundo: 0 });
    expect(
      ordenarIncidencias([tanda, segunda, descanso, tarde, pronto]),
    ).toEqual([pronto, tarde, descanso, segunda, tanda]);
  });

  it('desempata el mismo segundo por hora de registro', () => {
    const primero = gol('local', 1, { registro: '2026-10-03T18:10:00.1' });
    const despues = gol('local', 1, { registro: '2026-10-03T18:10:00.9' });
    expect(ordenarIncidencias([despues, primero])).toEqual([primero, despues]);
  });
});
