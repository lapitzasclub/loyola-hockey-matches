import { describe, expect, it } from 'vitest';
import {
  compararPorFechaHora,
  crearMarcador,
  ordenarPartidos,
} from './partido';
import { partido } from './test-utils';

describe('crearMarcador', () => {
  it('redondea el puntaje que llega como float', () => {
    expect(crearMarcador(3.0, 0.0)).toEqual({ local: 3, visitante: 0 });
    expect(crearMarcador(2.9999999, 1)).toEqual({ local: 3, visitante: 1 });
  });

  it('no inventa un 0 si falta un lado', () => {
    expect(crearMarcador(null, 2)).toBeNull();
    expect(crearMarcador(1, undefined)).toBeNull();
  });
});

describe('ordenarPartidos', () => {
  it('ordena por fecha y hora, no por jornada (aplazados)', () => {
    const aplazado = partido({
      id: 'j1',
      jornada: 'JORNADA 1',
      fecha: '2026-11-20',
      hora: '18:00',
    });
    const j2 = partido({
      id: 'j2',
      jornada: 'JORNADA 2',
      fecha: '2026-10-10',
      hora: '19:00',
    });
    const j3 = partido({
      id: 'j3',
      jornada: 'JORNADA 3',
      fecha: '2026-10-10',
      hora: '17:30',
    });
    expect(ordenarPartidos([aplazado, j2, j3]).map((p) => p.id)).toEqual([
      'j3',
      'j2',
      'j1',
    ]);
  });

  it('deja al final del día los partidos sin hora', () => {
    const sinHora = partido({ id: 'a', fecha: '2026-10-10', hora: null });
    const conHora = partido({ id: 'b', fecha: '2026-10-10', hora: '21:00' });
    const otroDia = partido({ id: 'c', fecha: '2026-10-11', hora: '09:00' });
    expect(
      ordenarPartidos([otroDia, sinHora, conHora]).map((p) => p.id),
    ).toEqual(['b', 'a', 'c']);
  });

  it('desempata por id para que el orden sea estable', () => {
    const a = partido({ id: 'a' });
    const b = partido({ id: 'b' });
    expect(compararPorFechaHora(b, a)).toBeGreaterThan(0);
    expect(compararPorFechaHora(a, a)).toBe(0);
  });

  it('no muta la lista original', () => {
    const lista = [partido({ id: 'b' }), partido({ id: 'a' })];
    ordenarPartidos(lista);
    expect(lista.map((p) => p.id)).toEqual(['b', 'a']);
  });
});
