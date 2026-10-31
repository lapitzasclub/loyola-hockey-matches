import { describe, expect, it } from 'vitest';

import {
  estadoPorPeriodo,
  fusionarMarcador,
  marcadorDirectoDe,
  seguirEnDirecto,
} from './directo';
import type { MarcadorDirecto } from './marcador';
import { detalle, gol, penalti } from './test-utils';

describe('seguirEnDirecto', () => {
  const hoy = '2026-10-31';

  it('sigue los partidos de hoy, jugados o no', () => {
    expect(seguirEnDirecto({ estado: 'programado', fecha: hoy }, hoy)).toBe(
      true,
    );
    expect(seguirEnDirecto({ estado: 'finalizado', fecha: hoy }, hoy)).toBe(
      true,
    );
  });

  it('de otro día solo si sigue en juego', () => {
    const ayer = '2026-10-30';
    expect(seguirEnDirecto({ estado: 'en_juego', fecha: ayer }, hoy)).toBe(
      true,
    );
    expect(seguirEnDirecto({ estado: 'finalizado', fecha: ayer }, hoy)).toBe(
      false,
    );
    expect(
      seguirEnDirecto({ estado: 'programado', fecha: '2026-11-07' }, hoy),
    ).toBe(false);
  });
});

describe('estadoPorPeriodo', () => {
  it('30 finaliza y cualquier periodo de juego es en juego', () => {
    expect(estadoPorPeriodo('en_juego', 30)).toBe('finalizado');
    expect(estadoPorPeriodo('programado', 1)).toBe('en_juego');
    expect(estadoPorPeriodo('programado', 21)).toBe('en_juego');
  });

  it('un acta reabierta vuelve a estar en juego', () => {
    expect(estadoPorPeriodo('finalizado', 2)).toBe('en_juego');
  });

  it('la previa (0) no cambia el estado', () => {
    expect(estadoPorPeriodo('programado', 0)).toBe('programado');
    expect(estadoPorPeriodo('en_juego', -1)).toBe('en_juego');
  });
});

describe('marcadorDirectoDe', () => {
  it('en la previa no hay marcador', () => {
    expect(marcadorDirectoDe(detalle())).toBeNull();
  });

  it('cuenta los goles y aplica las reglas de la liga', () => {
    const partido = detalle({
      estado: 'en_juego',
      periodo: 2,
      reglas: { ...detalle().reglas, maxDiferenciaGoles: 2 },
      incidencias: [
        gol('local'),
        gol('local'),
        gol('local'),
        gol('local'),
        gol('visitante'),
      ],
    });
    expect(marcadorDirectoDe(partido)).toEqual<MarcadorDirecto>({
      partidoId: 'p',
      competicionId: 'c',
      estado: 'en_juego',
      periodo: 2,
      goles: { local: 4, visitante: 1 },
      oficial: { local: 3, visitante: 1 },
      ganadorDesempate: null,
    });
  });

  it('la tanda no suma goles y por periodos no hay oficial', () => {
    const partido = detalle({
      estado: 'finalizado',
      periodo: 30,
      reglas: { ...detalle().reglas, puntuacionPorPeriodos: true },
      incidencias: [gol('local'), gol('visitante'), penalti('local', 'gol')],
      visitante: { ...detalle().visitante, ganoDesempate: true },
    });
    expect(marcadorDirectoDe(partido)).toMatchObject({
      goles: { local: 1, visitante: 1 },
      oficial: null,
      ganadorDesempate: 'visitante',
    });
  });
});

describe('fusionarMarcador', () => {
  const marcador = (
    partidoId: string,
    goles: [number, number],
  ): MarcadorDirecto => ({
    partidoId,
    competicionId: 'c',
    estado: 'en_juego',
    periodo: 1,
    goles: { local: goles[0], visitante: goles[1] },
    oficial: { local: goles[0], visitante: goles[1] },
    ganadorDesempate: null,
  });

  it('pone al día el del partido sin tocar los demás', () => {
    const lista = [marcador('a', [0, 0]), marcador('b', [1, 0])];
    const nueva = fusionarMarcador(lista, marcador('b', [2, 0]));
    expect(nueva).not.toBe(lista);
    expect(nueva[0]).toBe(lista[0]);
    expect(nueva[1]?.goles).toEqual({ local: 2, visitante: 0 });
  });

  it('añade el partido que empezó después de pedir la lista', () => {
    const lista = [marcador('a', [0, 0])];
    expect(fusionarMarcador(lista, marcador('b', [0, 0]))).toHaveLength(2);
  });

  it('sin cambios devuelve la misma lista', () => {
    const lista = [marcador('a', [1, 1])];
    expect(fusionarMarcador(lista, marcador('a', [1, 1]))).toBe(lista);
  });
});
