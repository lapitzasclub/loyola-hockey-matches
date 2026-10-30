import { describe, expect, it } from 'vitest';
import { normalizarEstado } from './estado';

describe('normalizarEstado', () => {
  it.each([
    ['PROGRAMADO', 'programado'],
    ['EN_JUEGO', 'en_juego'],
    ['FINALIZADO', 'finalizado'],
    ['SCHEDULED', 'programado'],
    ['FINISHED', 'finalizado'],
    ['IN_PROGRESS', 'en_juego'],
    ['PROGRESS', 'en_juego'],
    [' finished ', 'finalizado'],
  ] as const)(
    'traduce %s de cualquiera de los dos vocabularios',
    (estado, esperado) => {
      expect(normalizarEstado(estado)).toBe(esperado);
    },
  );

  it('da por finalizado el periodo 30 aunque el texto diga otra cosa', () => {
    expect(normalizarEstado('SCHEDULED', 30)).toBe('finalizado');
    expect(normalizarEstado('PROGRAMADO', 30)).toBe('finalizado');
  });

  it('da por en juego los periodos 1..29 aunque el detalle siga en PROGRAMADO', () => {
    expect(normalizarEstado('PROGRAMADO', 1)).toBe('en_juego');
    expect(normalizarEstado('PROGRAMADO', 29)).toBe('en_juego');
  });

  it('no da por empezado un partido con periodo 0 o negativo', () => {
    expect(normalizarEstado('PROGRAMADO', 0)).toBe('programado');
    expect(normalizarEstado('SCHEDULED', -1)).toBe('programado');
  });

  it('respeta un texto de finalizado aunque el periodo no sea 30', () => {
    expect(normalizarEstado('FINISHED', null)).toBe('finalizado');
    expect(normalizarEstado('FINALIZADO', 2)).toBe('finalizado');
  });

  it('trata lo desconocido o vacío como programado', () => {
    expect(normalizarEstado('SUSPENDIDO')).toBe('programado');
    expect(normalizarEstado(null)).toBe('programado');
    expect(normalizarEstado(undefined, null)).toBe('programado');
  });
});
